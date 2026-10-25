// Domain vocabulary shared by the database schema, Zod validation and the UI.
// Safe to import from browser code (no server-only dependencies).
import { z } from "zod";

export const PROCESSES = [
  "washed",
  "natural",
  "honey",
  "anaerobic",
  "other",
] as const;
export const ROAST_LEVELS = [
  "light",
  "medium_light",
  "medium",
  "medium_dark",
  "dark",
] as const;
export const GRIND_LEVELS = [
  "extra_fine",
  "fine",
  "medium_fine",
  "medium",
  "medium_coarse",
  "coarse",
] as const;
export const GRINDER_KINDS = ["clicks", "dial", "stepless"] as const;
export const FLAVOUR_NOTES = [
  "sweet",
  "fruity",
  "floral",
  "chocolatey",
  "astringent",
] as const;
export const STEP_ACTIONS = [
  "bloom",
  "pour",
  "stir",
  "swirl",
  "wait",
  "press",
  "drawdown",
  "enjoy",
] as const;

/** Steps that carry a cumulative scale target (grams on a scale tared after the grounds). */
export const WEIGHTED_ACTIONS: ReadonlySet<StepAction> = new Set([
  "bloom",
  "pour",
]);

export type Process = (typeof PROCESSES)[number];
export type RoastLevel = (typeof ROAST_LEVELS)[number];
export type GrindLevel = (typeof GRIND_LEVELS)[number];
export type GrinderKind = (typeof GRINDER_KINDS)[number];
export type FlavourNote = (typeof FLAVOUR_NOTES)[number];
export type StepAction = (typeof STEP_ACTIONS)[number];

// ---------- Recipe method ----------
// Stored as JSON on recipes (and copied into each brew's snapshot), so the
// rules the database can't see are enforced here, on every write.

export const RecipeStepSchema = z
  .object({
    /** Seconds from the start of the brew. */
    at: z
      .int()
      .min(0)
      .max(60 * 60),
    action: z.enum(STEP_ACTIONS),
    /** Cumulative scale reading in grams; only for bloom and pour. */
    targetG: z.int().positive().max(5000).nullable(),
    note: z.string().trim().max(200).default(""),
  })
  .refine((s) => WEIGHTED_ACTIONS.has(s.action) === (s.targetG != null), {
    message:
      "Bloom and pour steps need a scale target; other steps can't have one.",
    path: ["targetG"],
  });

export const RecipeStepsSchema = z
  .array(RecipeStepSchema)
  .min(2, "Add at least one step before Enjoy.")
  .superRefine((steps, ctx) => {
    const enjoys = steps.filter((s) => s.action === "enjoy");
    if (enjoys.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "A recipe needs exactly one Enjoy step.",
      });
      return;
    }
    const last = steps.at(-1)!;
    if (last.action !== "enjoy")
      ctx.addIssue({ code: "custom", message: "Enjoy must be the last step." });
    if (steps.slice(0, -1).some((s) => s.at >= last.at))
      ctx.addIssue({
        code: "custom",
        message: "Enjoy must come after every other step.",
      });
    for (let i = 1; i < steps.length; i++)
      if (steps[i].at < steps[i - 1].at)
        ctx.addIssue({
          code: "custom",
          message: "Steps must be in time order.",
          path: [i, "at"],
        });
  });

export type RecipeStep = z.infer<typeof RecipeStepSchema>;

/** What a brew keeps of its recipe, as the recipe was when brewed. */
export const RecipeSnapshotSchema = z.object({
  doseG: z.number().positive(),
  waterMl: z.int().positive(),
  /** Added after the first snapshots were written, so older ones lack it. */
  tempC: z.int().optional(),
  grindLevel: z.enum(GRIND_LEVELS),
  steps: RecipeStepsSchema,
});
export type RecipeSnapshot = z.infer<typeof RecipeSnapshotSchema>;
