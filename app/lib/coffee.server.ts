import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "~/db/client.server";
import { bags, brews, coffees, roasters } from "~/db/schema.server";

// ---------- Derived values ----------
// Grams left = bag weight minus the doses of its brews. Computed, never stored.
const usedG =
  sql<number>`coalesce((select sum(${brews.doseG}) from ${brews} where ${brews.bagId} = ${bags.id}), 0)`.mapWith(
    Number,
  );
const bagBrews =
  sql<number>`(select count(*) from ${brews} where ${brews.bagId} = ${bags.id})`.mapWith(
    Number,
  );

const coffeeBrews =
  sql<number>`(select count(*) from ${brews} join ${bags} b on b.id = ${brews.bagId} where b.coffee_id = ${coffees.id})`.mapWith(
    Number,
  );
const coffeeAvg = sql<
  number | null
>`(select avg(${brews.rating}) from ${brews} join ${bags} b on b.id = ${brews.bagId} where b.coffee_id = ${coffees.id})`.mapWith(
  (v) => (v == null ? null : Number(v)),
);
const openBagCount =
  sql<number>`(select count(*) from ${bags} b where b.coffee_id = ${coffees.id} and b.finished_at is null)`.mapWith(
    Number,
  );
// The open bag you're most likely brewing from: the most recently roasted one.
const currentBag = sql<{
  roastedOn: string;
  weightG: number;
  usedG: number;
} | null>`(
  select json_build_object(
    'roastedOn', b.roasted_on,
    'weightG', b.weight_g,
    'usedG', coalesce((select sum(w.dose_g) from brews w where w.bag_id = b.id), 0))
  from ${bags} b where b.coffee_id = ${coffees.id} and b.finished_at is null
  order by b.roasted_on desc limit 1)`;

// ---------- Coffee list ----------
export async function listCoffees() {
  const rows = await db
    .select({
      id: coffees.id,
      name: coffees.name,
      roaster: roasters.name,
      originCountry: coffees.originCountry,
      process: coffees.process,
      roastLevel: coffees.roastLevel,
      rating: coffees.rating,
      brews: coffeeBrews,
      brewAvg: coffeeAvg,
      openBags: openBagCount,
      currentBag,
    })
    .from(coffees)
    .innerJoin(roasters, eq(roasters.id, coffees.roasterId))
    .orderBy(asc(sql`lower(${coffees.name})`));
  return rows.map((r) => ({
    ...r,
    currentBag: r.currentBag
      ? { ...r.currentBag, usedG: Number(r.currentBag.usedG) }
      : null,
  }));
}

// ---------- One coffee ----------
export async function getCoffee(id: number) {
  const [coffee] = await db
    .select({
      id: coffees.id,
      name: coffees.name,
      roasterId: coffees.roasterId,
      roaster: roasters.name,
      roasterCity: roasters.city,
      originCountry: coffees.originCountry,
      region: coffees.region,
      producer: coffees.producer,
      variety: coffees.variety,
      process: coffees.process,
      roastLevel: coffees.roastLevel,
      tastingNotes: coffees.tastingNotes,
      notes: coffees.notes,
      rating: coffees.rating,
      brews: coffeeBrews,
      brewAvg: coffeeAvg,
    })
    .from(coffees)
    .innerJoin(roasters, eq(roasters.id, coffees.roasterId))
    .where(eq(coffees.id, id));
  if (!coffee) return null;

  const bagRows = await db
    .select({
      id: bags.id,
      roastedOn: bags.roastedOn,
      weightG: bags.weightG,
      notes: bags.notes,
      finishedAt: bags.finishedAt,
      usedG,
      brews: bagBrews,
    })
    .from(bags)
    .where(eq(bags.coffeeId, id))
    // Open bags first, newest roast first.
    .orderBy(sql`${bags.finishedAt} is not null`, desc(bags.roastedOn));

  return { ...coffee, bags: bagRows };
}

// ---------- Roasters ----------
export async function listRoasters() {
  return db
    .select({
      id: roasters.id,
      name: roasters.name,
      city: roasters.city,
      countryCode: roasters.countryCode,
      coffees: sql<
        string[]
      >`coalesce((select array_agg(c.name order by lower(c.name)) from ${coffees} c where c.roaster_id = ${roasters.id}), '{}')`,
    })
    .from(roasters)
    .orderBy(asc(sql`lower(${roasters.name})`));
}

// ---------- Mutations ----------
type RoasterValues = {
  name: string;
  city: string | null;
  countryCode: string | null;
};
type CoffeeValues = {
  name: string;
  originCountry: string | null;
  region: string | null;
  producer: string | null;
  variety: string | null;
  process: (typeof coffees.$inferInsert)["process"];
  roastLevel: (typeof coffees.$inferInsert)["roastLevel"];
  tastingNotes: string[];
  notes: string | null;
};
type BagValues = { roastedOn: string; weightG: number; notes: string | null };

