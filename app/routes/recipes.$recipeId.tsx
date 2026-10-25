import { useState } from "react";
import { data, Form, redirect, useNavigation } from "react-router";

import { primaryButton } from "~/components/fields";
import { Overlay } from "~/components/overlay";
import { RecipeFields } from "~/components/recipe-editor";
import type { RouteHandle } from "~/components/route-handle";
import { parseRecipeForm } from "~/lib/recipe-form.server";
import {
  brewerChoices,
  getRecipe,
  setRecipeArchived,
  updateRecipe,
} from "~/lib/recipes.server";
import type { Route } from "./+types/recipes.$recipeId";

export const handle: RouteHandle = {
  title: "Edit recipe",
  overlay: true,
  backLabel: "Cancel",
};
export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData?.recipe.name ?? "Recipe"} · B{ean}log` },
];

const idOf = (params: { recipeId: string }) => {
  const id = Number(params.recipeId);
  if (!Number.isInteger(id) || id <= 0)
    throw data("Not found", { status: 404 });
  return id;
};

export async function loader({ params }: Route.LoaderArgs) {
  const [recipe, brewers] = await Promise.all([
    getRecipe(idOf(params)),
    brewerChoices(),
  ]);
  if (!recipe) throw data("Recipe not found", { status: 404 });
  return { recipe, brewers };
}

export async function action({ request, params }: Route.ActionArgs) {
  const id = idOf(params);
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "archive" || intent === "restore") {
    await setRecipeArchived(id, intent === "archive");
    return redirect("/recipes");
  }
  const parsed = parseRecipeForm(form);
  if (!parsed.ok) return data({ errors: parsed.errors }, { status: 400 });
  await updateRecipe(id, parsed.values);
  return redirect("/recipes");
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function EditRecipe({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { recipe, brewers } = loaderData;
  const saving = useNavigation().state === "submitting";
  return (
    <>
      <Form method="post" className="contents" id="recipe-form">
        <Overlay
          title="Edit recipe"
          closeTo="/recipes"
          closeLabel="Cancel"
          footer={
            <button disabled={saving} className={primaryButton}>
              {saving ? "Saving…" : "Save recipe"}
            </button>
          }
        >
          <RecipeFields
            key={recipe.id}
            values={recipe}
            brewers={brewers}
            errors={actionData?.errors}
          />
          {!recipe.archivedAt && <ArchiveRecipe brews={recipe.brews} />}
        </Overlay>
      </Form>
    </>
  );
}

// Archive lives inside the edit form's overlay but submits its own intent via
// the button's name/value, so it doesn't need a nested form.
function ArchiveRecipe({ brews }: { brews: number }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mt-5 pb-2">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full rounded-2xl border border-line bg-surface py-3 font-medium text-danger"
        >
          Archive recipe
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
          <p className="text-sm">
            Archive this recipe? It disappears from the recipe picker.
            {brews > 0 &&
              ` The ${plural(brews, "brew")} that used it keep their link and their copy of the method.`}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium"
            >
              Keep
            </button>
            <button
              name="intent"
              value="archive"
              formNoValidate
              className="rounded-full bg-danger px-3.5 py-1.5 text-sm font-medium text-surface"
            >
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
