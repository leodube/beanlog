import { useState } from "react";
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation,
} from "react-router";
import { z } from "zod";

import { Sheet } from "~/components/sheet";
import type { RouteHandle } from "~/components/route-handle";
import { userContext } from "~/lib/auth/context.server";
import { GRINDER_KINDS, type GrinderKind } from "~/lib/domain";
import {
  BrewerInput,
  COMMON_BREWERS,
  DIAL_STEPS,
  describeGrinder,
  formatGrind,
  GrinderInput,
  KIND_LABELS,
} from "~/lib/equipment";
import {
  listEquipment,
  saveBrewer,
  saveGrinder,
  setArchived,
} from "~/lib/equipment.server";
import type { EquipmentType } from "~/lib/equipment.server";
import type { Route } from "./+types/settings";

export const handle: RouteHandle = { title: "Settings", pushed: true };
export const meta: Route.MetaFunction = () => [
  { title: "Settings · B{ean}log" },
];

// ---------- Server ----------

// The add/edit sheet is driven by the URL: ?new=grinder or ?edit=grinder-3.
function parseSheet(url: URL) {
  const created = url.searchParams.get("new");
  if (created === "brewer" || created === "grinder")
    return { type: created, id: null } as const;
  const m = url.searchParams.get("edit")?.match(/^(brewer|grinder)-(\d+)$/);
  return m
    ? ({ type: m[1] as EquipmentType, id: Number(m[2]) } as const)
    : null;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const equipment = await listEquipment();
  return {
    equipment,
    sheet: parseSheet(new URL(request.url)),
    username: context.get(userContext).username,
  };
}

type Errors = { name?: string; step?: string };
const fail = (errors: Errors) => data({ errors }, { status: 400 });
const Id = z.coerce.number().int().positive();

export async function action({ request }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const id = form.id ? Id.parse(form.id) : null;

  switch (form.intent) {
    case "save-brewer":
    case "quick-brewer": {
      const parsed = BrewerInput.safeParse(form);
      if (!parsed.success)
        return fail({ name: parsed.error.issues[0].message });
      const saved = await saveBrewer(id, parsed.data);
      if (typeof saved === "object")
        return fail({
          name: `You already have a brewer called ${parsed.data.name}.`,
        });
      break;
    }
    case "save-grinder": {
      const parsed = GrinderInput.safeParse(form);
      if (!parsed.success) {
        const errors: Errors = {};
        for (const i of parsed.error.issues)
          errors[i.path[0] === "step" ? "step" : "name"] ??= i.message;
        return fail(errors);
      }
      const saved = await saveGrinder(id, parsed.data);
      if (typeof saved === "object")
        return fail({
          name: `You already have a grinder called ${parsed.data.name}.`,
        });
      break;
    }
    case "archive":
    case "restore": {
      const type = z.enum(["brewer", "grinder"]).parse(form.type);
      await setArchived(type, Id.parse(form.id), form.intent === "archive");
      break;
    }
    default:
      throw data("Unknown action", { status: 400 });
  }
  // Closing the sheet = navigating back to plain /settings.
  return redirect("/settings");
}

// ---------- UI ----------

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { equipment, sheet, username } = loaderData;
  const brewers = equipment.brewers.filter((b) => !b.archivedAt);
  const grinders = equipment.grinders.filter((g) => !g.archivedAt);
  const archived = [
    ...equipment.brewers
      .filter((b) => b.archivedAt)
      .map((b) => ({
        type: "brewer" as const,
        id: b.id,
        name: b.name,
        brews: b.brews,
      })),
    ...equipment.grinders
      .filter((g) => g.archivedAt)
      .map((g) => ({
        type: "grinder" as const,
        id: g.id,
        name: g.name,
        brews: g.brews,
      })),
  ];

  const editing =
    sheet?.type === "brewer"
      ? equipment.brewers.find((b) => b.id === sheet.id)
      : equipment.grinders.find((g) => g.id === sheet?.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4 px-safe lg:px-8 lg:py-6">
      <Section title="Brewers">
        {brewers.map((b) => (
          <Row
            key={b.id}
            to={`?edit=brewer-${b.id}`}
            title={b.name}
            subtitle={
              b.brews || b.recipes
                ? [
                    b.brews && plural(b.brews, "brew"),
                    b.recipes && plural(b.recipes, "recipe"),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Not used yet"
            }
          />
        ))}
        {brewers.length === 0 && <QuickAddBrewers />}
        <AddRow to="?new=brewer" label="Add brewer" />
      </Section>

      <Section title="Grinders">
        {grinders.map((g) => (
          <Row
            key={g.id}
            to={`?edit=grinder-${g.id}`}
            title={g.name}
            subtitle={`${describeGrinder(g)} · ${g.brews ? plural(g.brews, "brew") : "Not used yet"}`}
          />
        ))}
        {grinders.length === 0 && (
          <p className="px-3 py-3 text-sm text-muted">
            Add the grinder you use so brews can record its setting.
          </p>
        )}
        <AddRow to="?new=grinder" label="Add grinder" />
      </Section>

      {archived.length > 0 && (
        <Section
          title="Archived"
          footnote="Archived equipment is hidden from the pickers. Brews that used it keep their record."
        >
          {archived.map((a) => (
            <div
              key={`${a.type}-${a.id}`}
              className="flex items-center gap-3 px-3 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-muted">
                  {a.name}
                </span>
                <span className="block text-sm text-muted">
                  {a.type === "brewer" ? "Brewer" : "Grinder"} ·{" "}
                  {a.brews ? plural(a.brews, "brew") : "Not used"}
                </span>
              </span>
              <Form method="post" preventScrollReset>
                <input type="hidden" name="intent" value="restore" />
                <input type="hidden" name="type" value={a.type} />
                <input type="hidden" name="id" value={a.id} />
                <button className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium">
                  Restore
                </button>
              </Form>
            </div>
          ))}
        </Section>
      )}

      <Section title="Account">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-muted">Signed in as</span>
          <span className="font-medium">{username}</span>
        </div>
        <Form method="post" action="/logout">
          <button className="w-full px-3 py-3 text-left font-medium text-danger">
            Log out
          </button>
        </Form>
      </Section>

      {sheet?.type === "brewer" && (sheet.id == null || editing) && (
        <BrewerSheet
          key={sheet.id ?? "new"}
          brewer={editing as (typeof equipment.brewers)[number] | undefined}
        />
      )}
      {sheet?.type === "grinder" && (sheet.id == null || editing) && (
        <GrinderSheet
          key={sheet.id ?? "new"}
          grinder={editing as (typeof equipment.grinders)[number] | undefined}
        />
      )}
    </div>
  );
}

