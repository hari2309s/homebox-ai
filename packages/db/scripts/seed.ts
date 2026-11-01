import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env.local") });

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

// ── Config ───────────────────────────────────────────────────────────────

const USER_EMAIL = "hari23haran09@gmail.com";

const dayKey = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

// ── Wipe ─────────────────────────────────────────────────────────────────

async function wipe(userId: string) {
  const db = getDb();

  // Effective owner: if the user is a member in someone else's household,
  // their data lives under that owner. Otherwise they own their own data.
  const memberRow = await db.execute<{ owner_id: string }>(
    sql`SELECT owner_id FROM shared_access WHERE member_user_id = ${userId}`,
  );
  const ownerId = memberRow[0]?.owner_id ?? userId;

  console.log(`Wiping all data for owner ${ownerId} (keeping household members)…`);

  // FK-safe order: leaves → roots
  await db.execute(sql`DELETE FROM item_labels    WHERE item_id IN (SELECT id FROM items WHERE owner_id = ${ownerId})`);
  await db.execute(sql`DELETE FROM attachments     WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM maintenance_entries WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM reminders       WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM item_activity   WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM chat_messages   WHERE owner_id = ${ownerId}`);
  // Items can self-reference (parent_item_id) — clear parents first, then delete.
  await db.execute(sql`UPDATE items SET parent_item_id = NULL WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM items           WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM labels          WHERE owner_id = ${ownerId}`);
  // Locations self-reference too.
  await db.execute(sql`UPDATE locations SET parent_id = NULL WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM locations       WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM home_settings   WHERE owner_id = ${ownerId}`);
  await db.execute(sql`DELETE FROM shared_access_invites WHERE owner_id = ${ownerId}`);
  // shared_access is intentionally kept — Dora stays.

  console.log("Wipe complete.");
}

// ── Seed data ────────────────────────────────────────────────────────────

// Plot space is 1200×760 (apps/web/lib/plan-layout.ts).
interface PlaceSeed {
  name: string;
  kind: string;
  parent?: string;
  rect: [x: number, y: number, w: number, h: number];
}

