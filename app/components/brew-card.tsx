import { Link } from "react-router";

import { RatingPill } from "./bean";
import { CompassGlyph } from "./taste-compass";
import { FLAVOUR_LABELS } from "~/lib/brew";
import { describeCompass } from "~/lib/compass";
import type { FlavourNote, GrinderKind } from "~/lib/domain";
import { formatGrind } from "~/lib/equipment";

export type BrewCardData = {
  id: number;
  when: string;
  coffee: string;
  roaster: string;
  recipe: string | null;
  brewer: string;
  doseG: number;
  waterMl: number;
  tempC: number;
  grindSetting: number;
  grinderKind: GrinderKind;
  grinderStep: number;
  grinderUnit: string | null;
  rating: number | null;
  compassStrength: number | null;
  compassExtraction: number | null;
  flavourNotes: FlavourNote[];
};

export function BrewCard({
  brew: b,
  to,
  selected,
}: {
  brew: BrewCardData;
  to: string;
  selected?: boolean;
}) {
  const compass =
    b.compassStrength != null
      ? { strength: b.compassStrength, extraction: b.compassExtraction! }
      : null;
  return (
    <Link
      to={to}
      className={`flex flex-col gap-2 rounded-2xl border bg-surface p-3 ${selected ? "border-accent ring-1 ring-accent" : "border-line"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{b.coffee}</p>
          <p className="truncate text-sm text-muted">{b.roaster}</p>
        </div>
        {b.rating != null ? (
          <RatingPill value={b.rating} />
        ) : (
          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-sm text-muted">
            Not rated
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums">
        <span>{b.brewer}</span>
        <span className="text-muted">
          {b.doseG} g → {b.waterMl} ml
        </span>
        <span className="text-muted">{b.tempC}°C</span>
        <span className="text-muted">
          {formatGrind(
            {
              settingKind: b.grinderKind,
              step: b.grinderStep,
              unit: b.grinderUnit,
            },
            b.grindSetting,
          )}
        </span>
      </div>
      {(compass || b.flavourNotes.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {compass && (
            <span className="mr-1 flex items-center gap-1.5 text-sm">
              <CompassGlyph value={compass} className="size-6" />
              {describeCompass(compass)}
            </span>
          )}
          {b.flavourNotes.map((f) => (
            <span
              key={f}
              className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium"
            >
              {FLAVOUR_LABELS[f]}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{b.recipe ?? "No recipe"}</span>
        <span>{b.when}</span>
      </div>
    </Link>
  );
}
