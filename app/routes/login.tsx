import { eq } from "drizzle-orm";
import { data, Form, redirect, useNavigation } from "react-router";
import { z } from "zod";

import { db } from "~/db/client.server";
import { users } from "~/db/schema.server";
import { assertSameOrigin, safeRedirect } from "~/lib/auth/middleware.server";
import { burnVerifyTime, verifyPassword } from "~/lib/auth/password.server";
import {
  clearLoginFailures,
  clientIp,
  loginRetryAfter,
  recordLoginFailure,
} from "~/lib/auth/rate-limit.server";
import {
  getSession,
  startSession,
  sweepExpiredSessions,
} from "~/lib/auth/session.server";
import type { Route } from "./+types/login";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Log in · B{ean}log" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  // Already signed in: skip the form.
  const redirectTo = safeRedirect(
    new URL(request.url).searchParams.get("redirectTo"),
  );
  if (await getSession(request)) throw redirect(redirectTo);
  // Read on the server so the hidden field renders the same on server and client.
  return { redirectTo };
}

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(1024),
  redirectTo: z.string().optional(),
});

const GENERIC_ERROR = "That username and password don't match.";

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const parsed = LoginSchema.safeParse(
    Object.fromEntries(await request.formData()),
  );
  if (!parsed.success)
    return data(
      { error: "Enter your username and password." },
      { status: 400 },
    );
  const { username, password, redirectTo } = parsed.data;

  const ip = clientIp(request);
  const wait = loginRetryAfter(ip, username);
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60);
    return data(
      {
        error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  const ok = user
    ? await verifyPassword(user.passwordHash, password)
    : (await burnVerifyTime(password), false);
  if (!user || !ok) {
    recordLoginFailure(ip, username);
    return data({ error: GENERIC_ERROR }, { status: 401 });
  }

  clearLoginFailures(ip, username);
  await sweepExpiredSessions();
  return redirect(safeRedirect(redirectTo), {
    headers: { "Set-Cookie": await startSession(user.id) },
  });
}

export default function Login({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const { redirectTo } = loaderData;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 py-10 px-safe">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          B&#123;ean&#125;log
        </h1>
        <p className="text-muted">Log in to your brew log.</p>
      </div>

      <Form method="post" className="flex flex-col gap-4" replace>
        {redirectTo !== "/" && (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        )}
        {actionData?.error && (
          <p
            role="alert"
            className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger"
          >
            {actionData.error}
          </p>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Username</span>
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            className="rounded-xl border border-line bg-surface p-3 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-xl border border-line bg-surface p-3 outline-none focus:border-accent"
          />
        </label>
        <button
          disabled={busy}
          className="mt-2 rounded-2xl bg-accent py-3.5 text-[17px] font-semibold text-accent-fg disabled:opacity-60"
        >
          {busy ? "Logging in…" : "Log in"}
        </button>
      </Form>
    </main>
  );
}
