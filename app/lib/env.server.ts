import { existsSync } from "node:fs";
import { z } from "zod";

// Load .env when present (Coder workspaces don't get runArgs --env-file).
// Variables already in the environment win.
if (existsSync(".env")) process.loadEnvFile(".env");

// Validated once at startup. A missing or malformed variable fails loudly here
// instead of surfacing later as a confusing database or cookie error.
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  SESSION_SECRET: z
    .string()
    .min(
      32,
      "SESSION_SECRET must be at least 32 characters (openssl rand -base64 32)",
    ),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment:\n" + z.prettifyError(parsed.error));
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
