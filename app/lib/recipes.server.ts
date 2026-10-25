import { asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "~/db/client.server";
import { brewers, brews, recipes } from "~/db/schema.server";
import type { RecipeFormValues } from "./recipe";

const recipeBrews =
  sql<number>`(select count(*) from ${brews} where ${brews.recipeId} = ${recipes.id})`.mapWith(
    Number,
  );

const columns = {
  id: recipes.id,
  name: recipes.name,
  brewerId: recipes.brewerId,
  brewer: brewers.name,
  doseG: recipes.doseG,
  waterMl: recipes.waterMl,
  tempC: recipes.tempC,
  grindLevel: recipes.grindLevel,
  steps: recipes.steps,
  notes: recipes.notes,
  archivedAt: recipes.archivedAt,
  brews: recipeBrews,
};

export function listRecipes() {
  return db
    .select(columns)
    .from(recipes)
    .innerJoin(brewers, eq(brewers.id, recipes.brewerId))
    .orderBy(asc(sql`lower(${recipes.name})`));
}

export async function getRecipe(id: number) {
  const [row] = await db
    .select(columns)
    .from(recipes)
    .innerJoin(brewers, eq(brewers.id, recipes.brewerId))
    .where(eq(recipes.id, id));
  return row ?? null;
}

export async function createRecipe(values: RecipeFormValues) {
  const [row] = await db
    .insert(recipes)
    .values(values)
    .returning({ id: recipes.id });
  return row.id;
}

export async function updateRecipe(id: number, values: RecipeFormValues) {
  await db.update(recipes).set(values).where(eq(recipes.id, id));
}

export async function setRecipeArchived(id: number, archived: boolean) {
  await db
    .update(recipes)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(recipes.id, id));
}

/** Brewers a recipe can use; an archived brewer stays listed if the recipe already has it. */
export function brewerChoices() {
  return db
    .select({
      id: brewers.id,
      name: brewers.name,
      archived: sql<boolean>`${brewers.archivedAt} is not null`,
    })
    .from(brewers)
    .orderBy(asc(sql`lower(${brewers.name})`));
}

export function activeRecipes() {
  return db
    .select(columns)
    .from(recipes)
    .innerJoin(brewers, eq(brewers.id, recipes.brewerId))
    .where(isNull(recipes.archivedAt))
    .orderBy(asc(sql`lower(${recipes.name})`));
}
