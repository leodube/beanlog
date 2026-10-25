import { redirect, type MiddlewareFunction } from "react-router";

import { sessionIdContext, userContext } from "./context.server";
import { getSession } from "./session.server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Cross-site request guard. SameSite=Lax already keeps the session cookie off
 * cross-site POSTs; this rejects any state-changing request whose Origin
 * header names another site. Browsers send Origin on every POST.
 */
export function assertSameOrigin(request: Request) {
  if (SAFE_METHODS.has(request.method)) return;
  const origin = request.headers.get("Origin");
  if (!origin) return;
  const host =
    request.headers.get("X-Forwarded-Host") ??
    request.headers.get("Host") ??
    new URL(request.url).host;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Response("Bad Origin header", { status: 403 });
  }
  if (originHost !== host)
    throw new Response("Cross-site request blocked", { status: 403 });
}

/**
 * Runs before every loader and action under the protected layout. A loader
 * check alone isn't enough: React Router runs loaders in parallel and sends
 * form posts straight to the child route's action, so only middleware is
 * guaranteed to run first.
 */
export const requireAuth: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  assertSameOrigin(request);
  const session = await getSession(request);
  if (!session) {
    const url = new URL(request.url);
    const back = url.pathname + url.search;
    throw redirect(
      back === "/" ? "/login" : `/login?redirectTo=${encodeURIComponent(back)}`,
    );
  }
  context.set(userContext, session.user);
  context.set(sessionIdContext, session.sessionId);

  const response = await next();
  if (session.setCookie)
    response.headers.append("Set-Cookie", session.setCookie);
  return response;
};

/** Only allow redirects to paths on this site ("/brews", not "//evil.com"). */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  fallback = "/",
) {
  if (
    typeof to !== "string" ||
    !to.startsWith("/") ||
    to.startsWith("//") ||
    to.startsWith("/\\")
  )
    return fallback;
  return to;
}
