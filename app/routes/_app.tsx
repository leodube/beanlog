import { Outlet } from "react-router";

import { userContext } from "~/lib/auth/context.server";
import { requireAuth } from "~/lib/auth/middleware.server";
import type { Route } from "./+types/_app";

// Every route nested under this layout requires a signed-in user.
export const middleware: Route.MiddlewareFunction[] = [requireAuth];

export function loader({ context }: Route.LoaderArgs) {
  return { user: context.get(userContext) };
}

// The real app shell (tab bar / sidebar) replaces this when we build it.
export default function AppLayout() {
  return <Outlet />;
}
