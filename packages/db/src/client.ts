import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;

export function getDb(connectionString?: string) {
  if (!client) {
    const connStr = connectionString ?? process.env.DATABASE_URL;
    if (!connStr) throw new Error("DATABASE_URL is not set");
    client = postgres(connStr, { prepare: false });
  }
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof getDb>;
