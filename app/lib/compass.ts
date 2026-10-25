// Taste compass: two scales from -1 to 1 in 0.25 steps.
//   strength:   -1 strong … +1 weak       (x, left → right)
//   extraction: -1 sour   … +1 bitter     (y, top → bottom)
export type Compass = { strength: number; extraction: number };

export const COMPASS_STEP = 0.25;
/** Within ±0.2 of centre on an axis counts as balanced on that axis. */
const BAL = 0.2;

export const snapCompass = (v: number) =>
  Math.max(-1, Math.min(1, Math.round(v / COMPASS_STEP) * COMPASS_STEP));

export function describeCompass(c: Compass) {
  const lvl = (v: number) =>
    Math.abs(v) < 0.5 ? "slightly " : Math.abs(v) < 0.8 ? "" : "very ";
  const parts: string[] = [];
  if (Math.abs(c.extraction) >= BAL)
    parts.push(lvl(c.extraction) + (c.extraction < 0 ? "sour" : "bitter"));
  if (Math.abs(c.strength) >= BAL)
    parts.push(lvl(c.strength) + (c.strength < 0 ? "strong" : "weak"));
  if (!parts.length) return "Balanced";
  const t = parts.join(", ");
  return t[0].toUpperCase() + t.slice(1);
}

/**
 * Next-time suggestion. Extraction is fixed with grind (then temperature),
 * strength with the ratio. Grinding finer raises both, so it alone fixes
 * sour + weak; coarser alone fixes bitter + strong.
 */
export function adviseCompass(c: Compass) {
  const sour = c.extraction <= -BAL,
    bitter = c.extraction >= BAL,
    strong = c.strength <= -BAL,
    weak = c.strength >= BAL;
  if (!sour && !bitter && !strong && !weak)
    return "Dialed in. Keep these settings.";
  if (sour && weak)
    return "Grind finer. That raises extraction and strength together.";
  if (bitter && strong)
    return "Grind coarser. That lowers extraction and strength together.";
  const out: string[] = [];
  if (sour)
    out.push(
      Math.abs(c.extraction) >= 0.6
        ? "grind finer or raise the temperature"
        : "grind a little finer",
    );
  if (bitter)
    out.push(
      Math.abs(c.extraction) >= 0.6
        ? "grind coarser or lower the temperature"
        : "grind a little coarser",
    );
  if (strong) out.push("use more water or less coffee");
  if (weak) out.push("use more coffee or less water");
  const t = out.join(", and ");
  return t[0].toUpperCase() + t.slice(1) + ".";
}

/** Least-squares line through (x, y) points and where it crosses y = 0 (balanced). */
export function fitZero(points: [number, number][]) {
  if (points.length < 4) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mx = mean(points.map((p) => p[0])),
    my = mean(points.map((p) => p[1]));
  const sxx = points.reduce((a, [x]) => a + (x - mx) ** 2, 0);
  if (sxx < 1e-6) return null;
  const b = points.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0) / sxx;
  const a = my - b * mx;
  if (Math.abs(b) < 1e-3) return { a, b, x0: null };
  const x0 = -a / b,
    xs = points.map((p) => p[0]);
  return {
    a,
    b,
    x0: x0 >= Math.min(...xs) - 3 && x0 <= Math.max(...xs) + 3 ? x0 : null,
  };
}
