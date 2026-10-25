import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "B{ean}log" }];
}

// Placeholder until we design the real pages.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-sm flex-col justify-center gap-2 py-8 px-safe">
      <h1 className="text-3xl font-semibold tracking-tight">
        B&#123;ean&#125;log
      </h1>
      <p className="text-stone-600 dark:text-stone-400">Scaffold is running.</p>
    </main>
  );
}
