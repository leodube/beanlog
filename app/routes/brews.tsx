import {
  Form,
  Link,
  Outlet,
  useLocation,
  useOutlet,
  useSubmit,
} from "react-router";

import { BrewCard } from "~/components/brew-card";
import { EmptyState } from "~/components/empty-state";
import type { RouteHandle } from "~/components/route-handle";
import { whenLabel } from "~/lib/brew";
import {
  brewFilterOptions,
  listBrews,
  type BrewFilters,
} from "~/lib/brews.server";
import type { Route } from "./+types/brews";

export const handle: RouteHandle = { title: "Brews" };
export const meta: Route.MetaFunction = () => [{ title: "Brews · B{ean}log" }];

const positive = (v: string | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

// Filters live in the URL (/brews?coffee=3&brewer=1), so the coffee page can
// link straight to a filtered list and Back works as expected.
export async function loader({ request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams;
  const filters: BrewFilters = {
    coffeeId: positive(q.get("coffee")),
    recipeId: q.get("recipe") === "none" ? "none" : positive(q.get("recipe")),
    brewerId: positive(q.get("brewer")),
  };
  const [brews, options] = await Promise.all([
    listBrews(filters),
    brewFilterOptions(),
  ]);
  const now = new Date();
  return {
    brews: brews.map((b) => ({ ...b, when: whenLabel(b.brewedAt, now) })),
    options,
    filters: {
      coffee: q.get("coffee") ?? "",
      recipe: q.get("recipe") ?? "",
      brewer: q.get("brewer") ?? "",
    },
  };
}

// The list stays rendered under brew entry and brew detail on desktop (they
// open as drawers); on the phone those pages replace it.
export default function Brews({ loaderData, params }: Route.ComponentProps) {
  const child = useOutlet();
  const { search } = useLocation();
  const openId = (params as { brewId?: string }).brewId;
  const { brews, options, filters } = loaderData;
  const filtered = Boolean(filters.coffee || filters.recipe || filters.brewer);

  return (
    <>
      <div className={child ? "hidden lg:block" : undefined}>
        <div className="mx-auto flex max-w-5xl flex-col gap-3 py-4 px-safe lg:px-8 lg:py-6">
          {options.total > 0 && (
            <FilterBar
              filters={filters}
              options={[
                {
                  key: "coffee",
                  label: "Coffee",
                  items: options.coffees.map(
                    (c) => [String(c.id), c.name] as const,
                  ),
                },
                {
                  key: "recipe",
                  label: "Recipe",
                  items: [
                    ["none", "No recipe"] as const,
                    ...options.recipes.map(
                      (r) => [String(r.id), r.name] as const,
                    ),
                  ],
                },
                {
                  key: "brewer",
                  label: "Brewer",
                  items: options.brewers.map(
                    (b) => [String(b.id), b.name] as const,
                  ),
                },
              ]}
              count={brews.length}
              filtered={filtered}
            />
          )}
          {options.total === 0 ? (
            <EmptyState title="No brews yet">
              Tap Log to record your first one.
            </EmptyState>
          ) : brews.length === 0 ? (
            <p className="py-10 text-center text-muted">
              No brews match these filters.
            </p>
          ) : (
            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
              {brews.map((b) => (
                <BrewCard
                  key={b.id}
                  brew={b}
                  to={`/brews/${b.id}${search}`}
                  selected={openId === String(b.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Outlet />
    </>
  );
}

type FilterKey = "coffee" | "recipe" | "brewer";

function FilterBar({
  filters,
  options,
  count,
  filtered,
}: {
  filters: Record<FilterKey, string>;
  options: {
    key: FilterKey;
    label: string;
    items: (readonly [string, string])[];
  }[];
  count: number;
  filtered: boolean;
}) {
  const submit = useSubmit();
  return (
    <Form
      method="get"
      className="flex flex-col gap-2"
      onChange={(e) =>
        submit(e.currentTarget, { replace: true, preventScrollReset: true })
      }
    >
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {options.map(({ key, label, items }) => {
          const value = filters[key];
          const name = items.find(([id]) => id === value)?.[1];
          return (
            <span
              key={key}
              className={`relative inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium ${value ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface"}`}
            >
              <span className="max-w-40 truncate">
                {value ? (name ?? label) : label}
              </span>
              <svg
                className="size-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              {/* Native picker (the iOS wheel on the phone), invisible over the pill */}
              <select
                name={key}
                defaultValue={value}
                aria-label={`Filter by ${label.toLowerCase()}`}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="">All {label.toLowerCase()}s</option>
                {items.map(([id, n]) => (
                  <option key={id} value={id}>
                    {n}
                  </option>
                ))}
              </select>
            </span>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="tabular-nums">
          {count} brew{count === 1 ? "" : "s"}
        </span>
        {filtered && (
          <Link to="/brews" replace preventScrollReset className="text-accent">
            Clear filters
          </Link>
        )}
      </div>
    </Form>
  );
}