const PLACES: PlaceSeed[] = [
  // Main building
  { name: "House",          kind: "house",  rect: [30,  260, 580, 430] },
  { name: "Kitchen",        kind: "room",   parent: "House", rect: [42,  290, 170, 130] },
  { name: "Dining Room",    kind: "room",   parent: "House", rect: [220, 290, 150, 130] },
  { name: "Living Room",    kind: "room",   parent: "House", rect: [378, 290, 220, 130] },
  { name: "Master Bedroom", kind: "room",   parent: "House", rect: [42,  430, 190, 140] },
  { name: "Guest Room",     kind: "room",   parent: "House", rect: [240, 430, 160, 140] },
  { name: "Home Office",    kind: "room",   parent: "House", rect: [408, 430, 190, 140] },
  { name: "Hallway",        kind: "room",   parent: "House", rect: [42,  580, 160, 100] },
  { name: "Bathroom",       kind: "room",   parent: "House", rect: [210, 580, 140, 100] },
  { name: "Laundry Nook",   kind: "room",   parent: "House", rect: [358, 580, 130, 100] },
  { name: "Pantry",         kind: "room",   parent: "House", rect: [496, 580, 102, 100] },

  // Outdoor
  { name: "Garden",         kind: "garden", rect: [30,  40,  560, 190] },
  { name: "Patio",          kind: "area",   parent: "Garden", rect: [42,  70,  200, 120] },
  { name: "Vegetable Patch",kind: "bed",    parent: "Garden", rect: [260, 70,  160, 120] },
  { name: "Flower Bed",     kind: "bed",    parent: "Garden", rect: [438, 70,  140, 120] },

  // Garage
  { name: "Garage",         kind: "garage", rect: [650, 260, 220, 280] },
  { name: "Workbench",      kind: "area",   parent: "Garage", rect: [662, 292, 196, 100] },
  { name: "Tool Wall",      kind: "area",   parent: "Garage", rect: [662, 400, 196, 60]  },
  { name: "Storage Loft",   kind: "area",   parent: "Garage", rect: [662, 468, 196, 60]  },

  // Detached
  { name: "Terrace",        kind: "area",   rect: [650, 40,  220, 190] },
  { name: "Shed",           kind: "shed",   rect: [910, 40,  200, 160] },
  { name: "Driveway",       kind: "drive",  rect: [910, 260, 200, 160] },
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
  { name: "Books & Media",    color: "#e5ddf6" },
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
  // ═══════════════════════════════════════════════════════════════════════
  //  KITCHEN
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Espresso Machine",
    place: "Kitchen",
    labels: ["Kitchen", "Appliances"],
    brand: "Breville",
    model: "Barista Express",
    serial: "BRV-BE-44821",
    price: "699.00",
    currency: "USD",
    boughtDaysAgo: 680,
    from: "Williams Sonoma",
    warrantyInDays: 18,
    pin: true,
    care: [
      { daysAgo: 120, name: "Descaled", cost: "8.00", description: "Used Breville descaling powder." },
      { daysAgo: 340, name: "Replaced portafilter gasket", cost: "5.50" },
    ],
    reminder: { inDays: 5, title: "Descale espresso machine", description: "Run the descaling cycle, then flush with clean water twice." },
  },
  {
    name: "Stand Mixer",
    place: "Kitchen",
    labels: ["Kitchen", "Appliances"],
    brand: "KitchenAid",
    model: "Artisan 5KSM175",
    price: "449.00",
    currency: "USD",
    boughtDaysAgo: 420,
    from: "Amazon",
    warrantyInDays: 310,
    pin: true,
  },
  {
    name: "Air Fryer",
    place: "Kitchen",
    labels: ["Kitchen", "Appliances", "Electronics"],
    brand: "Ninja",
    model: "AF400 Max XL",
    price: "159.99",
    currency: "USD",
    boughtDaysAgo: 200,
    warrantyInDays: 530,
  },
  {
    name: "Instant Pot",
    place: "Kitchen",
    labels: ["Kitchen", "Appliances"],
    brand: "Instant Pot",
    model: "Duo Plus 8 Qt",
    price: "129.95",
    currency: "USD",
    boughtDaysAgo: 900,
    warrantyInDays: -170,
    care: [{ daysAgo: 60, name: "Replaced sealing ring", cost: "12.00" }],
  },
  {
    name: "Refrigerator",
    place: "Kitchen",
    labels: ["Kitchen", "Appliances"],
    brand: "Samsung",
    model: "RF28T5001SR",
    serial: "SAM-RF-992104",
    price: "1499.00",
    currency: "USD",
    boughtDaysAgo: 1100,
    from: "Home Depot",
    warrantyInDays: -370,
    insured: true,
    pin: true,
    care: [
      { daysAgo: 30, name: "Cleaned condenser coils", description: "Vacuumed dust from rear coils." },
      { daysAgo: 200, name: "Replaced water filter", cost: "34.99" },
    ],
  },
  {
    name: "Dishwasher",
    place: "Kitchen",
    labels: ["Kitchen", "Appliances"],
    brand: "Bosch",
    model: "SHPM88Z75N",
    serial: "BSH-DW-118723",
    price: "1049.00",
    currency: "USD",
    boughtDaysAgo: 750,
    from: "Lowe's",
    warrantyInDays: -20,
    pin: true,
    care: [{ daysAgo: 90, name: "Cleaned filter and spray arms" }],
    reminder: { inDays: 14, title: "Run dishwasher cleaning cycle", description: "Use affresh tablet on empty hot cycle." },
  },
  {
    name: "Blender",
    place: "Kitchen",
    labels: ["Kitchen", "Appliances"],
    brand: "Vitamix",
    model: "E310",
    price: "349.95",
    currency: "USD",
    boughtDaysAgo: 560,
    warrantyInDays: 1900,
    notes: "7-year full warranty — keep the receipt in the safe.",
  },
  {
    name: "Knife Set",
    place: "Kitchen",
    labels: ["Kitchen"],
    brand: "Wüsthof",
    model: "Classic 8-Piece",
    price: "599.95",
    currency: "USD",
    boughtDaysAgo: 400,
    from: "Sur La Table",
    lifetimeWarranty: true,
    pin: true,
    care: [{ daysAgo: 45, name: "Professional sharpening", cost: "25.00" }],
  },
  {
    name: "Cast Iron Skillet",
    place: "Kitchen",
    labels: ["Kitchen"],
    brand: "Lodge",
    model: "12-Inch",
    price: "29.90",
    currency: "USD",
    boughtDaysAgo: 1800,
    lifetimeWarranty: true,
    care: [{ daysAgo: 180, name: "Re-seasoned" }],
  },
  {
    name: "Microwave",
    place: "Kitchen",
    labels: ["Kitchen", "Appliances"],
    brand: "Panasonic",
    model: "NN-SN966S",
    price: "229.95",
    currency: "USD",
    boughtDaysAgo: 650,
    warrantyInDays: 80,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  PANTRY
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Food Storage Containers",
    place: "Pantry",
    labels: ["Kitchen"],
    quantity: 24,
    brand: "OXO",
    model: "Good Grips POP",
    price: "89.99",
    currency: "USD",
    boughtDaysAgo: 300,
  },
  {
    name: "Spice Rack",
    place: "Pantry",
    labels: ["Kitchen"],
    brand: "SimpleHouseware",
    quantity: 1,
    price: "18.99",
    currency: "USD",
    boughtDaysAgo: 300,
    notes: "Wall-mounted, holds 30 jars.",
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DINING ROOM
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Dining Table",
    place: "Dining Room",
    labels: ["Furniture"],
    brand: "Article",
    model: "Seno Oak 72\"",
    price: "1199.00",
    currency: "USD",
    boughtDaysAgo: 950,
    from: "Article",
    pin: true,
    care: [{ daysAgo: 60, name: "Oiled tabletop", cost: "12.00", description: "Used Watco Danish Oil, light walnut." }],
  },
  {
    name: "Dining Chairs",
    place: "Dining Room",
    labels: ["Furniture"],
    quantity: 6,
    brand: "Article",
    model: "Sede Black",
    price: "999.00",
    currency: "USD",
    boughtDaysAgo: 950,
  },
  {
    name: "Chandelier",
    place: "Dining Room",
    labels: ["Electronics", "Furniture"],
    brand: "West Elm",
    model: "Mobile Chandelier",
    price: "399.00",
    currency: "USD",
    boughtDaysAgo: 900,
    pin: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  LIVING ROOM
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "OLED TV 65\"",
    place: "Living Room",
    labels: ["Electronics", "Entertainment", "Valuable"],
    brand: "LG",
    model: "OLED65C3PUA",
    serial: "LG-C3-6501293",
    price: "1799.00",
    currency: "USD",
    boughtDaysAgo: 290,
    from: "Best Buy",
    warrantyInDays: 440,
    insured: true,
    pin: true,
  },
  {
    name: "Soundbar",
    place: "Living Room",
    labels: ["Electronics", "Entertainment"],
    brand: "Sonos",
    model: "Arc",
    serial: "SONOS-ARC-78214",
    price: "899.00",
    currency: "USD",
    boughtDaysAgo: 290,
    from: "Best Buy",
    warrantyInDays: 440,
    pin: true,
  },
  {
    name: "Subwoofer",
    place: "Living Room",
    labels: ["Electronics", "Entertainment"],
    brand: "Sonos",
    model: "Sub Gen 3",
    price: "799.00",
    currency: "USD",
    boughtDaysAgo: 290,
    warrantyInDays: 440,
  },
  {
    name: "PlayStation 5",
    place: "Living Room",
    labels: ["Electronics", "Entertainment"],
    brand: "Sony",
    model: "PS5 Disc Edition",
    serial: "PS5-CFI-1215A-Q7432",
    price: "499.99",
    currency: "USD",
    boughtDaysAgo: 600,
    warrantyInDays: -235,
    pin: true,
    notes: "Extra DualSense controller in the drawer below.",
  },
  {
    name: "Turntable",
    place: "Living Room",
    labels: ["Electronics", "Entertainment"],
    brand: "Audio-Technica",
    model: "AT-LP120XUSB",
    price: "249.00",
    currency: "USD",
    boughtDaysAgo: 450,
    warrantyInDays: 280,
    pin: true,
  },
  {
    name: "Bookshelf Speakers",
    place: "Living Room",
    labels: ["Electronics", "Entertainment"],
    brand: "KEF",
    model: "LS50 Meta",
    price: "1499.00",
    currency: "USD",
    boughtDaysAgo: 450,
    warrantyInDays: 1370,
    insured: true,
    pin: true,
  },
  {
    name: "Vinyl Record Collection",
    place: "Living Room",
    labels: ["Entertainment", "Books & Media"],
    quantity: 85,
    description: "Jazz, classic rock, and Tamil film scores. Stored in the Kallax shelf.",
    price: "1200.00",
    currency: "USD",
    notes: "Insured as part of the contents policy, not individually.",
  },
  {
    name: "Robot Vacuum",
    place: "Living Room",
    labels: ["Electronics", "Cleaning"],
    brand: "Roborock",
    model: "S8 Pro Ultra",
    serial: "RR-S8P-440821",
    price: "1599.99",
    currency: "USD",
    boughtDaysAgo: 180,
    from: "Amazon",
    warrantyInDays: 550,
    pin: true,
    care: [
      { daysAgo: 30, name: "Cleaned HEPA filter" },
      { daysAgo: 90, name: "Replaced side brush", cost: "9.99" },
    ],
  },
  {
    name: "Sofa",
    place: "Living Room",
    labels: ["Furniture"],
    brand: "IKEA",
    model: "Söderhamn 3-Seat",
    price: "799.00",
    currency: "USD",
    boughtDaysAgo: 1100,
    from: "IKEA",
    pin: true,
    care: [{ daysAgo: 150, name: "Deep cleaned upholstery", cost: "45.00" }],
  },
  {
    name: "Coffee Table",
    place: "Living Room",
    labels: ["Furniture"],
    brand: "West Elm",
    model: "Mid-Century Pop-Up",
    price: "599.00",
    currency: "USD",
    boughtDaysAgo: 800,
  },
  {
    name: "Board Games Collection",
    place: "Living Room",
    labels: ["Entertainment"],
    quantity: 12,
    description: "Catan, Ticket to Ride, Azul, Pandemic, Wingspan, Codenames, and more.",
    price: "350.00",
    currency: "USD",
  },
  {
    name: "Smart Speaker",
    place: "Living Room",
    labels: ["Electronics"],
    brand: "Apple",
    model: "HomePod mini",
    price: "99.00",
    currency: "USD",
    boughtDaysAgo: 400,
    warrantyInDays: -35,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  MASTER BEDROOM
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Mattress",
    place: "Master Bedroom",
    labels: ["Furniture"],
    brand: "Casper",
    model: "Wave Hybrid Snow",
    price: "2695.00",
    currency: "USD",
    boughtDaysAgo: 600,
    from: "Casper.com",
    warrantyInDays: 3050,
    insured: false,
    pin: true,
    notes: "10-year warranty. Rotate 180° every 3 months.",
    reminder: { inDays: 20, title: "Rotate mattress", description: "Turn 180° head-to-foot." },
  },
  {
    name: "Bed Frame",
    place: "Master Bedroom",
    labels: ["Furniture"],
    brand: "Article",
    model: "Nora Walnut King",
    price: "899.00",
    currency: "USD",
    boughtDaysAgo: 600,
    pin: true,
  },
  {
    name: "Dresser",
    place: "Master Bedroom",
    labels: ["Furniture"],
    brand: "West Elm",
    model: "Mid-Century 6-Drawer",
    price: "1099.00",
    currency: "USD",
    boughtDaysAgo: 600,
    pin: true,
  },
  {
    name: "Apple Watch",
    place: "Master Bedroom",
    labels: ["Electronics", "Valuable"],
    brand: "Apple",
    model: "Watch Ultra 2",
    serial: "APL-WU2-FN82K1",
    price: "799.00",
    currency: "USD",
    boughtDaysAgo: 120,
    from: "Apple Store",
    warrantyInDays: 610,
    insured: true,
  },
  {
    name: "Dyson Purifier",
    place: "Master Bedroom",
    labels: ["Electronics", "Appliances"],
    brand: "Dyson",
    model: "Purifier Hot+Cool HP07",
    serial: "DYS-HP07-22918",
    price: "569.99",
    currency: "USD",
    boughtDaysAgo: 350,
    warrantyInDays: 380,
    pin: true,
    care: [{ daysAgo: 120, name: "Replaced HEPA filter", cost: "69.99" }],
  },
  {
    name: "Bedside Lamp",
    place: "Master Bedroom",
    labels: ["Electronics", "Furniture"],
    quantity: 2,
    brand: "Philips Hue",
    model: "Go Portable",
    price: "159.98",
    currency: "USD",
    boughtDaysAgo: 500,
    warrantyInDays: 230,
  },
  {
    name: "Humidifier",
    place: "Master Bedroom",
    labels: ["Appliances"],
    brand: "Levoit",
    model: "LV600S",
    price: "69.99",
    currency: "USD",
    boughtDaysAgo: 150,
    warrantyInDays: 580,
    care: [{ daysAgo: 14, name: "Cleaned tank and base" }],
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  GUEST ROOM
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Sofa Bed",
    place: "Guest Room",
    labels: ["Furniture"],
    brand: "IKEA",
    model: "Friheten",
    price: "599.00",
    currency: "USD",
    boughtDaysAgo: 800,
    pin: true,
  },
  {
    name: "Portable AC",
    place: "Guest Room",
    labels: ["Electronics", "Appliances"],
    brand: "Dyson",
    model: "Pure Cool TP07",
    price: "549.99",
    currency: "USD",
    boughtDaysAgo: 400,
    warrantyInDays: 330,
    pin: true,
  },
  {
    name: "Towel Warmer",
    place: "Guest Room",
    labels: ["Appliances"],
    brand: "Brookstone",
    model: "Towel Warmer Bucket",
    price: "99.99",
    currency: "USD",
    boughtDaysAgo: 200,
    warrantyInDays: 530,
  },
  {
    name: "Telescope",
    place: "Guest Room",
    labels: ["Electronics", "Entertainment"],
    brand: "Celestron",
    model: "NexStar 6SE",
    serial: "CEL-6SE-193482",
    price: "999.00",
    currency: "USD",
    boughtDaysAgo: 365,
    from: "B&H Photo",
    warrantyInDays: 365,
    insured: true,
    notes: "Stored in guest room closet. Take to terrace for use.",
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  HOME OFFICE
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "MacBook Pro 16\"",
    place: "Home Office",
    labels: ["Electronics", "Office", "Valuable"],
    brand: "Apple",
    model: "MacBook Pro M3 Max",
    serial: "C02ZK7LMHV29",
    price: "3499.00",
    currency: "USD",
    boughtDaysAgo: 180,
    from: "Apple Store",
    warrantyInDays: 550,
    insured: true,
    pin: true,
  },
  {
    name: "Studio Display",
    place: "Home Office",
    labels: ["Electronics", "Office"],
    brand: "Apple",
    model: "Studio Display 27\" 5K",
    serial: "APL-SD-MK0U3LL",
    price: "1599.00",
    currency: "USD",
    boughtDaysAgo: 350,
    from: "Apple Store",
    warrantyInDays: 380,
    pin: true,
  },
  {
    name: "Mechanical Keyboard",
    place: "Home Office",
    labels: ["Electronics", "Office"],
    brand: "Keychron",
    model: "Q1 Pro",
    price: "199.00",
    currency: "USD",
    boughtDaysAgo: 200,
    warrantyInDays: 530,
  },
  {
    name: "Mouse",
    place: "Home Office",
    labels: ["Electronics", "Office"],
    brand: "Logitech",
    model: "MX Master 3S",
    price: "99.99",
    currency: "USD",
    boughtDaysAgo: 200,
    warrantyInDays: 530,
  },
  {
    name: "Standing Desk",
    place: "Home Office",
    labels: ["Furniture", "Office"],
    brand: "Uplift",
    model: "V2 72\" Walnut",
    price: "899.00",
    currency: "USD",
    boughtDaysAgo: 700,
    warrantyInDays: 2850,
    pin: true,
    notes: "15-year frame warranty, 5-year electronics.",
  },
  {
    name: "Office Chair",
    place: "Home Office",
    labels: ["Furniture", "Office"],
    brand: "Herman Miller",
    model: "Aeron Remastered Size B",
    serial: "HM-AER-52891P",
    price: "1395.00",
    currency: "USD",
    boughtDaysAgo: 700,
    from: "Design Within Reach",
    warrantyInDays: 3650,
    insured: true,
    pin: true,
    notes: "12-year warranty. Lumbar pad set to position 3.",
  },
  {
    name: "Desk Lamp",
    place: "Home Office",
    labels: ["Electronics", "Office"],
    brand: "BenQ",
    model: "ScreenBar Halo",
    price: "179.00",
    currency: "USD",
    boughtDaysAgo: 200,
    warrantyInDays: 530,
  },
  {
    name: "External SSD",
    place: "Home Office",
    labels: ["Electronics", "Office"],
    brand: "Samsung",
    model: "T7 Shield 2TB",
    serial: "SAM-T7S-2TB-992K",
    price: "159.99",
    currency: "USD",
    boughtDaysAgo: 260,
    warrantyInDays: 470,
    notes: "Monthly Time Machine backup of the MacBook.",
    reminder: { inDays: 3, title: "Run Time Machine backup", description: "Plug in the Samsung SSD and let it finish." },
  },
  {
    name: "Webcam",
    place: "Home Office",
    labels: ["Electronics", "Office"],
    brand: "Elgato",
    model: "Facecam Pro",
    price: "299.99",
    currency: "USD",
    boughtDaysAgo: 180,
    warrantyInDays: 550,
  },
  {
    name: "Headphones",
    place: "Home Office",
    labels: ["Electronics", "Office"],
    brand: "Sony",
    model: "WH-1000XM5",
    serial: "SNY-XM5-440129",
    price: "349.99",
    currency: "USD",
    boughtDaysAgo: 300,
    warrantyInDays: 430,
  },
  {
    name: "Fireproof Safe",
    place: "Home Office",
    labels: ["Valuable", "Safety"],
    brand: "SentrySafe",
    model: "SFW123GDC",
    price: "189.99",
    currency: "USD",
    boughtDaysAgo: 1200,
    lifetimeWarranty: true,
    pin: true,
    notes: "Combination: last four digits of our old landline. Key taped under the desk left drawer.",
  },
  {
    name: "Passports",
    place: "Home Office",
    labels: ["Valuable"],
    quantity: 2,
    parent: "Fireproof Safe",
    description: "Both passports in the blue document folder.",
  },
  {
    name: "Birth Certificates",
    place: "Home Office",
    labels: ["Valuable"],
    quantity: 2,
    parent: "Fireproof Safe",
    description: "In the red folder, along with marriage certificate.",
  },
  {
    name: "Document Scanner",
    place: "Home Office",
    labels: ["Electronics", "Office"],
    brand: "Fujitsu",
    model: "ScanSnap iX1600",
    price: "419.99",
    currency: "USD",
    boughtDaysAgo: 500,
    warrantyInDays: 230,
  },
  {
    name: "UPS Battery Backup",
    place: "Home Office",
    labels: ["Electronics", "Office"],
    brand: "APC",
    model: "Back-UPS Pro 1500VA",
    serial: "APC-BR1500-87321",
    price: "249.99",
    currency: "USD",
    boughtDaysAgo: 500,
    warrantyInDays: 230,
    care: [{ daysAgo: 10, name: "Battery self-test passed" }],
    reminder: { inDays: 60, title: "Replace UPS battery", description: "Battery is 18 months old. Order APC RBC124 replacement." },
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  HALLWAY
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Smoke Detectors",
    place: "Hallway",
    labels: ["Safety"],
    quantity: 5,
    brand: "Google Nest",
    model: "Protect (Wired)",
    price: "595.00",
    currency: "USD",
    boughtDaysAgo: 800,
    warrantyInDays: -70,
    reminder: { inDays: 7, title: "Test smoke detectors", description: "Press the test button on all five. Replace batteries if the chirp is weak." },
  },
  {
    name: "CO Detector",
    place: "Hallway",
    labels: ["Safety"],
    quantity: 2,
    brand: "Kidde",
    model: "Nighthawk",
    price: "59.98",
    currency: "USD",
    boughtDaysAgo: 600,
    warrantyInDays: 1230,
  },
  {
    name: "Coat Rack",
    place: "Hallway",
    labels: ["Furniture"],
    brand: "Umbra",
    model: "Flapper",
    price: "60.00",
    currency: "USD",
    boughtDaysAgo: 900,
  },
  {
    name: "Security Camera",
    place: "Hallway",
    labels: ["Electronics", "Safety"],
    brand: "Ring",
    model: "Indoor Cam 2nd Gen",
    quantity: 2,
    price: "119.98",
    currency: "USD",
    boughtDaysAgo: 260,
    warrantyInDays: 470,
    pin: true,
  },
  {
    name: "Smart Lock",
    place: "Hallway",
    labels: ["Electronics", "Safety"],
    brand: "August",
    model: "Wi-Fi Smart Lock 4th Gen",
    price: "229.99",
    currency: "USD",
    boughtDaysAgo: 400,
    warrantyInDays: 330,
    pin: true,
    notes: "Master code shared with Dora. Guest codes rotate monthly.",
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  BATHROOM
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Electric Toothbrush",
    place: "Bathroom",
    labels: ["Electronics"],
    quantity: 2,
    brand: "Oral-B",
    model: "iO Series 9",
    price: "399.98",
    currency: "USD",
    boughtDaysAgo: 200,
    warrantyInDays: 530,
    care: [{ daysAgo: 45, name: "Replaced brush heads (both)", cost: "24.99" }],
  },
  {
    name: "Bathroom Scale",
    place: "Bathroom",
    labels: ["Electronics"],
    brand: "Withings",
    model: "Body+",
    price: "99.95",
    currency: "USD",
    boughtDaysAgo: 500,
    warrantyInDays: 230,
  },
  {
    name: "First Aid Kit",
    place: "Bathroom",
    labels: ["Safety"],
    brand: "Johnson & Johnson",
    model: "All-Purpose Kit",
    price: "19.99",
    currency: "USD",
    boughtDaysAgo: 365,
    notes: "Check expiration dates every 6 months.",
    reminder: { inDays: 30, title: "Restock first aid kit", description: "Check for expired items and restock bandages, antiseptic, and painkillers." },
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  LAUNDRY NOOK
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Washing Machine",
    place: "Laundry Nook",
    labels: ["Appliances"],
    brand: "LG",
    model: "WM4000HWA",
    serial: "LG-WM-5577821",
    price: "899.00",
    currency: "USD",
    boughtDaysAgo: 800,
    from: "Home Depot",
    warrantyInDays: -70,
    pin: true,
    care: [
      { daysAgo: 60, name: "Cleaned door gasket", description: "Wiped mildew from rubber seal." },
      { daysAgo: 180, name: "Ran tub clean cycle" },
    ],
    reminder: { inDays: 10, title: "Run washing machine tub clean", description: "Use Affresh or a cup of white vinegar on the hottest cycle, empty." },
  },
  {
    name: "Dryer",
    place: "Laundry Nook",
    labels: ["Appliances"],
    brand: "LG",
    model: "DLEX4000W",
    serial: "LG-DX-5577832",
    price: "799.00",
    currency: "USD",
    boughtDaysAgo: 800,
    from: "Home Depot",
    warrantyInDays: -70,
    pin: true,
    care: [{ daysAgo: 120, name: "Cleaned lint vent duct", cost: "0.00", description: "Vacuumed the full vent run to the exterior wall." }],
  },
  {
    name: "Iron",
    place: "Laundry Nook",
    labels: ["Appliances"],
    brand: "Rowenta",
    model: "DW5080",
    price: "79.99",
    currency: "USD",
    boughtDaysAgo: 500,
    warrantyInDays: 230,
  },
  {
    name: "Dyson V15 Detect",
    place: "Laundry Nook",
    labels: ["Electronics", "Cleaning"],
    brand: "Dyson",
    model: "V15 Detect Absolute",
    serial: "DYS-V15-88120",
    price: "749.99",
    currency: "USD",
    boughtDaysAgo: 300,
    warrantyInDays: 430,
    pin: true,
    care: [{ daysAgo: 30, name: "Washed filter", description: "Cold water rinse, air-dried 24 hours." }],
  },
  {
    name: "Steam Mop",
    place: "Laundry Nook",
    labels: ["Cleaning"],
    brand: "Bissell",
    model: "PowerFresh Slim",
    price: "79.99",
    currency: "USD",
    boughtDaysAgo: 400,
    warrantyInDays: 330,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  GARAGE
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Toolbox",
    place: "Workbench",
    labels: ["Tools"],
    brand: "Milwaukee",
    model: "PACKOUT 3-Piece",
    price: "229.97",
    currency: "USD",
    boughtDaysAgo: 1000,
    pin: true,
  },
  {
    name: "Cordless Drill",
    place: "Workbench",
    labels: ["Tools", "Electronics"],
    parent: "Toolbox",
    brand: "Milwaukee",
    model: "M18 FUEL",
    serial: "MIL-M18-39201",
    price: "199.00",
    currency: "USD",
    boughtDaysAgo: 500,
    warrantyInDays: 1330,
    care: [{ daysAgo: 90, name: "Replaced bit set", cost: "34.99" }],
  },
  {
    name: "Impact Driver",
    place: "Workbench",
    labels: ["Tools", "Electronics"],
    parent: "Toolbox",
    brand: "Milwaukee",
    model: "M18 FUEL Impact",
    price: "179.00",
    currency: "USD",
    boughtDaysAgo: 500,
    warrantyInDays: 1330,
  },
  {
    name: "Circular Saw",
    place: "Workbench",
    labels: ["Tools"],
    brand: "DeWalt",
    model: "DWE575SB",
    serial: "DW-575-11982",
    price: "139.00",
    currency: "USD",
    boughtDaysAgo: 800,
    warrantyInDays: 26,
    pin: true,
    care: [{ daysAgo: 180, name: "Replaced blade", cost: "22.00" }],
  },
  {
    name: "Screwdriver Set",
    place: "Tool Wall",
    labels: ["Tools"],
    brand: "Wiha",
    model: "Precision 26-Piece",
    price: "59.99",
    currency: "USD",
    boughtDaysAgo: 600,
    lifetimeWarranty: true,
    pin: true,
  },
  {
    name: "Socket Set",
    place: "Tool Wall",
    labels: ["Tools"],
    brand: "Craftsman",
    model: "256-Piece Mechanics Set",
    price: "199.00",
    currency: "USD",
    boughtDaysAgo: 1200,
    lifetimeWarranty: true,
    pin: true,
  },
  {
    name: "Work Light",
    place: "Workbench",
    labels: ["Tools", "Electronics"],
    brand: "Milwaukee",
    model: "M18 RADIUS LED",
    price: "149.00",
    currency: "USD",
    boughtDaysAgo: 400,
    warrantyInDays: 1430,
  },
  {
    name: "Bicycle",
    place: "Garage",
    labels: ["Sports & Fitness", "Outdoor"],
    brand: "Trek",
    model: "FX 3 Disc",
    serial: "TRK-FX3-992017",
    price: "999.99",
    currency: "USD",
    boughtDaysAgo: 500,
    insured: true,
    pin: true,
    care: [
      { daysAgo: 60, name: "Tuned gears and brakes", cost: "65.00" },
      { daysAgo: 200, name: "Replaced chain and cassette", cost: "85.00" },
    ],
    reminder: { inDays: 45, title: "Bike annual service", description: "Book with the local shop before spring." },
  },
  {
    name: "E-Bike",
    place: "Garage",
    labels: ["Sports & Fitness", "Outdoor", "Valuable", "Electronics"],
    brand: "VanMoof",
    model: "S5",
    serial: "VM-S5-ASY-77142",
    price: "2998.00",
    currency: "EUR",
    boughtDaysAgo: 320,
    from: "VanMoof Berlin",
    warrantyInDays: 410,
    insured: true,
    pin: true,
    care: [{ daysAgo: 100, name: "Firmware update and brake adjustment" }],
  },
  {
    name: "Car Roof Box",
    place: "Storage Loft",
    labels: ["Outdoor", "Seasonal"],
    brand: "Thule",
    model: "Motion XT XL",
    price: "649.95",
    currency: "USD",
    boughtDaysAgo: 600,
    warrantyInDays: 1230,
  },
  {
    name: "Jumper Cables",
    place: "Garage",
    labels: ["Tools"],
    brand: "Energizer",
    model: "1-Gauge 25ft",
    price: "54.99",
    currency: "USD",
    boughtDaysAgo: 900,
  },
  {
    name: "Extension Cord Reel",
    place: "Garage",
    labels: ["Tools"],
    brand: "Link2Home",
    model: "50ft Retractable",
    price: "89.99",
    currency: "USD",
    boughtDaysAgo: 700,
  },
  {
    name: "Winter Tyres",
    place: "Storage Loft",
    labels: ["Seasonal"],
    quantity: 4,
    brand: "Michelin",
    model: "X-Ice Snow",
    price: "840.00",
    currency: "USD",
    boughtDaysAgo: 380,
    reminder: { inDays: -2, title: "Check winter tyre tread depth", description: "Overdue — measure before the swap." },
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  GARDEN & PATIO
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Lawn Mower",
    place: "Shed",
    labels: ["Outdoor", "Tools"],
    brand: "Honda",
    model: "HRX217VKA",
    serial: "HND-HRX-881231",
    price: "849.00",
    currency: "USD",
    boughtDaysAgo: 600,
    warrantyInDays: 1230,
    pin: true,
    care: [
      { daysAgo: 120, name: "Oil change" },
      { daysAgo: 120, name: "Sharpened blade", cost: "15.00" },
      { daysAgo: 365, name: "Full seasonal service", cost: "120.00", description: "Oil, filter, spark plug, blade." },
    ],
    reminder: { inDays: 2, title: "Mow the lawn", description: "Front and back. Bag the clippings for compost." },
  },
  {
    name: "Pressure Washer",
    place: "Shed",
    labels: ["Outdoor", "Tools"],
    brand: "Kärcher",
    model: "K5 Premium",
    price: "379.00",
    currency: "USD",
    boughtDaysAgo: 500,
    warrantyInDays: 230,
    pin: true,
  },
  {
    name: "Hedge Trimmer",
    place: "Shed",
    labels: ["Outdoor", "Tools"],
    brand: "Stihl",
    model: "HSA 56",
    price: "219.00",
    currency: "USD",
    boughtDaysAgo: 400,
    warrantyInDays: 330,
    pin: true,
    care: [{ daysAgo: 200, name: "Sharpened blades", cost: "20.00" }],
  },
  {
    name: "Wheelbarrow",
    place: "Shed",
    labels: ["Outdoor", "Tools"],
    brand: "Jackson",
    model: "6 Cu Ft Steel",
    price: "109.00",
    currency: "USD",
    boughtDaysAgo: 1500,
    lifetimeWarranty: true,
    pin: true,
  },
  {
    name: "BBQ Grill",
    place: "Patio",
    labels: ["Outdoor", "Appliances"],
    brand: "Weber",
    model: "Spirit II E-310",
    serial: "WBR-SPR2-44182",
    price: "499.00",
    currency: "USD",
    boughtDaysAgo: 450,
    from: "Home Depot",
    warrantyInDays: 3200,
    pin: true,
    care: [
      { daysAgo: 30, name: "Deep cleaned grates and burners" },
      { daysAgo: 200, name: "Replaced grease tray", cost: "12.99" },
    ],
  },
  {
    name: "Patio Furniture Set",
    place: "Patio",
    labels: ["Outdoor", "Furniture"],
    brand: "Outer",
    model: "Aluminum 5-Piece Dining",
    price: "2999.00",
    currency: "USD",
    boughtDaysAgo: 400,
    warrantyInDays: 3230,
    pin: true,
    notes: "Store cushions in the shed over winter.",
    reminder: { inDays: 35, title: "Store patio cushions for winter", description: "Clean and move to shed before the first frost." },
  },
  {
    name: "String Lights",
    place: "Patio",
    labels: ["Outdoor", "Seasonal"],
    brand: "Brightech",
    model: "Ambience Pro 48ft",
    price: "49.99",
    currency: "USD",
    boughtDaysAgo: 400,
    pin: true,
  },
  {
    name: "Garden Hose & Reel",
    place: "Garden",
    labels: ["Outdoor", "Tools"],
    brand: "Gardena",
    model: "100ft Wall-Mounted Reel",
    price: "79.99",
    currency: "USD",
    boughtDaysAgo: 600,
  },
  {
    name: "Compost Bin",
    place: "Vegetable Patch",
    labels: ["Outdoor"],
    brand: "FCMP",
    model: "IM4000 Dual Tumbler",
    price: "109.99",
    currency: "USD",
    boughtDaysAgo: 500,
    pin: true,
  },
  {
    name: "Raised Garden Beds",
    place: "Vegetable Patch",
    labels: ["Outdoor"],
    quantity: 3,
    brand: "Birdies",
    model: "6-in-1 Modular",
    price: "450.00",
    currency: "USD",
    boughtDaysAgo: 400,
    pin: true,
    notes: "Tomatoes in bed 1, herbs in bed 2, peppers in bed 3.",
  },
  {
    name: "Patio Heater",
    place: "Patio",
    labels: ["Outdoor", "Seasonal", "Appliances"],
    brand: "Fire Sense",
    model: "Commercial Propane",
    price: "219.99",
    currency: "USD",
    boughtDaysAgo: 350,
    warrantyInDays: 380,
    pin: true,
    reminder: { inDays: 40, title: "Refill propane tank", description: "Last refill was 2 months ago — check gauge." },
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  TERRACE
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Outdoor Dining Set",
    place: "Terrace",
    labels: ["Outdoor", "Furniture"],
    brand: "CB2",
    model: "Artemis 4-Person",
    price: "1299.00",
    currency: "USD",
    boughtDaysAgo: 350,
    pin: true,
  },
  {
    name: "Outdoor Rug",
    place: "Terrace",
    labels: ["Outdoor"],
    brand: "Safavieh",
    model: "Courtyard 8x10",
    price: "159.99",
    currency: "USD",
    boughtDaysAgo: 350,
  },
  {
    name: "Hammock",
    place: "Terrace",
    labels: ["Outdoor", "Furniture"],
    brand: "Yellow Leaf",
    model: "Signature Double",
    price: "199.00",
    currency: "USD",
    boughtDaysAgo: 250,
    pin: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  SPORTS & SEASONAL (Storage Loft / Shed / various)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Camping Tent",
    place: "Storage Loft",
    labels: ["Outdoor", "Seasonal", "Sports & Fitness"],
    brand: "MSR",
    model: "Hubba Hubba NX 2",
    price: "449.95",
    currency: "USD",
    boughtDaysAgo: 700,
    lifetimeWarranty: true,
  },
  {
    name: "Sleeping Bags",
    place: "Storage Loft",
    labels: ["Outdoor", "Seasonal"],
    quantity: 2,
    brand: "REI Co-op",
    model: "Magma 15",
    price: "599.90",
    currency: "USD",
    boughtDaysAgo: 700,
    lifetimeWarranty: true,
  },
  {
    name: "Camping Stove",
    place: "Storage Loft",
    labels: ["Outdoor", "Seasonal"],
    brand: "Jetboil",
    model: "Flash",
    price: "114.95",
    currency: "USD",
    boughtDaysAgo: 700,
  },
  {
    name: "Suitcase Set",
    place: "Storage Loft",
    labels: ["Seasonal"],
    quantity: 3,
    brand: "Away",
    model: "Carry-On + Medium + Large",
    price: "845.00",
    currency: "USD",
    boughtDaysAgo: 500,
    lifetimeWarranty: true,
    notes: "Black carry-on, green medium (Dora's), navy large.",
  },
  {
    name: "Christmas Decorations",
    place: "Storage Loft",
    labels: ["Seasonal"],
    quantity: 4,
    description: "4 boxes: tree ornaments, lights, wreath, outdoor inflatables.",
    price: "300.00",
    currency: "USD",
    boughtDaysAgo: 1000,
    reminder: { inDays: 50, title: "Set up Christmas decorations", description: "Get boxes down from the loft. Test lights before hanging." },
  },
  {
    name: "Yoga Mat",
    place: "Master Bedroom",
    labels: ["Sports & Fitness"],
    brand: "Manduka",
    model: "PRO 71\"",
    price: "120.00",
    currency: "USD",
    boughtDaysAgo: 300,
    lifetimeWarranty: true,
  },
  {
    name: "Dumbbells",
    place: "Garage",
    labels: ["Sports & Fitness"],
    brand: "Bowflex",
    model: "SelectTech 552",
    price: "429.00",
    currency: "USD",
    boughtDaysAgo: 600,
    warrantyInDays: 130,
    pin: true,
  },
  {
    name: "Resistance Bands Set",
    place: "Garage",
    labels: ["Sports & Fitness"],
    brand: "TheraBand",
    model: "CLX 5-Pack",
    price: "49.99",
    currency: "USD",
    boughtDaysAgo: 200,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  MISCELLANEOUS / HOBBY
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Kindle",
    place: "Living Room",
    labels: ["Electronics", "Books & Media"],
    brand: "Amazon",
    model: "Kindle Paperwhite 11th Gen",
    price: "139.99",
    currency: "USD",
    boughtDaysAgo: 250,
    warrantyInDays: 480,
  },
  {
    name: "Instant Camera",
    place: "Living Room",
    labels: ["Electronics", "Entertainment"],
    brand: "Fujifilm",
    model: "Instax Mini 12",
    price: "79.99",
    currency: "USD",
    boughtDaysAgo: 180,
    warrantyInDays: 550,
    notes: "Extra film packs in the dining room sideboard.",
  },
  {
    name: "Sewing Machine",
    place: "Guest Room",
    labels: ["Appliances"],
    brand: "Brother",
    model: "CS7000X",
    price: "249.99",
    currency: "USD",
    boughtDaysAgo: 400,
    warrantyInDays: 1430,
    notes: "Dora's. Extra bobbins and feet in the drawer underneath.",
  },
  {
    name: "Fire Extinguisher",
    place: "Kitchen",
    labels: ["Safety"],
    quantity: 3,
    brand: "Kidde",
    model: "FA110 Multipurpose",
    price: "59.97",
    currency: "USD",
    boughtDaysAgo: 800,
    notes: "One in the kitchen, one in the garage, one in the hallway.",
    reminder: { inDays: 60, title: "Inspect fire extinguishers", description: "Check pressure gauge on all three. Replace if the needle is in the red zone." },
  },
  {
    name: "Guitar",
    place: "Living Room",
    labels: ["Entertainment", "Valuable"],
    brand: "Taylor",
    model: "214ce",
    serial: "TAY-214-110932891",
    price: "1299.00",
    currency: "USD",
    boughtDaysAgo: 1500,
    from: "Guitar Center",
    insured: true,
    lifetimeWarranty: true,
    pin: true,
    care: [
      { daysAgo: 60, name: "New strings (Elixir Nanoweb)", cost: "14.99" },
      { daysAgo: 365, name: "Professional setup and fret polish", cost: "75.00" },
    ],
  },
  {
    name: "DSLR Camera",
    place: "Home Office",
    labels: ["Electronics", "Valuable"],
    brand: "Sony",
    model: "Alpha a7 IV",
    serial: "SNY-A7IV-8891032",
    price: "2498.00",
    currency: "USD",
    boughtDaysAgo: 400,
    from: "B&H Photo",
    warrantyInDays: 330,
    insured: true,
    pin: true,
    notes: "Body + 28-70mm kit lens. 50mm f/1.8 in the camera bag.",
  },
  {
    name: "Camera Bag",
    place: "Home Office",
    labels: ["Valuable"],
    brand: "Peak Design",
    model: "Everyday Backpack 30L",
    price: "289.95",
    currency: "USD",
    boughtDaysAgo: 400,
    lifetimeWarranty: true,
  },
  {
    name: "Tripod",
    place: "Home Office",
    labels: ["Electronics"],
    parent: "Camera Bag",
    brand: "Peak Design",
    model: "Travel Tripod Carbon",
    price: "599.95",
    currency: "USD",
    boughtDaysAgo: 350,
    lifetimeWarranty: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DRIVEWAY
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Outdoor Security Camera",
    place: "Driveway",
    labels: ["Electronics", "Safety"],
    brand: "Ring",
    model: "Floodlight Cam Pro",
    price: "249.99",
    currency: "USD",
    boughtDaysAgo: 260,
    warrantyInDays: 470,
    pin: true,
  },
  {
    name: "Snow Blower",
    place: "Shed",
    labels: ["Outdoor", "Tools", "Seasonal"],
    brand: "Toro",
    model: "Power Clear 721 E",
    price: "499.00",
    currency: "USD",
    boughtDaysAgo: 600,
    warrantyInDays: 130,
    pin: true,
    care: [{ daysAgo: 300, name: "Oil change and spark plug", cost: "18.00" }],
    reminder: { inDays: 25, title: "Winterize snow blower", description: "Check oil, add fuel stabilizer, run for 5 minutes to circulate." },
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  ARCHIVED (sold / given away)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "Old Laptop",
    place: "Home Office",
    labels: ["Electronics"],
    brand: "Apple",
    model: "MacBook Pro 13\" 2019",
    serial: "C02YK3LMQ6L4",
    price: "1799.00",
    currency: "USD",
    boughtDaysAgo: 1800,
    warrantyInDays: -1070,
    archived: true,
    notes: "Traded in for the M3 Max. Apple gave $350 credit.",
  },
  {
    name: "Old TV",
    place: "Living Room",
    labels: ["Electronics"],
    brand: "Samsung",
    model: "Q70T 55\"",
    price: "799.99",
    currency: "USD",
    boughtDaysAgo: 1400,
    warrantyInDays: -670,
    archived: true,
    notes: "Gave to Dora's parents when we upgraded to the LG OLED.",
  },
];

