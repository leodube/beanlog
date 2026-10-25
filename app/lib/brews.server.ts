import { and, asc, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";

import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "~/db/client.server";
import {
  bags,
  brewers,
  brews,
  coffees,
  grinders,
  recipes,
  roasters,
} from "~/db/schema.server";
import { bagUnavailable, type BrewValues } from "./brew";
import { localToday } from "./coffee";

// ---------- Brew form data ----------

type Keep = {
  recipeId?: number | null;
  brewerId?: number;
  grinderId?: number;
};

/**
 * Everything the brew form needs, including recent history for its grind
 * hints. When editing, `keep` names the brew's own recipe and equipment so
 * they stay selectable even if archived since.
 *
 * Bags are all of them, finished or not: the form shows only the ones that
 * were around on the brew's date (see bagUnavailable), and that date can be
 * changed in the form.
 */
export async function brewFormData(keep: Keep = {}) {
  const activeOr = (
    archivedAt: AnyPgColumn,
    id: AnyPgColumn,
    keepId?: number | null,
  ) => (keepId ? or(isNull(archivedAt), eq(id, keepId)) : isNull(archivedAt));

  const [bagRows, recipeOptions, brewerOptions, grinderOptions, history] =
    await Promise.all([
      db
        .select({
          id: bags.id,
          coffeeId: coffees.id,
          coffee: coffees.name,
          roaster: roasters.name,
          roastedOn: bags.roastedOn,
          finishedAt: bags.finishedAt,
        })
        .from(bags)
        .innerJoin(coffees, eq(coffees.id, bags.coffeeId))
        .innerJoin(roasters, eq(roasters.id, coffees.roasterId))
        .orderBy(asc(sql`lower(${coffees.name})`), desc(bags.roastedOn)),
      db
        .select({
          id: recipes.id,
          name: recipes.name,
          brewerId: recipes.brewerId,
          brewer: brewers.name,
          doseG: recipes.doseG,
          waterMl: recipes.waterMl,
          tempC: recipes.tempC,
          grindLevel: recipes.grindLevel,
          steps: recipes.steps,
        })
        .from(recipes)
        .innerJoin(brewers, eq(brewers.id, recipes.brewerId))
        .where(activeOr(recipes.archivedAt, recipes.id, keep.recipeId))
        .orderBy(asc(sql`lower(${recipes.name})`)),
      db
        .select({ id: brewers.id, name: brewers.name })
        .from(brewers)
        .where(activeOr(brewers.archivedAt, brewers.id, keep.brewerId))
        .orderBy(asc(sql`lower(${brewers.name})`)),
      db
        .select({
          id: grinders.id,
          name: grinders.name,
          settingKind: grinders.settingKind,
          step: grinders.step,
          unit: grinders.unit,
        })
        .from(grinders)
        .where(activeOr(grinders.archivedAt, grinders.id, keep.grinderId))
        .orderBy(asc(sql`lower(${grinders.name})`)),
      // Newest first. Enough to find "last time" values and fit a trend line.
      db
        .select({
          id: brews.id,
          coffeeId: bags.coffeeId,
          bagId: brews.bagId,
          brewerId: brews.brewerId,
          grinderId: brews.grinderId,
          grindSetting: brews.grindSetting,
          compassStrength: brews.compassStrength,
          compassExtraction: brews.compassExtraction,
        })
        .from(brews)
        .innerJoin(bags, eq(bags.id, brews.bagId))
        .orderBy(desc(brews.brewedAt), desc(brews.id))
        .limit(300),
    ]);
  // Finished times become local days (server TZ) so the browser can compare
  // them with the form's date without timezone maths.
  const bagOptions = bagRows.map(({ finishedAt, ...b }) => ({
    ...b,
    finishedOn: finishedAt ? localToday(finishedAt) : null,
  }));
  return {
    today: localToday(),
    bagOptions,
    recipeOptions,
    brewerOptions,
    grinderOptions,
    history,
  };
}

/** A past brew's inputs, for "Brew again" and editing. */
export async function getBrewInputs(id: number) {
  const [row] = await db
    .select({
      id: brews.id,
      brewedAt: brews.brewedAt,
      bagId: brews.bagId,
      coffeeId: bags.coffeeId,
      recipeId: brews.recipeId,
      brewerId: brews.brewerId,
      doseG: brews.doseG,
      waterMl: brews.waterMl,
      tempC: brews.tempC,
      grinderId: brews.grinderId,
      grindSetting: brews.grindSetting,
      rating: brews.rating,
      compassStrength: brews.compassStrength,
      compassExtraction: brews.compassExtraction,
      flavourNotes: brews.flavourNotes,
      notes: brews.notes,
    })
    .from(brews)
    .innerJoin(bags, eq(bags.id, brews.bagId))
    .where(eq(brews.id, id));
  return row ?? null;
}

// ---------- Brew detail ----------

export async function getBrew(id: number) {
  const [row] = await db
    .select({
      id: brews.id,
      brewedAt: brews.brewedAt,
      coffeeId: coffees.id,
      coffee: coffees.name,
      roaster: roasters.name,
      process: coffees.process,
      bagRoastedOn: bags.roastedOn,
      recipeId: brews.recipeId,
      recipe: recipes.name,
      recipeArchived: sql<boolean>`${recipes.archivedAt} is not null`,
      snapshot: brews.recipeSnapshot,
      brewer: brewers.name,
      doseG: brews.doseG,
      waterMl: brews.waterMl,
      tempC: brews.tempC,
      grinder: grinders.name,
      grinderKind: grinders.settingKind,
      grinderStep: grinders.step,
      grinderUnit: grinders.unit,
      grindSetting: brews.grindSetting,
      rating: brews.rating,
      compassStrength: brews.compassStrength,
      compassExtraction: brews.compassExtraction,
      flavourNotes: brews.flavourNotes,
      notes: brews.notes,
    })
    .from(brews)
    .innerJoin(bags, eq(bags.id, brews.bagId))
    .innerJoin(coffees, eq(coffees.id, bags.coffeeId))
    .innerJoin(roasters, eq(roasters.id, coffees.roasterId))
    .innerJoin(brewers, eq(brewers.id, brews.brewerId))
    .innerJoin(grinders, eq(grinders.id, brews.grinderId))
    .leftJoin(recipes, eq(recipes.id, brews.recipeId))
    .where(eq(brews.id, id));
  return row ?? null;
}

// ---------- Saving ----------

export class BrewRuleError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Save a new brew. With a recipe, the brewer must be the recipe's (it's locked
 * in the form) and the brew keeps a snapshot of the recipe as it is now.
 */
