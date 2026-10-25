import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { GrindScatter } from "~/components/charts";
import { EmptyState } from "~/components/empty-state";
import { Picker } from "~/components/picker";
import { RatingCompassColumn } from "~/components/taste-compass";
import { fitZero } from "~/lib/compass";
import { formatGrind, formatGrindValue } from "~/lib/equipment";
import { dialingStats } from "~/lib/stats.server";
import { daysBetween, shortDate } from "~/lib/stats";
import type { Route } from "./+types/stats.dialing-in";

export const meta: Route.MetaFunction = () => [
  { title: "Dialing in · Stats · B{ean}log" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const num = (k: string) => Number(url.searchParams.get(k)) || null;
  const data = await dialingStats(num("bag"), num("roaster"));
  return {
    data,
    grinder: num("grinder"),
    recipe: url.searchParams.get("recipe") ?? "",
  };
}

type Brew = NonNullable<
  Route.ComponentProps["loaderData"]["data"]
>["brews"][number];

/** Charts appear for a setup once it has this many compass readings. */
const MIN_READINGS = 4;
/** Rows shown before "Show earlier brews". */
const LIMIT = 8;

/**
 * Dialing in, one bag at a time. With no setup picked, the list shows how each
 * recipe and grinder turned out. Pick a grinder and a recipe (a setup) to
 * follow it brew by brew: each row shows what changed since the setup's
 * previous brew, so switching recipe or grinder never reads as a grind change.
 */
export default function DialingIn({ loaderData }: Route.ComponentProps) {
  const { data } = loaderData;
  const navigate = useNavigate();
  if (!data)
    return (
      <EmptyState title="Nothing to dial in yet">
        Log a few brews and they'll show up here, one bag at a time.
      </EmptyState>
    );
  const { bag, brews } = data;

  // Grinder chips, then that grinder's recipe chips. A bag brewed on a single
  // grinder skips the grinder row: there's nothing to choose.
  const grinders = countBy(
    brews,
    (b) => b.grinderId,
    (b) => b.grinder,
  );
  const single = grinders.size === 1;
  const grinderId = single
    ? [...grinders.keys()][0]
    : grinders.has(loaderData.grinder ?? -1)
      ? loaderData.grinder
      : null;
  const onGrinder = brews.filter(
    (b) => grinderId == null || b.grinderId === grinderId,
  );
  const recipes = countBy(
    onGrinder,
    (b) => b.key,
    (b) => b.recipeLabel,
  );
  const recipe =
    grinderId != null && recipes.has(loaderData.recipe)
      ? loaderData.recipe
      : "";
  const setup = grinderId != null && recipe !== "";
  const shown = onGrinder.filter((b) => !recipe || b.key === recipe);

  const href = (p: { grinder?: number | null; recipe?: string }) => {
    const q = new URLSearchParams({ bag: String(bag.id) });
    if (p.grinder != null && !single) q.set("grinder", String(p.grinder));
    if (p.recipe) q.set("recipe", p.recipe);
    return `?${q}`;
  };

  const readings = setup
    ? shown.filter((b) => b.compassExtraction != null)
    : [];
  const first = shown[0];
  const fmt = (v: number) => (first ? formatGrindValue(first, v) : String(v));
  const best = shown.reduce<Brew | null>(
    (t, b) =>
      b.rating != null && (t == null || b.rating >= t.rating!) ? b : t,
    null,
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-2">
          <Picker text={bag.roaster}>
            <select
              aria-label="Roaster"
              value={bag.roasterId}
              onChange={(e) =>
                navigate(`?roaster=${e.target.value}`, {
                  preventScrollReset: true,
                })
              }
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {data.roasterOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Picker>
          <Picker text={bag.coffee}>
            <select
              aria-label="Bag"
              value={bag.id}
              onChange={(e) =>
                navigate(`?bag=${e.target.value}`, { preventScrollReset: true })
              }
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {data.bagOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.coffee} · roasted {shortDate(b.roastedOn)}
                  {b.finished ? " · finished" : ""}
                </option>
              ))}
            </select>
          </Picker>
        </div>
        <span className="text-sm text-muted tabular-nums">
          roasted {shortDate(bag.roastedOn)} · {brews.length} brew
          {brews.length === 1 ? "" : "s"}
          {bag.finished ? " · finished" : ""}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {!single && (
          <ChipRow label="Grinder">
            <Chip
              to={href({})}
              active={grinderId == null}
              label="All grinders"
              n={brews.length}
            />
            {[...grinders].map(([id, g]) => (
              <Chip
                key={id}
                to={href({ grinder: id })}
                active={grinderId === id}
                label={g.label}
                n={g.n}
              />
            ))}
          </ChipRow>
        )}
        {grinderId != null && (
          <ChipRow label="Recipe">
            <Chip
              to={href({ grinder: grinderId })}
              active={!recipe}
              label="All recipes"
              n={onGrinder.length}
            />
            {[...recipes].map(([k, r]) => (
              <Chip
                key={k}
                to={href({ grinder: grinderId, recipe: k })}
                active={recipe === k}
                label={r.label}
                n={r.n}
              />
            ))}
          </ChipRow>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-6">
        {setup ? (
          <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-4">
            <p className="rounded-xl bg-surface-2 p-3 text-sm tabular-nums">
              {best ? (
                <>
                  Best: <b>{best.rating!.toFixed(2)}</b> at{" "}
                  <b>{formatGrind(best, best.grindSetting)}</b>, {best.doseG} g
                  → {best.waterMl} ml, {best.tempC}°C
                </>
              ) : (
                "No rated brews yet."
              )}
            </p>
            {readings.length >= MIN_READINGS ? (
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium">
                  Grind → sour or bitter{" "}
                  <span className="font-normal text-muted">
                    · this setup only
                  </span>
                </p>
                <GrindScatter
                  points={readings.map((b) => ({
                    x: b.grindSetting,
                    y: b.compassExtraction!,
                    tip: `${shortDate(b.day)} · ${formatGrind(b, b.grindSetting)}`,
                  }))}
                  fit={fitZero(
                    readings.map((b) => [b.grindSetting, b.compassExtraction!]),
                  )}
                  format={fmt}
                />
              </div>
            ) : (
              <p className="text-sm text-muted">
                A grind chart appears once this setup has {MIN_READINGS} compass
                readings ({readings.length} so far).
              </p>
            )}
          </section>
        ) : (
          <section className="hidden flex-col gap-2 rounded-2xl border border-line bg-surface p-4 text-sm text-muted lg:flex">
            <p className="font-medium text-fg">
              Pick {grinderId != null ? "a recipe" : "a grinder and recipe"}
            </p>
            <p>
              Each recipe and grinder dials in separately. Choose one above to
              follow its brews one change at a time and, with {MIN_READINGS} or
              more compass readings, see how grind moved the taste.
            </p>
          </section>
        )}
        <BrewRows
          // Start collapsed again whenever the selection changes.
          key={`${bag.id}|${grinderId}|${recipe}`}
          brews={shown}
          roastedOn={bag.roastedOn}
          setup={setup}
          showGrinder={single || grinderId == null}
        />
      </div>
    </>
  );
}

function BrewRows({
  brews,
  roastedOn,
  setup,
  showGrinder,
}: {
  brews: Brew[];
  roastedOn: string;
  setup: boolean;
  showGrinder: boolean;
}) {
  const [all, setAll] = useState(false);
  const hidden = all ? 0 : Math.max(0, brews.length - LIMIT);
  return (
    <ol className="flex flex-col rounded-2xl border border-line bg-surface px-4 py-1 [&>li:last-child>a]:border-0">
      {hidden > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setAll(true)}
            className="w-full py-2 text-sm font-medium text-accent"
          >
            Show {hidden} earlier brew{hidden === 1 ? "" : "s"}
          </button>
        </li>
      )}
      {brews.slice(hidden).map((b) => {
        const i = brews.indexOf(b);
        const prev = setup && i > 0 ? brews[i - 1] : null;
        const changes = prev ? brewChanges(b, prev) : [];
        return (
          <li key={b.id}>
            <Link
              to={`/brews/${b.id}`}
              className="flex items-center gap-3 border-b border-line py-2.5"
            >
              <span className="w-14 shrink-0 text-xs text-muted tabular-nums">
                <span className="block font-medium text-fg">
                  {shortDate(b.day)}
                </span>
                day {Math.max(0, daysBetween(roastedOn, b.day))}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                {setup ? (
                  <>
                    <span className="truncate text-sm tabular-nums">
                      <span className="font-medium">
                        {formatGrind(b, b.grindSetting)}
                      </span>
                      <span className="text-muted"> · {b.doseG} g</span>
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {i === 0 ? (
                        <Tag>First brew</Tag>
                      ) : changes.length ? (
                        changes.map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent tabular-nums"
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <Tag>Same as last</Tag>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium">
                      {b.recipeLabel}
                      {showGrinder && (
                        <span className="font-normal text-muted">
                          {" "}
                          · {b.grinder}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted tabular-nums">
                      {formatGrind(b, b.grindSetting)} · {b.doseG} g ·{" "}
                      {b.waterMl} ml · {b.tempC}°C
                    </span>
                  </>
                )}
              </span>
              <RatingCompassColumn
                rating={b.rating}
                compass={
                  b.compassStrength != null
                    ? {
                        strength: b.compassStrength,
                        extraction: b.compassExtraction!,
                      }
                    : null
                }
                notRated={
                  <span className="text-xs whitespace-nowrap text-muted">
                    Not rated
                  </span>
                }
              />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** "grind 18 → 20 coarser", "dose 15 → 16 g": what changed since the setup's previous brew. */
function brewChanges(b: Brew, prev: Brew) {
  const out: string[] = [];
  if (b.grindSetting !== prev.grindSetting)
    out.push(
      `grind ${formatGrindValue(b, prev.grindSetting)} → ${formatGrindValue(b, b.grindSetting)} ${b.grindSetting < prev.grindSetting ? "finer" : "coarser"}`,
    );
  if (b.doseG !== prev.doseG) out.push(`dose ${prev.doseG} → ${b.doseG} g`);
  if (b.waterMl !== prev.waterMl)
    out.push(`water ${prev.waterMl} → ${b.waterMl} ml`);
  if (b.tempC !== prev.tempC) out.push(`temp ${prev.tempC} → ${b.tempC}°C`);
  return out;
}

function countBy<K>(
  list: Brew[],
  key: (b: Brew) => K,
  label: (b: Brew) => string,
) {
  const m = new Map<K, { label: string; n: number }>();
  for (const b of list) {
    const k = key(b);
    m.set(k, { label: label(b), n: (m.get(k)?.n ?? 0) + 1 });
  }
  return m;
}

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0"
    >
      {children}
    </div>
  );
}

function Chip({
  to,
  active,
  label,
  n,
}: {
  to: string;
  active: boolean;
  label: string;
  n: number;
}) {
  return (
    <Link
      to={to}
      replace
      preventScrollReset
      aria-current={active ? "true" : undefined}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm tabular-nums ${active ? "border-accent bg-accent-soft font-medium text-accent" : "border-line bg-surface"}`}
    >
      {label} <span className="opacity-70">{n}</span>
    </Link>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
      {children}
    </span>
  );
}
