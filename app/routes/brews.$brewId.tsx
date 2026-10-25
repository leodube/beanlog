import { Overlay } from "~/components/overlay";
import { EmptyState } from "~/components/empty-state";
import type { RouteHandle } from "~/components/route-handle";
import type { Route } from "./+types/brews.$brewId";

export const handle: RouteHandle = { title: "Brew", overlay: true };
export const meta: Route.MetaFunction = () => [{ title: "Brew · B{ean}log" }];

export default function BrewDetail({ params }: Route.ComponentProps) {
  return (
    <Overlay title="Brew" closeTo="/brews">
      <EmptyState title={`Brew #${params.brewId}`}>
        Brew detail goes here.
      </EmptyState>
    </Overlay>
  );
}
