import { useEffect, useMemo, useState } from "react";
import { Link, useFetcher } from "react-router";

import { BeanSlider } from "./bean-slider";
import { ChipRadios } from "./chips";
import { Field, inputClass, primaryButton } from "./fields";
import { MethodSteps } from "./method-steps";
import { Sheet } from "./sheet";
import { Stepper } from "./stepper";
import { TasteCompass } from "./taste-compass";
import { FLAVOUR_LABELS } from "~/lib/brew";
import { formatDate } from "~/lib/coffee";
import { describeCompass, fitZero, type Compass } from "~/lib/compass";
import {
  FLAVOUR_NOTES,
  GRINDER_KINDS,
  type FlavourNote,
  type GrinderKind,
  type RecipeStep,
} from "~/lib/domain";
import { DIAL_STEPS, formatGrind, KIND_LABELS } from "~/lib/equipment";
import {
  GRIND_LEVEL_LABELS,
  isScaled,
  readyLabel,
  scaleFactors,
} from "~/lib/recipe";

// ---------- Types ----------

type Bag = {
  id: number;
  coffeeId: number;
  coffee: string;
  roaster: string;
  roastedOn: string;
};
type Recipe = {
  id: number;
  name: string;
  brewerId: number;
  brewer: string;
  doseG: number;
  waterMl: number;
  tempC: number;
  grindLevel: keyof typeof GRIND_LEVEL_LABELS;
  steps: RecipeStep[];
};
type Grinder = {
  id: number;
  name: string;
  settingKind: GrinderKind;
  step: number;
  unit: string | null;
};
type History = {
  coffeeId: number;
  brewerId: number;
  grinderId: number;
  grindSetting: number;
  compassStrength: number | null;
  compassExtraction: number | null;
};

export type BrewFormData = {
  bagOptions: Bag[];
  recipeOptions: Recipe[];
  brewerOptions: { id: number; name: string }[];
  grinderOptions: Grinder[];
  history: History[];
};

export type BrewFormInitial = {
  brewedAt: string; // datetime-local value
  bagId: number | null;
  recipeId: number | null;
  brewerId: number | null;
  doseG: number;
  waterMl: number;
  tempC: number;
  grinderId: number | null;
  grindSetting: number;
  rating: number | null;
  compass: Compass | null;
  flavourNotes: FlavourNote[];
  notes: string;
};

const decimalsFor = (step: number) => (step >= 1 ? 0 : step === 0.25 ? 2 : 1);
const snap = (v: number, step: number) =>
  Number((Math.round(v / step) * step).toFixed(4));

// ---------- Form ----------

/**
 * The brew form. Picking a recipe prefills brewer (locked), dose, water and
 * temperature; anything you change shows "Recipe … · Reset". The recipe's
 * method is shown scaled to your dose and water. Grind hints come from your
 * history with this grinder, brewer and coffee.
 */
