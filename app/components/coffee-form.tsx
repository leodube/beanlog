import { useState } from "react";

import { ChipRadios } from "./chips";
import { Field, inputClass } from "./fields";
import { TagInput } from "./tag-input";
import {
  COMMON_BAG_SIZES,
  PROCESS_LABELS,
  ROAST_LEVEL_LABELS,
} from "~/lib/coffee";
import { ALL_CODES, countryOptions, ORIGIN_CODES } from "~/lib/countries";
import {
  PROCESSES,
  ROAST_LEVELS,
  type Process,
  type RoastLevel,
} from "~/lib/domain";

export type CoffeeFormValues = {
  name: string;
  roasterId: number | null;
  originCountry: string | null;
  region: string | null;
  producer: string | null;
  variety: string | null;
  process: Process;
  roastLevel: RoastLevel;
  tastingNotes: string[];
  notes: string | null;
};

const originOptions = countryOptions(ORIGIN_CODES);
const roasterCountryOptions = countryOptions(ALL_CODES);
const processOptions = PROCESSES.map((p) => [p, PROCESS_LABELS[p]] as const);
const levelOptions = ROAST_LEVELS.map(
  (l) => [l, ROAST_LEVEL_LABELS[l]] as const,
);

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted">{title}</span>
      {children}
    </div>
  );
}

/**
 * Coffee fields for both "new" and "edit". The roaster picker can add a
 * roaster inline (its fields appear when "+ New roaster…" is chosen), so
 * you never leave the form. `withBag` adds the first bag's fields.
 */
export function CoffeeFields({
  values,
  roasters,
  errors = {},
  withBag,
  today,
}: {
  values?: Partial<CoffeeFormValues>;
  roasters: { id: number; name: string }[];
  errors?: Record<string, string>;
  withBag?: boolean;
  today: string;
}) {
  const [roaster, setRoaster] = useState<string>(
    values?.roasterId
      ? String(values.roasterId)
      : roasters.length
        ? String(roasters[0].id)
        : "new",
  );

  return (
    <div className="flex flex-col gap-5">
      <Field label="Name" error={errors.name}>
        <input
          name="name"
          defaultValue={values?.name}
          placeholder="As it's named on the bag"
          autoComplete="off"
          required
          className={`${inputClass} text-lg font-semibold`}
        />
      </Field>

      <Group title="Roaster">
        <select
          name="roasterId"
          value={roaster}
          onChange={(e) => setRoaster(e.target.value)}
          className={`${inputClass} font-medium`}
        >
          {roasters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
          <option value="new">+ New roaster…</option>
        </select>
        {errors.roasterId && (
          <span className="text-sm font-medium text-danger">
            {errors.roasterId}
          </span>
        )}
        {roaster === "new" && (
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
            <Field label="Roaster name" error={errors.roasterName}>
              <input
                name="roasterName"
                placeholder="e.g. Northfold Coffee"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" optional>
                <input
                  name="roasterCity"
                  placeholder="e.g. Vancouver"
                  autoComplete="off"
                  className={inputClass}
                />
              </Field>
              <Field label="Country" optional error={errors.roasterCountry}>
                <select
                  name="roasterCountry"
                  defaultValue="CA"
                  className={inputClass}
                >
                  <option value="">—</option>
                  {roasterCountryOptions.map(([c, n]) => (
                    <option key={c} value={c}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}
      </Group>

      <Group title="Origin">
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
          <Field label="Country" error={errors.originCountry}>
            <select
              name="originCountry"
              defaultValue={values?.originCountry ?? "ET"}
              className={inputClass}
            >
              {originOptions.map(([c, n]) => (
                <option key={c} value={c}>
                  {n}
                </option>
              ))}
              <option value="">Blend / other</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Region" optional>
              <input
                name="region"
                defaultValue={values?.region ?? ""}
                placeholder="e.g. Guji"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <Field label="Producer" optional>
              <input
                name="producer"
                defaultValue={values?.producer ?? ""}
                placeholder="Farm or co-op"
                autoComplete="off"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Variety" optional>
            <input
              name="variety"
              defaultValue={values?.variety ?? ""}
              placeholder="e.g. Pink Bourbon"
              autoComplete="off"
              className={inputClass}
            />
          </Field>
        </div>
      </Group>

      <Group title="Process">
        <ChipRadios
          name="process"
          options={processOptions}
          defaultValue={values?.process ?? "washed"}
        />
        {errors.process && (
          <span className="text-sm font-medium text-danger">
            {errors.process}
          </span>
        )}
      </Group>
      <Group title="Roast level">
        <ChipRadios
          name="roastLevel"
          options={levelOptions}
          defaultValue={values?.roastLevel ?? "light"}
        />
        {errors.roastLevel && (
          <span className="text-sm font-medium text-danger">
            {errors.roastLevel}
          </span>
        )}
      </Group>

      {withBag && <BagFields today={today} errors={errors} />}

      <Group title="Roaster's tasting notes">
        <TagInput
          name="tastingNotes"
          defaultValue={values?.tastingNotes}
          placeholder="e.g. Blueberry, then Enter"
        />
        {errors.tastingNotes && (
          <span className="text-sm font-medium text-danger">
            {errors.tastingNotes}
          </span>
        )}
      </Group>

      <Field label="Notes" optional>
        <textarea
          name="notes"
          rows={3}
          defaultValue={values?.notes ?? ""}
          placeholder="Anything worth remembering about this coffee"
          className={`${inputClass} resize-none`}
        />
      </Field>
    </div>
  );
}

/** Roast date, bag size (with common sizes as chips) and notes for one bag. */
export function BagFields({
  today,
  values,
  errors = {},
}: {
  today: string;
  values?: { roastedOn: string; weightG: number; notes: string | null };
  errors?: Record<string, string>;
}) {
  const [weight, setWeight] = useState(String(values?.weightG ?? 250));
  return (
    <Group title="Bag">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Roast date" error={errors.roastedOn}>
            <input
              type="date"
              name="roastedOn"
              defaultValue={values?.roastedOn ?? today}
              max={today}
              required
              className={`${inputClass} min-w-0`}
            />
          </Field>
          <Field label="Bag size" error={errors.weightG}>
            <span className="flex items-baseline gap-1 rounded-xl border border-line bg-surface p-2.5 focus-within:border-accent">
              <input
                name="weightG"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                inputMode="numeric"
                required
                className="w-full min-w-0 bg-transparent tabular-nums outline-none"
              />
              <span className="text-sm text-muted">g</span>
            </span>
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_BAG_SIZES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setWeight(String(g))}
              className={`rounded-full border px-3 py-1 text-sm tabular-nums ${weight === String(g) ? "border-accent bg-accent-soft text-accent" : "border-line"}`}
            >
              {g >= 1000 ? `${g / 1000} kg` : `${g} g`}
            </button>
          ))}
        </div>
        <Field label="Bag notes" optional>
          <input
            name="bagNotes"
            defaultValue={values?.notes ?? ""}
            placeholder="e.g. Resting until the 26th"
            autoComplete="off"
            className={inputClass}
          />
        </Field>
      </div>
    </Group>
  );
}
