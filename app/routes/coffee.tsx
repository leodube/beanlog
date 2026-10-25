import { EmptyState } from "~/components/empty-state";
import type { RouteHandle } from "~/components/route-handle";
import type { Route } from "./+types/coffee";

export const handle: RouteHandle = { title: "Coffee" };
export const meta: Route.MetaFunction = () => [{ title: "Coffee · B{ean}log" }];

export default function CoffeePage() {
  return (
    <div className="mx-auto max-w-5xl py-4 px-safe lg:px-8 lg:py-6">
      <EmptyState title="Coffee">Roasts, roasters and bags.</EmptyState>
    </div>
  );
}
