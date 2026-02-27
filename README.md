# Inventory Management System V4

Production-ish inventory platform built with Next.js + Supabase + Tailwind + Azure OpenAI.

## What You Can Do

- Inventory CRUD with validation
- Category management (admin)
- Status tracking: `in_stock`, `low_stock`, `ordered`, `discontinued`
- Search/filter/sort inventory
- Role-based access control (`admin`, `manager`, `viewer`) in UI + backend + RLS
- AI features:
  - Supplier reorder draft assistant
  - Chat with inventory data

## Tech Stack

- Next.js (App Router, TypeScript)
- Supabase (Postgres, Auth, RLS)
- Tailwind CSS
- Azure OpenAI (`openai` SDK)
- Vercel deployment

## Project Structure

- `src/app/login/page.tsx` login page
- `src/app/inventory/page.tsx` non-admin inventory route
- `src/app/admin/*` admin dashboard pages + tabs
- `src/app/api/items/*` inventory APIs
- `src/app/api/categories/*` category APIs
- `src/app/api/admin/*` team/role APIs
- `src/app/api/ai/*` AI APIs (chat, reorder drafts, etc.)
- `src/components/inventory/*` inventory/admin UI
- `src/lib/*` authz, validation, Supabase, AI helpers
- `supabase/schema.sql` database schema and RLS

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=...
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

## Setup (Local)

1. Install dependencies:

```bash
npm install
```

2. Run Supabase schema:
   - Open Supabase SQL Editor
   - Execute `supabase/schema.sql`

3. Auth settings in Supabase:
   - Enable Email/Password
   - (Optional) disable public sign-up for invite-only flow
   - Add redirect URLs:
     - `http://localhost:3000/login`
     - `https://<your-vercel-domain>/login`

4. Start app:

```bash
npm run dev
```

5. Open: `http://localhost:3000`

## Test Users (Admin / Manager / Viewer)

Use these test accounts with the same password:

- `admin@ims.local` → `admin`
- `manager@ims.local` → `manager`
- `viewer@ims.local` → `viewer`
- Password for all: `P@ssw0rd`

### Create the 3 users in Supabase

In Supabase dashboard:

1. Go to **Authentication > Users**
2. Click **Add user**
3. Create:
   - `admin@ims.local` with password `P@ssw0rd`
   - `manager@ims.local` with password `P@ssw0rd`
   - `viewer@ims.local` with password `P@ssw0rd`

### Assign roles in SQL Editor

Run:

```sql
update public.profiles set role = 'admin' where email = 'admin@ims.local';
update public.profiles set role = 'manager' where email = 'manager@ims.local';
update public.profiles set role = 'viewer' where email = 'viewer@ims.local';
```

## How to Test Each Role

### Admin (`admin@ims.local`)

- Login should redirect to `/admin/inventory`
- Can:
  - Add/edit/delete inventory
  - Manage team roles (`/admin/team`)
  - Manage categories (`/admin/categories`)
  - Use AI supplier drafts and chat

### Manager (`manager@ims.local`)

- Login should redirect to `/inventory`
- Can:
  - Add/edit inventory
  - Use AI supplier drafts and chat
- Cannot:
  - Access admin tabs
  - Manage users/roles/categories
  - Delete items (admin-only)

### Viewer (`viewer@ims.local`)

- Login should redirect to `/inventory`
- Can:
  - View/search/filter inventory
  - Use read-only chat with data
- Cannot:
  - Add/edit/delete items
  - Use admin management features

## API Endpoints

- Items
  - `GET /api/items`
  - `POST /api/items`
  - `GET /api/items/:id`
  - `PATCH /api/items/:id`
  - `DELETE /api/items/:id`
- Categories
  - `GET /api/categories`
  - `POST /api/categories`
  - `PATCH /api/categories/:id`
  - `DELETE /api/categories/:id`
- Admin
  - `POST /api/admin/invite`
  - `GET /api/admin/roles`
  - `PATCH /api/admin/roles`
- AI
  - `POST /api/ai/supplier-drafts`
  - `POST /api/ai/chat-data`
  - `POST /api/ai/restock`
  - `POST /api/ai/nl-search`

## Deploy (Vercel)

1. Push project to GitHub
2. Import in Vercel
3. Add all `.env.example` vars in Vercel
4. Deploy
5. Add deployed login URL in Supabase Auth redirects

## Security Notes

- RBAC is enforced in:
  - UI controls
  - API authorization checks
  - Supabase RLS policies
- AI endpoints return validated structured output and use fallbacks when invalid.
