/**
 * Runs `fn` over `items` with at most `concurrency` calls in flight at once.
 * Bulk imports (CSV/ZIP/receipt) otherwise create rows one at a time, paying
 * a full DB round-trip per row since each query function opens its own
 * transaction — bounded rather than a single unbounded `Promise.all` so an
 * import with hundreds of rows doesn't try to open hundreds of connections
 * at once against the pooled Postgres client.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index] as T, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
