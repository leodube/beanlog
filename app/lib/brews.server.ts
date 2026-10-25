import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

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
import type { BrewValues } from "./brew";
import { listOpenBags } from "./coffee.server";
import { activeRecipes } from "./recipes.server";

// ---------- Brew form data ----------

/** Everything the brew form needs, including recent history for its grind hints. */
export async function brewFormData() {
  const [bagOptions, recipeOptions, brewerOptions, grinderOptions, history] =
    await Promise.all([
      listOpenBags(),
      activeRecipes(),
      db
        .select({ id: brewers.id, name: brewers.name })
        .from(brewers)
        .where(isNull(brewers.archivedAt))
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
        .where(isNull(grinders.archivedAt))
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
  return { bagOptions, recipeOptions, brewerOptions, grinderOptions, history };
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
  const snapshot = await snapshotFor(values);
  const [row] = await db
    .insert(brews)
    .values({ ...values, recipeSnapshot: snapshot })
    .returning({ id: brews.id });
  return row.id;
}

async function snapshotFor(values: BrewValues) {
  const [bag] = await db
    .select({ id: bags.id })
    .from(bags)
    .where(eq(bags.id, values.bagId));
  if (!bag)
    throw new BrewRuleError(
      "bagId",
      "That coffee isn't available any more. Pick another.",
    );
  if (values.recipeId == null) return null;
  const [recipe] = await db
    .select({
      brewerId: recipes.brewerId,
      doseG: recipes.doseG,
      waterMl: recipes.waterMl,
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
    grindLevel: recipe.grindLevel,
    steps: recipe.steps,
  };
}

// ---------- Brew list ----------

export function listBrews(limit = 100) {
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
    .orderBy(desc(brews.brewedAt), desc(brews.id))
    .limit(limit);
}
