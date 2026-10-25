import { NavLink, Outlet } from "react-router";

import type { RouteHandle } from "~/components/route-handle";
import type { Route } from "./+types/stats";

export const handle: RouteHandle = { title: "Stats" };
export const meta: Route.MetaFunction = () => [{ title: "Stats · B{ean}log" }];

/** Stats has two tabs, each its own URL so Back and reloads keep your place. */
export default function StatsLayout() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-1.5 text-sm font-medium ${isActive ? "bg-accent text-accent-fg" : "text-muted"}`;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 py-4 px-safe lg:px-8 lg:py-6">
      <nav
        aria-label="Stats"
        className="flex gap-1 self-start rounded-full border border-line bg-surface p-1"
      >
        <NavLink to="/stats" end className={tab}>
          Overview
        </NavLink>
        <NavLink to="/stats/dialing-in" className={tab}>
          Dialing in
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
