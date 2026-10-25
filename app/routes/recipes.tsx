import { EmptyState } from "~/components/empty-state";
import type { RouteHandle } from "~/components/route-handle";
import type { Route } from "./+types/recipes";

export const handle: RouteHandle = { title: "Recipes" };
export const meta: Route.MetaFunction = () => [
  { title: "Recipes · B{ean}log" },
];

export default function RecipesPage() {
  return (
    <div className="mx-auto max-w-5xl py-4 px-safe lg:px-8 lg:py-6">
      <EmptyState title="Recipes">Your recipes and their methods.</EmptyState>
    </div>
  );
}