export async function createBrew(values: BrewValues) {
  await assertBag(values);
  const snapshot = await snapshotFor(values);
  const [row] = await db
    .insert(brews)
    .values({ ...values, recipeSnapshot: snapshot })
    .returning({ id: brews.id });
  return row.id;
}

/**
 * Edit a brew. Its recipe snapshot is kept as long as the recipe is unchanged,
 * so editing an old brew never rewrites its method; switching recipe takes a
 * fresh snapshot (and the brewer rule applies again).
 */
export async function updateBrew(id: number, values: BrewValues) {
  const [current] = await db
    .select({ recipeId: brews.recipeId })
    .from(brews)
    .where(eq(brews.id, id));
  if (!current) throw new BrewRuleError("form", "That brew no longer exists.");
  await assertBag(values);
  const set =
    current.recipeId === values.recipeId
      ? { ...values }
      : { ...values, recipeSnapshot: await snapshotFor(values) };
  await db.update(brews).set(set).where(eq(brews.id, id));
}

export async function deleteBrew(id: number) {
  await db.delete(brews).where(eq(brews.id, id));
}

/** The bag must exist and have been around on the brew's day. */
async function assertBag(values: Pick<BrewValues, "bagId" | "brewedAt">) {
  const [bag] = await db
    .select({ roastedOn: bags.roastedOn, finishedAt: bags.finishedAt })
    .from(bags)
    .where(eq(bags.id, values.bagId));
  if (!bag)
    throw new BrewRuleError(
      "bagId",
      "That coffee isn't available any more. Pick another.",
    );
  const why = bagUnavailable(
    {
      roastedOn: bag.roastedOn,
      finishedOn: bag.finishedAt ? localToday(bag.finishedAt) : null,
    },
    localToday(values.brewedAt),
  );
  if (why)
    throw new BrewRuleError("bagId", `That bag was ${why}. Pick another.`);
}

