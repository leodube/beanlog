import { Form, Link, Outlet, useOutlet } from "react-router";

import { EmptyState } from "~/components/empty-state";
import { PourChart } from "~/components/pour-chart";
import type { RouteHandle } from "~/components/route-handle";
import { GRIND_LEVEL_LABELS, readyLabel } from "~/lib/recipe";
import { listRecipes } from "~/lib/recipes.server";
import type { Route } from "./+types/recipes";

export const handle: RouteHandle = { title: "Recipes" };
export const meta: Route.MetaFunction = () => [
  { title: "Recipes · B{ean}log" },
];

export async function loader() {
  return { recipes: await listRecipes() };
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function Recipes({ loaderData, params }: Route.ComponentProps) {
  const child = useOutlet();
  const active = loaderData.recipes.filter((r) => !r.archivedAt);
  const archived = loaderData.recipes.filter((r) => r.archivedAt);
  const openId = (params as { recipeId?: string }).recipeId;

  return (
    <>
      <div className={child ? "hidden lg:block" : undefined}>
        <div className="mx-auto flex max-w-5xl flex-col gap-4 py-4 px-safe lg:px-8 lg:py-6">
          <Link
            to="/recipes/new"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-4 font-medium text-accent"
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
            New recipe
          </Link>

          {active.length === 0 && (
            <EmptyState title="No recipes yet">
              Save a method you brew often so brews can start from it.
            </EmptyState>
          )}

          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
            {active.map((r) => (
              <Link
                key={r.id}
                to={`/recipes/${r.id}`}
                className={`flex flex-col gap-2 rounded-2xl border bg-surface p-3 ${openId === String(r.id) ? "border-accent ring-1 ring-accent" : "border-line"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="truncate text-sm text-muted tabular-nums">
                      {r.brewer} · {r.doseG} g · {r.waterMl} ml · {r.tempC}°C
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-sm text-muted">
                    {GRIND_LEVEL_LABELS[r.grindLevel]}
                  </span>
                </div>
                <PourChart steps={r.steps} waterMl={r.waterMl} />
                <div className="flex justify-between text-xs text-muted tabular-nums">
                  <span>
                    {plural(r.steps.length, "step")} · {readyLabel(r.steps)}
                  </span>
                  <span>
                    {r.brews
                      ? `Used in ${plural(r.brews, "brew")}`
                      : "Not used yet"}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {archived.length > 0 && (
            <details className="group rounded-2xl border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-sm font-medium text-muted [&::-webkit-details-marker]:hidden">
                Archived recipes ({archived.length})
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
              </summary>
              <div className="flex flex-col divide-y divide-line border-t border-line">
                {archived.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-muted">
                        {r.name}
                      </span>
                      <span className="block text-sm text-muted">
                        {r.brewer} ·{" "}
                        {r.brews ? plural(r.brews, "brew") : "Not used"}
                      </span>
                    </span>
                    <Form
                      method="post"
                      action={`/recipes/${r.id}`}
                      preventScrollReset
                    >
                      <input type="hidden" name="intent" value="restore" />
                      <button className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium">
                        Restore
                      </button>
                    </Form>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
      <Outlet />
    </>
  );
}
