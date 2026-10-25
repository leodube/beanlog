// npm run user:password — set a new password and log out every device.
import { eq } from "drizzle-orm";

import { db } from "../app/db/client.server";
import { users } from "../app/db/schema.server";
import { hashPassword } from "../app/lib/auth/password.server";
import { endAllSessions } from "../app/lib/auth/session.server";
import { askNewPassword, askUsername } from "./account";

const username = await askUsername();
const [user] = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.username, username));
if (!user) {
  console.error(
    `No user called "${username}". Use npm run user:create to add one.`,
  );
  process.exit(1);
}
const password = await askNewPassword();
await db
  .update(users)
  .set({ passwordHash: await hashPassword(password) })
  .where(eq(users.id, user.id));
await endAllSessions(user.id);
console.log(`Password changed for ${username}. All devices were logged out.`);
process.exit(0);