async function snapshotFor(values: BrewValues) {
  if (values.recipeId == null) return null;
  const [recipe] = await db
    .select({
      brewerId: recipes.brewerId,
      doseG: recipes.doseG,
      waterMl: recipes.waterMl,
      tempC: recipes.tempC,
      grindLevel: recipes.grindLevel,
      steps: recipes.steps,
    })
    .from(recipes)
    .where(and(eq(recipes.id, values.recipeId), isNull(recipes.archivedAt)));
  if (!recipe)
    throw new BrewRuleError(
      "recipeId",
      "That recipe isn't available any more. Pick another.",
    );
  if (recipe.brewerId !== values.brewerId)
    throw new BrewRuleError(
      "brewerId",
      "A brew from a recipe uses the recipe's brewer.",
    );
  return {
    doseG: recipe.doseG,
    waterMl: recipe.waterMl,
    tempC: recipe.tempC,
    grindLevel: recipe.grindLevel,
    steps: recipe.steps,
  };
}

// ---------- Brew list ----------

export type BrewFilters = {
  coffeeId?: number;
  recipeId?: number | "none";
  brewerId?: number;
};

export function listBrews(filters: BrewFilters = {}, limit = 200) {
  const where: SQL[] = [];
  if (filters.coffeeId) where.push(eq(bags.coffeeId, filters.coffeeId));
  if (filters.recipeId === "none") where.push(isNull(brews.recipeId));
  else if (filters.recipeId) where.push(eq(brews.recipeId, filters.recipeId));
  if (filters.brewerId) where.push(eq(brews.brewerId, filters.brewerId));

  return db
    .select({
      id: brews.id,
      brewedAt: brews.brewedAt,
      coffee: coffees.name,
      roaster: roasters.name,
      recipe: recipes.name,
      brewer: brewers.name,
      doseG: brews.doseG,
      waterMl: brews.waterMl,
      tempC: brews.tempC,
      grindSetting: brews.grindSetting,
      grinderKind: grinders.settingKind,
      grinderStep: grinders.step,
      grinderUnit: grinders.unit,
      rating: brews.rating,
      compassStrength: brews.compassStrength,
      compassExtraction: brews.compassExtraction,
      flavourNotes: brews.flavourNotes,
    })
    .from(brews)
    .innerJoin(bags, eq(bags.id, brews.bagId))
    .innerJoin(coffees, eq(coffees.id, bags.coffeeId))
    .innerJoin(roasters, eq(roasters.id, coffees.roasterId))
    .innerJoin(brewers, eq(brewers.id, brews.brewerId))
    .innerJoin(grinders, eq(grinders.id, brews.grinderId))
    .leftJoin(recipes, eq(recipes.id, brews.recipeId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(brews.brewedAt), desc(brews.id))
    .limit(limit);
}

/** Choices for the list's filter pills: only things that have brews. */
export async function brewFilterOptions() {
  const [coffeeRows, recipeRows, brewerRows, total] = await Promise.all([
    db
      .selectDistinct({ id: coffees.id, name: coffees.name })
      .from(brews)
      .innerJoin(bags, eq(bags.id, brews.bagId))
      .innerJoin(coffees, eq(coffees.id, bags.coffeeId))
      .orderBy(coffees.name),
    db
      .selectDistinct({ id: recipes.id, name: recipes.name })
      .from(brews)
      .innerJoin(recipes, eq(recipes.id, brews.recipeId))
      .orderBy(recipes.name),
    db
      .selectDistinct({ id: brewers.id, name: brewers.name })
      .from(brews)
      .innerJoin(brewers, eq(brewers.id, brews.brewerId))
      .orderBy(brewers.name),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(brews),
  ]);
  return {
    coffees: coffeeRows,
    recipes: recipeRows,
    brewers: brewerRows,
    total: total[0].n,
  };
}
