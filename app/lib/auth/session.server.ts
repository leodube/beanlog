import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { createCookie } from "react-router";

import { db } from "~/db/client.server";
import { sessions, users } from "~/db/schema.server";
import { env } from "~/lib/env.server";

const DAY = 24 * 60 * 60 * 1000;
export const SESSION_TTL = 30 * DAY;
/** Extend a session once it has less than this left, so regular use never logs you out. */
const RENEW_BELOW = 15 * DAY;

// The cookie holds a random token. It's signed with SESSION_SECRET (tamper
// detection, rotatable via the secrets array); the database only ever sees
// its SHA-256, so a leaked backup can't be used to log in.
export const sessionCookie = createCookie("beanlog_session", {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL / 1000,
  secrets: [env.SESSION_SECRET],
});

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export type AuthUser = { id: number; username: string };
export type ValidSession = {
  user: AuthUser;
  sessionId: string;
  setCookie?: string;
};

/** Create a session and return the Set-Cookie header value for it. */
export async function startSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL),
  });
  return sessionCookie.serialize(token);
}

async function readToken(request: Request): Promise<string | null> {
  const value = await sessionCookie.parse(request.headers.get("Cookie"));
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Look up the request's session. Expired sessions are deleted on sight.
 * When the session is past its renewal point, it's extended and `setCookie`
 * carries the refreshed cookie for the response.
 */
export async function getSession(
  request: Request,
): Promise<ValidSession | null> {
  const token = await readToken(request);
  if (!token) return null;
  const id = hashToken(token);

  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      userId: users.id,
      username: users.username,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);
  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  const result: ValidSession = {
    user: { id: row.userId, username: row.username },
    sessionId: id,
  };
  if (row.expiresAt.getTime() - now < RENEW_BELOW) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(now + SESSION_TTL) })
      .where(eq(sessions.id, id));
    result.setCookie = await sessionCookie.serialize(token);
  }
  return result;
}

/** Delete the request's session (if any) and return a cookie-clearing header. */
export async function endSession(request: Request) {
  const token = await readToken(request);
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  return sessionCookie.serialize("", { maxAge: 0 });
}

/** "Log out other devices": keep only the current session. */
export async function endOtherSessions(userId: number, keepSessionId: string) {
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)));
}

/** Used after a password reset: every device has to log in again. */
export async function endAllSessions(userId: number) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Housekeeping, run on each successful login. */
export async function sweepExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export async function countSessions(userId: number) {
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())),
    );
  return rows.length;
}
