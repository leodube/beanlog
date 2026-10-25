import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside the app, so it loads .env itself (variables already
// set in the environment win, as in app/lib/env.server.ts).
if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/db/schema.server.ts",
  out: "./drizzle",
  dbCredentials: { url },
  // TypeScript keys are camelCase; columns are snake_case (brewedAt → brewed_at).
  casing: "snake_case",
  strict: true,
  verbose: true,
});
