import {
  data,
  Form,
  Link,
  Outlet,
  redirect,
  useActionData,
  useNavigation,
  useOutlet,
} from "react-router";
import { z } from "zod";

import { RatingPill } from "~/components/bean";
import { EmptyState } from "~/components/empty-state";
import { Field, inputClass, primaryButton } from "~/components/fields";
import type { RouteHandle } from "~/components/route-handle";
import { Sheet } from "~/components/sheet";
import {
  daysSince,
  PROCESS_LABELS,
  ROAST_LEVEL_LABELS,
  RoasterInput,
} from "~/lib/coffee";
import {
  DuplicateError,
  listCoffees,
  listRoasters,
  saveRoaster,
} from "~/lib/coffee.server";
import { ALL_CODES, countryName, countryOptions } from "~/lib/countries";
import { fieldErrors, formToObject } from "~/lib/form";
import type { Route } from "./+types/coffee";

export const handle: RouteHandle = { title: "Coffee" };
export const meta: Route.MetaFunction = () => [{ title: "Coffee · B{ean}log" }];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const tab =
    url.searchParams.get("tab") === "roasters" ? "roasters" : "roasts";
  const sheet = url.searchParams.get("roaster"); // "new" or an id
  const [coffees, roasters] = await Promise.all([
    listCoffees(),
    listRoasters(),
  ]);
  return {
    tab,
    sheet,
    roasters,
    coffees: coffees.map((c) => ({
      ...c,
      daysOffRoast: c.currentBag ? daysSince(c.currentBag.roastedOn) : null,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") !== "save-roaster")
    throw data("Unknown action", { status: 400 });
  const parsed = RoasterInput.safeParse(formToObject(form));
  if (!parsed.success)
    return data({ errors: fieldErrors(parsed.error.issues) }, { status: 400 });
  const id = form.get("id")
    ? z.coerce.number().int().parse(form.get("id"))
    : null;
  try {
    await saveRoaster(id, parsed.data);
  } catch (e) {
    if (e instanceof DuplicateError)
      return data(
        {
          errors: {
            roasterName: `${parsed.data.name} is already in your roasters.`,
          },
        },
        { status: 400 },
      );
    throw e;
  }
  return redirect("/coffee?tab=roasters");
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function Coffee({ loaderData }: Route.ComponentProps) {
  const { tab, coffees, roasters, sheet } = loaderData;
  const child = useOutlet();
  const shelf = coffees.filter((c) => c.openBags > 0);
  const finished = coffees.filter((c) => c.openBags === 0);
  const editingRoaster =
    sheet && sheet !== "new"
      ? roasters.find((r) => String(r.id) === sheet)
      : undefined;

  return (
    <>
      <div className={child ? "hidden lg:block" : undefined}>
        <div className="mx-auto flex max-w-5xl flex-col gap-4 py-4 px-safe lg:px-8 lg:py-6">
          <nav
            className="flex gap-1 self-start rounded-full border border-line bg-surface p-1"
            aria-label="Coffee views"
          >
            {(["roasts", "roasters"] as const).map((t) => (
              <Link
                key={t}
                to={t === "roasts" ? "/coffee" : "/coffee?tab=roasters"}
                aria-current={tab === t ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === t ? "bg-accent text-accent-fg" : "text-muted"}`}
              >
                {t === "roasts" ? "Roasts" : "Roasters"}
              </Link>
            ))}
          </nav>

          {tab === "roasts" ? (
            <>
              <AddButton to="/coffee/new" label="Add coffee" />
              {coffees.length === 0 && (
                <EmptyState title="No coffees yet">
                  Add the bag you're brewing from.
                </EmptyState>
              )}
              {shelf.length > 0 && (
                <>
                  <h2 className="text-[13px] font-medium text-muted">
                    On the shelf
                  </h2>
                  <Grid>
                    {shelf.map((c) => (
                      <CoffeeCard key={c.id} coffee={c} />
                    ))}
                  </Grid>
                </>
              )}
              {finished.length > 0 && (
                <>
                  <h2 className="mt-2 text-[13px] font-medium text-muted">
                    Finished
                  </h2>
                  <Grid>
                    {finished.map((c) => (
                      <CoffeeCard key={c.id} coffee={c} />
                    ))}
                  </Grid>
                </>
              )}
            </>
          ) : (
            <>
              <AddButton
                to="/coffee?tab=roasters&roaster=new"
                label="Add roaster"
              />
              {roasters.length === 0 && (
                <EmptyState title="No roasters yet">
                  They're added here or from the coffee form.
                </EmptyState>
              )}
              <Grid>
                {roasters.map((r) => (
                  <Link
                    key={r.id}
                    to={`/coffee?tab=roasters&roaster=${r.id}`}
                    preventScrollReset
                    className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="truncate text-sm text-muted">
                        {[r.city, countryName(r.countryCode)]
                          .filter(Boolean)
                          .join(", ") || "No location"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.coffees.length ? (
                        r.coffees.map((n) => (
                          <span
                            key={n}
                            className="rounded-full border border-line px-2 py-0.5 text-xs"
                          >
                            {n}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted">
                          No coffees yet
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </Grid>
            </>
          )}
        </div>
      </div>
      <Outlet />
      {sheet && (sheet === "new" || editingRoaster) && (
        <RoasterSheet key={sheet} roaster={editingRoaster} />
      )}
    </>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
      {children}
    </div>
  );
}

function AddButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      preventScrollReset
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
      {label}
    </Link>
  );
}

function CoffeeCard({
  coffee: c,
}: {
  coffee: Route.ComponentProps["loaderData"]["coffees"][number];
}) {
  const open = c.openBags > 0 && c.currentBag;
  const left = open
    ? Math.max(0, Math.round(c.currentBag!.weightG - c.currentBag!.usedG))
    : 0;
  return (
    <Link
      to={`/coffee/${c.id}`}
      className={`flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 ${open ? "" : "opacity-75"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{c.name}</p>
          <p className="truncate text-sm text-muted">{c.roaster}</p>
        </div>
        {c.rating != null ? (
          <RatingPill value={c.rating} />
        ) : c.brewAvg != null ? (
          <RatingPill value={c.brewAvg} label=" avg" />
        ) : (
          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-sm text-muted">
            Not rated
          </span>
        )}
      </div>
      <p className="text-sm">
        {[
          countryName(c.originCountry) || "Blend",
          PROCESS_LABELS[c.process],
          ROAST_LEVEL_LABELS[c.roastLevel],
        ].join(" · ")}
      </p>
      <div className="flex flex-wrap justify-between gap-x-3 text-xs text-muted tabular-nums">
        <span>
          {open
            ? `Roasted ${plural(c.daysOffRoast ?? 0, "day")} ago`
            : "Finished"}
        </span>
        <span>
          {plural(c.brews, "brew")}
          {open ? ` · ≈${left} g left` : ""}
        </span>
      </div>
    </Link>
  );
}

const roasterCountries = countryOptions(ALL_CODES);

function RoasterSheet({
  roaster,
}: {
  roaster?: {
    id: number;
    name: string;
    city: string | null;
    countryCode: string | null;
    coffees: string[];
  };
}) {
  const result = useActionData<typeof action>();
  const errors = (result && "errors" in result ? result.errors : {}) as Record<
    string,
    string
  >;
  const saving = useNavigation().state === "submitting";
  return (
    <Sheet
      title={roaster ? "Edit roaster" : "New roaster"}
      closeTo="/coffee?tab=roasters"
    >
      <Form method="post" preventScrollReset className="flex flex-col gap-4">
        <input type="hidden" name="intent" value="save-roaster" />
        {roaster && <input type="hidden" name="id" value={roaster.id} />}
        <Field label="Name" error={errors.roasterName}>
          <input
            name="roasterName"
            defaultValue={roaster?.name}
            placeholder="e.g. Northfold Coffee"
            autoComplete="off"
            autoFocus
            required
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" optional>
            <input
              name="roasterCity"
              defaultValue={roaster?.city ?? ""}
              placeholder="e.g. Vancouver"
              autoComplete="off"
              className={inputClass}
            />
          </Field>
          <Field label="Country" optional error={errors.roasterCountry}>
            <select
              name="roasterCountry"
              defaultValue={roaster ? (roaster.countryCode ?? "") : "CA"}
              className={inputClass}
            >
              <option value="">—</option>
              {roasterCountries.map(([c, n]) => (
                <option key={c} value={c}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {roaster && roaster.coffees.length > 0 && (
          <p className="text-sm text-muted">
            Coffees: {roaster.coffees.join(", ")}
          </p>
        )}
        <button disabled={saving} className={primaryButton}>
          {roaster ? "Save" : "Add roaster"}
        </button>
      </Form>
    </Sheet>
  );
}
