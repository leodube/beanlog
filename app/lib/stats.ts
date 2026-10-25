// Stats helpers shared by the server and the charts.

export const PERIODS = [
  { value: "30", label: "30 days", days: 30 },
  { value: "90", label: "90 days", days: 90 },
  { value: "all", label: "All time", days: null },
] as const;
export type PeriodValue = (typeof PERIODS)[number]["value"];

export function parsePeriod(raw: string | null) {
  return PERIODS.find((p) => p.value === raw) ?? PERIODS[1];
}

export const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

/** "Jul 26" from a local YYYY-MM-DD, the same on server and browser. */
export function shortDate(isoDate: string) {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function monthLabel(isoDate: string) {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString("en-CA", {
    month: "short",
    timeZone: "UTC",
  });
}

/** Whole days from `a` to `b`, both local YYYY-MM-DD. */
export function daysBetween(a: string, b: string) {
  return Math.round(
    (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000,
  );
}

/** Monday of the week containing a local YYYY-MM-DD. */
export function weekStart(isoDate: string) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, n: number) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * A recipe "setup" within a bag. Brews without a recipe are grouped by
 * brewer, since that's the closest thing to a method they have.
 */
export const recipeKey = (b: { recipeId: number | null; brewerId: number }) =>
  b.recipeId != null ? `r${b.recipeId}` : `b${b.brewerId}`;
