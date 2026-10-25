// npm run user:create — create the login account. There is no sign-up page.
import { eq } from "drizzle-orm";

import { db } from "../app/db/client.server";
import { users } from "../app/db/schema.server";
import { hashPassword } from "../app/lib/auth/password.server";
import { askNewPassword, askUsername } from "./account";

const username = await askUsername();
const [existing] = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.username, username));
if (existing) {
  console.error(
    `A user called "${username}" already exists. Use npm run user:password to change its password.`,
  );
  process.exit(1);
}
const password = await askNewPassword();
await db
  .insert(users)
  .values({ username, passwordHash: await hashPassword(password) });
console.log(`Created ${username}. You can log in now.`);
process.exit(0);
