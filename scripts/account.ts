import { z } from "zod";

import { PASSWORD_MIN_LENGTH } from "../app/lib/auth/password.server";
import { ask } from "./prompt";

export const UsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9._-]{3,32}$/,
    "3–32 characters: letters, numbers, dots, dashes or underscores.",
  );

export async function askNewPassword(): Promise<string> {
  for (;;) {
    const password = await ask(
      `Password (at least ${PASSWORD_MIN_LENGTH} characters): `,
      { hidden: true },
    );
    if (password.length < PASSWORD_MIN_LENGTH) {
      console.error(
        `  Too short: use at least ${PASSWORD_MIN_LENGTH} characters.`,
      );
      continue;
    }
    const again = await ask("Repeat password: ", { hidden: true });
    if (again !== password) {
      console.error("  Those didn't match. Try again.");
      continue;
    }
    return password;
  }
}

export async function askUsername(): Promise<string> {
  for (;;) {
    const parsed = UsernameSchema.safeParse(await ask("Username: "));
    if (parsed.success) return parsed.data;
    console.error("  " + parsed.error.issues[0].message);
  }
}
