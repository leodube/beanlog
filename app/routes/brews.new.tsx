import { Overlay } from "~/components/overlay";
import { EmptyState } from "~/components/empty-state";
import type { RouteHandle } from "~/components/route-handle";
import type { Route } from "./+types/brews.new";

export const handle: RouteHandle = {
  title: "New brew",
  overlay: true,
  backLabel: "Cancel",
};
export const meta: Route.MetaFunction = () => [
  { title: "New brew · B{ean}log" },
];

export default function NewBrew() {
  return (
    <Overlay
      title="New brew"
      closeTo="/brews"
      closeLabel="Cancel"
      footer={
        <button
          disabled
          className="w-full rounded-2xl bg-accent py-3.5 text-[17px] font-semibold text-accent-fg opacity-60"
        >
          Log brew
        </button>
      }
    >
      <EmptyState title="Brew entry">
        The form from the mockup goes here.
      </EmptyState>
    </Overlay>
  );
}
