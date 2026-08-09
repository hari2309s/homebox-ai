import { sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import { getDb } from "./client";
import type * as schema from "./schema";

type Tx = PgTransaction<PostgresJsQueryResultHKT, typeof schema>;

/**
 * Runs `fn` inside a transaction scoped to `userId` so Postgres RLS policies
 * (keyed off `auth.uid()`) apply the same way they would for a request proxied
 * through Supabase's PostgREST. Needed because this package connects directly
 * to Postgres rather than through PostgREST, so `auth.uid()` has nothing to
 * read unless we set it ourselves via `request.jwt.claims` for the duration
 * of the transaction.
 */
export async function withRLS<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`,
    );
    await tx.execute(sql`set local role authenticated`);
    return fn(tx as unknown as Tx);
  });
}