function Section({
  title,
  footnote,
  children,
}: {
  title: string;
  footnote?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[13px] font-medium text-muted">{title}</h2>
      <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
        {children}
      </div>
      {footnote && <p className="text-sm text-muted">{footnote}</p>}
    </section>
  );
}

function Row({
  to,
  title,
  subtitle,
}: {
  to: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      preventScrollReset
      className="flex items-center gap-3 px-3 py-3"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-sm text-muted">{subtitle}</span>
      </span>
      <svg
        className="size-4 shrink-0 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="m9 5 7 7-7 7" />
      </svg>
    </Link>
  );
}

function AddRow({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      preventScrollReset
      className="flex items-center gap-2 px-3 py-3 font-medium text-accent"
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

// One tap to add a common brewer while you have none.
function QuickAddBrewers() {
  const result = useActionData<typeof action>();
  const error = result && "errors" in result ? result.errors.name : undefined;
  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <ErrorText>{error}</ErrorText>
      <p className="text-sm text-muted">
        Add the brewers you use. Common ones:
      </p>
      <div className="flex flex-wrap gap-2">
        {COMMON_BREWERS.map((name) => (
          <Form key={name} method="post" preventScrollReset>
            <input type="hidden" name="intent" value="quick-brewer" />
            <input type="hidden" name="name" value={name} />
            <button className="rounded-full border border-dashed border-line px-3 py-1.5 text-sm font-medium text-accent">
              + {name}
            </button>
          </Form>
        ))}
      </div>
    </div>
  );
}

// ---------- Sheets ----------

function useSaving() {
  const navigation = useNavigation();
  return navigation.state === "submitting";
}

function ErrorText({ children }: { children?: string }) {
  return children ? (
    <p className="text-sm font-medium text-danger">{children}</p>
  ) : null;
}

const inputClass =
  "w-full rounded-2xl border border-line bg-surface-2 p-3 font-semibold outline-none focus:border-accent";
const primaryButton =
  "w-full rounded-2xl bg-accent py-3.5 text-[17px] font-semibold text-accent-fg disabled:opacity-60";

function BrewerSheet({
  brewer,
}: {
  brewer?: { id: number; name: string; brews: number; recipes: number };
}) {
  const saving = useSaving();
  return (
    <Sheet title={brewer ? "Edit brewer" : "New brewer"} closeTo="/settings">
      <SheetForm intent="save-brewer" id={brewer?.id}>
        {(errors) => (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-muted">Name</span>
              <input
                name="name"
                defaultValue={brewer?.name}
                placeholder="e.g. Kalita Wave 185"
                autoComplete="off"
                autoFocus
                required
                className={inputClass}
              />
              <ErrorText>{errors?.name}</ErrorText>
            </label>
            <button disabled={saving} className={primaryButton}>
              {brewer ? "Save" : "Add brewer"}
            </button>
          </>
        )}
      </SheetForm>
      {brewer && (
        <ArchiveControl
          type="brewer"
          id={brewer.id}
          name={brewer.name}
          note={
            brewer.brews || brewer.recipes
              ? `The ${[brewer.brews && plural(brewer.brews, "brew"), brewer.recipes && plural(brewer.recipes, "recipe")].filter(Boolean).join(" and ")} that use it keep their record.`
              : ""
          }
        />
      )}
    </Sheet>
  );
}

function GrinderSheet({
  grinder,
}: {
  grinder?: {
    id: number;
    name: string;
    settingKind: GrinderKind;
    step: number;
    unit: string | null;
    brews: number;
  };
}) {
  const saving = useSaving();
  const [kind, setKind] = useState<GrinderKind>(
    grinder?.settingKind ?? "clicks",
  );
  const [step, setStep] = useState<number>(
    grinder?.settingKind === "dial" ? grinder.step : 0.1,
  );
  const [unit, setUnit] = useState(grinder?.unit ?? "");
  const sample = { clicks: 18, dial: 4.2, stepless: 1.5 }[kind];
  const preview = formatGrind(
    {
      settingKind: kind,
      step: kind === "dial" ? step : 0.1,
      unit: kind === "stepless" ? unit.trim() || null : null,
    },
    sample,
  );

  return (
    <Sheet title={grinder ? "Edit grinder" : "New grinder"} closeTo="/settings">
      <SheetForm intent="save-grinder" id={grinder?.id}>
        {(errors) => (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-muted">Name</span>
              <input
                name="name"
                defaultValue={grinder?.name}
                placeholder="e.g. Comandante C40"
                autoComplete="off"
                autoFocus
                required
                className={inputClass}
              />
              <ErrorText>{errors?.name}</ErrorText>
            </label>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[13px] font-medium text-muted">
                Setting type
              </legend>
              <div className="flex flex-wrap gap-2">
                {GRINDER_KINDS.map((k) => (
                  <ChipRadio
                    key={k}
                    name="settingKind"
                    value={k}
                    checked={kind === k}
                    onChange={() => setKind(k)}
                    label={KIND_LABELS[k].label}
                  />
                ))}
              </div>
              <p className="text-sm text-muted">{KIND_LABELS[kind].help}</p>
            </fieldset>

            {kind === "dial" && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-[13px] font-medium text-muted">
                  Step size
                </legend>
                <div className="flex flex-wrap gap-2">
                  {DIAL_STEPS.map((s) => (
                    <ChipRadio
                      key={s}
                      name="step"
                      value={String(s)}
                      checked={step === s}
                      onChange={() => setStep(s)}
                      label={String(s)}
                    />
                  ))}
                </div>
                <ErrorText>{errors?.step}</ErrorText>
              </fieldset>
            )}

            {kind === "stepless" && (
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-muted">
                  Unit <span className="font-normal">· optional</span>
                </span>
                <input
                  name="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. turns"
                  autoComplete="off"
                  className={`${inputClass} font-normal`}
                />
              </label>
            )}

            <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">
              In a brew this reads <b className="tabular-nums">{preview}</b>
            </p>
            <button disabled={saving} className={primaryButton}>
              {grinder ? "Save" : "Add grinder"}
            </button>
          </>
        )}
      </SheetForm>
      {grinder && (
        <ArchiveControl
          type="grinder"
          id={grinder.id}
          name={grinder.name}
          note={
            grinder.brews
              ? `The ${plural(grinder.brews, "brew")} that used it keep their record.`
              : ""
          }
        />
      )}
    </Sheet>
  );
}

