import type { MaintenanceContext } from "../src/graphs/maintenance-assistant";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  return daysFromToday(-days);
}

// Shapes matching what itemQueries.getItem() and
// maintenanceQueries.listMaintenanceForItem() return in production — the
// maintenance-assistant prompt just JSON.stringify()s them, so these only need
// to be "close enough" for the model to reason about.
export interface EvalInventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  purchaseDate: string | null;
  purchasePrice: string | null;
  warrantyExpires: string | null;
}

export interface EvalMaintenanceEntry {
  id: string;
  itemId: string;
  name: string;
  date: string;
  description: string | null;
  cost: string | null;
}

export interface MaintenanceFixture {
  item: EvalInventoryItem;
  history: EvalMaintenanceEntry[];
  context: MaintenanceContext;
}

// Dates computed relative to runtime "today" so warranty-detection evaluator
// expectations never drift out of sync — same approach as truffle's
// computeMonthProjection-based numeric checks.
export function buildMaintenanceFixtures(): Record<string, MaintenanceFixture> {
  const t = today();

  return {
    washingMachine: {
      item: {
        id: "eval-washing-machine",
        name: "Bosch Series 6 Washing Machine",
        description: "9kg front-loader, 1400rpm, purchased from MediaMarkt",
        quantity: 1,
        purchaseDate: daysAgo(700),
        purchasePrice: "649.00",
        warrantyExpires: daysFromToday(25),
      },
      history: [
        {
          id: "mh-wm-1",
          itemId: "eval-washing-machine",
          name: "Descaled drum",
          date: daysAgo(90),
          description: "Used citric acid descaler",
          cost: "4.99",
        },
      ],
      context: { today: t, place: "Utility room" },
    },

    lawnMower: {
      item: {
        id: "eval-lawn-mower",
        name: "Honda HRX 217 Lawn Mower",
        description: "Self-propelled petrol mower, 21-inch cut",
        quantity: 1,
        purchaseDate: daysAgo(1100),
        purchasePrice: "549.00",
        warrantyExpires: null,
      },
      history: [
        {
          id: "mh-lm-1",
          itemId: "eval-lawn-mower",
          name: "Oil change",
          date: daysAgo(180),
          description: "SAE 30 oil",
          cost: "12.99",
        },
        {
          id: "mh-lm-2",
          itemId: "eval-lawn-mower",
          name: "Blade sharpened",
          date: daysAgo(365),
          description: null,
          cost: "25.00",
        },
      ],
      context: { today: t, place: "Garden › Shed" },
    },

    hvacUnit: {
      item: {
        id: "eval-hvac",
        name: "Daikin Split AC Unit",
        description: "Inverter split-system air conditioner, 3.5kW cooling",
        quantity: 1,
        purchaseDate: daysAgo(500),
        purchasePrice: "1299.00",
        warrantyExpires: daysFromToday(400),
      },
      history: [
        {
          id: "mh-hvac-1",
          itemId: "eval-hvac",
          name: "Filter cleaned",
          date: daysAgo(180),
          description: "Rinsed and dried indoor unit filter",
          cost: null,
        },
      ],
      context: { today: t, place: "Living room" },
    },

    newBlender: {
      item: {
        id: "eval-blender",
        name: "Cuisinart Hurricane Pro Blender",
        description: "3.5 HP commercial-grade blender",
        quantity: 1,
        purchaseDate: daysAgo(14),
        purchasePrice: "199.99",
        warrantyExpires: null,
      },
      history: [],
      context: { today: t, place: "Kitchen" },
    },

    oldDrill: {
      item: {
        id: "eval-drill",
        name: "Makita 18V Cordless Drill",
        description: "Brushless motor, 2x 5.0Ah batteries, charger",
        quantity: 1,
        purchaseDate: daysAgo(900),
        purchasePrice: "189.00",
        warrantyExpires: daysAgo(90),
      },
      history: [
        {
          id: "mh-drill-1",
          itemId: "eval-drill",
          name: "Chuck cleaned",
          date: daysAgo(200),
          description: "Removed concrete dust from chuck",
          cost: null,
        },
      ],
      context: { today: t, place: "Garage › Workbench" },
    },

    gasGrill: {
      item: {
        id: "eval-grill",
        name: "Weber Spirit E-310 Gas Grill",
        description: "3-burner propane grill, porcelain-enamel lid",
        quantity: 1,
        purchaseDate: daysAgo(600),
        purchasePrice: "499.00",
        warrantyExpires: null,
      },
      history: [
        {
          id: "mh-grill-1",
          itemId: "eval-grill",
          name: "Deep clean",
          date: daysAgo(120),
          description: "Scraped grates, cleaned burner tubes, emptied grease trap",
          cost: null,
        },
      ],
      context: {
        today: t,
        place: "Garden › Patio",
        forecast:
          "Mon: 18°C, sunny. Tue: 14°C, rain expected. Wed: 12°C, overcast. Thu: 8°C, heavy rain and wind. Fri: 10°C, clearing up.",
      },
    },

    fridge: {
      item: {
        id: "eval-fridge",
        name: "Samsung Family Hub Refrigerator",
        description: "Side-by-side, 634L capacity, with touchscreen",
        quantity: 1,
        purchaseDate: daysAgo(710),
        purchasePrice: "2199.00",
        warrantyExpires: daysFromToday(15),
      },
      history: [],
      context: { today: t, place: "Kitchen" },
    },

    pressureWasher: {
      item: {
        id: "eval-pressure-washer",
        name: "Kärcher K5 Premium Pressure Washer",
        description: "Electric, 2100 PSI, with hose reel",
        quantity: 1,
        purchaseDate: daysAgo(400),
        purchasePrice: "379.00",
        warrantyExpires: null,
      },
      history: [
        {
          id: "mh-pw-1",
          itemId: "eval-pressure-washer",
          name: "Winterized",
          date: daysAgo(300),
          description: "Drained water, stored indoors",
          cost: null,
        },
      ],
      context: {
        today: t,
        place: "Garage",
        forecast:
          "Mon: 3°C, frost overnight. Tue: 1°C, freezing fog. Wed: 5°C, clear. Thu: 7°C, partly cloudy. Fri: 4°C, frost overnight.",
      },
    },

    smokeDetector: {
      item: {
        id: "eval-smoke-detector",
        name: "Nest Protect Smoke & CO Detector",
        description: "Battery-powered, split-spectrum sensor",
        quantity: 1,
        purchaseDate: daysAgo(330),
        purchasePrice: "119.00",
        warrantyExpires: null,
      },
      history: [
        {
          id: "mh-sd-1",
          itemId: "eval-smoke-detector",
          name: "Battery replaced",
          date: daysAgo(330),
          description: "Installed fresh AA lithium batteries",
          cost: "8.99",
        },
      ],
      context: { today: t, place: "Hallway" },
    },

    vacuum: {
      item: {
        id: "eval-vacuum",
        name: "Dyson V15 Detect Cordless Vacuum",
        description: "Laser dust detection, LCD screen, 60min runtime",
        quantity: 1,
        purchaseDate: daysAgo(680),
        purchasePrice: "749.00",
        warrantyExpires: daysFromToday(45),
      },
      history: [
        {
          id: "mh-vac-1",
          itemId: "eval-vacuum",
          name: "Filter washed",
          date: daysAgo(60),
          description: "Rinsed under cold water and air-dried 24h",
          cost: null,
        },
      ],
      context: { today: t, place: "Hallway closet" },
    },

    garageDoor: {
      item: {
        id: "eval-garage-door",
        name: "Chamberlain B6765T Garage Door Opener",
        description: "Belt-drive, 1.25 HP, with MyQ smart connectivity",
        quantity: 1,
        purchaseDate: daysAgo(1460),
        purchasePrice: "349.00",
        warrantyExpires: daysAgo(730),
      },
      history: [
        {
          id: "mh-gd-1",
          itemId: "eval-garage-door",
          name: "Lubricated chain",
          date: daysAgo(365),
          description: "White lithium grease on chain and rollers",
          cost: "9.99",
        },
      ],
      context: { today: t, place: "Garage" },
    },

    coffeeMachine: {
      item: {
        id: "eval-coffee-machine",
        name: "DeLonghi Magnifica S Coffee Machine",
        description: "Fully automatic espresso, built-in grinder, milk frother",
        quantity: 1,
        purchaseDate: daysAgo(200),
        purchasePrice: "449.00",
        warrantyExpires: daysFromToday(90),
      },
      history: [
        {
          id: "mh-cm-1",
          itemId: "eval-coffee-machine",
          name: "Descaled",
          date: daysAgo(90),
          description: "DeLonghi EcoDecalk solution",
          cost: "12.99",
        },
        {
          id: "mh-cm-2",
          itemId: "eval-coffee-machine",
          name: "Brew group cleaned",
          date: daysAgo(30),
          description: "Removed and rinsed under water",
          cost: null,
        },
      ],
      context: { today: t, place: "Kitchen" },
    },
  };
}
