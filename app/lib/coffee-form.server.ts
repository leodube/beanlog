import type { z } from "zod";

import { BagInput, CoffeeInput, RoasterInput } from "./coffee";
import { fieldErrors, formToObject } from "./form";

type Parsed =
  | { ok: false; errors: Record<string, string> }
  | {
      ok: true;
      roaster:
        | number
        | { name: string; city: string | null; countryCode: string | null };
      coffee: Omit<z.output<typeof CoffeeInput>, "roasterId">;
      bag: { roastedOn: string; weightG: number; notes: string | null } | null;
    };

/** Validate the coffee form (and, for new coffees, its first bag) in one pass. */
export function parseCoffeeForm(
  form: FormData,
  { withBag }: { withBag: boolean },
): Parsed {
  const raw = formToObject(form, ["tastingNotes"]);
  const coffee = CoffeeInput.safeParse(raw);
  const roaster = raw.roasterId === "new" ? RoasterInput.safeParse(raw) : null;
  const bag = withBag ? BagInput.safeParse(raw) : null;

  const errors = {
    ...(coffee.success ? {} : fieldErrors(coffee.error.issues)),
    ...(roaster && !roaster.success ? fieldErrors(roaster.error.issues) : {}),
    ...(bag && !bag.success ? fieldErrors(bag.error.issues) : {}),
  };
  if (!coffee.success || (roaster && !roaster.success) || (bag && !bag.success))
    return { ok: false, errors };

  const { roasterId, ...values } = coffee.data;
  return {
    ok: true,
    roaster: roaster?.success ? roaster.data : (roasterId as number),
    coffee: values,
    bag: bag?.success
      ? {
          roastedOn: bag.data.roastedOn,
          weightG: bag.data.weightG,
          notes: bag.data.bagNotes,
        }
      : null,
  };
}
