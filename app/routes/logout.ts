import { redirect } from "react-router";

import { endSession } from "~/lib/auth/session.server";
import type { Route } from "./+types/logout";

// POST only: a GET that logs you out could be triggered by any link or image.
export async function action({ request }: Route.ActionArgs) {
  return redirect("/login", {
    headers: { "Set-Cookie": await endSession(request) },
  });
}

export function loader() {
  return redirect("/");
}
