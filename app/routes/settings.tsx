import { Form, useRouteLoaderData } from "react-router";

import { EmptyState } from "~/components/empty-state";
import type { RouteHandle } from "~/components/route-handle";
import type { Route } from "./+types/settings";
import type { loader as appLoader } from "./_app";

export const handle: RouteHandle = { title: "Settings", pushed: true };
export const meta: Route.MetaFunction = () => [
  { title: "Settings · B{ean}log" },
];

export default function Settings() {
  const user = useRouteLoaderData<typeof appLoader>("routes/_app")?.user;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-4 px-safe lg:px-8 lg:py-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-medium text-muted">Equipment</h2>
        <EmptyState title="Brewers and grinders">
          Managed here once we build this page.
        </EmptyState>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-medium text-muted">Account</h2>
        <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between px-3 py-3">
            <span className="text-muted">Signed in as</span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <Form method="post" action="/logout">
            <button className="w-full px-3 py-3 text-left font-medium text-danger">
              Log out
            </button>
          </Form>
        </div>
      </section>
    </div>
  );
}
