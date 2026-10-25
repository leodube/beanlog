// Failed-login limiter. In memory is enough for a single-instance app; a
// restart clears it, which is acceptable for this threat model.
const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = { ip: 5, user: 20 } as const;

const failures = new Map<string, number[]>();

function recent(key: string, now = Date.now()) {
  const hits = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length) failures.set(key, hits);
  else failures.delete(key);
  return hits;
}

const keys = (ip: string, username: string) =>
  [`ip:${ip}`, `user:${username.toLowerCase()}`] as const;

/** Seconds until another attempt is allowed, or 0 if allowed now. */
export function loginRetryAfter(ip: string, username: string) {
  const now = Date.now();
  const [ipKey, userKey] = keys(ip, username);
  let wait = 0;
  for (const [key, limit] of [
    [ipKey, LIMITS.ip],
    [userKey, LIMITS.user],
  ] as const) {
    const hits = recent(key, now);
    if (hits.length >= limit)
      wait = Math.max(wait, Math.ceil((hits[0] + WINDOW_MS - now) / 1000));
  }
  return wait;
}

export function recordLoginFailure(ip: string, username: string) {
  const now = Date.now();
  for (const key of keys(ip, username))
    failures.set(key, [...recent(key, now), now]);
}

export function clearLoginFailures(ip: string, username: string) {
  for (const key of keys(ip, username)) failures.delete(key);
}

/**
 * Client IP. Caddy replaces X-Forwarded-For with the real client address
 * (it ignores values sent by untrusted clients), so the right-most entry is
 * trustworthy as long as the app is only reachable through Caddy.
 */
export function clientIp(request: Request) {
  const xff = request.headers.get("X-Forwarded-For");
  return xff?.split(",").at(-1)?.trim() || "direct";
}
