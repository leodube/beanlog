import {
  bagUnavailable,
  BrewInput,
  toLocalInput,
  type BrewValues,
} from "./brew";
import type { BrewFormInitial } from "~/components/brew-form";
import { brewFormData, getBrewInputs } from "./brews.server";
import { fieldErrors, formToObject } from "./form";

export function parseBrewForm(
  form: FormData,
):
  | { ok: true; values: BrewValues }
  | { ok: false; errors: Record<string, string> } {
  const parsed = BrewInput.safeParse(formToObject(form, ["flavourNotes"]));
  return parsed.success
    ? { ok: true, values: parsed.data }
    : { ok: false, errors: fieldErrors(parsed.error.issues) };
}

type FormData_ = Awaited<ReturnType<typeof brewFormData>>;

/**
 * Starting values for a new brew:
 * - ?again=<brewId>: that brew's setup, unrated, brewed now.
 * - ?coffee=<coffeeId>: your last setup, with that coffee.
 * - otherwise: your last brew's setup.
 * Tasting fields always start empty. Finished bags fall back to the same
 * coffee's newest open bag; archived recipes/equipment fall back to none.
 */
export async function initialBrew(
  data: FormData_,
  url: URL,
): Promise<BrewFormInitial> {
  const now = toLocalInput(new Date());
  const againId = Number(url.searchParams.get("again"));
  const coffeeId = Number(url.searchParams.get("coffee"));
  const source = againId
    ? await getBrewInputs(againId)
    : data.history[0]
      ? await getBrewInputs(data.history[0].id)
      : null;

  // A new brew is brewed now, so only bags around today count.
  const onShelf = data.bagOptions.filter((b) => !bagUnavailable(b, data.today));
  const openBag = (bagId: number | undefined, coffee: number | undefined) =>
    onShelf.find((b) => b.id === bagId)?.id ??
    onShelf.find((b) => b.coffeeId === coffee)?.id ??
    null;
  const has = <T extends { id: number }>(
    xs: T[],
    id: number | null | undefined,
  ) => (id != null && xs.some((x) => x.id === id) ? id : null);

  const bagId = coffeeId
    ? openBag(undefined, coffeeId)
    : openBag(source?.bagId, source?.coffeeId);
  return {
    brewedAt: now,
    bagId: bagId ?? onShelf[0]?.id ?? null,
    recipeId: has(data.recipeOptions, source?.recipeId),
    brewerId: has(data.brewerOptions, source?.brewerId),
    doseG: source?.doseG ?? 15,
    waterMl: source?.waterMl ?? 250,
    tempC: source?.tempC ?? 94,
    grinderId: has(data.grinderOptions, source?.grinderId),
    grindSetting: source?.grindSetting ?? 15,
    rating: null,
    compass: null,
    flavourNotes: [],
    notes: "",
  };
}
