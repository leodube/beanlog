import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

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
import { localToday } from "./coffee";
import type { RecipeSnapshot } from "./domain";
import { formatGrind } from "./equipment";
import {
  addDays,
  mean,
  recipeKey,
  shortDate,
  weekStart,
  type PERIODS,
} from "./stats";

type Period = (typeof PERIODS)[number];

// ---------- Overview ----------

/**
 * Everything on the Overview tab for one period. Brews are few enough (a
 * couple a day) that it's simpler to load the period's rows and aggregate
 * here than to write a query per chart.
 */
export async function overviewStats(
  period: Period,
  recipeCoffeeId: number | null,
) {
  const since = period.days
    ? new Date(Date.now() - period.days * 86400000)
    : null;
  const rows = await db
    .select({
      id: brews.id,
      brewedAt: brews.brewedAt,
      coffeeId: coffees.id,
      coffee: coffees.name,
      coffeeRating: coffees.rating,
      origin: coffees.originCountry,
      roaster: roasters.name,
      recipeId: brews.recipeId,
      recipe: recipes.name,
      recipeBrewer: sql<
        string | null
      >`(select ${brewers.name} from ${brewers} where ${brewers.id} = ${recipes.brewerId})`,
      brewer: brewers.name,
      doseG: brews.doseG,
      waterMl: brews.waterMl,
      tempC: brews.tempC,
      grindSetting: brews.grindSetting,
      grinderKind: grinders.settingKind,
      grinderStep: grinders.step,
      grinderUnit: grinders.unit,
      rating: brews.rating,
      snapshot: brews.recipeSnapshot,
    })
    .from(brews)
    .innerJoin(bags, eq(bags.id, brews.bagId))
    .innerJoin(coffees, eq(coffees.id, bags.coffeeId))
    .innerJoin(roasters, eq(roasters.id, coffees.roasterId))
    .innerJoin(brewers, eq(brewers.id, brews.brewerId))
    .innerJoin(grinders, eq(grinders.id, brews.grinderId))
    .leftJoin(recipes, eq(recipes.id, brews.recipeId))
    .where(since ? gte(brews.brewedAt, since) : undefined)
    .orderBy(asc(brews.brewedAt), asc(brews.id));

  const today = localToday();
  const list = rows.map((r) => ({ ...r, day: localToday(r.brewedAt) }));
  const rated = list.filter((b) => b.rating != null);

  // Tiles
  const firstDay = since ? localToday(since) : (list[0]?.day ?? today);
  const days = Math.max(
    1,
    period.days ??
      Math.round((Date.parse(today) - Date.parse(firstDay)) / 86400000) + 1,
  );
  const grams = list.reduce((a, b) => a + b.doseG, 0);
  const tiles = {
    brews: list.length,
    perDay: list.length / days,
    grams,
    gramsPerBrew: list.length ? grams / list.length : 0,
    avgRating: mean(rated.map((b) => b.rating!)),
    rated: rated.length,
    coffees: new Set(list.map((b) => b.coffeeId)).size,
    origins: new Set(list.map((b) => b.origin).filter(Boolean)).size,
  };

  // Brews per week, Monday to Sunday, including empty weeks.
  const counts = new Map<string, number>();
  for (const b of list) {
    const w = weekStart(b.day);
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const weekly: { week: string; n: number }[] = [];
  for (let w = weekStart(firstDay); w <= today; w = addDays(w, 7))
    weekly.push({ week: w, n: counts.get(w) ?? 0 });

  // Rating over time, with a 7-brew running average.
  const ratings = rated.map((b, i) => {
    const window = rated.slice(Math.max(0, i - 6), i + 1);
    return {
      id: b.id,
      day: b.day,
      rating: b.rating!,
      avg: mean(window.map((x) => x.rating!))!,
      tip: `${shortDate(b.day)} · ${b.coffee}\n${b.rating!.toFixed(2)} · ${formatGrind(
        {
          settingKind: b.grinderKind,
          step: b.grinderStep,
          unit: b.grinderUnit,
        },
        b.grindSetting,
      )}`,
    };
  });

  // Ratings per recipe. A coffee filter keeps the comparison fair, since a
  // great coffee flatters any recipe.
  const coffeeOptions = [
    ...new Map(
      list.map((b) => [b.coffeeId, { id: b.coffeeId, name: b.coffee }]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const recipeCoffee = coffeeOptions.some((c) => c.id === recipeCoffeeId)
    ? recipeCoffeeId
    : null;
  const byRecipe = new Map<string, typeof list>();
  for (const b of list) {
    if (recipeCoffee && b.coffeeId !== recipeCoffee) continue;
    const k = b.recipeId != null ? String(b.recipeId) : "none";
    byRecipe.set(k, [...(byRecipe.get(k) ?? []), b]);
  }
  const recipeRows = [...byRecipe.entries()]
    .map(([k, bs]) => {
      const rs = bs.filter((b) => b.rating != null).map((b) => b.rating!);
      const withSnap = bs.filter((b) => b.snapshot);
      const tweaked = withSnap.filter((b) => isTweaked(b, b.snapshot!)).length;
      return {
        key: k,
        name: bs[0].recipe ?? "No recipe",
        brewer: k === "none" ? "Various" : (bs[0].recipeBrewer ?? bs[0].brewer),
        n: bs.length,
        ratings: rs,
        avg: mean(rs),
        tweakedPct: withSnap.length
          ? Math.round((tweaked / withSnap.length) * 100)
          : null,
      };
    })
    .filter((r) => r.avg != null)
    .sort((a, b) => b.avg! - a.avg!);

  // By brewer
  const byBrewer = new Map<string, typeof list>();
  for (const b of list)
    byBrewer.set(b.brewer, [...(byBrewer.get(b.brewer) ?? []), b]);
  const brewerRows = [...byBrewer.entries()]
    .map(([name, bs]) => ({
      name,
      n: bs.length,
      avg: mean(bs.filter((b) => b.rating != null).map((b) => b.rating!)),
    }))
    .sort((a, b) => b.n - a.n);

  // Top coffees: your own rating of the coffee, else its brews' average.
  const byCoffee = new Map<number, typeof list>();
  for (const b of list)
    byCoffee.set(b.coffeeId, [...(byCoffee.get(b.coffeeId) ?? []), b]);
  const topCoffees = [...byCoffee.values()]
    .map((bs) => {
      const avg = mean(
        bs.filter((b) => b.rating != null).map((b) => b.rating!),
      );
      return {
        id: bs[0].coffeeId,
        name: bs[0].coffee,
        roaster: bs[0].roaster,
        n: bs.length,
        score: bs[0].coffeeRating ?? avg,
        own: bs[0].coffeeRating != null,
      };
    })
    .filter((c) => c.score != null)
    .sort((a, b) => b.score! - a.score!)
    .slice(0, 5);

  return {
    tiles,
    weekly,
    ratings,
    recipes: { coffeeId: recipeCoffee, coffeeOptions, rows: recipeRows },
    brewers: brewerRows,
    topCoffees,
  };
}

/** Brewed with a different dose, water or temperature than its recipe said. */
function isTweaked(
  b: { doseG: number; waterMl: number; tempC: number },
  s: RecipeSnapshot,
) {
  return (
    b.doseG !== s.doseG ||
    b.waterMl !== s.waterMl ||
    (s.tempC != null && b.tempC !== s.tempC)
  );
}

export async function totalBrews() {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(brews);
  return row.n;
}

// ---------- Dialing in ----------

/**
 * Bags with brews (newest brewing first), the chosen bag, and its brews in
 * order. `roasterId` without `bagId` picks that roaster's latest bag.
 */
export async function dialingStats(
  bagId: number | null,
  roasterId: number | null,
) {
  const bagRows = await db
    .select({
      id: bags.id,
      coffee: coffees.name,
      roasterId: roasters.id,
      roaster: roasters.name,
      roastedOn: bags.roastedOn,
      finished: sql<boolean>`${bags.finishedAt} is not null`,
      lastBrewedAt: sql<Date>`max(${brews.brewedAt})`.mapWith(
        (v) => new Date(v),
      ),
      n: sql<number>`count(${brews.id})`.mapWith(Number),
    })
    .from(bags)
    .innerJoin(brews, eq(brews.bagId, bags.id))
    .innerJoin(coffees, eq(coffees.id, bags.coffeeId))
    .innerJoin(roasters, eq(roasters.id, coffees.roasterId))
    .groupBy(bags.id, coffees.name, roasters.id, roasters.name)
    .orderBy(desc(sql`max(${brews.brewedAt})`), desc(bags.id));
  if (!bagRows.length) return null;

  const bag =
    bagRows.find((b) => b.id === bagId) ??
    bagRows.find((b) => b.roasterId === roasterId) ??
    bagRows[0];

  const rows = await db
    .select({
      id: brews.id,
      brewedAt: brews.brewedAt,
      recipeId: brews.recipeId,
      recipe: recipes.name,
      brewerId: brews.brewerId,
      brewer: brewers.name,
      grinderId: grinders.id,
      grinder: grinders.name,
      settingKind: grinders.settingKind,
      step: grinders.step,
      unit: grinders.unit,
      grindSetting: brews.grindSetting,
      doseG: brews.doseG,
      waterMl: brews.waterMl,
      tempC: brews.tempC,
      rating: brews.rating,
      compassStrength: brews.compassStrength,
      compassExtraction: brews.compassExtraction,
    })
    .from(brews)
    .innerJoin(brewers, eq(brewers.id, brews.brewerId))
    .innerJoin(grinders, eq(grinders.id, brews.grinderId))
    .leftJoin(recipes, eq(recipes.id, brews.recipeId))
    .where(and(eq(brews.bagId, bag.id)))
    .orderBy(asc(brews.brewedAt), asc(brews.id));

  // Roasters in order of their most recent brewing.
  const roasterOptions = [
    ...new Map(
      bagRows.map((b) => [b.roasterId, { id: b.roasterId, name: b.roaster }]),
    ).values(),
  ];
  return {
    roasterOptions,
    bagOptions: bagRows
      .filter((b) => b.roasterId === bag.roasterId)
      .map(({ id, coffee, roastedOn, finished }) => ({
        id,
        coffee,
        roastedOn,
        finished,
      })),
    bag: {
      id: bag.id,
      coffee: bag.coffee,
      roasterId: bag.roasterId,
      roaster: bag.roaster,
      roastedOn: bag.roastedOn,
      finished: bag.finished,
    },
    brews: rows.map(({ brewedAt, ...b }) => ({
      ...b,
      day: localToday(brewedAt),
      key: recipeKey(b),
      recipeLabel: b.recipe ?? `No recipe (${b.brewer})`,
    })),
  };
}
