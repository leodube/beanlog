import { Outlet, useOutlet } from "react-router";

import { EmptyState } from "~/components/empty-state";
import type { RouteHandle } from "~/components/route-handle";
import type { Route } from "./+types/brews";

export const handle: RouteHandle = { title: "Brews" };
export const meta: Route.MetaFunction = () => [{ title: "Brews · B{ean}log" }];

// The list stays rendered under brew entry and brew detail on desktop (they
// open as drawers); on the phone those pages replace it.
export default function Brews() {
  const child = useOutlet();
  return (
    <>
      <div className={child ? "hidden lg:block" : undefined}>
        <div className="mx-auto max-w-5xl py-4 px-safe lg:px-8 lg:py-6">
          <EmptyState title="No brews yet">
            Tap Log to record your first one.
          </EmptyState>
        </div>
      </div>
      <Outlet />
    </>
  );
}
