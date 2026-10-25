import { Form, useRouteLoaderData } from "react-router";

import type { Route } from "./+types/home";
import type { loader as appLoader } from "./_app";

export function meta({}: Route.MetaArgs) {
  return [{ title: "B{ean}log" }];
}

// Placeholder until the real pages are built.
export default function Home() {
  const data = useRouteLoaderData<typeof appLoader>("routes/_app");
  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-sm flex-col justify-center gap-4 py-8 px-safe">
      <h1 className="text-3xl font-semibold tracking-tight">
        B&#123;ean&#125;log
      </h1>
      <p className="text-stone-600 dark:text-stone-400">
        Signed in as{" "}
        <b className="text-stone-900 dark:text-stone-100">
          {data?.user.username}
        </b>
        .
      </p>
      <Form method="post" action="/logout">
        <button className="rounded-xl border border-stone-300 px-4 py-2 font-medium dark:border-stone-700">
          Log out
        </button>
      </Form>
    </main>
  );
}
