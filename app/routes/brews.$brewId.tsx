import { useState } from "react";
import { data, Form, Link, redirect, useLocation } from "react-router";

import { RatingPill } from "~/components/bean";
import { primaryButton } from "~/components/fields";
import { MethodSteps } from "~/components/method-steps";
import { Overlay } from "~/components/overlay";
import type { RouteHandle } from "~/components/route-handle";
import { CompassGlyph } from "~/components/taste-compass";
import { FLAVOUR_LABELS, whenLabel } from "~/lib/brew";
import { deleteBrew, getBrew } from "~/lib/brews.server";
import { PROCESS_LABELS } from "~/lib/coffee";
import { adviseCompass, describeCompass } from "~/lib/compass";
import { formatGrind } from "~/lib/equipment";
import { GRIND_LEVEL_LABELS, isScaled, scaleFactors } from "~/lib/recipe";
import type { Route } from "./+types/brews.$brewId";

export const handle: RouteHandle = { title: "Brew", overlay: true };
export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData?.brew.coffee ?? "Brew"} · B{ean}log` },
];

const idOf = (params: { brewId: string }) => {
  const id = Number(params.brewId);
  if (!Number.isInteger(id) || id <= 0)
    throw data("Not found", { status: 404 });
  return id;
};

export async function loader({ params }: Route.LoaderArgs) {
  const brew = await getBrew(idOf(params));
  if (!brew) throw data("Brew not found", { status: 404 });
  return { brew: { ...brew, when: whenLabel(brew.brewedAt) } };
}

export async function action({ request, params }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") !== "delete")
    throw data("Unknown action", { status: 400 });
  await deleteBrew(idOf(params));
  // Back to the list, keeping any filters it had.
  return redirect(`/brews${new URL(request.url).search}`);
}

export default function BrewDetail({ loaderData }: Route.ComponentProps) {
  const { brew } = loaderData;
  const { search } = useLocation();
  const snap = brew.snapshot;
  const scale = snap ? scaleFactors(snap, brew) : null;
  const compass =
    brew.compassStrength != null
      ? { strength: brew.compassStrength, extraction: brew.compassExtraction! }
      : null;
  const grind = formatGrind(
    {
      settingKind: brew.grinderKind,
      step: brew.grinderStep,
      unit: brew.grinderUnit,
    },
    brew.grindSetting,
  );

  // "+1 g vs recipe" against the snapshot, i.e. the recipe as it was when brewed.
  const delta = (
    v: number,
    base: number | undefined,
    unit: string,
    decimals = 0,
  ) => {
    if (base == null || v === base) return null;
    const d = v - base;
    return (
      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
        {d > 0 ? "+" : "−"}
        {Math.abs(d).toFixed(decimals).replace(/\.0$/, "")}
        {unit} vs recipe
      </span>
    );
  };
  const row = (
    label: string,
    value: React.ReactNode,
    extra?: React.ReactNode,
  ) => (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 tabular-nums">
      <span className="text-sm text-muted">{label}</span>
      <span className="flex flex-wrap items-center justify-end gap-2 text-right font-medium">
        {extra}
        {value}
      </span>
    </div>
  );

  return (
    <Overlay title="Brew" closeTo={`/brews${search}`}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            {brew.when}
          </p>
          <Link
            to={`/coffee/${brew.coffeeId}`}
            className="text-2xl font-semibold tracking-tight text-balance hover:underline"
          >
            {brew.coffee}
          </Link>
          <p className="text-muted">
            {brew.roaster} · {PROCESS_LABELS[brew.process]}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
          {brew.rating != null ? (
            <span className="self-start">
              <RatingPill value={brew.rating} size="lg" />
            </span>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-muted">Not rated yet</span>
              <Link to={`edit${search}`} className="text-sm text-accent">
                Rate it
              </Link>
            </div>
          )}
          {compass && (
            <div className="flex items-center gap-3 border-t border-line pt-3">
              <CompassGlyph value={compass} className="size-16" />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">
                  {describeCompass(compass)}
                </span>
                <span className="text-sm text-muted">
                  <b className="text-accent">Next time:</b>{" "}
                  {adviseCompass(compass)}
                </span>
              </div>
            </div>
          )}
          {brew.flavourNotes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {brew.flavourNotes.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-line px-2.5 py-1 text-sm"
                >
                  {FLAVOUR_LABELS[f]}
                </span>
              ))}
            </div>
          )}
          {brew.notes && (
            <p className="text-[15px] leading-relaxed whitespace-pre-line">
              {brew.notes}
            </p>
          )}
        </div>

        <Section title="Brew">
          <div className="flex flex-col divide-y divide-line">
            {row("Brewer", brew.brewer)}
            {row(
              "Dose",
              `${brew.doseG} g`,
              delta(brew.doseG, snap?.doseG, " g", 1),
            )}
            {row(
              "Water",
              `${brew.waterMl} ml`,
              delta(brew.waterMl, snap?.waterMl, " ml"),
            )}
            {row(
              "Temp",
              `${brew.tempC}°C`,
              delta(brew.tempC, snap?.tempC, "°C"),
            )}
            {row("Ratio", `1:${(brew.waterMl / brew.doseG).toFixed(1)}`)}
            {row(
              "Grind",
              <>
                {grind}{" "}
                <span className="font-normal text-muted">· {brew.grinder}</span>
              </>,
            )}
          </div>
        </Section>

        {snap && scale ? (
          <Section title="Recipe">
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-baseline justify-between gap-3">
                {brew.recipeId && !brew.recipeArchived ? (
                  <Link
                    to={`/recipes/${brew.recipeId}`}
                    className="font-semibold hover:underline"
                  >
                    {brew.recipe}
                  </Link>
                ) : (
                  <span className="font-semibold">
                    {brew.recipe}{" "}
                    {brew.recipeArchived && (
                      <span className="text-xs font-normal text-muted">
                        (archived)
                      </span>
                    )}
                  </span>
                )}
                <span className="text-sm text-muted">
                  {GRIND_LEVEL_LABELS[snap.grindLevel].toLowerCase()} grind
                </span>
              </div>
              {(isScaled(scale.dose) || isScaled(scale.water)) && (
                <div className="flex flex-wrap gap-1.5">
                  {isScaled(scale.dose) &&
                    snap.steps.some((s) => s.action === "bloom") && (
                      <Pill>Scaled to {brew.doseG} g</Pill>
                    )}
                  {isScaled(scale.water) && (
                    <Pill>Scaled to {brew.waterMl} ml</Pill>
                  )}
                </div>
              )}
              <MethodSteps steps={snap.steps} scale={scale} />
            </div>
          </Section>
        ) : (
          <p className="text-sm text-muted">Brewed without a recipe.</p>
        )}

        <div className="flex flex-col gap-2 pb-2">
          <Link
            to={`/brews/new?again=${brew.id}`}
            className={`${primaryButton} text-center`}
          >
            Brew again
          </Link>
          <BrewActions search={search} />
        </div>
      </div>
    </Overlay>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted">{title}</span>
      <div className="rounded-2xl border border-line bg-surface">
        {children}
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent tabular-nums">
      {children}
    </span>
  );
}

function BrewActions({ search }: { search: string }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming)
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3">
        <span className="text-sm">Delete this brew? This can't be undone.</span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium"
          >
            Keep
          </button>
          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <button className="rounded-full bg-danger px-3.5 py-1.5 text-sm font-medium text-surface">
              Delete
            </button>
          </Form>
        </div>
      </div>
    );
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link
        to={`edit${search}`}
        className="rounded-2xl border border-line bg-surface py-3 text-center font-medium"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-2xl border border-line bg-surface py-3 font-medium text-danger"
      >
        Delete
      </button>
    </div>
  );
}
