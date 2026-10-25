import { asc, eq, sql } from "drizzle-orm";

import { db } from "~/db/client.server";
import { brewers, grinders } from "~/db/schema.server";

export type EquipmentType = "brewer" | "grinder";

// Brews (and recipes, for brewers) that point at each item. Shown in the list
// and in the archive confirmation.
const brewerBrews =
  sql<number>`(select count(*) from brews where brews.brewer_id = ${brewers.id})`.mapWith(
    Number,
  );
const brewerRecipes =
  sql<number>`(select count(*) from recipes where recipes.brewer_id = ${brewers.id})`.mapWith(
    Number,
  );
const grinderBrews =
  sql<number>`(select count(*) from brews where brews.grinder_id = ${grinders.id})`.mapWith(
    Number,
  );

export async function listEquipment() {
  const [brewerRows, grinderRows] = await Promise.all([
    db
      .select({
        id: brewers.id,
        name: brewers.name,
        archivedAt: brewers.archivedAt,
        brews: brewerBrews,
        recipes: brewerRecipes,
      })
      .from(brewers)
      .orderBy(asc(sql`lower(${brewers.name})`)),
    db
      .select({
        id: grinders.id,
        name: grinders.name,
        settingKind: grinders.settingKind,
        step: grinders.step,
        unit: grinders.unit,
        archivedAt: grinders.archivedAt,
        brews: grinderBrews,
      })
      .from(grinders)
      .orderBy(asc(sql`lower(${grinders.name})`)),
  ]);
  return { brewers: brewerRows, grinders: grinderRows };
}

export type DuplicateName = { duplicate: true };

/** Postgres unique violation (our case-insensitive name indexes). */
function isUniqueViolation(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

async function guardDuplicate<T>(
  fn: () => Promise<T>,
): Promise<T | DuplicateName> {
  try {
    return await fn();
  } catch (e) {
    if (isUniqueViolation(e)) return { duplicate: true };
    throw e;
  }
}

export function saveBrewer(id: number | null, values: { name: string }) {
  return guardDuplicate(async () => {
    if (id == null) {
      const [row] = await db
        .insert(brewers)
        .values(values)
        .returning({ id: brewers.id });
      return row.id;
    }
    await db.update(brewers).set(values).where(eq(brewers.id, id));
    return id;
  });
}

export function saveGrinder(
  id: number | null,
  values: {
    name: string;
    settingKind: "clicks" | "dial" | "stepless";
    step: number;
    unit: string | null;
  },
) {
  return guardDuplicate(async () => {
    if (id == null) {
      const [row] = await db
        .insert(grinders)
        .values(values)
        .returning({ id: grinders.id });
      return row.id;
    }
    await db.update(grinders).set(values).where(eq(grinders.id, id));
    return id;
  });
}

export async function setArchived(
  type: EquipmentType,
  id: number,
  archived: boolean,
) {
  const table = type === "brewer" ? brewers : grinders;
  await db
    .update(table)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(table.id, id));
}
