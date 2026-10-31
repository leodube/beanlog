// Coffee validation and labels, shared by server actions and the UI.
import { z } from "zod";

import { ALL_CODES, ORIGIN_CODES } from "./countries";
import {
  PROCESSES,
  ROAST_LEVELS,
  type Process,
  type RoastLevel,
} from "./domain";

export const PROCESS_LABELS: Record<Process, string> = {
  washed: "Washed",
  natural: "Natural",
  honey: "Honey",
  anaerobic: "Anaerobic",
  other: "Other",
};

export const ROAST_LEVEL_LABELS: Record<RoastLevel, string> = {
  light: "Light",
  medium_light: "Medium-light",
  medium: "Medium",
  medium_dark: "Medium-dark",
  dark: "Dark",
};

/** Bag sizes offered as one-tap chips. */
export const COMMON_BAG_SIZES = [250, 340, 1000];

// Optional text: missing, empty or whitespace-only all become null.
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const RoasterFields = z.object({
  roasterName: z.string().trim().min(1, "Give the roaster a name.").max(80),
  roasterCity: text(80),
  roasterCountry: z
    .string()
    .optional()
    .refine((c) => !c || ALL_CODES.includes(c), "Pick a country.")
    .transform((c) => c || null),
});

export const RoasterInput = RoasterFields.transform((r) => ({
  name: r.roasterName,
  city: r.roasterCity,
  countryCode: r.roasterCountry,
}));

export const BagInput = z.object({
  roastedOn: z.iso.date("Enter the roast date."),
  weightG: z.coerce
    .number()
    .int("Use whole grams.")
    .min(1, "Enter the bag size.")
    .max(10000),
  bagNotes: text(500),
});

export const CoffeeInput = z.object({
  name: z.string().trim().min(1, "Give the coffee a name.").max(120),
  /** A roaster id, or "new" when adding one inline. */
  roasterId: z.union([z.literal("new"), z.coerce.number().int().positive()], {
    error: "Pick a roaster.",
  }),
  process: z.enum(PROCESSES, { error: "Pick a process." }),
  roastLevel: z.enum(ROAST_LEVELS, { error: "Pick a roast level." }),
  tastingNotes: z
    .array(z.string().trim().min(1).max(40))
    .max(12, "Keep it to 12 notes.")
    // Case-insensitive de-duplication, keeping the first spelling.
    .transform((notes) =>
      notes.filter(
        (n, i) =>
          notes.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i,
      ),
    ),
  notes: text(2000),
});

// ---------- Origins ----------
/** How many origins a coffee can have. The table allows more; the form doesn't yet. */
export const MAX_ORIGINS = 2;

export type OriginValues = {
  country: string | null;
  region: string | null;
  producer: string | null;
  variety: string | null;
};

const country = z
  .string()
  .optional()
  .refine(
    (c) => !c || (ORIGIN_CODES as readonly string[]).includes(c),
    "Pick a country from the list.",
  )
  .transform((c) => c || null);

/** One origin card's fields: origin1Country, origin1Region, … */
const originFields = (n: number) =>
  z
    .object({
      [`origin${n}Country`]: country,
      [`origin${n}Region`]: text(120),
      [`origin${n}Producer`]: text(120),
      [`origin${n}Variety`]: text(120),
    })
    .transform((o): OriginValues => ({
      country: o[`origin${n}Country`] as string | null,
      region: o[`origin${n}Region`] as string | null,
      producer: o[`origin${n}Producer`] as string | null,
      variety: o[`origin${n}Variety`] as string | null,
    }));

/**
 * The form's origin cards, main first. `originCount` says how many cards were
 * shown. Only the main origin may be left as "Blend / other", and only when
 * it's the only one.
 */
export function parseOrigins(
  raw: Record<string, unknown>,
):
  | { ok: true; origins: OriginValues[] }
  | { ok: false; errors: Record<string, string> } {
  const count = Math.min(
    MAX_ORIGINS,
    Math.max(1, Number(raw.originCount) || 1),
  );
  const origins: OriginValues[] = [];
  const errors: Record<string, string> = {};
  for (let n = 1; n <= count; n++) {
    const parsed = originFields(n).safeParse(raw);
    if (!parsed.success) {
      for (const i of parsed.error.issues)
        errors[String(i.path[0])] ??= i.message;
      continue;
    }
    if (n > 1 && !parsed.data.country)
      errors[`origin${n}Country`] = "Pick a country, or remove this origin.";
    origins.push(parsed.data);
  }
  if (count > 1 && origins[0] && !origins[0].country)
    errors.origin1Country = "Pick the main origin's country.";
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, origins };
}

export const RatingInput = z.object({
  rating: z.union([
    z.literal("").transform(() => null),
    z.coerce
      .number()
      .min(0.25)
      .max(5)
      .refine((v) => Number.isInteger(v * 4), "Ratings go in steps of 0.25."),
  ]),
});

/** Whole days between a YYYY-MM-DD date and today (server's local timezone). */
export function daysSince(isoDate: string, today = localToday()) {
  const ms =
    Date.parse(today + "T00:00:00Z") - Date.parse(isoDate + "T00:00:00Z");
  return Math.round(ms / 86400000);
}

/** Today's date as YYYY-MM-DD in the server's timezone (set TZ in the environment). */
export function localToday(now = new Date()) {
  const y = now.getFullYear(),
    m = String(now.getMonth() + 1).padStart(2, "0"),
    d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(isoDate: string) {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
