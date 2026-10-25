import { eq } from "drizzle-orm";

import { db } from "~/db/client.server";
import { users } from "~/db/schema.server";
import {
  hashPassword,
  PASSWORD_MIN_LENGTH,
  verifyPassword,
} from "./password.server";
import {
  clearLoginFailures,
  loginRetryAfter,
  recordLoginFailure,
} from "./rate-limit.server";
import { endOtherSessions } from "./session.server";

export type PasswordErrors = {
  current?: string;
  next?: string;
  repeat?: string;
};

/**
 * Change the signed-in user's password from Settings. The current password
 * is required (a borrowed unlocked phone shouldn't be enough to take over the
 * account), and wrong guesses count against the same limiter as logins.
 * Every other device is logged out; this one stays signed in.
 */
export async function changePassword(input: {
  userId: number;
  username: string;
  sessionId: string;
  ip: string;
  current: string;
  next: string;
  repeat: string;
}): Promise<{ ok: true } | { ok: false; errors: PasswordErrors }> {
  const wait = loginRetryAfter(input.ip, input.username);
  if (wait)
    return {
      ok: false,
      errors: {
        current: `Too many wrong passwords. Try again in ${Math.ceil(wait / 60)} min.`,
      },
    };

  const errors: PasswordErrors = {};
  if (input.next.length < PASSWORD_MIN_LENGTH)
    errors.next = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  else if (input.next.length > 1024) errors.next = "That's too long.";
  else if (input.repeat !== input.next) errors.repeat = "These don't match.";
  else if (input.next === input.current)
    errors.next = "That's your current password. Pick a new one.";

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, input.userId));
  if (!user || !(await verifyPassword(user.passwordHash, input.current))) {
    recordLoginFailure(input.ip, input.username);
    return {
      ok: false,
      errors: { ...errors, current: "That isn't your current password." },
    };
  }
  clearLoginFailures(input.ip, input.username);
  if (Object.keys(errors).length) return { ok: false, errors };

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(input.next) })
    .where(eq(users.id, input.userId));
  await endOtherSessions(input.userId, input.sessionId);
  return { ok: true };
}
