export type EvalGraph = "maintenance";

export interface EvalItemInput {
  graph: EvalGraph;
  fixtureKey: string;
}

export interface EvalItemMetadata {
  expectedWarranty?: boolean;
  notes?: string;
}

export interface EvalItem {
  id: string;
  input: EvalItemInput;
  metadata: EvalItemMetadata;
}

// Maintenance assistant: does the model correctly flag warranty status, suggest
// sensible dates, and produce contextually relevant maintenance advice?
// Deterministic checks (warranty, date validity) plus an LLM judge (overall
// quality) — see evaluators.ts.
const MAINTENANCE_ITEMS: EvalItem[] = [
  {
    id: "maint-01",
    input: { graph: "maintenance", fixtureKey: "washingMachine" },
    metadata: { expectedWarranty: true, notes: "Warranty expires in 25 days — should flag." },
  },
  {
    id: "maint-02",
    input: { graph: "maintenance", fixtureKey: "lawnMower" },
    metadata: { expectedWarranty: false, notes: "No warranty — outdoor item, suggest seasonal maintenance." },
  },
  {
    id: "maint-03",
    input: { graph: "maintenance", fixtureKey: "hvacUnit" },
    metadata: { expectedWarranty: false, notes: "Warranty 400 days out (>60) — should not flag." },
  },
  {
    id: "maint-04",
    input: { graph: "maintenance", fixtureKey: "newBlender" },
    metadata: { expectedWarranty: false, notes: "Brand new, no warranty info, no history — baseline suggestions." },
  },
  {
    id: "maint-05",
    input: { graph: "maintenance", fixtureKey: "oldDrill" },
    metadata: { expectedWarranty: false, notes: "Warranty already expired — should not flag." },
  },
  {
    id: "maint-06",
    input: { graph: "maintenance", fixtureKey: "gasGrill" },
    metadata: { expectedWarranty: false, notes: "Outdoor item with weather forecast — should consider weather." },
  },
  {
    id: "maint-07",
    input: { graph: "maintenance", fixtureKey: "fridge" },
    metadata: { expectedWarranty: true, notes: "Warranty expires in 15 days — should flag." },
  },
  {
    id: "maint-08",
    input: { graph: "maintenance", fixtureKey: "pressureWasher" },
    metadata: { expectedWarranty: false, notes: "Frost forecast — should suggest winterizing." },
  },
  {
    id: "maint-09",
    input: { graph: "maintenance", fixtureKey: "smokeDetector" },
    metadata: { expectedWarranty: false, notes: "Battery replaced ~11 months ago — may suggest replacement." },
  },
  {
    id: "maint-10",
    input: { graph: "maintenance", fixtureKey: "vacuum" },
    metadata: { expectedWarranty: true, notes: "Warranty expires in 45 days — should flag." },
  },
  {
    id: "maint-11",
    input: { graph: "maintenance", fixtureKey: "garageDoor" },
    metadata: { expectedWarranty: false, notes: "Warranty long expired — suggest yearly service." },
  },
  {
    id: "maint-12",
    input: { graph: "maintenance", fixtureKey: "coffeeMachine" },
    metadata: {
      expectedWarranty: false,
      notes: "Warranty 90 days out (>60) — should not flag. Suggest descaling cycle.",
    },
  },
];

export const EVAL_DATASET_ITEMS: EvalItem[] = [...MAINTENANCE_ITEMS];
