import { data } from "react-router";

import { BrewerInput, GrinderInput } from "~/lib/equipment";
import { saveBrewer, saveGrinder } from "~/lib/equipment.server";
import type { Route } from "./+types/equipment";

// Resource route for adding a brewer or grinder from inside the brew form.
// Returns JSON instead of redirecting, so the form underneath stays put.
export async function action({ request }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  if (form.type === "brewer") {
    const parsed = BrewerInput.safeParse(form);
    if (!parsed.success)
      return data(
        { ok: false as const, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    const id = await saveBrewer(null, parsed.data);
    if (typeof id === "object")
      return data(
        {
          ok: false as const,
          error: `You already have a brewer called ${parsed.data.name}.`,
        },
        { status: 400 },
      );
    return { ok: true as const, id };
  }
  if (form.type === "grinder") {
    const parsed = GrinderInput.safeParse(form);
    if (!parsed.success)
      return data(
        { ok: false as const, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    const id = await saveGrinder(null, parsed.data);
    if (typeof id === "object")
      return data(
        {
          ok: false as const,
          error: `You already have a grinder called ${parsed.data.name}.`,
        },
        { status: 400 },
      );
    return { ok: true as const, id };
  }
  throw data("Unknown type", { status: 400 });
}
