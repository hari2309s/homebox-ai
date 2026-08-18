/**
 * Builds a name -> id resolver seeded from `existing`, creating a new row
 * (and remembering it) the first time a name isn't found. Both the CSV and
 * ZIP importers need this same "dedupe locations/labels by name, create on
 * miss" behavior, just with different underlying create calls.
 */
export function createNameResolver<T extends { id: string }>(
  existing: { id: string; name: string }[],
  create: (name: string) => Promise<T | undefined>,
) {
  const idByName = new Map(existing.map((item) => [item.name.toLowerCase(), item.id]));
  return async (name: string): Promise<{ id: string; created: boolean } | null> => {
    const key = name.toLowerCase();
    const existingId = idByName.get(key);
    if (existingId) return { id: existingId, created: false };

    const created = await create(name);
    if (!created) return null;
    idByName.set(key, created.id);
    return { id: created.id, created: true };
  };
}
