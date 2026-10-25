import { useMemo, useRef, useState } from "react";

import { ChipRadios } from "./chips";
import { Field, inputClass } from "./fields";
import { PourChart } from "./pour-chart";
import {
  GRIND_LEVELS,
  WEIGHTED_ACTIONS,
  type GrindLevel,
  type RecipeStep,
  type StepAction,
} from "~/lib/domain";
import {
  ACTION_LABELS,
  GRIND_LEVEL_LABELS,
  methodWarnings,
  mmss,
  parseTime,
  PICKABLE_ACTIONS,
  pourAmounts,
  readyLabel,
  sortSteps,
} from "~/lib/recipe";

export type RecipeEditorValues = {
  name: string;
  brewerId: number | null;
  doseG: number;
  waterMl: number;
  tempC: number;
  grindLevel: GrindLevel;
  steps: RecipeStep[];
  notes: string | null;
};

export const NEW_RECIPE: RecipeEditorValues = {
  name: "",
  brewerId: null,
  doseG: 15,
  waterMl: 250,
  tempC: 94,
  grindLevel: "medium",
  steps: [
    { at: 0, action: "bloom", targetG: 45, note: "" },
    { at: 180, action: "enjoy", targetG: null, note: "" },
  ],
  notes: null,
};

// Editor rows carry a stable key and the time as typed ("1:" mid-edit).
type Row = RecipeStep & { key: number; atText: string };

const grindOptions = GRIND_LEVELS.map(
  (g) => [g, GRIND_LEVEL_LABELS[g]] as const,
);

/**
 * All recipe fields. The method is kept in React state and submitted as one
 * JSON field (`steps`); the server re-validates it with RecipeStepsSchema.
 * Enjoy is always present and last: it can't be deleted or picked twice.
 */
