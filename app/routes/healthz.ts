import { sql } from "drizzle-orm";

import { db } from "~/db/client.server";

// Resource route (no component): returns plain JSON.
// Used to confirm DB wiring in dev, and later as the container health check.
export async function loader() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", db: "ok" });
  } catch {
    return Response.json(
      { status: "error", db: "unreachable" },
      { status: 503 },
    );
  }
}
