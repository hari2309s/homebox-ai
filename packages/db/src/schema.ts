import {
  type AnyPgColumn,
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Supabase manages this table; we only reference its `id` column.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const attachmentType = pgEnum("attachment_type", ["photo", "receipt", "manual", "warranty"]);

export const chatMessageRole = pgEnum("chat_message_role", ["user", "assistant"]);

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => locations.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Hex color (e.g. "#fb7369") shown behind the label chip; null falls back to the default chip style.
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull().default(1),
  // Sequential per-owner number (not a global sequence — see itemQueries.createItem),
  // shown zero-padded for printable asset labels. Null on items that predate this field.
  assetId: integer("asset_id"),
  serialNumber: text("serial_number"),
  modelNumber: text("model_number"),
  manufacturer: text("manufacturer"),
  insured: boolean("insured").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  lifetimeWarranty: boolean("lifetime_warranty").notNull().default(false),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }),
  purchaseDate: date("purchase_date"),
  purchaseFrom: text("purchase_from"),
  salePrice: numeric("sale_price", { precision: 12, scale: 2 }),
  saleDate: date("sale_date"),
  soldTo: text("sold_to"),
  soldNotes: text("sold_notes"),
  warrantyExpires: date("warranty_expires"),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const itemLabels = pgTable(
  "item_labels",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.labelId] })],
);

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  type: attachmentType("type").notNull(),
  // Path within the Supabase Storage "attachments" bucket, not a local filesystem path.
  storagePath: text("storage_path").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull(),
  role: chatMessageRole("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const maintenanceEntries = pgTable("maintenance_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
