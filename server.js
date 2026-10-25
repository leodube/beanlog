// Production server: `npm start` (and the container's command).
//
// 1. Applies any pending database migrations from ./drizzle.
// 2. Serves the React Router build with Express.
//
// This replaces react-router-serve so the app can run behind a reverse proxy
// (Caddy, nginx, Traefik): with `trust proxy` on, request URLs use the
// X-Forwarded-Proto/Host the proxy sets. Without it, a request that arrived
// over https looks like http to the app, and React Router rejects every form
// post as cross-origin.
import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import express from "express";
import morgan from "morgan";
import postgres from "postgres";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
// How many proxies sit in front of the app. 1 = a single reverse proxy.
// Set to 0 if the app is exposed directly (then forwarded headers are ignored).
const TRUST_PROXY = Number(process.env.TRUST_PROXY ?? 1);

if (process.env.MIGRATE_ON_START !== "false") {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    onnotice: () => {},
  });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
    console.log("[beanlog] database is up to date");
  } catch (error) {
    console.error("[beanlog] migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", TRUST_PROXY);
app.use(compression());
// Fingerprinted build assets never change, so they can be cached for a year.
app.use(
  "/assets",
  express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
);
app.use(express.static("build/client", { maxAge: "1h" }));
app.use(morgan("tiny", { skip: (req) => req.path === "/healthz" }));
app.all(
  "/{*splat}",
  createRequestHandler({
    build: await import("./build/server/index.js"),
    mode: process.env.NODE_ENV,
  }),
);

const server = app.listen(PORT, HOST, () =>
  console.log(`[beanlog] listening on http://${HOST}:${PORT}`),
);

// Podman/systemd stop the container with SIGTERM: finish in-flight requests.
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
