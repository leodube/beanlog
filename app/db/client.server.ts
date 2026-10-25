import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/lib/env.server";
import * as schema from "./schema.server";

// In dev, Vite re-evaluates modules on every change. Caching the connection on
// globalThis stops each hot reload from opening a new pool until Postgres
// runs out of connections.
const globalForDb = globalThis as unknown as {
  beanlogSql?: ReturnType<typeof postgres>;
};

const sql = globalForDb.beanlogSql ?? postgres(env.DATABASE_URL, { max: 10 });

if (env.NODE_ENV !== "production") globalForDb.beanlogSql = sql;

// Must match drizzle.config.ts so queries use the same column names.
export const db = drizzle(sql, { schema, casing: "snake_case" });