export function BrewFields({
  data,
  initial,
  errors = {},
}: {
  data: BrewFormData;
  initial: BrewFormInitial;
  errors?: Record<string, string>;
}) {
  const [bagId, setBagId] = useState(
    initial.bagId ?? data.bagOptions[0]?.id ?? null,
  );
  const [recipeId, setRecipeId] = useState(initial.recipeId);
  const [brewerId, setBrewerId] = useState(
    initial.brewerId ?? data.brewerOptions[0]?.id ?? null,
  );
  const [dose, setDose] = useState(initial.doseG);
  const [water, setWater] = useState(initial.waterMl);
  const [temp, setTemp] = useState(initial.tempC);
  const [grinderId, setGrinderId] = useState(
    initial.grinderId ?? data.grinderOptions[0]?.id ?? null,
  );
  const [grind, setGrind] = useState(initial.grindSetting);
  const [rating, setRating] = useState(initial.rating);
  const [compass, setCompass] = useState(initial.compass);
  const [flavours, setFlavours] = useState(initial.flavourNotes);
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState<"brewer" | "grinder" | null>(null);

  const recipe = data.recipeOptions.find((r) => r.id === recipeId) ?? null;
  const bag = data.bagOptions.find((b) => b.id === bagId) ?? null;
  const grinder = data.grinderOptions.find((g) => g.id === grinderId) ?? null;
  const grindStep = grinder
    ? grinder.settingKind === "clicks"
      ? 1
      : grinder.step
    : 1;
  const grindUnit = grinder
    ? grinder.settingKind === "clicks"
      ? "clicks"
      : (grinder.unit ?? "")
    : "";

  // Last setting used with this grinder and brewer.
  const lastOnGrinder = data.history.find(
    (h) => h.grinderId === grinderId && h.brewerId === brewerId,
  )?.grindSetting;

  const applyRecipe = (r: Recipe | null) => {
    setRecipeId(r?.id ?? null);
    if (r) {
      setBrewerId(r.brewerId);
      setDose(r.doseG);
      setWater(r.waterMl);
      setTemp(r.tempC);
      const last = data.history.find(
        (h) => h.grinderId === grinderId && h.brewerId === r.brewerId,
      )?.grindSetting;
      if (last != null) setGrind(last);
    }
  };

  // Compass history for this coffee on this brewer and grinder → hints.
  const sameSetup = useMemo(
    () =>
      data.history.filter(
        (h) =>
          h.coffeeId === bag?.coffeeId &&
          h.brewerId === brewerId &&
          h.grinderId === grinderId &&
          h.compassExtraction != null,
      ),
    [data.history, bag?.coffeeId, brewerId, grinderId],
  );
  const trend = fitZero(
    sameSetup.map(
      (h) => [h.grindSetting, h.compassExtraction!] as [number, number],
    ),
  );
  const trendAim = trend?.x0 != null ? snap(trend.x0, grindStep) : null;

  const scale = recipe
    ? scaleFactors(recipe, { doseG: dose, waterMl: water })
    : null;
  const ratio = dose > 0 && water > 0 ? `1:${(water / dose).toFixed(1)}` : "–";
  const recipeRatio = recipe
    ? `1:${(recipe.waterMl / recipe.doseG).toFixed(1)}`
    : null;

  const override = (
    current: number,
    base: number | undefined,
    unit: string,
    reset: () => void,
  ) => {
    if (!recipe || base == null) return null;
    return current === base ? (
      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
        From recipe
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent tabular-nums">
        Recipe {base}
        {unit}
        <button type="button" onClick={reset} className="ml-1 underline">
          Reset
        </button>
      </span>
    );
  };

  const fmtGrind = (v: number) =>
    grinder ? formatGrind(grinder, v) : String(v);

  return (
    <div className="flex flex-col gap-5">
      {/* Values the controls hold in state */}
      <input type="hidden" name="recipeId" value={recipeId ?? ""} />
      <input type="hidden" name="brewerId" value={brewerId ?? ""} />
      <input type="hidden" name="grinderId" value={grinderId ?? ""} />
      {errors.form && (
        <p className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">
          {errors.form}
        </p>
      )}

      {/* Recipe */}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted">
          Recipe <span className="font-normal">· optional</span>
        </span>
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left"
        >
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${recipe ? "bg-accent-soft text-accent" : "border border-dashed border-line text-muted"}`}
          >
            {recipe ? "≡" : "+"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">
              {recipe ? recipe.name : "No recipe"}
            </span>
            <span className="block truncate text-sm text-muted tabular-nums">
              {recipe
                ? `${recipe.brewer} · ${recipe.doseG} g / ${recipe.waterMl} ml · ${recipe.steps.length} steps`
                : "Pick one to prefill the brew"}
            </span>
          </span>
          <span className="text-sm text-accent">
            {recipe ? "Change" : "Choose"}
          </span>
        </button>
        {errors.recipeId && <ErrorText>{errors.recipeId}</ErrorText>}
      </div>

      {/* Coffee */}
      <Field label="Coffee" error={errors.bagId}>
        {data.bagOptions.length ? (
          <select
            name="bagId"
            value={bagId ?? ""}
            onChange={(e) => setBagId(Number(e.target.value))}
            className={`${inputClass} font-medium`}
          >
            {data.bagOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.coffee} · {b.roaster} · roasted {formatDate(b.roastedOn)}
              </option>
            ))}
          </select>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-3 text-sm text-muted">
            No coffee on the shelf.{" "}
            <Link to="/coffee/new" className="text-accent underline">
              Add a coffee
            </Link>{" "}
            first.
          </p>
        )}
      </Field>

      {/* Brewer: locked to the recipe's when one is picked */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted">Brewer</span>
          {recipe && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              Set by recipe
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {data.brewerOptions.map((b) => {
            const on = b.id === brewerId;
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={on}
                disabled={!!recipe && !on}
                onClick={() => setBrewerId(b.id)}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium disabled:opacity-35 ${on ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface"}`}
              >
                {b.name}
              </button>
            );
          })}
          {!recipe && (
            <button
              type="button"
              onClick={() => setAdding("brewer")}
              className="rounded-full border border-dashed border-line px-3.5 py-2 text-sm font-medium text-accent"
            >
              + Add
            </button>
          )}
        </div>
        {errors.brewerId && <ErrorText>{errors.brewerId}</ErrorText>}
      </div>

      {/* Dose, water, temperature */}
      <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
        <Stepper
          label="Dose"
          unit="g"
          name="doseG"
          value={dose}
          onChange={setDose}
          step={0.5}
          min={1}
          max={100}
          decimals={1}
          aside={override(dose, recipe?.doseG, " g", () =>
            setDose(recipe!.doseG),
          )}
        />
        <Stepper
          label="Water"
          unit="ml"
          name="waterMl"
          value={water}
          onChange={setWater}
          step={5}
          min={10}
          max={3000}
          aside={override(water, recipe?.waterMl, " ml", () =>
            setWater(recipe!.waterMl),
          )}
        />
        <Stepper
          label="Temp"
          unit="°C"
          name="tempC"
          value={temp}
          onChange={setTemp}
          step={1}
          min={0}
          max={100}
          aside={override(temp, recipe?.tempC, "°C", () =>
            setTemp(recipe!.tempC),
          )}
        />
        <div className="flex items-center justify-between px-3 py-2.5 text-sm">
          <span className="text-muted">Ratio</span>
          <span className="font-semibold tabular-nums">
            {ratio}
            {recipeRatio && recipeRatio !== ratio && (
              <span className="font-normal text-muted">
                {" "}
                · recipe {recipeRatio}
              </span>
            )}
          </span>
        </div>
      </div>
      {(errors.doseG || errors.waterMl || errors.tempC) && (
        <ErrorText>{errors.doseG ?? errors.waterMl ?? errors.tempC}</ErrorText>
      )}

      {/* Grind */}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted">Grind</span>
        <div className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {(recipe ||
            lastOnGrinder != null ||
            sameSetup[0] ||
            trendAim != null) && (
            <div className="flex flex-col gap-1 bg-accent-soft p-3 text-sm">
              {recipe && (
                <p>
                  Recipe suggests{" "}
                  <b>{GRIND_LEVEL_LABELS[recipe.grindLevel].toLowerCase()}</b>
                </p>
              )}
              {lastOnGrinder != null && (
                <p className="text-muted">
                  Last {data.brewerOptions.find((b) => b.id === brewerId)?.name}{" "}
                  on {grinder?.name}:{" "}
                  <HintButton onClick={() => setGrind(lastOnGrinder)}>
                    {fmtGrind(lastOnGrinder)}
                  </HintButton>
                </p>
              )}
              {sameSetup[0] && (
                <p className="text-muted">
                  Last time this coffee was{" "}
                  <b className="text-fg">
                    {describeCompass({
                      strength: sameSetup[0].compassStrength!,
                      extraction: sameSetup[0].compassExtraction!,
                    }).toLowerCase()}
                  </b>{" "}
                  at {fmtGrind(sameSetup[0].grindSetting)}.
                </p>
              )}
              {trendAim != null && (
                <p className="text-muted">
                  Your trend for this coffee balances at{" "}
                  <HintButton onClick={() => setGrind(trendAim)}>
                    {fmtGrind(trendAim)}
                  </HintButton>{" "}
                  <span className="text-xs">({sameSetup.length} brews)</span>
                </p>
              )}
            </div>
          )}
          <label className="flex items-center justify-between gap-3 p-3">
            <span className="text-sm text-muted">Grinder</span>
            <select
              value={grinderId ?? ""}
              onChange={(e) => {
                if (e.target.value === "__add") return setAdding("grinder");
                const g = data.grinderOptions.find(
                  (x) => x.id === Number(e.target.value),
                )!;
                setGrinderId(g.id);
                setGrind((v) =>
                  snap(v, g.settingKind === "clicks" ? 1 : g.step),
                );
              }}
              className="min-w-0 bg-transparent text-right font-medium outline-none"
            >
              {data.grinderOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
              <option value="__add">+ Add grinder…</option>
            </select>
          </label>
          <Stepper
            label="Setting"
            unit={grindUnit}
            name="grindSetting"
            value={grind}
            onChange={setGrind}
            step={grindStep}
            min={0}
            max={9999}
            decimals={decimalsFor(grindStep)}
          />
        </div>
        {(errors.grinderId || errors.grindSetting) && (
          <ErrorText>{errors.grinderId ?? errors.grindSetting}</ErrorText>
        )}
      </div>

      {/* Method, scaled to this brew; collapsed by default */}
      {recipe && scale && (
        <details className="group overflow-hidden rounded-2xl border border-line bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2.5 2.5M10 2h4" />
              </svg>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-semibold">Method</span>
              <span className="flex flex-wrap gap-1.5">
                {isScaled(scale.dose) &&
                  recipe.steps.some((s) => s.action === "bloom") && (
                    <ScalePill>Scaled to {dose} g</ScalePill>
                  )}
                {isScaled(scale.water) && (
                  <ScalePill>Scaled to {water} ml</ScalePill>
                )}
                {!isScaled(scale.water) &&
                  !(
                    isScaled(scale.dose) &&
                    recipe.steps.some((s) => s.action === "bloom")
                  ) && (
                    <span className="text-sm text-muted tabular-nums">
                      {recipe.steps.length} steps · {readyLabel(recipe.steps)}
                    </span>
                  )}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent">
              <span className="group-open:hidden">Show</span>
              <span className="hidden group-open:inline">Hide</span>
              <svg
                className="size-4 transition-transform group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </summary>
          <div className="border-t border-line px-3 pb-1">
            <MethodSteps steps={recipe.steps} scale={scale} />
          </div>
        </details>
      )}

      {/* Tasting */}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted">
          Tasting <span className="font-normal">· optional, can add later</span>
        </span>
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-3">
          <TasteCompass value={compass} onChange={setCompass} />
          {(errors.compass ||
            errors.compassStrength ||
            errors.compassExtraction) && (
            <ErrorText>
              {errors.compass ??
                errors.compassStrength ??
                errors.compassExtraction}
            </ErrorText>
          )}
          <div className="border-t border-line" />
          <BeanSlider value={rating} onChange={setRating} name="rating" />
          {errors.rating && <ErrorText>{errors.rating}</ErrorText>}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Flavour notes</span>
            <div className="flex flex-wrap gap-2">
              {FLAVOUR_NOTES.map((f) => (
                <label key={f} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="flavourNotes"
                    value={f}
                    checked={flavours.includes(f)}
                    onChange={(e) =>
                      setFlavours((xs) =>
                        e.target.checked
                          ? [...xs, f]
                          : xs.filter((x) => x !== f),
                      )
                    }
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full border border-line bg-surface px-3 py-1.5 text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-medium peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                    {FLAVOUR_LABELS[f]}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <textarea
            name="notes"
            rows={2}
            defaultValue={initial.notes}
            placeholder="Anything else?"
            className="w-full resize-none rounded-xl bg-surface-2 p-2.5 outline-none"
          />
        </div>
      </div>

      <Field label="Brewed at" error={errors.brewedAt}>
        <input
          type="datetime-local"
          name="brewedAt"
          defaultValue={initial.brewedAt}
          required
          className={`${inputClass} min-w-0`}
        />
      </Field>

      {picking && (
        <RecipePicker
          recipes={data.recipeOptions}
          current={recipeId}
          onPick={(r) => {
            applyRecipe(r);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {adding && (
        <QuickAdd
          type={adding}
          onClose={() => setAdding(null)}
          onAdded={(id) => {
            if (adding === "brewer") setBrewerId(id);
            else setGrinderId(id);
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}

function ErrorText({ children }: { children: string }) {
  return <p className="text-sm font-medium text-danger">{children}</p>;
}

function HintButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-semibold text-accent tabular-nums underline"
    >
      {children}
    </button>
  );
}

function ScalePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent tabular-nums">
      {children}
    </span>
  );
}

// ---------- Recipe picker ----------

function RecipePicker({
  recipes,
  current,
  onPick,
  onClose,
}: {
  recipes: Recipe[];
  current: number | null;
  onPick: (r: Recipe | null) => void;
  onClose: () => void;
}) {
  const row = (r: Recipe | null) => (
    <button
      key={r?.id ?? "none"}
      type="button"
      onClick={() => onPick(r)}
      className={`flex flex-col gap-1 rounded-2xl border bg-surface p-3 text-left ${current === (r?.id ?? null) ? "border-accent ring-1 ring-accent" : "border-line"}`}
    >
      <span className="font-semibold">{r ? r.name : "No recipe"}</span>
      <span className="text-sm text-muted tabular-nums">
        {r
          ? `${r.brewer} · ${r.doseG} g · ${r.waterMl} ml · ${r.tempC}°C · ${GRIND_LEVEL_LABELS[r.grindLevel].toLowerCase()}`
          : "Enter everything yourself"}
      </span>
    </button>
  );
  return (
    <Sheet title="Choose recipe" onClose={onClose}>
      <div className="flex flex-col gap-2 pb-2">
        {row(null)}
        {recipes.map(row)}
        {recipes.length === 0 && (
          <p className="text-sm text-muted">
            No recipes yet.{" "}
            <Link to="/recipes/new" className="text-accent underline">
              Create one
            </Link>
            .
          </p>
        )}
      </div>
    </Sheet>
  );
}

// ---------- Equipment quick-add (posts to /equipment without leaving the form) ----------

type QuickAddResult = { ok: true; id: number } | { ok: false; error: string };

function QuickAdd({
  type,
  onClose,
  onAdded,
}: {
  type: "brewer" | "grinder";
  onClose: () => void;
  onAdded: (id: number) => void;
}) {
  const fetcher = useFetcher<QuickAddResult>();
  const [kind, setKind] = useState<GrinderKind>("clicks");
  const busy = fetcher.state !== "idle";

  // The form's loader revalidates after the post, so the new item is in the
  // lists by the time we select it.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) onAdded(fetcher.data.id);
  }, [fetcher.state, fetcher.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet
      title={type === "brewer" ? "New brewer" : "New grinder"}
      onClose={onClose}
    >
      {/* A separate form: the sheet renders inside the brew form, so this posts with the fetcher instead */}
      <div className="flex flex-col gap-4 pb-2">
        <Field
          label="Name"
          error={
            fetcher.data && !fetcher.data.ok ? fetcher.data.error : undefined
          }
        >
          <input
            id="quick-name"
            placeholder={
              type === "brewer" ? "e.g. Kalita Wave" : "e.g. Comandante C40"
            }
            autoComplete="off"
            autoFocus
            // Enter would otherwise submit the brew form around this sheet.
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            className={inputClass}
          />
        </Field>
        {type === "grinder" && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-muted">
                Setting type
              </span>
              <ChipRadios
                name="quick-kind"
                options={GRINDER_KINDS.map(
                  (k) => [k, KIND_LABELS[k].label] as const,
                )}
                value={kind}
                onChange={setKind}
              />
              <p className="text-sm text-muted">{KIND_LABELS[kind].help}</p>
            </div>
            {kind === "dial" && (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-muted">
                  Step size
                </span>
                <ChipRadios
                  name="quick-step"
                  options={DIAL_STEPS.map(
                    (s) => [String(s), String(s)] as const,
                  )}
                  defaultValue="0.1"
                />
              </div>
            )}
            {kind === "stepless" && (
              <Field label="Unit" optional>
                <input
                  id="quick-unit"
                  placeholder="e.g. turns"
                  autoComplete="off"
                  className={inputClass}
                />
              </Field>
            )}
          </>
        )}
        <button
          type="button"
          disabled={busy}
          className={primaryButton}
          onClick={() => {
            const val = (id: string) =>
              (document.getElementById(id) as HTMLInputElement | null)?.value ??
              "";
            const step =
              (
                document.querySelector(
                  'input[name="quick-step"]:checked',
                ) as HTMLInputElement | null
              )?.value ?? "";
            fetcher.submit(
              type === "brewer"
                ? { type, name: val("quick-name") }
                : {
                    type,
                    name: val("quick-name"),
                    settingKind: kind,
                    step,
                    unit: val("quick-unit"),
                  },
              { method: "post", action: "/equipment" },
            );
          }}
        >
          {busy ? "Adding…" : type === "brewer" ? "Add brewer" : "Add grinder"}
        </button>
      </div>
    </Sheet>
  );
}