// ── Runner ───────────────────────────────────────────────────────────────

async function main() {
  const db = getDb();

  // Resolve user id
  const rows = await db.execute<{ id: string }>(
    sql`SELECT id FROM auth.users WHERE email = ${USER_EMAIL}`,
  );
  const userId = rows[0]?.id;
  if (!userId) throw new Error(`No auth user found for ${USER_EMAIL}`);
  console.log(`User: ${USER_EMAIL} → ${userId}`);

  // ── 1. Wipe ──
  await wipe(userId);

  // ── 2. Set home location (Chennai, India) ──
  await homeQueries.setHomeLocation(userId, {
    placeName: "Amsterdam, North Holland, Netherlands",
    latitude: 52.3676,
    longitude: 4.9041,
    timezone: "Europe/Amsterdam",
  });
  console.log("Home location set.");

  // ── 3. Places ──
  const placeIdByName = new Map<string, string>();
  const rectByPlace = new Map<string, [number, number, number, number]>();

  for (const p of PLACES) {
    rectByPlace.set(p.name, p.rect);
    const [x, y, w, h] = p.rect;
    const [created] = await locationQueries.createLocation(userId, {
      name: p.name,
      parentId: p.parent ? (placeIdByName.get(p.parent) ?? null) : null,
      planKind: p.kind,
      planX: x,
      planY: y,
      planW: w,
      planH: h,
    });
    if (!created) continue;
    placeIdByName.set(p.name, created.id);
  }
  console.log(`${placeIdByName.size} places created.`);

  // ── 4. Labels ──
  const labelIdByName = new Map<string, string>();
  for (const l of LABELS) {
    const [created] = await labelQueries.createLabel(userId, l);
    if (!created) continue;
    labelIdByName.set(l.name, created.id);
  }
  console.log(`${labelIdByName.size} labels created.`);

  // ── 5. Items + labels, care, reminders, activity ──
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

    const [created] = await itemQueries.createItem(userId, {
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

    // Archive after creation if needed
    if (item.archived) {
      await itemQueries.updateItem(userId, created.id, { archived: true });
    }

    await itemActivityQueries.recordItemActivity(userId, {
      itemName: created.name,
      action: "created",
      itemId: created.id,
    });

    const labelIds = (item.labels ?? []).flatMap((n) => labelIdByName.get(n) ?? []);
    if (labelIds.length > 0) await itemLabelQueries.setItemLabels(userId, created.id, labelIds);

    for (const entry of item.care ?? []) {
      await maintenanceQueries.createMaintenanceEntry(userId, {
        itemId: created.id,
        name: entry.name,
        date: dayKey(-entry.daysAgo),
        description: entry.description,
        cost: entry.cost,
      });
      careCreated++;
    }

    if (item.reminder) {
      await reminderQueries.createReminder(userId, {
        itemId: created.id,
        title: item.reminder.title,
        description: item.reminder.description,
        dueDate: dayKey(item.reminder.inDays),
        assignedToUserId: userId,
      });
      remindersCreated++;
    }
  }

  console.log(
    `Done: ${placeIdByName.size} places, ${labelIdByName.size} labels, ${itemsCreated} items, ` +
      `${careCreated} care entries, ${remindersCreated} reminders.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
