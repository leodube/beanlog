import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Vite, so it reads process.env directly.
// Inside the devcontainer that comes from --env-file (see devcontainer.json).
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