export function RecipeFields({
  values,
  brewers,
  errors = {},
}: {
  values: RecipeEditorValues;
  brewers: { id: number; name: string; archived: boolean }[];
  errors?: Record<string, string>;
}) {
  const nextKey = useRef(0);
  const toRow = (s: RecipeStep): Row => ({
    ...s,
    key: nextKey.current++,
    atText: mmss(s.at),
  });
  const [rows, setRows] = useState<Row[]>(() => {
    const steps = values.steps.some((s) => s.action === "enjoy")
      ? values.steps
      : [
          ...values.steps,
          {
            at: Math.max(0, ...values.steps.map((s) => s.at)) + 60,
            action: "enjoy" as const,
            targetG: null,
            note: "",
          },
        ];
    return sortSteps(steps).map(toRow);
  });
  const [dose, setDose] = useState(String(values.doseG));
  const [water, setWater] = useState(String(values.waterMl));

  const waterNum = Number(water) || 0;
  const doseNum = Number(dose) || 0;
  const steps: RecipeStep[] = rows.map(({ at, action, targetG, note }) => ({
    at,
    action,
    targetG,
    note,
  }));
  const pours = pourAmounts(steps);
  const warnings = useMemo(
    () => methodWarnings(steps, waterNum),
    [rows, waterNum],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const commitTimes = () =>
    setRows((rs) => sortSteps(rs.map((r) => ({ ...r, atText: mmss(r.at) }))));
  const addStep = () =>
    setRows((rs) => {
      const enjoy = rs.find((r) => r.action === "enjoy");
      const rest = rs.filter((r) => r.action !== "enjoy");
      let at = rest.length ? rest.at(-1)!.at + 30 : 0;
      if (enjoy && at >= enjoy.at) at = Math.max(0, enjoy.at - 15);
      return sortSteps([
        ...rs,
        toRow({ at, action: "pour", targetG: waterNum || null, note: "" }),
      ]);
    });

  const activeBrewers = brewers.filter(
    (b) => !b.archived || b.id === values.brewerId,
  );

  return (
    <div className="flex flex-col gap-5">
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

      <Field label="Name" error={errors.name}>
        <input
          name="name"
          defaultValue={values.name}
          placeholder="e.g. Daily V60"
          autoComplete="off"
          required
          className={`${inputClass} text-lg font-semibold`}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted">Brewer</span>
        {activeBrewers.length ? (
          <ChipRadios
            name="brewerId"
            options={activeBrewers.map((b) => [String(b.id), b.name] as const)}
            defaultValue={values.brewerId ? String(values.brewerId) : undefined}
          />
        ) : (
          <p className="text-sm text-muted">
            Add a brewer in{" "}
            <a href="/settings" className="text-accent underline">
              Settings
            </a>{" "}
            first.
          </p>
        )}
        {errors.brewerId && (
          <span className="text-sm font-medium text-danger">
            {errors.brewerId}
          </span>
        )}
      </div>

      <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
        <div className="grid grid-cols-3 divide-x divide-line">
          <NumberCell
            label="Dose"
            unit="g"
            name="doseG"
            value={dose}
            onChange={setDose}
          />
          <NumberCell
            label="Water"
            unit="ml"
            name="waterMl"
            value={water}
            onChange={setWater}
          />
          <NumberCell
            label="Temp"
            unit="°C"
            name="tempC"
            defaultValue={String(values.tempC)}
          />
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 text-sm">
          <span className="text-muted">Ratio</span>
          <span className="font-semibold tabular-nums">
            {doseNum > 0 && waterNum > 0
              ? `1:${(waterNum / doseNum).toFixed(1)}`
              : "–"}
          </span>
        </div>
      </div>
      {(errors.doseG || errors.waterMl || errors.tempC) && (
        <p className="-mt-3 text-sm font-medium text-danger">
          {errors.doseG ?? errors.waterMl ?? errors.tempC}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted">Grind</span>
        <ChipRadios
          name="grindLevel"
          options={grindOptions}
          defaultValue={values.grindLevel}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-muted">Method</span>
          <span className="text-sm text-muted tabular-nums">
            {rows.length} steps · {readyLabel(steps)}
          </span>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-3">
          <PourChart steps={steps} waterMl={waterNum} />
        </div>

        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const isEnjoy = r.action === "enjoy";
            const weighted = WEIGHTED_ACTIONS.has(r.action);
            return (
              <li
                key={r.key}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2.5"
              >
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Step ${i + 1} time`}
                    value={r.atText}
                    inputMode="numeric"
                    onChange={(e) => {
                      const t = parseTime(e.target.value);
                      update(
                        r.key,
                        t == null
                          ? { atText: e.target.value }
                          : { atText: e.target.value, at: t },
                      );
                    }}
                    onBlur={commitTimes}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), commitTimes())
                    }
                    className="w-16 rounded-lg bg-surface-2 px-2 py-2 text-center font-semibold text-accent tabular-nums outline-none"
                  />
                  {isEnjoy ? (
                    <span className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 font-semibold">
                      Enjoy{" "}
                      <span className="text-xs font-normal text-muted">
                        final step
                      </span>
                    </span>
                  ) : (
                    <select
                      aria-label={`Step ${i + 1} action`}
                      value={r.action}
                      onChange={(e) => {
                        const action = e.target.value as StepAction;
                        update(r.key, {
                          action,
                          targetG: WEIGHTED_ACTIONS.has(action)
                            ? (r.targetG ?? (waterNum || null))
                            : null,
                        });
                      }}
                      className="min-w-0 flex-1 rounded-lg bg-surface-2 px-2 py-2 font-medium outline-none"
                    >
                      {PICKABLE_ACTIONS.map((a) => (
                        <option key={a} value={a}>
                          {ACTION_LABELS[a]}
                        </option>
                      ))}
                    </select>
                  )}
                  {weighted && (
                    <span className="flex items-baseline gap-1 rounded-lg bg-surface-2 px-2 py-2">
                      <span className="text-xs text-muted">to</span>
                      <input
                        aria-label={`Step ${i + 1} scale target`}
                        value={r.targetG ?? ""}
                        inputMode="numeric"
                        onChange={(e) =>
                          update(r.key, {
                            targetG:
                              e.target.value === ""
                                ? null
                                : Math.max(
                                    0,
                                    Math.round(Number(e.target.value) || 0),
                                  ),
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && e.preventDefault()
                        }
                        className="w-11 bg-transparent text-right font-semibold tabular-nums outline-none"
                      />
                      <span className="text-sm text-muted">g</span>
                    </span>
                  )}
                  {isEnjoy ? (
                    <span className="size-9 shrink-0" />
                  ) : (
                    <button
                      type="button"
                      aria-label={`Remove step ${i + 1}`}
                      onClick={() =>
                        setRows((rs) => rs.filter((x) => x.key !== r.key))
                      }
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-muted"
                    >
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Step ${i + 1} note`}
                    value={r.note}
                    onChange={(e) => update(r.key, { note: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    placeholder="Note (optional)"
                    maxLength={200}
                    className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm outline-none placeholder:text-muted"
                  />
                  {pours[i] != null && (
                    <span className="shrink-0 text-xs text-muted tabular-nums">
                      pours {pours[i]} g
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={addStep}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 font-medium text-accent"
        >
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add step
        </button>

        {errors.steps && (
          <p className="text-sm font-medium text-danger">{errors.steps}</p>
        )}
        {warnings.map((w) => (
          <p
            key={w}
            className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent"
          >
            {w}
          </p>
        ))}
      </div>

      <Field label="Notes" optional>
        <textarea
          name="notes"
          rows={3}
          defaultValue={values.notes ?? ""}
          placeholder="Source, tips, what to adjust"
          className={`${inputClass} resize-none`}
        />
      </Field>
    </div>
  );
}

function NumberCell({
  label,
  unit,
  name,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  unit: string;
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="flex flex-col items-center gap-1 p-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="flex items-baseline gap-1">
        <input
          name={name}
          inputMode="decimal"
          autoComplete="off"
          {...(onChange
            ? {
                value,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange(e.target.value),
              }
            : { defaultValue })}
          className="w-16 bg-transparent text-center text-2xl font-semibold tabular-nums outline-none"
        />
        <span className="text-sm text-muted">{unit}</span>
      </span>
    </label>
  );
}
