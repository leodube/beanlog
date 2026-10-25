import { fieldErrors, formToObject } from "./form";
import { RecipeInput, type RecipeFormValues } from "./recipe";

export function parseRecipeForm(
  form: FormData,
):
  | { ok: true; values: RecipeFormValues }
  | { ok: false; errors: Record<string, string> } {
  const parsed = RecipeInput.safeParse(formToObject(form));
  return parsed.success
    ? { ok: true, values: parsed.data }
    : { ok: false, errors: fieldErrors(parsed.error.issues) };
}
