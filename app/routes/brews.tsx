import { Link, Outlet, useOutlet } from "react-router";

import { RatingPill } from "~/components/bean";
import { EmptyState } from "~/components/empty-state";
import type { RouteHandle } from "~/components/route-handle";
import { CompassGlyph } from "~/components/taste-compass";
import { FLAVOUR_LABELS } from "~/lib/brew";
import { listBrews } from "~/lib/brews.server";
import { describeCompass } from "~/lib/compass";
import { formatGrind } from "~/lib/equipment";
import type { Route } from "./+types/brews";

export const handle: RouteHandle = { title: "Brews" };
export const meta: Route.MetaFunction = () => [{ title: "Brews · B{ean}log" }];

export async function loader() {
  const brews = await listBrews();
  // Labels like "Today, 7:42" are made on the server (in TZ) so they match after hydration.
  const now = new Date();
  const day = (d: Date) => d.toDateString();
  const yesterday = new Date(now.getTime() - 86400000);
  const when = (d: Date) => {
    const time = d.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
    });
    if (day(d) === day(now)) return `Today, ${time}`;
    if (day(d) === day(yesterday)) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString("en-CA", { month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }) })}, ${time}`;
  };
  return { brews: brews.map((b) => ({ ...b, when: when(b.brewedAt) })) };
}

// The list stays rendered under brew entry and brew detail on desktop (they
// open as drawers); on the phone those pages replace it.
export default function Brews({ loaderData, params }: Route.ComponentProps) {
  const child = useOutlet();
  const openId = (params as { brewId?: string }).brewId;
  const { brews } = loaderData;
  return (
    <>
      <div className={child ? "hidden lg:block" : undefined}>
        <div className="mx-auto max-w-5xl py-4 px-safe lg:px-8 lg:py-6">
          {brews.length === 0 ? (
            <EmptyState title="No brews yet">
              Tap Log to record your first one.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
              {brews.map((b) => {
                const compass =
                  b.compassStrength != null
                    ? {
                        strength: b.compassStrength,
                        extraction: b.compassExtraction!,
                      }
                    : null;
                return (
                  <Link
                    key={b.id}
                    to={`/brews/${b.id}`}
                    className={`flex flex-col gap-2 rounded-2xl border bg-surface p-3 ${openId === String(b.id) ? "border-accent ring-1 ring-accent" : "border-line"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{b.coffee}</p>
                        <p className="truncate text-sm text-muted">
                          {b.roaster}
                        </p>
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
              })}
            </div>
          )}
        </div>
      </div>
      <Outlet />
    </>
  );
}
