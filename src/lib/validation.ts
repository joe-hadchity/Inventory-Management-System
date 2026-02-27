import { z } from "zod";

export const statusEnum = z.enum([
  "in_stock",
  "low_stock",
  "ordered",
  "discontinued",
]);

export const itemInputSchema = z.object({
  name: z.string().min(2).max(120),
  quantity: z.number().int().min(0),
  categoryId: z.string().uuid(),
  status: statusEnum,
  sku: z.string().max(80).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  supplier: z.string().max(120).optional().nullable(),
  unit_cost: z.number().min(0).optional().nullable(),
  reorder_threshold: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const itemPatchSchema = itemInputSchema.partial();

export const listQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: statusEnum.optional(),
  sku: z.string().optional(),
  location: z.string().optional(),
  supplier: z.string().optional(),
  maxQuantity: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  lowStockOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  sortBy: z
    .enum(["name", "quantity", "updated_at", "category"])
    .optional()
    .default("updated_at"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const roleUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "manager", "viewer"]),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "viewer"]),
  fullName: z.string().min(1).max(120).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(250).optional().nullable(),
});

export const nlSearchSchema = z.object({
  query: z.string().min(3).max(500),
});

export const nlSearchResponseSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  status: statusEnum.optional(),
  maxQuantity: z.number().int().min(0).optional(),
  location: z.string().optional(),
  supplier: z.string().optional(),
  sortBy: z.enum(["name", "quantity", "updated_at", "category"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const restockResponseSchema = z.array(
  z.object({
    item_id: z.string().uuid(),
    reason: z.string().min(1),
    recommended_order_qty: z.number().int().min(0),
    urgency: z.enum(["low", "medium", "high"]),
  }),
);

export const supplierDraftSchema = z.object({
  supplier: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  items: z.array(
    z.object({
      sku: z.string().nullable().optional(),
      name: z.string().min(1),
      qty_to_order: z.number().int().min(1),
      reason: z.string().min(1),
    }),
  ),
});

export const supplierDraftsResponseSchema = z.array(supplierDraftSchema);

export const chatDataRequestSchema = z.object({
  message: z.string().min(2).max(1000),
});

export const chatDataIntentSchema = z.object({
  action: z.enum([
    "list_items",
    "count_low_stock",
    "group_by_category",
    "group_by_supplier",
  ]),
  filters: z
    .object({
      q: z.string().optional(),
      category: z.string().optional(),
      status: statusEnum.optional(),
      maxQuantity: z.number().int().min(0).optional(),
      location: z.string().optional(),
      supplier: z.string().optional(),
      lowStockOnly: z.boolean().optional(),
      sortBy: z.enum(["name", "quantity", "updated_at", "category"]).optional(),
      sortDir: z.enum(["asc", "desc"]).optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
