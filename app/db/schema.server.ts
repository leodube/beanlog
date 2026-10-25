// BeanLog database schema.
//
// Workflow: edit this file → `npm run db:generate` → review the SQL in
// drizzle/ → `npm run db:migrate`.
//
// Conventions
// - Integer identity ids; every table has created_at / updated_at.
// - Things that brews point at are archived (archived_at) or finished
//   (finished_at), never deleted: foreign keys are RESTRICT.
// - Derived values (ratio, grams left, averages, trends) are computed in
//   queries, not stored.
// - Single-user data: only the auth tables know about users.
//
// Imports are relative (not ~/) so drizzle-kit can load this file directly.
import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  char,
} from "drizzle-orm/pg-core";

import {
  FLAVOUR_NOTES,
  GRIND_LEVELS,
  GRINDER_KINDS,
  PROCESSES,
  ROAST_LEVELS,
  type RecipeSnapshot,
  type RecipeStep,
} from "../lib/domain";

// ---------- Enums ----------
export const processEnum = pgEnum("process", PROCESSES);
export const roastLevelEnum = pgEnum("roast_level", ROAST_LEVELS);
export const grindLevelEnum = pgEnum("grind_level", GRIND_LEVELS);
export const grinderKindEnum = pgEnum("grinder_kind", GRINDER_KINDS);
export const flavourNoteEnum = pgEnum("flavour_note", FLAVOUR_NOTES);

// ---------- Shared columns ----------
const id = () => integer().primaryKey().generatedAlwaysAsIdentity();
const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
// Quarter steps (0.25) for ratings and compass values.
const quarter = (col: string) => sql.raw(`${col} * 4 = trunc(${col} * 4)`);

// ---------- Coffee ----------
export const roasters = pgTable(
  "roasters",
  {
    id: id(),
    name: text().notNull(),
    city: text(),
    /** ISO 3166-1 alpha-2, e.g. "CA". */
    countryCode: char({ length: 2 }),
    website: text(),
    // Not used yet; kept so a map can be added later without a backfill.
    latitude: doublePrecision(),
    longitude: doublePrecision(),
    ...timestamps,
  },
  (t) => [uniqueIndex("roasters_name_unique").on(sql`lower(${t.name})`)],
);

