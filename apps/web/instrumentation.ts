// Next.js calls `register()` once per server instance, in every runtime
// (Node and Edge) — the OTel Node SDK only works in Node, so it's guarded
// and split into its own file per Next.js's own recommended pattern.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
