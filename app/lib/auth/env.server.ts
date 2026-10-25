import { existsSync } from "node:fs";
import { z } from "zod";

// Local development: read .env if there is one. Variables already set in the
// environment win, so a container's or CI's settings are never overridden.
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