/** A coffee as a product: one roaster's lot. Purchases of it are bags. */
export const coffees = pgTable(
  "coffees",
  {
    id: id(),
    roasterId: integer()
      .notNull()
      .references(() => roasters.id, { onDelete: "restrict" }),
    name: text().notNull(),
    /** ISO 3166-1 alpha-2, e.g. "ET". Null for blends. */
    originCountry: char({ length: 2 }),
    region: text(),
    producer: text(),
    variety: text(),
    process: processEnum().notNull(),
    roastLevel: roastLevelEnum().notNull(),
    /** The roaster's tasting notes from the bag. */
    tastingNotes: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    notes: text(),
    /** Your own rating of the coffee, separate from brew ratings. */
    rating: numeric({ precision: 3, scale: 2, mode: "number" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("coffees_roaster_name_unique").on(
      t.roasterId,
      sql`lower(${t.name})`,
    ),
    check(
      "coffees_rating_range",
      sql`${t.rating} is null or (${t.rating} between 0.25 and 5 and ${quarter("rating")})`,
    ),
  ],
);

/** One purchase of a coffee. Freshness and grams left are per bag. */
export const bags = pgTable(
  "bags",
  {
    id: id(),
    coffeeId: integer()
      .notNull()
      .references(() => coffees.id, { onDelete: "restrict" }),
    roastedOn: date({ mode: "string" }).notNull(),
    weightG: integer().notNull(),
    notes: text(),
    /** Set when the bag is used up; unfinished bags are "on the shelf". */
    finishedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("bags_coffee_idx").on(t.coffeeId),
    check("bags_weight_positive", sql`${t.weightG} > 0`),
  ],
);

// ---------- Equipment ----------
export const brewers = pgTable(
  "brewers",
  {
    id: id(),
    name: text().notNull(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("brewers_name_unique").on(sql`lower(${t.name})`)],
);

export const grinders = pgTable(
  "grinders",
  {
    id: id(),
    name: text().notNull(),
    settingKind: grinderKindEnum().notNull().default("clicks"),
    /** Increment for the grind stepper: 1 for clicks, e.g. 0.1 for a dial. */
    step: numeric({ precision: 4, scale: 2, mode: "number" })
      .notNull()
      .default(1),
    /** Optional label for stepless grinders, e.g. "turns". */
    unit: text(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("grinders_name_unique").on(sql`lower(${t.name})`),
    check("grinders_step_positive", sql`${t.step} > 0`),
  ],
);

// ---------- Recipes ----------
export const recipes = pgTable(
  "recipes",
  {
    id: id(),
    name: text().notNull(),
    brewerId: integer()
      .notNull()
      .references(() => brewers.id, { onDelete: "restrict" }),
    doseG: numeric({ precision: 4, scale: 1, mode: "number" }).notNull(),
    waterMl: integer().notNull(),
    tempC: smallint().notNull(),
    grindLevel: grindLevelEnum().notNull(),
    /** Validated by RecipeStepsSchema (one Enjoy, last; targets on bloom/pour only). */
    steps: jsonb().$type<RecipeStep[]>().notNull(),
    notes: text(),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check("recipes_dose_positive", sql`${t.doseG} > 0`),
    check("recipes_water_positive", sql`${t.waterMl} > 0`),
    check("recipes_temp_range", sql`${t.tempC} between 0 and 100`),
  ],
);

// ---------- Brews ----------
export const brews = pgTable(
  "brews",
  {
    id: id(),
    /** Editable in the brew form; defaults to now. */
    brewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    bagId: integer()
      .notNull()
      .references(() => bags.id, { onDelete: "restrict" }),
    brewerId: integer()
      .notNull()
      .references(() => brewers.id, { onDelete: "restrict" }),
    recipeId: integer().references(() => recipes.id, { onDelete: "restrict" }),
    /** Copy of the recipe when brewed, so later recipe edits don't rewrite history. */
    recipeSnapshot: jsonb().$type<RecipeSnapshot>(),
    doseG: numeric({ precision: 4, scale: 1, mode: "number" }).notNull(),
    waterMl: integer().notNull(),
    tempC: smallint().notNull(),
    grinderId: integer()
      .notNull()
      .references(() => grinders.id, { onDelete: "restrict" }),
    grindSetting: numeric({ precision: 6, scale: 2, mode: "number" }).notNull(),
    rating: numeric({ precision: 3, scale: 2, mode: "number" }),
    /** Taste compass, -1..1 in 0.25 steps. Strength: -1 strong … +1 weak. */
    compassStrength: numeric({ precision: 3, scale: 2, mode: "number" }),
    /** Extraction: -1 sour … +1 bitter. */
    compassExtraction: numeric({ precision: 3, scale: 2, mode: "number" }),
    flavourNotes: flavourNoteEnum()
      .array()
      .notNull()
      .default(sql`'{}'`),
    notes: text(),
    ...timestamps,
  },
  (t) => [
    index("brews_brewed_at_idx").on(t.brewedAt.desc()),
    index("brews_bag_brewed_at_idx").on(t.bagId, t.brewedAt.desc()),
    index("brews_recipe_idx").on(t.recipeId),
    index("brews_brewer_grinder_idx").on(t.brewerId, t.grinderId),
    check("brews_dose_positive", sql`${t.doseG} > 0`),
    check("brews_water_positive", sql`${t.waterMl} > 0`),
    check("brews_temp_range", sql`${t.tempC} between 0 and 100`),
    check(
      "brews_rating_range",
      sql`${t.rating} is null or (${t.rating} between 0.25 and 5 and ${quarter("rating")})`,
    ),
    check(
      "brews_compass_pair",
      sql`(${t.compassStrength} is null) = (${t.compassExtraction} is null)`,
    ),
    check(
      "brews_compass_range",
      sql`${t.compassStrength} is null or (
        ${t.compassStrength} between -1 and 1 and ${quarter("compass_strength")} and
        ${t.compassExtraction} between -1 and 1 and ${quarter("compass_extraction")})`,
    ),
    check(
      "brews_snapshot_with_recipe",
      sql`(${t.recipeId} is null) = (${t.recipeSnapshot} is null)`,
    ),
  ],
);

// ---------- Auth ----------
export const users = pgTable("users", {
  id: id(),
  username: text().notNull().unique(),
  /** argon2id */
  passwordHash: text().notNull(),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the random token in the cookie; the token itself is never stored. */
    id: text().primaryKey(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

// ---------- Relations (for db.query.*.findMany({ with: … })) ----------
export const roastersRelations = relations(roasters, ({ many }) => ({
  coffees: many(coffees),
}));
export const coffeesRelations = relations(coffees, ({ one, many }) => ({
  roaster: one(roasters, {
    fields: [coffees.roasterId],
    references: [roasters.id],
  }),
  bags: many(bags),
}));
export const bagsRelations = relations(bags, ({ one, many }) => ({
  coffee: one(coffees, { fields: [bags.coffeeId], references: [coffees.id] }),
  brews: many(brews),
}));
export const brewersRelations = relations(brewers, ({ many }) => ({
  recipes: many(recipes),
  brews: many(brews),
}));
export const grindersRelations = relations(grinders, ({ many }) => ({
  brews: many(brews),
}));
export const recipesRelations = relations(recipes, ({ one, many }) => ({
  brewer: one(brewers, {
    fields: [recipes.brewerId],
    references: [brewers.id],
  }),
  brews: many(brews),
}));
export const brewsRelations = relations(brews, ({ one }) => ({
  bag: one(bags, { fields: [brews.bagId], references: [bags.id] }),
  brewer: one(brewers, { fields: [brews.brewerId], references: [brewers.id] }),
  recipe: one(recipes, { fields: [brews.recipeId], references: [recipes.id] }),
  grinder: one(grinders, {
    fields: [brews.grinderId],
    references: [grinders.id],
  }),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
