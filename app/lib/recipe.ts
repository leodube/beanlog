// Recipe validation, labels and method maths. Shared by server and UI.
import { z } from "zod";

import {
  GRIND_LEVELS,
  RecipeStepsSchema,
  WEIGHTED_ACTIONS,
  type GrindLevel,
  type RecipeStep,
  type StepAction,
} from "./domain";

export const GRIND_LEVEL_LABELS: Record<GrindLevel, string> = {
  extra_fine: "Extra fine",
  fine: "Fine",
  medium_fine: "Medium-fine",
  medium: "Medium",
  medium_coarse: "Medium-coarse",
  coarse: "Coarse",
};

export const ACTION_LABELS: Record<StepAction, string> = {
  bloom: "Bloom",
  pour: "Pour",
  stir: "Stir",
  swirl: "Swirl",
  wait: "Wait",
  press: "Press",
  drawdown: "Drawdown",
  enjoy: "Enjoy",
};

/** Actions you can pick for a step. Enjoy is added automatically and always last. */
export const PICKABLE_ACTIONS = (
  Object.keys(ACTION_LABELS) as StepAction[]
).filter((a) => a !== "enjoy");

// ---------- Time ----------
export const mmss = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** "45" → 45, "1:15" → 75, anything else → null. */
export function parseTime(text: string): number | null {
  const m = text.trim().match(/^(\d{1,3})(?::(\d{1,2}))?$/);
  if (!m) return null;
  const seconds =
    m[2] != null ? Number(m[1]) * 60 + Number(m[2]) : Number(m[1]);
  return m[2] != null && Number(m[2]) > 59 ? null : seconds;
}

/** Sort by time with Enjoy forced to the end. */
export function sortSteps<T extends Pick<RecipeStep, "at" | "action">>(
  steps: T[],
): T[] {
  return [...steps].sort(
    (a, b) =>
      Number(a.action === "enjoy") - Number(b.action === "enjoy") ||
      a.at - b.at,
  );
}

export const enjoyAt = (steps: Pick<RecipeStep, "at" | "action">[]) =>
  steps.find((s) => s.action === "enjoy")?.at ?? null;

// ---------- Derived values ----------
/** Grams poured by each weighted step (targets are cumulative scale readings). */
export function pourAmounts(steps: Pick<RecipeStep, "action" | "targetG">[]) {
  let prev = 0;
  return steps.map((s) => {
    if (!WEIGHTED_ACTIONS.has(s.action) || s.targetG == null) return null;
    const poured = s.targetG - prev;
    prev = s.targetG;
    return poured;
  });
}

/** Non-blocking checks shown while editing. Blocking rules live in RecipeStepsSchema. */
export function methodWarnings(steps: RecipeStep[], waterMl: number) {
  const out: string[] = [];
  const weighted = steps.filter(
    (s) => WEIGHTED_ACTIONS.has(s.action) && s.targetG != null,
  );
  for (let i = 1; i < weighted.length; i++)
    if (weighted[i].targetG! <= weighted[i - 1].targetG!)
      out.push(
        `The ${ACTION_LABELS[weighted[i].action].toLowerCase()} at ${mmss(weighted[i].at)} targets ${weighted[i].targetG} g, which is no more than the step before it.`,
      );
  const last = weighted.at(-1)?.targetG;
  if (!weighted.length)
    out.push(
      "No step adds water yet. Add a bloom or pour with a scale target.",
    );
  else if (waterMl > 0 && last !== waterMl)
    out.push(
      `Pours end at ${last} g, but the recipe's water is ${waterMl} ml.`,
    );
  const enjoy = enjoyAt(steps);
  const late =
    enjoy != null
      ? steps.filter((s) => s.action !== "enjoy" && s.at >= enjoy).length
      : 0;
  if (late)
    out.unshift(
      `Enjoy is at ${mmss(enjoy!)}, but ${late === 1 ? "a step starts" : `${late} steps start`} at or after it. Move Enjoy later or those steps earlier.`,
    );
  return out;
}

/** "Ready at 3:00" when there's an Enjoy step. */
export const readyLabel = (steps: Pick<RecipeStep, "at" | "action">[]) => {
  const e = enjoyAt(steps);
  return e != null ? `ready at ${mmss(e)}` : "";
};

// ---------- Scaling a method to a brew ----------
/** Bloom scales with the dose, pours with the water. Display only; the recipe isn't changed. */
export function scaleFactors(
  base: { doseG: number; waterMl: number },
  brew: { doseG: number; waterMl: number },
) {
  return { dose: brew.doseG / base.doseG, water: brew.waterMl / base.waterMl };
}
export const isScaled = (f: number) => Math.abs(f - 1) > 0.001;
export function scaledTarget(
  step: Pick<RecipeStep, "action" | "targetG">,
  f: { dose: number; water: number },
) {
  if (step.targetG == null) return null;
  return Math.round(
    step.targetG * (step.action === "bloom" ? f.dose : f.water),
  );
}

// ---------- Form input ----------
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const RecipeInput = z.object({
  name: z.string().trim().min(1, "Give the recipe a name.").max(80),
  brewerId: z.coerce
    .number({ error: "Pick a brewer." })
    .int()
    .positive("Pick a brewer."),
  doseG: z.coerce
    .number({ error: "Enter the dose." })
    .positive("Enter the dose.")
    .max(100)
    .refine((v) => Number.isInteger(v * 10), "Use at most one decimal place."),
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
  grindLevel: z.enum(GRIND_LEVELS, { error: "Pick a grind level." }),
  notes: optionalText(2000),
  // The editor sends its steps as one JSON field.
  steps: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "The method couldn't be read. Reload and try again.",
        });
        return z.NEVER;
      }
    })
    .pipe(RecipeStepsSchema),
});

export type RecipeFormValues = z.output<typeof RecipeInput>;
