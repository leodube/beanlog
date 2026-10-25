import { data, Form, redirect, useNavigation } from "react-router";

import { BrewFields } from "~/components/brew-form";
import { primaryButton } from "~/components/fields";
import { Overlay } from "~/components/overlay";
import type { RouteHandle } from "~/components/route-handle";
import { initialBrew, parseBrewForm } from "~/lib/brew-form.server";
import { brewFormData, BrewRuleError, createBrew } from "~/lib/brews.server";
import type { Route } from "./+types/brews.new";

export const handle: RouteHandle = {
  title: "New brew",
  overlay: true,
  backLabel: "Cancel",
};
export const meta: Route.MetaFunction = () => [
  { title: "New brew · B{ean}log" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const formData = await brewFormData();
  return {
    formData,
    initial: await initialBrew(formData, new URL(request.url)),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const parsed = parseBrewForm(await request.formData());
  if (!parsed.ok) return data({ errors: parsed.errors }, { status: 400 });
  try {
    await createBrew(parsed.values);
  } catch (e) {
    if (e instanceof BrewRuleError)
      return data(
        { errors: { [e.field]: e.message } as Record<string, string> },
        { status: 400 },
      );
    throw e;
  }
  return redirect("/brews");
}

export default function NewBrew({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const saving = useNavigation().state === "submitting";
  const { formData, initial } = loaderData;
  const ready =
    formData.bagOptions.length > 0 &&
    formData.brewerOptions.length > 0 &&
    formData.grinderOptions.length > 0;
  return (
    <Form method="post" className="contents">
      <Overlay
        title="New brew"
        closeTo="/brews"
        closeLabel="Cancel"
        footer={
          <button disabled={saving || !ready} className={primaryButton}>
            {saving ? "Saving…" : "Log brew"}
          </button>
        }
      >
        {!ready && (
          <p className="mb-4 rounded-xl bg-accent-soft p-3 text-sm text-accent">
            To log a brew you need a coffee on the shelf, a brewer and a
            grinder. Anything missing can be added below or in Settings.
          </p>
        )}
        <BrewFields
          data={formData}
          initial={initial}
          errors={actionData?.errors}
        />
      </Overlay>
    </Form>
  );
}