export class DuplicateError extends Error {
  constructor(public field: "roaster" | "coffee") {
    super(`duplicate ${field}`);
  }
}

const isUnique = (e: unknown, index: string) => {
  const err = e as {
    code?: string;
    constraint_name?: string;
    cause?: { code?: string; constraint_name?: string };
  };
  const code = err?.cause?.code ?? err?.code;
  const name = err?.cause?.constraint_name ?? err?.constraint_name;
  return code === "23505" && name === index;
};

async function translateDuplicates<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (isUnique(e, "roasters_name_unique"))
      throw new DuplicateError("roaster");
    if (isUnique(e, "coffees_roaster_name_unique"))
      throw new DuplicateError("coffee");
    throw e;
  }
}

/** Create a coffee with its first bag, optionally creating its roaster too. One transaction. */
export function createCoffee(
  roaster: number | RoasterValues,
  coffee: CoffeeValues,
  bag: BagValues,
) {
  return translateDuplicates(() =>
    db.transaction(async (tx) => {
      const roasterId =
        typeof roaster === "number"
          ? roaster
          : (
              await tx
                .insert(roasters)
                .values(roaster)
                .returning({ id: roasters.id })
            )[0].id;
      const [row] = await tx
        .insert(coffees)
        .values({ ...coffee, roasterId })
        .returning({ id: coffees.id });
      await tx.insert(bags).values({ ...bag, coffeeId: row.id });
      return row.id;
    }),
  );
}

export function updateCoffee(
  id: number,
  roaster: number | RoasterValues,
  coffee: CoffeeValues,
) {
  return translateDuplicates(() =>
    db.transaction(async (tx) => {
      const roasterId =
        typeof roaster === "number"
          ? roaster
          : (
              await tx
                .insert(roasters)
                .values(roaster)
                .returning({ id: roasters.id })
            )[0].id;
      await tx
        .update(coffees)
        .set({ ...coffee, roasterId })
        .where(eq(coffees.id, id));
    }),
  );
}

export async function rateCoffee(id: number, rating: number | null) {
  await db.update(coffees).set({ rating }).where(eq(coffees.id, id));
}

export async function addBag(coffeeId: number, bag: BagValues) {
  await db.insert(bags).values({ ...bag, coffeeId });
}

export async function updateBag(
  coffeeId: number,
  bagId: number,
  bag: BagValues,
) {
  await db
    .update(bags)
    .set(bag)
    .where(and(eq(bags.id, bagId), eq(bags.coffeeId, coffeeId)));
}

export async function setBagFinished(
  coffeeId: number,
  bagId: number,
  finished: boolean,
) {
  await db
    .update(bags)
    .set({ finishedAt: finished ? new Date() : null })
    .where(and(eq(bags.id, bagId), eq(bags.coffeeId, coffeeId)));
}

/** Only bags with no brews can be deleted (for fixing mistakes). Returns false otherwise. */
export async function deleteBag(coffeeId: number, bagId: number) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(brews)
    .where(eq(brews.bagId, bagId));
  if (n > 0) return false;
  const remaining = await db
    .select({ id: bags.id })
    .from(bags)
    .where(eq(bags.coffeeId, coffeeId));
  if (remaining.length <= 1) return false; // a coffee keeps at least one bag
  await db
    .delete(bags)
    .where(and(eq(bags.id, bagId), eq(bags.coffeeId, coffeeId)));
  return true;
}

export function saveRoaster(id: number | null, values: RoasterValues) {
  return translateDuplicates(async () => {
    if (id == null)
      return (
        await db.insert(roasters).values(values).returning({ id: roasters.id })
      )[0].id;
    await db.update(roasters).set(values).where(eq(roasters.id, id));
    return id;
  });
}

export async function roasterOptions() {
  return db
    .select({ id: roasters.id, name: roasters.name })
    .from(roasters)
    .orderBy(asc(sql`lower(${roasters.name})`));
}

/** Open bags across all coffees, for the brew form's picker (used later). */
export async function listOpenBags() {
  return db
    .select({
      id: bags.id,
      coffeeId: coffees.id,
      coffee: coffees.name,
      roaster: roasters.name,
      roastedOn: bags.roastedOn,
    })
    .from(bags)
    .innerJoin(coffees, eq(coffees.id, bags.coffeeId))
    .innerJoin(roasters, eq(roasters.id, coffees.roasterId))
    .where(isNull(bags.finishedAt))
    .orderBy(asc(sql`lower(${coffees.name})`), desc(bags.roastedOn));
}
