import { data, Form, redirect, useNavigation } from "react-router";

import { CoffeeFields } from "~/components/coffee-form";
import { primaryButton } from "~/components/fields";
import { Overlay } from "~/components/overlay";
import type { RouteHandle } from "~/components/route-handle";
import { localToday } from "~/lib/coffee";
import {
  DuplicateError,
  getCoffee,
  roasterOptions,
  updateCoffee,
} from "~/lib/coffee.server";
import { parseCoffeeForm } from "~/lib/coffee-form.server";
import type { Route } from "./+types/coffee.$coffeeId.edit";

export const handle: RouteHandle = {
  title: "Edit coffee",
  overlay: true,
  backLabel: "Cancel",
  backTo: (path) => path.replace(/\/edit$/, ""),
};
export const meta: Route.MetaFunction = () => [
  { title: "Edit coffee · B{ean}log" },
];

const idOf = (params: { coffeeId: string }) => {
  const id = Number(params.coffeeId);
  if (!Number.isInteger(id) || id <= 0)
    throw data("Not found", { status: 404 });
  return id;
};

export async function loader({ params }: Route.LoaderArgs) {
  const [coffee, roasters] = await Promise.all([
    getCoffee(idOf(params)),
    roasterOptions(),
  ]);
  if (!coffee) throw data("Coffee not found", { status: 404 });
  return { coffee, roasters, today: localToday() };
}

export async function action({ request, params }: Route.ActionArgs) {
  const id = idOf(params);
  const parsed = parseCoffeeForm(await request.formData(), { withBag: false });
  if (!parsed.ok) return data({ errors: parsed.errors }, { status: 400 });
  try {
    await updateCoffee(id, parsed.roaster, parsed.coffee);
  } catch (e) {
    if (e instanceof DuplicateError)
      return data(
        {
          errors: (e.field === "roaster"
            ? {
                roasterName:
                  "That roaster already exists. Pick it from the list.",
              }
            : {
                name: "This roaster already has a coffee with that name.",
              }) as Record<string, string>,
        },
        { status: 400 },
      );
    throw e;
  }
  return redirect(`/coffee/${id}`);
}

export default function EditCoffee({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const saving = useNavigation().state === "submitting";
  const { coffee } = loaderData;
  return (
    <Form method="post" className="contents">
      <Overlay
        title="Edit coffee"
        closeTo={`/coffee/${coffee.id}`}
        closeLabel="Cancel"
        footer={
          <button disabled={saving} className={primaryButton}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      >
        <CoffeeFields
          values={coffee}
          roasters={loaderData.roasters}
          errors={actionData?.errors}
          today={loaderData.today}
        />
      </Overlay>
    </Form>
  );
}
