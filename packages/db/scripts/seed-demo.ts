/**
 * seed-demo.ts — Creates (or resets) a demo account with a fully furnished
 * Antwerp property.  Run with:
 *
 *   npx tsx packages/db/scripts/seed-demo.ts
 *
 * The script uses the Supabase admin client to create auth users and the
 * normal query layer to insert data (which goes through RLS).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env.local") });

import { createClient } from "@supabase/supabase-js";

import {
  getDb,
  homeQueries,
  itemActivityQueries,
  itemLabelQueries,
  itemQueries,
  labelQueries,
  locationQueries,
  maintenanceQueries,
  reminderQueries,
} from "../src/index";

// ── Demo credentials (keep in sync with the login page) ────────────────
export const DEMO_EMAIL = "demo@homebox.app";
export const DEMO_PASSWORD = "TryHomebox2024!";
const DEMO_NAME = "Hari";

const HOUSEHOLD = [
  { email: "dora.demo@homebox.app", name: "Dora", relationship: "Partner" },
  { email: "kamala.demo@homebox.app", name: "Kamala", relationship: "Parent" },
];

// ── Helpers ─────────────────────────────────────────────────────────────

const dayKey = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

// ── Supabase admin (service role) ──────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function ensureUser(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  email: string,
  fullName: string,
  password?: string,
): Promise<string> {
  // Try to find existing user
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    // Update metadata to ensure onboarded_at is set
    await admin.auth.admin.updateUserById(existing.id, {
      user_metadata: { ...existing.user_metadata, full_name: fullName, onboarded_at: new Date().toISOString() },
      ...(password ? { password } : {}),
    });
    console.log(`  Found existing user: ${email} → ${existing.id}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: password ?? `Member${Date.now()}!`,
    email_confirm: true,
    user_metadata: { full_name: fullName, onboarded_at: new Date().toISOString() },
  });
  if (error) throw new Error(`Failed to create ${email}: ${error.message}`);
  console.log(`  Created user: ${email} → ${data.user.id}`);
  return data.user.id;
}

// ── Wipe ────────────────────────────────────────────────────────────────

async function wipe(ownerId: string) {
  const db = getDb();
  console.log(`Wiping all data for owner ${ownerId}…`);
  await db.execute(sql`DELETE FROM item_labels WHERE item_id IN (SELECT id FROM items WHERE owner_id = ${ownerId})`);
  await db.execute(sql`DELETE FROM attachments WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM maintenance_entries WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM reminders WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM item_activity WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM chat_messages WHERE owner_id = ${ownerId}`);
  await db.execute(sql`UPDATE items SET parent_item_id = NULL WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM items WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM labels WHERE owner_id = ${ownerId}`);
  await db.execute(sql`UPDATE locations SET parent_id = NULL WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM locations WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM home_settings WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM shared_access_invites WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM shared_access WHERE owner_id = ${ownerId}`);
  console.log("Wipe complete.");
}

// ── Seed data ───────────────────────────────────────────────────────────

interface PlaceSeed {
  name: string;
  kind: string;
  parent?: string;
  rect: [x: number, y: number, w: number, h: number];
}

const PLACES: PlaceSeed[] = [
  // Main building
  { name: "House",           kind: "house",  rect: [30,  260, 580, 430] },
  { name: "Kitchen",         kind: "room",   parent: "House", rect: [42,  290, 170, 130] },
  { name: "Living Room",     kind: "room",   parent: "House", rect: [220, 290, 150, 130] },
  { name: "Master Bedroom",  kind: "room",   parent: "House", rect: [378, 290, 220, 130] },
  { name: "Guest Room",      kind: "room",   parent: "House", rect: [42,  430, 190, 140] },
  { name: "Bathroom",        kind: "room",   parent: "House", rect: [240, 430, 160, 140] },
  { name: "Hallway",         kind: "room",   parent: "House", rect: [408, 430, 190, 140] },
  { name: "Home Office",     kind: "room",   parent: "House", rect: [42,  580, 280, 100] },
  { name: "Laundry",         kind: "room",   parent: "House", rect: [330, 580, 268, 100] },

  // Garden
  { name: "Garden",          kind: "garden", rect: [30,  40,  560, 190] },
  { name: "Vegetable Patch", kind: "bed",    parent: "Garden", rect: [42,  70,  160, 120] },
  { name: "Flower Bed",      kind: "bed",    parent: "Garden", rect: [220, 70,  140, 120] },
  { name: "Pond",            kind: "pond",   parent: "Garden", rect: [380, 70,  100, 100] },
  { name: "Swing",           kind: "area",   parent: "Garden", rect: [500, 70,  80,  80]  },

  // Garage
  { name: "Garage",          kind: "garage", rect: [650, 260, 220, 280] },
  { name: "Workbench",       kind: "area",   parent: "Garage", rect: [662, 292, 196, 100] },
  { name: "Tool Wall",       kind: "area",   parent: "Garage", rect: [662, 400, 196, 60]  },

  // Other
  { name: "Terrace",         kind: "area",   rect: [650, 40,  220, 190] },
  { name: "Shed",            kind: "shed",   rect: [910, 40,  200, 160] },
  { name: "Driveway",        kind: "drive",  rect: [910, 260, 200, 160] },
];

const LABELS = [
  { name: "Electronics",      color: "#dde6f0" },
  { name: "Appliances",       color: "#f6e7c4" },
  { name: "Tools",            color: "#ecdccd" },
  { name: "Furniture",        color: "#e8ddd0" },
  { name: "Valuable",         color: "#f6dde5" },
  { name: "Outdoor",          color: "#dfe8d6" },
  { name: "Seasonal",         color: "#d6eaea" },
  { name: "Kitchen",          color: "#fce9d3" },
  { name: "Office",           color: "#dde6f0" },
  { name: "Sports & Fitness", color: "#d6eaea" },
  { name: "Safety",           color: "#f6dde5" },
  { name: "Entertainment",    color: "#e5ddf6" },
  { name: "Kids",             color: "#f6dde5" },
  { name: "Cleaning",         color: "#dfe8d6" },
];

interface ItemSeed {
  name: string;
  place: string;
  labels?: string[];
  description?: string;
  quantity?: number;
  brand?: string;
  model?: string;
  serial?: string;
  price?: string;
  currency?: string;
  boughtDaysAgo?: number;
  from?: string;
  warrantyInDays?: number;
  lifetimeWarranty?: boolean;
  insured?: boolean;
  parent?: string;
  pin?: boolean;
  notes?: string;
  archived?: boolean;
  care?: { daysAgo: number; name: string; cost?: string; description?: string }[];
  reminder?: { inDays: number; title: string; description?: string };
}

const ITEMS: ItemSeed[] = [
  // ── Kitchen ──
  {
    name: "Espresso Machine", place: "Kitchen", labels: ["Kitchen", "Appliances"],
    brand: "De'Longhi", model: "Dinamica Plus", serial: "DLG-DYN-55128",
    price: "599.00", currency: "EUR", boughtDaysAgo: 540, from: "MediaMarkt Antwerp",
    warrantyInDays: 190, pin: true,
    care: [{ daysAgo: 90, name: "Descaled", cost: "6.00" }],
    reminder: { inDays: 5, title: "Descale espresso machine", description: "Run the descaling cycle." },
  },
  {
    name: "Stand Mixer", place: "Kitchen", labels: ["Kitchen", "Appliances"],
    brand: "KitchenAid", model: "Artisan 5KSM175", price: "449.00", currency: "EUR",
    boughtDaysAgo: 420, from: "Bol.com", warrantyInDays: 310, pin: true,
  },
  {
    name: "Refrigerator", place: "Kitchen", labels: ["Kitchen", "Appliances"],
    brand: "Bosch", model: "KGN39AIAT", serial: "BSH-KGN-882102",
    price: "899.00", currency: "EUR", boughtDaysAgo: 900, from: "Coolblue",
    warrantyInDays: -170, insured: true, pin: true,
    care: [{ daysAgo: 30, name: "Cleaned condenser coils" }],
  },
  {
    name: "Dishwasher", place: "Kitchen", labels: ["Kitchen", "Appliances"],
    brand: "Siemens", model: "SN65ZX49CE", serial: "SIE-SN65-77123",
    price: "1049.00", currency: "EUR", boughtDaysAgo: 750, from: "Vanden Borre",
    warrantyInDays: -20, pin: true,
    reminder: { inDays: 14, title: "Run dishwasher cleaning cycle" },
  },
  {
    name: "Knife Set", place: "Kitchen", labels: ["Kitchen"],
    brand: "Zwilling", model: "Twin Chef 8-Piece",
    price: "299.00", currency: "EUR", boughtDaysAgo: 600, from: "Zwilling Store Antwerp",
    lifetimeWarranty: true, pin: true,
    care: [{ daysAgo: 45, name: "Professional sharpening", cost: "20.00" }],
  },
  {
    name: "Cast Iron Pot", place: "Kitchen", labels: ["Kitchen"],
    brand: "Le Creuset", model: "Signature Round 26cm",
    price: "349.00", currency: "EUR", boughtDaysAgo: 1200, lifetimeWarranty: true,
  },
  {
    name: "Microwave", place: "Kitchen", labels: ["Kitchen", "Appliances"],
    brand: "Samsung", model: "MS23K3513AW", price: "119.00", currency: "EUR",
    boughtDaysAgo: 650, warrantyInDays: 80,
  },
  {
    name: "Fire Extinguisher", place: "Kitchen", labels: ["Safety"],
    quantity: 2, brand: "Gloria", model: "6kg ABC",
    price: "69.00", currency: "EUR", boughtDaysAgo: 800,
    reminder: { inDays: 60, title: "Inspect fire extinguishers" },
  },

  // ── Living Room ──
  {
    name: "OLED TV 55\"", place: "Living Room", labels: ["Electronics", "Entertainment", "Valuable"],
    brand: "LG", model: "OLED55C3", serial: "LG-C3-5501293",
    price: "1399.00", currency: "EUR", boughtDaysAgo: 290, from: "MediaMarkt",
    warrantyInDays: 440, insured: true, pin: true,
  },
  {
    name: "Soundbar", place: "Living Room", labels: ["Electronics", "Entertainment"],
    brand: "Sonos", model: "Beam Gen 2", price: "499.00", currency: "EUR",
    boughtDaysAgo: 290, warrantyInDays: 440, pin: true,
  },
  {
    name: "Sofa", place: "Living Room", labels: ["Furniture"],
    brand: "IKEA", model: "Kivik 3-Seat", price: "699.00", currency: "EUR",
    boughtDaysAgo: 1100, from: "IKEA Wilrijk", pin: true,
    care: [{ daysAgo: 150, name: "Deep cleaned upholstery", cost: "40.00" }],
  },
  {
    name: "Coffee Table", place: "Living Room", labels: ["Furniture"],
    brand: "Ethnicraft", model: "Teak Duplex", price: "895.00", currency: "EUR",
    boughtDaysAgo: 800,
  },
  {
    name: "Board Games", place: "Living Room", labels: ["Entertainment"],
    quantity: 10, description: "Catan, Azul, Ticket to Ride, Wingspan, Codenames, etc.",
    price: "280.00", currency: "EUR",
  },
  {
    name: "Robot Vacuum", place: "Living Room", labels: ["Electronics", "Cleaning"],
    brand: "Roborock", model: "S8 Pro Ultra", serial: "RR-S8P-440821",
    price: "1299.00", currency: "EUR", boughtDaysAgo: 180, from: "Amazon.de",
    warrantyInDays: 550, pin: true,
    care: [{ daysAgo: 30, name: "Cleaned HEPA filter" }],
  },
  {
    name: "Guitar", place: "Living Room", labels: ["Entertainment", "Valuable"],
    brand: "Taylor", model: "214ce", serial: "TAY-214-110932",
    price: "1199.00", currency: "EUR", boughtDaysAgo: 1500, from: "Bax Music",
    insured: true, lifetimeWarranty: true, pin: true,
    care: [{ daysAgo: 60, name: "New strings", cost: "14.00" }],
  },

  // ── Master Bedroom ──
  {
    name: "Mattress", place: "Master Bedroom", labels: ["Furniture"],
    brand: "Emma", model: "Premium King", price: "999.00", currency: "EUR",
    boughtDaysAgo: 600, from: "Emma.be", warrantyInDays: 3050, pin: true,
    notes: "10-year warranty. Rotate 180° every 3 months.",
    reminder: { inDays: 20, title: "Rotate mattress" },
  },
  {
    name: "Bed Frame", place: "Master Bedroom", labels: ["Furniture"],
    brand: "Bolia", model: "Lull King Oak", price: "1299.00", currency: "EUR",
    boughtDaysAgo: 600, pin: true,
  },
  {
    name: "Dyson Purifier", place: "Master Bedroom", labels: ["Electronics", "Appliances"],
    brand: "Dyson", model: "Purifier Hot+Cool HP07", serial: "DYS-HP07-22918",
    price: "549.00", currency: "EUR", boughtDaysAgo: 350, warrantyInDays: 380, pin: true,
    care: [{ daysAgo: 120, name: "Replaced HEPA filter", cost: "59.00" }],
  },

  // ── Guest Room (Kamala's room when visiting) ──
  {
    name: "Sofa Bed", place: "Guest Room", labels: ["Furniture"],
    brand: "IKEA", model: "Friheten", price: "549.00", currency: "EUR",
    boughtDaysAgo: 800, from: "IKEA Wilrijk", pin: true,
    notes: "Kamala's room when she visits from Chennai.",
  },
  {
    name: "Sewing Machine", place: "Guest Room", labels: ["Appliances"],
    brand: "Brother", model: "CS7000X", price: "229.00", currency: "EUR",
    boughtDaysAgo: 400, warrantyInDays: 1430,
    notes: "Dora's. Extra bobbins in the drawer underneath.",
  },

  // ── Home Office ──
  {
    name: "MacBook Pro 16\"", place: "Home Office", labels: ["Electronics", "Office", "Valuable"],
    brand: "Apple", model: "MacBook Pro M3 Max", serial: "C02ZK7LMHV29",
    price: "3999.00", currency: "EUR", boughtDaysAgo: 180, from: "Apple Meir Antwerp",
    warrantyInDays: 550, insured: true, pin: true,
  },
  {
    name: "Studio Display", place: "Home Office", labels: ["Electronics", "Office"],
    brand: "Apple", model: "Studio Display 27\" 5K", serial: "APL-SD-MK0U3LL",
    price: "1749.00", currency: "EUR", boughtDaysAgo: 350, from: "Apple Meir Antwerp",
    warrantyInDays: 380, pin: true,
  },
  {
    name: "Standing Desk", place: "Home Office", labels: ["Furniture", "Office"],
    brand: "Flexispot", model: "E7 Pro 180cm Oak", price: "649.00", currency: "EUR",
    boughtDaysAgo: 700, warrantyInDays: 2850, pin: true,
  },
  {
    name: "Office Chair", place: "Home Office", labels: ["Furniture", "Office"],
    brand: "Herman Miller", model: "Aeron Remastered B", serial: "HM-AER-52891P",
    price: "1395.00", currency: "EUR", boughtDaysAgo: 700, from: "Design Within Reach",
    warrantyInDays: 3650, insured: true, pin: true,
  },
  {
    name: "Fireproof Safe", place: "Home Office", labels: ["Valuable", "Safety"],
    brand: "Burg-Wächter", model: "CL 40 E", price: "189.00", currency: "EUR",
    boughtDaysAgo: 1200, lifetimeWarranty: true, pin: true,
    notes: "Passports, birth certificates, property deed inside.",
  },
  {
    name: "Passports", place: "Home Office", labels: ["Valuable"],
    quantity: 3, parent: "Fireproof Safe",
    description: "Hari, Dora, and Kamala's passports in blue folder.",
  },

  // ── Hallway ──
  {
    name: "Smoke Detectors", place: "Hallway", labels: ["Safety"],
    quantity: 4, brand: "Nest", model: "Protect",
    price: "476.00", currency: "EUR", boughtDaysAgo: 800, warrantyInDays: -70,
    reminder: { inDays: 7, title: "Test smoke detectors" },
  },
  {
    name: "Smart Lock", place: "Hallway", labels: ["Electronics", "Safety"],
    brand: "Nuki", model: "Smart Lock 4.0 Pro",
    price: "279.00", currency: "EUR", boughtDaysAgo: 400, warrantyInDays: 330, pin: true,
    notes: "Master code shared with Dora. Guest code for Kamala's visits.",
  },

  // ── Bathroom ──
  {
    name: "Electric Toothbrush", place: "Bathroom", labels: ["Electronics"],
    quantity: 2, brand: "Oral-B", model: "iO Series 9",
    price: "349.00", currency: "EUR", boughtDaysAgo: 200, warrantyInDays: 530,
  },
  {
    name: "First Aid Kit", place: "Bathroom", labels: ["Safety"],
    price: "24.00", currency: "EUR", boughtDaysAgo: 365,
    reminder: { inDays: 30, title: "Restock first aid kit" },
  },

  // ── Laundry ──
  {
    name: "Washing Machine", place: "Laundry", labels: ["Appliances"],
    brand: "Miele", model: "WED164 WCS", serial: "MIE-WED-5577",
    price: "1099.00", currency: "EUR", boughtDaysAgo: 800, from: "Coolblue",
    warrantyInDays: -70, pin: true,
    care: [{ daysAgo: 60, name: "Cleaned door gasket" }],
    reminder: { inDays: 10, title: "Run washing machine tub clean" },
  },
  {
    name: "Dryer", place: "Laundry", labels: ["Appliances"],
    brand: "Miele", model: "TED264 WP", serial: "MIE-TED-5578",
    price: "999.00", currency: "EUR", boughtDaysAgo: 800, from: "Coolblue",
    warrantyInDays: -70, pin: true,
  },
  {
    name: "Dyson V15", place: "Laundry", labels: ["Electronics", "Cleaning"],
    brand: "Dyson", model: "V15 Detect Absolute", serial: "DYS-V15-88120",
    price: "699.00", currency: "EUR", boughtDaysAgo: 300, warrantyInDays: 430, pin: true,
    care: [{ daysAgo: 30, name: "Washed filter" }],
  },

  // ── Garage ──
  {
    name: "Toolbox", place: "Workbench", labels: ["Tools"],
    brand: "Milwaukee", model: "PACKOUT 3-Piece",
    price: "229.00", currency: "EUR", boughtDaysAgo: 1000, pin: true,
  },
  {
    name: "Cordless Drill", place: "Workbench", labels: ["Tools", "Electronics"],
    parent: "Toolbox", brand: "Bosch", model: "GSR 18V-90 C",
    price: "189.00", currency: "EUR", boughtDaysAgo: 500, warrantyInDays: 1330,
  },
  {
    name: "Screwdriver Set", place: "Tool Wall", labels: ["Tools"],
    brand: "Wiha", model: "Precision 26-Piece",
    price: "54.00", currency: "EUR", boughtDaysAgo: 600, lifetimeWarranty: true, pin: true,
  },
  {
    name: "Bicycle", place: "Garage", labels: ["Sports & Fitness", "Outdoor"],
    brand: "Gazelle", model: "Chamonix C7", serial: "GAZ-C7-992017",
    price: "1299.00", currency: "EUR", boughtDaysAgo: 500, insured: true, pin: true,
    care: [{ daysAgo: 60, name: "Tuned gears and brakes", cost: "55.00" }],
    reminder: { inDays: 45, title: "Bike annual service" },
  },
  {
    name: "E-Bike", place: "Garage", labels: ["Sports & Fitness", "Outdoor", "Valuable", "Electronics"],
    brand: "VanMoof", model: "S5", serial: "VM-S5-ASY-77142",
    price: "2498.00", currency: "EUR", boughtDaysAgo: 320, from: "VanMoof Antwerp",
    warrantyInDays: 410, insured: true, pin: true,
    notes: "Dora's daily commuter.",
  },
  {
    name: "Winter Tyres", place: "Garage", labels: ["Seasonal"],
    quantity: 4, brand: "Michelin", model: "Alpin 6",
    price: "640.00", currency: "EUR", boughtDaysAgo: 380,
    reminder: { inDays: -2, title: "Check winter tyre tread depth" },
  },
  {
    name: "Jumper Cables", place: "Garage", labels: ["Tools"],
    brand: "Energizer", model: "25ft Heavy Duty",
    price: "44.00", currency: "EUR", boughtDaysAgo: 900,
  },

  // ── Garden ──
  {
    name: "Lawn Mower", place: "Shed", labels: ["Outdoor", "Tools"],
    brand: "Bosch", model: "Rotak 43 LI", serial: "BSH-RTK-881231",
    price: "449.00", currency: "EUR", boughtDaysAgo: 600, warrantyInDays: 1230, pin: true,
    care: [{ daysAgo: 120, name: "Sharpened blade", cost: "15.00" }],
    reminder: { inDays: 2, title: "Mow the lawn" },
  },
  {
    name: "Pressure Washer", place: "Shed", labels: ["Outdoor", "Tools"],
    brand: "Kärcher", model: "K5 Premium", price: "349.00", currency: "EUR",
    boughtDaysAgo: 500, warrantyInDays: 230, pin: true,
  },
  {
    name: "Hedge Trimmer", place: "Shed", labels: ["Outdoor", "Tools"],
    brand: "Stihl", model: "HSA 56", price: "199.00", currency: "EUR",
    boughtDaysAgo: 400, warrantyInDays: 330, pin: true,
  },
  {
    name: "BBQ Grill", place: "Terrace", labels: ["Outdoor", "Appliances"],
    brand: "Weber", model: "Spirit II E-310", serial: "WBR-SPR2-44182",
    price: "449.00", currency: "EUR", boughtDaysAgo: 450, from: "Hubo",
    warrantyInDays: 3200, pin: true,
    care: [{ daysAgo: 30, name: "Deep cleaned grates" }],
  },
  {
    name: "Patio Furniture Set", place: "Terrace", labels: ["Outdoor", "Furniture"],
    brand: "Manutti", model: "Air Collection 5-Piece",
    price: "3499.00", currency: "EUR", boughtDaysAgo: 400, warrantyInDays: 3230, pin: true,
    notes: "Store cushions in the shed over winter.",
    reminder: { inDays: 35, title: "Store patio cushions for winter" },
  },
  {
    name: "String Lights", place: "Terrace", labels: ["Outdoor", "Seasonal"],
    brand: "Calex", model: "Party Lights 15m",
    price: "39.00", currency: "EUR", boughtDaysAgo: 400, pin: true,
  },
  {
    name: "Compost Bin", place: "Vegetable Patch", labels: ["Outdoor"],
    brand: "Garantia", model: "Thermo-King 600L",
    price: "79.00", currency: "EUR", boughtDaysAgo: 500, pin: true,
  },
  {
    name: "Raised Garden Beds", place: "Vegetable Patch", labels: ["Outdoor"],
    quantity: 3, brand: "Birdies", model: "6-in-1 Modular",
    price: "350.00", currency: "EUR", boughtDaysAgo: 400, pin: true,
    notes: "Tomatoes in bed 1, herbs in bed 2, peppers in bed 3.",
  },
  {
    name: "Garden Hose", place: "Garden", labels: ["Outdoor", "Tools"],
    brand: "Gardena", model: "30m Wall-Mounted Reel",
    price: "69.00", currency: "EUR", boughtDaysAgo: 600,
  },
  {
    name: "Pond Pump", place: "Pond", labels: ["Outdoor", "Electronics"],
    brand: "Oase", model: "AquaMax Eco Premium 6000",
    price: "329.00", currency: "EUR", boughtDaysAgo: 400, warrantyInDays: 1330, pin: true,
    care: [{ daysAgo: 90, name: "Cleaned filter basket" }],
    reminder: { inDays: 14, title: "Clean pond pump filter" },
  },
  {
    name: "Koi Fish Food", place: "Pond", labels: ["Outdoor", "Seasonal"],
    brand: "Hikari", model: "Staple Large 5kg",
    price: "34.00", currency: "EUR", boughtDaysAgo: 30,
    notes: "Feed once a day. Reduce in winter.",
  },
  {
    name: "Swing Set", place: "Swing", labels: ["Outdoor", "Kids"],
    brand: "Wickey", model: "TurboFlyer", price: "329.00", currency: "EUR",
    boughtDaysAgo: 600, warrantyInDays: 3000, pin: true,
    notes: "For when friends visit with kids. Check bolts each spring.",
    reminder: { inDays: 25, title: "Inspect swing set bolts" },
  },
  {
    name: "Hammock", place: "Garden", labels: ["Outdoor", "Furniture"],
    brand: "Tropilex", model: "Dream Sand XL",
    price: "119.00", currency: "EUR", boughtDaysAgo: 250, pin: true,
  },

  // ── Driveway ──
  {
    name: "Outdoor Camera", place: "Driveway", labels: ["Electronics", "Safety"],
    brand: "Ring", model: "Floodlight Cam Pro",
    price: "229.00", currency: "EUR", boughtDaysAgo: 260, warrantyInDays: 470, pin: true,
  },

  // ── Archived ──
  {
    name: "Old Laptop", place: "Home Office", labels: ["Electronics"],
    brand: "Apple", model: "MacBook Pro 13\" 2019", serial: "C02YK3LMQ6L4",
    price: "1799.00", currency: "EUR", boughtDaysAgo: 1800, warrantyInDays: -1070,
    archived: true, notes: "Traded in for the M3 Max.",
  },
];

// ── Runner ──────────────────────────────────────────────────────────────

async function main() {
  const admin = getAdminClient();

  // 1. Ensure demo users exist
  console.log("Ensuring demo users…");
  const hariId = await ensureUser(admin, DEMO_EMAIL, DEMO_NAME, DEMO_PASSWORD);

  const memberIds: string[] = [];
  for (const member of HOUSEHOLD) {
    const memberId = await ensureUser(admin, member.email, member.name);
    memberIds.push(memberId);
  }

  // 2. Wipe existing demo data
  await wipe(hariId);

  // 3. Set up household
  const db = getDb();
  for (let i = 0; i < HOUSEHOLD.length; i++) {
    await db.execute(
      sql`INSERT INTO shared_access (member_user_id, owner_id, relationship)
          VALUES (${memberIds[i]!}, ${hariId}, ${HOUSEHOLD[i]!.relationship})
          ON CONFLICT (member_user_id) DO UPDATE SET owner_id = ${hariId}, relationship = ${HOUSEHOLD[i]!.relationship}`,
    );
    console.log(`  Household: ${HOUSEHOLD[i]!.name} (${HOUSEHOLD[i]!.relationship})`);
  }

  // 4. Set home location (Antwerp, Belgium)
  await homeQueries.setHomeLocation(hariId, {
    placeName: "Antwerp, Belgium",
    latitude: 51.2194,
    longitude: 4.4025,
    timezone: "Europe/Brussels",
  });
  console.log("Home location set to Antwerp.");

  // 5. Create places
  const placeIdByName = new Map<string, string>();
  const rectByPlace = new Map<string, [number, number, number, number]>();

  for (const p of PLACES) {
    rectByPlace.set(p.name, p.rect);
    const [x, y, w, h] = p.rect;
    const [created] = await locationQueries.createLocation(hariId, {
      name: p.name,
      parentId: p.parent ? (placeIdByName.get(p.parent) ?? null) : null,
      planKind: p.kind,
      planX: x, planY: y, planW: w, planH: h,
    });
    if (!created) continue;
    placeIdByName.set(p.name, created.id);
  }
  console.log(`${placeIdByName.size} places created.`);

  // 6. Create labels
  const labelIdByName = new Map<string, string>();
  for (const l of LABELS) {
    const [created] = await labelQueries.createLabel(hariId, l);
    if (!created) continue;
    labelIdByName.set(l.name, created.id);
  }
  console.log(`${labelIdByName.size} labels created.`);

  // 7. Create items + labels, care, reminders, activity
  const itemIdByName = new Map<string, string>();
  let itemsCreated = 0;
  let careCreated = 0;
  let remindersCreated = 0;

  for (const [index, item] of ITEMS.entries()) {
    const rect = rectByPlace.get(item.place);
    const pin =
      item.pin && rect
        ? {
            planX: Math.round(rect[0] + rect[2] * (0.15 + ((index * 37) % 70) / 100)),
            planY: Math.round(rect[1] + rect[3] * (0.2 + ((index * 23) % 55) / 100)),
          }
        : {};

    const [created] = await itemQueries.createItem(hariId, {
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      manufacturer: item.brand,
      modelNumber: item.model,
      serialNumber: item.serial,
      insured: item.insured,
      lifetimeWarranty: item.lifetimeWarranty,
      currency: item.currency,
      purchasePrice: item.price,
      purchaseDate: item.boughtDaysAgo !== undefined ? dayKey(-item.boughtDaysAgo) : undefined,
      purchaseFrom: item.from,
      warrantyExpires: item.warrantyInDays !== undefined ? dayKey(item.warrantyInDays) : undefined,
      locationId: placeIdByName.get(item.place) ?? null,
      parentItemId: item.parent ? (itemIdByName.get(item.parent) ?? null) : null,
      notes: item.notes,
      ...pin,
    });
    if (!created) continue;
    itemIdByName.set(item.name, created.id);
    itemsCreated++;

    if (item.archived) {
      await itemQueries.updateItem(hariId, created.id, { archived: true });
    }

    await itemActivityQueries.recordItemActivity(hariId, {
      itemName: created.name, action: "created", itemId: created.id,
    });

    const labelIds = (item.labels ?? []).flatMap((n) => labelIdByName.get(n) ?? []);
    if (labelIds.length > 0) await itemLabelQueries.setItemLabels(hariId, created.id, labelIds);

    for (const entry of item.care ?? []) {
      await maintenanceQueries.createMaintenanceEntry(hariId, {
        itemId: created.id, name: entry.name, date: dayKey(-entry.daysAgo),
        description: entry.description, cost: entry.cost,
      });
      careCreated++;
    }

    if (item.reminder) {
      await reminderQueries.createReminder(hariId, {
        itemId: created.id, title: item.reminder.title,
        description: item.reminder.description,
        dueDate: dayKey(item.reminder.inDays),
        assignedToUserId: hariId,
      });
      remindersCreated++;
    }
  }

  console.log(
    `\nDone: ${placeIdByName.size} places, ${labelIdByName.size} labels, ${itemsCreated} items, ` +
      `${careCreated} care entries, ${remindersCreated} reminders.`,
  );
  console.log(`\nDemo account ready:`);
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
