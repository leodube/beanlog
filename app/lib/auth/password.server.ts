import { hash, verify } from "@node-rs/argon2";

// OWASP's recommended argon2id settings: 19 MiB memory, 2 iterations, 1 lane.
// The parameters are stored inside each hash, so changing them later only
// affects new hashes; existing passwords keep verifying.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false; // malformed hash
  }
}

// Verifying against this when the username doesn't exist makes an unknown
// user take as long as a wrong password, so timing can't reveal usernames.
let dummyHash: Promise<string> | undefined;
export async function burnVerifyTime(password: string) {
  dummyHash ??= hashPassword("beanlog-timing-equaliser");
  await verifyPassword(await dummyHash, password);
}

export const PASSWORD_MIN_LENGTH = 12;
