import { EmptyState } from "~/components/empty-state";
import type { RouteHandle } from "~/components/route-handle";
import type { Route } from "./+types/stats";

export const handle: RouteHandle = { title: "Stats" };
export const meta: Route.MetaFunction = () => [{ title: "Stats · B{ean}log" }];

export default function StatsPage() {
  return (
    <div className="mx-auto max-w-5xl py-4 px-safe lg:px-8 lg:py-6">
      <EmptyState title="Stats">
        Charts appear once you've logged some brews.
      </EmptyState>
    </div>
  );
}
