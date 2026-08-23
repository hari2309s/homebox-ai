import { sql } from "drizzle-orm";
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
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Supabase manages this table; we only reference its `id` column.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const attachmentType = pgEnum("attachment_type", ["photo", "receipt", "manual", "warranty"]);

export const chatMessageRole = pgEnum("chat_message_role", ["user", "assistant"]);

// Sharing without a separate "group" concept: one person (owner_id, the
// value every table below already used before sharing existed) stays the
// anchor identity. Other users get added here as members with full access
// to that owner's data. memberUserId is the primary key — a user can be a
// member of at most one other owner's data at a time (mirrors "one
// household" without needing a synthetic group id) — but can still own
// their own data independently. See packages/db/src/access.ts for how
// query functions resolve "the owner_id I should read/write as."
export const sharedAccess = pgTable("shared_access", {
  memberUserId: uuid("member_user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sharedAccessInvites = pgTable("shared_access_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedByUserId: uuid("accepted_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
});

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
  // ISO 4217 code (see apps/web/lib/currency.ts's SUPPORTED_CURRENCIES) —
  // one currency per item, covering both purchasePrice and salePrice below.
  // A single global "your currency" setting doesn't fit a household that
  // buys things in several countries, so this is chosen per item instead.
  currency: text("currency").notNull().default("USD"),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }),
  purchaseDate: date("purchase_date"),
  purchaseFrom: text("purchase_from"),
  salePrice: numeric("sale_price", { precision: 12, scale: 2 }),
  saleDate: date("sale_date"),
  soldTo: text("sold_to"),
  soldNotes: text("sold_notes"),
  warrantyExpires: date("warranty_expires"),
  // Set once an AI notifier message has been sent for this item's expiring
  // warranty, so the check doesn't re-notify every time it runs.
  warrantyNotifiedAt: timestamp("warranty_notified_at", { withTimezone: true }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  parentItemId: uuid("parent_item_id").references((): AnyPgColumn => items.id, { onDelete: "set null" }),
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
  // Path within the Supabase Storage "attachments" bucket: "{ownerId}/{itemId}/{filename}"
  // (owner-scoped, not the uploading member's own id, so every shared member can see it)
  // — not a local filesystem path.
  storagePath: text("storage_path").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

// Chat stays personal — each member has their own conversation history —
// even though the inventory data it searches over is shared.
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").notNull(),
    role: chatMessageRole("role").notNull(),
    content: text("content").notNull(),
    // True for messages an AI notifier sent unprompted (e.g. a warranty
    // reminder), as opposed to a reply to something the user asked.
    isProactive: boolean("is_proactive").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    // Deterministic per-notification-event key (e.g. "warranty:{ownerId}:{date}")
    // set only on proactive messages — the partial unique index below (see
    // migrations/0004_*.sql) makes re-running a notifier check a no-op
    // instead of a duplicate message, even under concurrent execution.
    nudgeKey: text("nudge_key"),
    /** Item IDs whose cover photos were shown inline with this assistant message — stored so history reload can re-fetch and re-sign the photo URLs. */
    referencedItemIds: text("referenced_item_ids").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("chat_messages_nudge_key_unique")
      .on(table.ownerId, table.nudgeKey)
      .where(sql`${table.nudgeKey} is not null`),
  ],
);

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
