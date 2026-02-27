-- Enable extension for UUID and text search optimization.
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'manager', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'inventory_status') then
    create type inventory_status as enum ('in_stock', 'low_stock', 'ordered', 'discontinued');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity integer not null check (quantity >= 0),
  category text not null,
  category_id uuid references public.categories(id),
  status inventory_status not null default 'in_stock',
  sku text unique,
  location text,
  supplier text,
  unit_cost numeric(12,2),
  reorder_threshold integer check (reorder_threshold >= 0),
  notes text,
  last_updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null check (action in ('insert', 'update', 'delete')),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_items_name on public.inventory_items(name);
create index if not exists idx_inventory_items_category on public.inventory_items(category);
create index if not exists idx_inventory_items_category_id on public.inventory_items(category_id);
create index if not exists idx_inventory_items_status on public.inventory_items(status);
create index if not exists idx_inventory_items_sku on public.inventory_items(sku);
create index if not exists idx_inventory_items_location on public.inventory_items(location);
create index if not exists idx_inventory_items_updated_at on public.inventory_items(updated_at desc);
create index if not exists idx_inventory_items_name_trgm on public.inventory_items using gin (name gin_trgm_ops);
create index if not exists idx_categories_name on public.categories(name);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.apply_inventory_status_rules()
returns trigger
language plpgsql
as $$
begin
  new.last_updated_at = now();
  if new.status <> 'discontinued' then
    if new.reorder_threshold is not null and new.quantity <= new.reorder_threshold then
      new.status = 'low_stock';
    elsif new.status <> 'ordered' then
      new.status = 'in_stock';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.audit_inventory_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(item_id, actor_id, action, after_data)
    values (new.id, auth.uid(), 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs(item_id, actor_id, action, before_data, after_data)
    values (new.id, auth.uid(), 'update', to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs(item_id, actor_id, action, before_data)
    values (old.id, auth.uid(), 'delete', to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_updated_at on public.inventory_items;
create trigger trg_inventory_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_status on public.inventory_items;
create trigger trg_inventory_status
before insert or update on public.inventory_items
for each row execute function public.apply_inventory_status_rules();

drop trigger if exists trg_inventory_audit on public.inventory_items;
create trigger trg_inventory_audit
after insert or update or delete on public.inventory_items
for each row execute function public.audit_inventory_changes();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null), 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.inventory_items enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_role()
returns app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
for select using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
for update using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert" on public.profiles
for insert with check (public.current_role() = 'admin');

drop policy if exists "inventory_select_all_roles" on public.inventory_items;
create policy "inventory_select_all_roles" on public.inventory_items
for select using (public.current_role() in ('admin', 'manager', 'viewer'));

drop policy if exists "inventory_insert_admin_manager" on public.inventory_items;
create policy "inventory_insert_admin_manager" on public.inventory_items
for insert with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "inventory_update_admin_manager" on public.inventory_items;
create policy "inventory_update_admin_manager" on public.inventory_items
for update using (public.current_role() in ('admin', 'manager'))
with check (public.current_role() in ('admin', 'manager'));

drop policy if exists "inventory_delete_admin_only" on public.inventory_items;
create policy "inventory_delete_admin_only" on public.inventory_items
for delete using (public.current_role() = 'admin');

drop policy if exists "categories_select_all_roles" on public.categories;
create policy "categories_select_all_roles" on public.categories
for select using (public.current_role() in ('admin', 'manager', 'viewer'));

drop policy if exists "categories_insert_admin_only" on public.categories;
create policy "categories_insert_admin_only" on public.categories
for insert with check (public.current_role() = 'admin');

drop policy if exists "categories_update_admin_only" on public.categories;
create policy "categories_update_admin_only" on public.categories
for update using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "categories_delete_admin_only" on public.categories;
create policy "categories_delete_admin_only" on public.categories
for delete using (public.current_role() = 'admin');

drop policy if exists "audit_select_admin_manager" on public.audit_logs;
create policy "audit_select_admin_manager" on public.audit_logs
for select using (public.current_role() in ('admin', 'manager'));

insert into public.categories(name, description)
values
  ('Electronics', 'Devices and accessories'),
  ('Office Supplies', 'Daily office usage'),
  ('Maintenance', 'Repair and upkeep items')
on conflict (name) do nothing;

update public.inventory_items i
set category_id = c.id
from public.categories c
where i.category_id is null and lower(i.category) = lower(c.name);
