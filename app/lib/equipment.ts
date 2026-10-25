// Equipment validation and display helpers. Shared by the server (actions)
// and the UI (labels, grind formatting), so it has no server-only imports.
import { z } from "zod";

import { GRINDER_KINDS, type GrinderKind } from "./domain";

export const DIAL_STEPS = [0.1, 0.25, 0.5, 1] as const;

export const KIND_LABELS: Record<GrinderKind, { label: string; help: string }> =
  {
    clicks: {
      label: "Clicks",
      help: "Whole numbers counted from fully closed, like the Timemore C2 or Comandante.",
    },
    dial: {
      label: "Numbered dial",
      help: "A number read off the dial, in fixed steps.",
    },
    stepless: {
      label: "Stepless",
      help: "Any value. Add a unit if you use one, such as turns.",
    },
  };

const name = z
  .string()
  .trim()
  .min(1, "Give it a name.")
  .max(60, "Keep the name under 60 characters.");

export const BrewerInput = z.object({ name });

// The form always sends step and unit; normalise them per kind so the stored
// row is consistent (clicks → step 1, no unit; stepless → step 0.1).
export const GrinderInput = z
  .object({
    name,
    settingKind: z.enum(GRINDER_KINDS),
    step: z.coerce.number().optional(),
    unit: z.string().trim().max(20).optional(),
  })
  .transform((g) => ({
    name: g.name,
    settingKind: g.settingKind,
    step:
      g.settingKind === "clicks"
        ? 1
        : g.settingKind === "stepless"
          ? 0.1
          : (g.step ?? 0.1),
    unit: g.settingKind === "stepless" && g.unit ? g.unit : null,
  }))
  .refine(
    (g) =>
      g.settingKind !== "dial" ||
      (DIAL_STEPS as readonly number[]).includes(g.step),
    {
      message: "Pick a step size.",
      path: ["step"],
    },
  );

export type GrinderSetting = {
  settingKind: GrinderKind;
  step: number;
  unit: string | null;
};

const decimals = (step: number) => (step >= 1 ? 0 : step === 0.25 ? 2 : 1);

/** "18 clicks", "4.2", "1.5 turns" */
export function formatGrind(g: GrinderSetting, value: number) {
  if (g.settingKind === "clicks") return `${Math.round(value)} clicks`;
  const n = value.toFixed(decimals(g.step));
  return g.unit ? `${n} ${g.unit}` : n;
}

/** "Clicks", "Dial · 0.1 steps", "Stepless · turns" */
export function describeGrinder(g: GrinderSetting) {
  if (g.settingKind === "clicks") return "Clicks";
  if (g.settingKind === "dial") return `Dial · ${g.step} steps`;
  return g.unit ? `Stepless · ${g.unit}` : "Stepless";
}

/** Quick-add suggestions shown while you have no brewers. */
export const COMMON_BREWERS = [
  "V60",
  "AeroPress",
  "Kalita Wave",
  "Chemex",
  "Orea",
  "French press",
];
