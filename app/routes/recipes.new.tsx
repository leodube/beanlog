import { data, Form, redirect, useNavigation } from "react-router";

import { primaryButton } from "~/components/fields";
import { Overlay } from "~/components/overlay";
import { NEW_RECIPE, RecipeFields } from "~/components/recipe-editor";
import type { RouteHandle } from "~/components/route-handle";
import { parseRecipeForm } from "~/lib/recipe-form.server";
import { brewerChoices, createRecipe } from "~/lib/recipes.server";
import type { Route } from "./+types/recipes.new";

export const handle: RouteHandle = {
  title: "New recipe",
  overlay: true,
  backLabel: "Cancel",
};
export const meta: Route.MetaFunction = () => [
  { title: "New recipe · B{ean}log" },
];

export async function loader() {
  return { brewers: await brewerChoices() };
}

export async function action({ request }: Route.ActionArgs) {
  const parsed = parseRecipeForm(await request.formData());
  if (!parsed.ok) return data({ errors: parsed.errors }, { status: 400 });
  await createRecipe(parsed.values);
  return redirect("/recipes");
}

export default function NewRecipe({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const saving = useNavigation().state === "submitting";
  return (
    <Form method="post" className="contents">
      <Overlay
        title="New recipe"
        closeTo="/recipes"
        closeLabel="Cancel"
        footer={
          <button disabled={saving} className={primaryButton}>
            {saving ? "Saving…" : "Save recipe"}
          </button>
        }
      >
        <RecipeFields
          values={NEW_RECIPE}
          brewers={loaderData.brewers}
          errors={actionData?.errors}
        />
      </Overlay>
    </Form>
  );
}