function ChipRadio({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="inline-block rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium tabular-nums peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
        {label}
      </span>
    </label>
  );
}

// Shared form wrapper: posts to this route's action, keeps the sheet's URL so
// errors re-render inside it, and hands field errors to its children.
function SheetForm({
  intent,
  id,
  children,
}: {
  intent: string;
  id?: number;
  children: (errors?: Errors) => React.ReactNode;
}) {
  return (
    <ActionErrors>
      {(errors) => (
        <Form method="post" preventScrollReset className="flex flex-col gap-4">
          <input type="hidden" name="intent" value={intent} />
          {id != null && <input type="hidden" name="id" value={id} />}
          {children(errors)}
        </Form>
      )}
    </ActionErrors>
  );
}

function ActionErrors({
  children,
}: {
  children: (errors?: Errors) => React.ReactNode;
}) {
  const result = useActionData<typeof action>();
  return (
    <>{children(result && "errors" in result ? result.errors : undefined)}</>
  );
}

function ArchiveControl({
  type,
  id,
  name,
  note,
}: {
  type: EquipmentType;
  id: number;
  name: string;
  note: string;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full py-2 font-medium text-danger"
      >
        Archive {type}
      </button>
    );
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-3">
      <p className="text-sm">
        Archive {name}? It leaves the pickers. {note}
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium"
        >
          Keep
        </button>
        <Form method="post" preventScrollReset>
          <input type="hidden" name="intent" value="archive" />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={id} />
          <button className="rounded-full bg-danger px-3.5 py-1.5 text-sm font-medium text-surface">
            Archive
          </button>
        </Form>
      </div>
    </div>
  );
}
