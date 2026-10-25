import { data, Form, redirect, useLocation, useNavigation } from "react-router";

import { BrewFields } from "~/components/brew-form";
import { primaryButton } from "~/components/fields";
import { Overlay } from "~/components/overlay";
import type { RouteHandle } from "~/components/route-handle";
import { toLocalInput } from "~/lib/brew";
import { parseBrewForm } from "~/lib/brew-form.server";
import {
  brewFormData,
  BrewRuleError,
  getBrewInputs,
  updateBrew,
} from "~/lib/brews.server";
import type { Route } from "./+types/brews.$brewId.edit";

export const handle: RouteHandle = {
  title: "Edit brew",
  overlay: true,
  backLabel: "Cancel",
  backTo: (path) => path.replace(/\/edit$/, ""),
};
export const meta: Route.MetaFunction = () => [
  { title: "Edit brew · B{ean}log" },
];

const idOf = (params: { brewId: string }) => {
  const id = Number(params.brewId);
  if (!Number.isInteger(id) || id <= 0)
    throw data("Not found", { status: 404 });
  return id;
};

export async function loader({ params }: Route.LoaderArgs) {
  const brew = await getBrewInputs(idOf(params));
  if (!brew) throw data("Brew not found", { status: 404 });
  // Keep the brew's own recipe and equipment selectable even if they've been
  // archived since. (Bags are chosen by the brew's date instead.)
  const formData = await brewFormData({
    recipeId: brew.recipeId,
    brewerId: brew.brewerId,
    grinderId: brew.grinderId,
  });
  return {
    id: brew.id,
    formData,
    initial: {
      brewedAt: toLocalInput(brew.brewedAt),
      bagId: brew.bagId,
      recipeId: brew.recipeId,
      brewerId: brew.brewerId,
      doseG: brew.doseG,
      waterMl: brew.waterMl,
      tempC: brew.tempC,
      grinderId: brew.grinderId,
      grindSetting: brew.grindSetting,
      rating: brew.rating,
      compass:
        brew.compassStrength != null
          ? {
              strength: brew.compassStrength,
              extraction: brew.compassExtraction!,
            }
          : null,
      flavourNotes: brew.flavourNotes,
      notes: brew.notes ?? "",
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const id = idOf(params);
  const parsed = parseBrewForm(await request.formData());
  if (!parsed.ok) return data({ errors: parsed.errors }, { status: 400 });
  try {
    await updateBrew(id, parsed.values);
  } catch (e) {
    if (e instanceof BrewRuleError)
      return data(
        { errors: { [e.field]: e.message } as Record<string, string> },
        { status: 400 },
      );
    throw e;
  }
  return redirect(`/brews/${id}${new URL(request.url).search}`);
}

export default function EditBrew({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const saving = useNavigation().state === "submitting";
  const { search } = useLocation();
  return (
    <Form method="post" className="contents">
      <Overlay
        title="Edit brew"
        closeTo={`/brews/${loaderData.id}${search}`}
        closeLabel="Cancel"
        footer={
          <button disabled={saving} className={primaryButton}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      >
        <BrewFields
          key={loaderData.id}
          data={loaderData.formData}
          initial={loaderData.initial}
          errors={actionData?.errors}
        />
      </Overlay>
    </Form>
  );
}
