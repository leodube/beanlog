import { useState } from "react";
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useFetcher,
  useNavigation,
} from "react-router";
import { z } from "zod";

import { BeanSlider } from "~/components/bean-slider";
import { BagFields } from "~/components/coffee-form";
import { primaryButton } from "~/components/fields";
import { Overlay } from "~/components/overlay";
import type { RouteHandle } from "~/components/route-handle";
import { Sheet } from "~/components/sheet";
import {
  BagInput,
  daysSince,
  formatDate,
  localToday,
  PROCESS_LABELS,
  RatingInput,
  ROAST_LEVEL_LABELS,
} from "~/lib/coffee";
import {
  addBag,
  deleteBag,
  getCoffee,
  rateCoffee,
  setBagFinished,
  updateBag,
} from "~/lib/coffee.server";
import { countryName } from "~/lib/countries";
import { whenLabel } from "~/lib/brew";
import { listBrews } from "~/lib/brews.server";
import { RatingPill } from "~/components/bean";
import { formatGrind } from "~/lib/equipment";
import { fieldErrors, formToObject } from "~/lib/form";
import type { Route } from "./+types/coffee.$coffeeId";

export const handle: RouteHandle = { title: "Coffee", overlay: true };
export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData?.coffee.name ?? "Coffee"} · B{ean}log` },
];

const idOf = (params: { coffeeId: string }) => {
  const id = Number(params.coffeeId);
  if (!Number.isInteger(id) || id <= 0)
    throw data("Not found", { status: 404 });
  return id;
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const id = idOf(params);
  const [coffee, brewRows] = await Promise.all([
    getCoffee(id),
    listBrews({ coffeeId: id }),
  ]);
  if (!coffee) throw data("Coffee not found", { status: 404 });
  const now = new Date();
  const brews = brewRows.map((b) => ({
    ...b,
    when: whenLabel(b.brewedAt, now),
  }));
  // Highest rated; newest wins a tie (the list is newest first).
  const best = brews.reduce<(typeof brews)[number] | null>(
    (top, b) =>
      b.rating != null && (top == null || b.rating > top.rating!) ? b : top,
    null,
  );
  const today = localToday();
  return {
    coffee: {
      ...coffee,
      bags: coffee.bags.map((b) => ({
        ...b,
        daysOffRoast: daysSince(b.roastedOn, today),
      })),
    },
    today,
    recentBrews: brews.slice(0, 3),
    best,
    bagSheet: new URL(request.url).searchParams.get("bag"), // "new" or a bag id
  };
}

const BagId = z.coerce.number().int().positive();

export async function action({ request, params }: Route.ActionArgs) {
  const id = idOf(params);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "rate") {
    const parsed = RatingInput.safeParse(formToObject(form));
    if (!parsed.success)
      return data(
        { errors: fieldErrors(parsed.error.issues) },
        { status: 400 },
      );
    await rateCoffee(id, parsed.data.rating);
    return { ok: true };
  }
  if (intent === "save-bag") {
    const parsed = BagInput.safeParse(formToObject(form));
    if (!parsed.success)
      return data(
        { errors: fieldErrors(parsed.error.issues) },
        { status: 400 },
      );
    const bag = {
      roastedOn: parsed.data.roastedOn,
      weightG: parsed.data.weightG,
      notes: parsed.data.bagNotes,
    };
    const bagId = form.get("bagId");
    if (bagId) await updateBag(id, BagId.parse(bagId), bag);
    else await addBag(id, bag);
    return redirect(`/coffee/${id}`);
  }
  if (intent === "finish-bag" || intent === "reopen-bag") {
    await setBagFinished(
      id,
      BagId.parse(form.get("bagId")),
      intent === "finish-bag",
    );
    return redirect(`/coffee/${id}`);
  }
  if (intent === "delete-bag") {
    const ok = await deleteBag(id, BagId.parse(form.get("bagId")));
    if (!ok)
      return data(
        {
          errors: {
            form: "Only an unused bag can be deleted, and a coffee keeps at least one.",
          },
        },
        { status: 400 },
      );
    return redirect(`/coffee/${id}`);
  }
  throw data("Unknown action", { status: 400 });
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function CoffeeDetail({ loaderData }: Route.ComponentProps) {
  const { coffee, bagSheet, today, recentBrews, best } = loaderData;
  const sheetBag =
    bagSheet && bagSheet !== "new"
      ? coffee.bags.find((b) => String(b.id) === bagSheet)
      : undefined;
  const onShelf = coffee.bags.some((b) => !b.finishedAt);
  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-right font-medium">{value}</span>
      </div>
    ) : null;

  return (
    <Overlay title="Coffee" closeTo="/coffee">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              {coffee.roaster}
              {coffee.roasterCity ? ` · ${coffee.roasterCity}` : ""}
            </p>
            {!onShelf && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                Finished
              </span>
            )}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">
            {coffee.name}
          </h2>
          <p className="text-muted">
            {[countryName(coffee.originCountry) || "Blend", coffee.region]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <Section title="Your rating">
          <div className="flex flex-col gap-3 p-3">
            <CoffeeRating initial={coffee.rating} />
            <p className="border-t border-line pt-3 text-sm text-muted tabular-nums">
              {coffee.brewAvg != null ? (
                <>
                  Brew average{" "}
                  <b className="text-fg">{coffee.brewAvg.toFixed(2)}</b> from{" "}
                  {plural(coffee.brews, "brew")}
                </>
              ) : (
                "No rated brews yet"
              )}
            </p>
          </div>
        </Section>

        {(coffee.tastingNotes.length > 0 || coffee.notes) && (
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3">
            {coffee.tastingNotes.length > 0 && (
              <>
                <span className="text-sm text-muted">
                  Roaster's tasting notes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {coffee.tastingNotes.map((n) => (
                    <span
                      key={n}
                      className="rounded-full border border-line px-2.5 py-1 text-sm"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </>
            )}
            {coffee.notes && (
              <p className="text-[15px] leading-relaxed whitespace-pre-line">
                {coffee.notes}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-muted">Bags</span>
            <Link
              to="?bag=new"
              preventScrollReset
              className="text-sm font-medium text-accent"
            >
              + Add bag
            </Link>
          </div>
          {coffee.bags.map((b) => {
            const left = Math.max(0, Math.round(b.weightG - b.usedG));
            return (
              <div
                key={b.id}
                className={`flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 ${b.finishedAt ? "opacity-75" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
                  <span>
                    Roasted {formatDate(b.roastedOn)}{" "}
                    <span className="text-muted">
                      · {plural(b.daysOffRoast, "day")} ago
                    </span>
                  </span>
                  <span className="text-muted">{b.weightG} g</span>
                </div>
                {!b.finishedAt && (
                  <>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(left / b.weightG) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm tabular-nums">
                      <b>≈{left} g left</b>{" "}
                      <span className="text-muted">
                        · {plural(b.brews, "brew")}
                      </span>
                    </p>
                  </>
                )}
                {b.finishedAt && (
                  <p className="text-sm text-muted">
                    Finished · {plural(b.brews, "brew")}
                  </p>
                )}
                {b.notes && <p className="text-sm">{b.notes}</p>}
                <div className="flex gap-2">
                  <Form method="post" preventScrollReset>
                    <input
                      type="hidden"
                      name="intent"
                      value={b.finishedAt ? "reopen-bag" : "finish-bag"}
                    />
                    <input type="hidden" name="bagId" value={b.id} />
                    <button className="rounded-full border border-line px-3 py-1.5 text-sm font-medium">
                      {b.finishedAt ? "Back on the shelf" : "Mark finished"}
                    </button>
                  </Form>
                  <Link
                    to={`?bag=${b.id}`}
                    preventScrollReset
                    className="rounded-full border border-line px-3 py-1.5 text-sm font-medium"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <Section title="Origin">
          <div className="flex flex-col divide-y divide-line">
            {row(
              "Country",
              countryName(coffee.originCountry) || "Blend / other",
            )}
            {row("Region", coffee.region)}
            {row("Producer", coffee.producer)}
            {row("Variety", coffee.variety)}
            {row("Process", PROCESS_LABELS[coffee.process])}
            {row("Roast level", ROAST_LEVEL_LABELS[coffee.roastLevel])}
          </div>
        </Section>

        {best && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-muted">
              Your best brew of this
            </span>
            <Link
              to={`/brews/${best.id}`}
              className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-3"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold">
                  {best.recipe ?? best.brewer}
                </span>
                <RatingPill value={best.rating!} />
              </span>
              <span className="text-sm text-muted tabular-nums">
                {best.brewer} · {best.doseG} g → {best.waterMl} ml ·{" "}
                {best.tempC}°C ·{" "}
                {formatGrind(
                  {
                    settingKind: best.grinderKind,
                    step: best.grinderStep,
                    unit: best.grinderUnit,
                  },
                  best.grindSetting,
                )}
              </span>
            </Link>
          </div>
        )}

        <Section title="Recent brews">
          {recentBrews.length ? (
            <div className="flex flex-col divide-y divide-line">
              {recentBrews.map((b) => (
                <Link
                  key={b.id}
                  to={`/brews/${b.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {b.recipe ?? "No recipe"}
                    </span>
                    <span className="block text-xs text-muted tabular-nums">
                      {b.when} · {b.doseG} g ·{" "}
                      {formatGrind(
                        {
                          settingKind: b.grinderKind,
                          step: b.grinderStep,
                          unit: b.grinderUnit,
                        },
                        b.grindSetting,
                      )}
                    </span>
                  </span>
                  {b.rating != null ? (
                    <RatingPill value={b.rating} />
                  ) : (
                    <span className="text-xs text-muted">Not rated</span>
                  )}
                </Link>
              ))}
              <Link
                to={`/brews?coffee=${coffee.id}`}
                className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-accent tabular-nums"
              >
                See all {plural(coffee.brews, "brew")}
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <p className="p-3 text-sm text-muted">No brews logged yet.</p>
          )}
        </Section>

        <div className="flex flex-col gap-2 pb-2">
          {onShelf && (
            <Link
              to={`/brews/new?coffee=${coffee.id}`}
              className={`${primaryButton} text-center`}
            >
              Brew this
            </Link>
          )}
          <Link
            to="edit"
            className="rounded-2xl border border-line bg-surface py-3 text-center font-medium"
          >
            Edit coffee
          </Link>
        </div>
      </div>

      {bagSheet && (bagSheet === "new" || sheetBag) && (
        <BagSheet
          key={bagSheet}
          coffeeId={coffee.id}
          bag={sheetBag}
          today={today}
          canDelete={
            !!sheetBag && sheetBag.brews === 0 && coffee.bags.length > 1
          }
        />
      )}
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

// Saves as you rate: a fetcher posts on release, so the page doesn't navigate.
function CoffeeRating({ initial }: { initial: number | null }) {
  const fetcher = useFetcher();
  const [value, setValue] = useState(initial);
  return (
    <BeanSlider
      value={value}
      onChange={setValue}
      onCommit={(v) =>
        fetcher.submit({ intent: "rate", rating: v ?? "" }, { method: "post" })
      }
      label="Your rating for this coffee"
    />
  );
}

function BagSheet({
  coffeeId,
  bag,
  today,
  canDelete,
}: {
  coffeeId: number;
  bag?: {
    id: number;
    roastedOn: string;
    weightG: number;
    notes: string | null;
  };
  today: string;
  canDelete: boolean;
}) {
  const result = useActionData<typeof action>();
  const errors = (result && "errors" in result ? result.errors : {}) as Record<
    string,
    string
  >;
  const saving = useNavigation().state === "submitting";
  return (
    <Sheet title={bag ? "Edit bag" : "New bag"} closeTo={`/coffee/${coffeeId}`}>
      <Form method="post" preventScrollReset className="flex flex-col gap-4">
        <input type="hidden" name="intent" value="save-bag" />
        {bag && <input type="hidden" name="bagId" value={bag.id} />}
        <BagFields today={today} values={bag} errors={errors} />
        <button disabled={saving} className={primaryButton}>
          {bag ? "Save" : "Add bag"}
        </button>
      </Form>
      {errors.form && (
        <p className="text-sm font-medium text-danger">{errors.form}</p>
      )}
      {canDelete && (
        <Form method="post" preventScrollReset>
          <input type="hidden" name="intent" value="delete-bag" />
          <input type="hidden" name="bagId" value={bag!.id} />
          <button className="w-full py-2 font-medium text-danger">
            Delete bag
          </button>
        </Form>
      )}
    </Sheet>
  );
}
