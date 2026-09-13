/**
 * Column counts for the item grid, keyed by the same viewport-width
 * breakpoints as its Tailwind classes (`grid-cols-2 sm:grid-cols-3
 * md:grid-cols-4 lg:grid-cols-5`, Tailwind's default sm/md/lg = 640/768/1024px).
 * This is the single source of truth for both the row-virtualizer's chunk
 * size and the row's own `grid-template-columns`, so the two can't drift
 * apart the way a duplicated set of breakpoints could.
 */
const GRID_BREAKPOINTS = [
  { minWidth: 1024, columns: 5 }, // lg
  { minWidth: 768, columns: 4 }, // md
  { minWidth: 640, columns: 3 }, // sm
  { minWidth: 0, columns: 2 }, // base
] as const;

export function columnsForWidth(width: number): number {
  return GRID_BREAKPOINTS.find((bp) => width >= bp.minWidth)!.columns;
}

/** Splits a flat list into rows of `columns` items each, for a row-virtualized grid. */
export function chunkIntoRows<T>(items: readonly T[], columns: number): T[][] {
  if (columns <= 0) return items.map((item) => [item]);
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return rows;
}
