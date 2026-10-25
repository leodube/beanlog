// Brew validation and labels, shared by server and UI.
import { z } from "zod";

import { FLAVOUR_NOTES, type FlavourNote } from "./domain";

export const FLAVOUR_LABELS: Record<FlavourNote, string> = {
  sweet: "Sweet",
  fruity: "Fruity",
  floral: "Floral",
  chocolatey: "Chocolatey",
  astringent: "Astringent",
};

const quarter = (min: number, max: number, msg: string) =>
  z.coerce
    .number()
    .min(min, msg)
    .max(max, msg)
    .refine((v) => Number.isInteger(v * 4), msg);

// Empty or missing → null; otherwise validated by `schema`.
const blankToNull = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), schema.nullable());

const id = (msg: string) =>
  z.coerce.number({ error: msg }).int(msg).positive(msg);

export const BrewInput = z
  .object({
    brewedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter when you brewed it.")
      // datetime-local has no zone; it's read in the server's timezone (TZ).
      .transform((v) => new Date(v)),
    bagId: id("Pick a coffee."),
    recipeId: blankToNull(id("Pick a recipe.")),
    brewerId: id("Pick a brewer."),
    doseG: z.coerce
      .number({ error: "Enter the dose." })
      .positive("Enter the dose.")
      .max(100)
      .refine(
        (v) => Number.isInteger(Math.round(v * 1000) / 100),
        "Use at most one decimal place.",
      ),
    waterMl: z.coerce
      .number({ error: "Enter the water." })
      .int("Use whole millilitres.")
      .positive("Enter the water.")
      .max(3000),
    tempC: z.coerce
      .number({ error: "Enter the temperature." })
      .int()
      .min(0)
      .max(100, "Water can't be over 100°C."),
    grinderId: id("Pick a grinder."),
    grindSetting: z.coerce
      .number({ error: "Enter the grind setting." })
      .min(0)
      .max(9999),
    rating: blankToNull(
      quarter(0.25, 5, "Ratings go from 0.25 to 5 in steps of 0.25."),
    ),
    compassStrength: blankToNull(
      quarter(-1, 1, "Compass values go in steps of 0.25."),
    ),
    compassExtraction: blankToNull(
      quarter(-1, 1, "Compass values go in steps of 0.25."),
    ),
    flavourNotes: z
      .array(z.enum(FLAVOUR_NOTES))
      .transform((xs) => [...new Set(xs)]),
    notes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => v || null),
  })
  .refine(
    (b) => (b.compassStrength == null) === (b.compassExtraction == null),
    {
      message: "Place the compass marker, or clear it.",
      path: ["compass"],
    },
  );

export type BrewValues = z.output<typeof BrewInput>;

/** "2026-10-24T07:58" in the server's timezone, for datetime-local inputs. */
export function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
