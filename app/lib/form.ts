/**
 * FormData → plain object for Zod. Keys listed in `arrays` collect every
 * value (repeated fields like tasting notes); everything else takes the first.
 */
export function formToObject(form: FormData, arrays: string[] = []) {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(form.keys()))
    out[key] = arrays.includes(key) ? form.getAll(key) : form.get(key)!;
  for (const key of arrays) out[key] ??= [];
  return out;
}

/** Zod issues → { field: first message }. */
export function fieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}
