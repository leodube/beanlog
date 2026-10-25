import type { ReactNode } from "react";
import { Form, Link, useSubmit } from "react-router";

import { RatingPill } from "~/components/bean";
import { RatingChart, RecipeStrips, WeeklyBars } from "~/components/charts";
import { EmptyState } from "~/components/empty-state";
import { Picker } from "~/components/picker";
import { overviewStats, totalBrews } from "~/lib/stats.server";
import { parsePeriod, PERIODS } from "~/lib/stats";
import type { Route } from "./+types/stats._index";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const recipeCoffee = Number(url.searchParams.get("rcoffee")) || null;
  const [total, stats] = await Promise.all([
    totalBrews(),
    overviewStats(period, recipeCoffee),
  ]);
  return { total, period: period.value, ...stats };
}

export default function StatsOverview({ loaderData }: Route.ComponentProps) {
  const {
    total,
    period,
    tiles,
    weekly,
    ratings,
    recipes,
    brewers,
    topCoffees,
  } = loaderData;
  if (!total)
    return (
      <EmptyState title="No brews yet">
        Charts appear once you've logged some brews.
      </EmptyState>
    );
  const periodLink = (value: string) => {
    const p = new URLSearchParams();
    if (value !== "90") p.set("period", value);
    if (recipes.coffeeId) p.set("rcoffee", String(recipes.coffeeId));
    const q = p.toString();
    return q ? `?${q}` : ".";
  };
  return (
    <>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Period">
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            to={periodLink(p.value)}
            replace
            preventScrollReset
            role="radio"
            aria-checked={period === p.value}
            className={`rounded-full border px-3 py-1.5 text-sm ${period === p.value ? "border-accent bg-accent-soft font-medium text-accent" : "border-line bg-surface"}`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Brews"
          value={String(tiles.brews)}
          sub={`${tiles.perDay.toFixed(1)} a day`}
        />
        <Tile
          label="Coffee used"
          value={
            tiles.grams >= 1000
              ? `${(tiles.grams / 1000).toFixed(2)} kg`
              : `${Math.round(tiles.grams)} g`
          }
          sub={`${Math.round(tiles.gramsPerBrew)} g per brew`}
        />
        <Tile
          label="Avg rating"
          value={tiles.avgRating != null ? tiles.avgRating.toFixed(2) : "–"}
          sub={`${tiles.rated} rated brew${tiles.rated === 1 ? "" : "s"}`}
        />
        <Tile
          label="Coffees"
          value={String(tiles.coffees)}
          sub={`${tiles.origins} origin${tiles.origins === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Brews per week">
          <WeeklyBars weeks={weekly} />
        </Card>
        <Card
          title="Rating over time"
          sub="dots are brews · line is the 7-brew average"
        >
          <RatingChart points={ratings} />
        </Card>
        <Card title="Recipes" className="lg:col-span-2">
          <RecipeCoffeePicker
            value={recipes.coffeeId}
            options={recipes.coffeeOptions}
            period={period}
          />
          {recipes.rows.length ? (
            <>
              <RecipeStrips rows={recipes.rows} />
              <div className="flex flex-col divide-y divide-line border-t border-line text-sm">
                {recipes.rows
                  .filter((r) => r.tweakedPct != null)
                  .map((r) => (
                    <div
                      key={r.key}
                      className="flex items-center justify-between gap-3 py-2 tabular-nums"
                    >
                      <span className="min-w-0 truncate">{r.name}</span>
                      <span className="shrink-0 text-muted">
                        tweaked in <b className="text-fg">{r.tweakedPct}%</b> of
                        brews
                      </span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No rated brews in this period.</p>
          )}
        </Card>
        <Card title="By brewer">
          {brewers.length ? (
            <div className="flex flex-col gap-3">
              {brewers.map((b) => (
                <div
                  key={b.name}
                  className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3"
                >
                  <span className="truncate text-sm">{b.name}</span>
                  <span className="h-3 rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${(b.n / brewers[0].n) * 100}%` }}
                    />
                  </span>
                  <span className="w-24 text-right text-sm tabular-nums">
                    <b>{b.n}</b>
                    {b.avg != null && (
                      <span className="text-muted"> · {b.avg.toFixed(2)}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No brews in this period.</p>
          )}
        </Card>
        <Card title="Top coffees" sub="your rating, or brew average">
          {topCoffees.length ? (
            <ol className="flex flex-col divide-y divide-line">
              {topCoffees.map((c, i) => (
                <li key={c.id}>
                  <Link
                    to={`/coffee/${c.id}`}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <span className="w-4 text-sm font-semibold text-muted tabular-nums">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {c.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {c.roaster} · {c.n} brew{c.n === 1 ? "" : "s"}
                      </span>
                    </span>
                    <RatingPill
                      value={c.score!}
                      label={c.own ? undefined : " avg"}
                    />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">
              No rated coffees in this period.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted tabular-nums">{sub}</span>
    </div>
  );
}

function Card({
  title,
  sub,
  className = "",
  children,
}: {
  title: string;
  sub?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-semibold">{title}</h2>
        {sub && <span className="text-sm text-muted">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

function RecipeCoffeePicker({
  value,
  options,
  period,
}: {
  value: number | null;
  options: { id: number; name: string }[];
  period: string;
}) {
  const submit = useSubmit();
  const name = options.find((o) => o.id === value)?.name ?? "All coffees";
  return (
    <Form
      method="get"
      className="flex flex-wrap items-center justify-between gap-2"
      onChange={(e) =>
        submit(e.currentTarget, { replace: true, preventScrollReset: true })
      }
    >
      <p className="text-sm text-muted">
        Ratings per recipe · dots are brews, the tick is the average
      </p>
      {period !== "90" && <input type="hidden" name="period" value={period} />}
      <Picker text={name}>
        <select
          name="rcoffee"
          defaultValue={value ?? ""}
          aria-label="Coffee"
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          <option value="">All coffees</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Picker>
    </Form>
  );
}
