export type UserRole = "admin" | "manager" | "viewer";

export type InventoryStatus =
  | "in_stock"
  | "low_stock"
  | "ordered"
  | "discontinued";

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  category: string;
  category_id: string | null;
  status: InventoryStatus;
  sku: string | null;
  location: string | null;
  supplier: string | null;
  unit_cost: number | null;
  reorder_threshold: number | null;
  notes: string | null;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
};
