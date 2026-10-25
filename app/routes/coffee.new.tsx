import { data, Form, redirect, useNavigation } from "react-router";

import { CoffeeFields } from "~/components/coffee-form";
import { primaryButton } from "~/components/fields";
import { Overlay } from "~/components/overlay";
import type { RouteHandle } from "~/components/route-handle";
import { localToday } from "~/lib/coffee";
import {
  createCoffee,
  DuplicateError,
  roasterOptions,
} from "~/lib/coffee.server";
import { parseCoffeeForm } from "~/lib/coffee-form.server";
import type { Route } from "./+types/coffee.new";

export const handle: RouteHandle = {
  title: "New coffee",
  overlay: true,
  backLabel: "Cancel",
};
export const meta: Route.MetaFunction = () => [
  { title: "New coffee · B{ean}log" },
];

export async function loader() {
  return { roasters: await roasterOptions(), today: localToday() };
}

export async function action({ request }: Route.ActionArgs) {
  const parsed = parseCoffeeForm(await request.formData(), { withBag: true });
  if (!parsed.ok) return data({ errors: parsed.errors }, { status: 400 });
  try {
    const id = await createCoffee(parsed.roaster, parsed.coffee, parsed.bag!);
    return redirect(`/coffee/${id}`);
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
}

export default function NewCoffee({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const saving = useNavigation().state === "submitting";
  return (
    <Form method="post" className="contents">
      <Overlay
        title="New coffee"
        closeTo="/coffee"
        closeLabel="Cancel"
        footer={
          <button disabled={saving} className={primaryButton}>
            {saving ? "Saving…" : "Save coffee"}
          </button>
        }
      >
        <CoffeeFields
          roasters={loaderData.roasters}
          errors={actionData?.errors}
          withBag
          today={loaderData.today}
        />
      </Overlay>
    </Form>
  );
}
