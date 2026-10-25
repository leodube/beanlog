import { WEIGHTED_ACTIONS, type RecipeStep } from "~/lib/domain";
import { enjoyAt, mmss } from "~/lib/recipe";

/**
 * Cumulative water over time. Each pour ramps over ~10 s from its start;
 * the time axis ends at Enjoy. Dots mark every step.
 */
export function PourChart({
  steps,
  waterMl,
}: {
  steps: Pick<RecipeStep, "at" | "action" | "targetG">[];
  waterMl: number;
}) {
  const W = 320,
    H = 96,
    L = 34,
    R = 8,
    T = 10,
    B = 20;
  const e = enjoyAt(steps);
  const end = Math.max(
    60,
    e ?? 0,
    ...steps.map((s) => (s.action === "enjoy" ? s.at : s.at + 30)),
  );
  const top = Math.max(waterMl, ...steps.map((s) => s.targetG ?? 0), 1);
  const x = (t: number) => L + (t / end) * (W - L - R);
  const y = (g: number) => T + (1 - g / top) * (H - T - B);

  let g = 0;
  let d = `M${x(0)},${y(0)}`;
  for (const st of [...steps].sort((a, b) => a.at - b.at)) {
    if (!WEIGHTED_ACTIONS.has(st.action) || st.targetG == null) continue;
    d += ` L${x(st.at)},${y(g)} L${x(Math.min(end, st.at + 10))},${y(st.targetG)}`;
    g = st.targetG;
  }
  d += ` L${x(end)},${y(g)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      role="img"
      aria-label="Water poured over time"
    >
      <line
        x1={L}
        x2={W - R}
        y1={y(waterMl)}
        y2={y(waterMl)}
        stroke="var(--line)"
        strokeDasharray="3 3"
      />
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--line)" />
      <path
        d={`${d} L${x(end)},${H - B} L${x(0)},${H - B} Z`}
        fill="var(--accent-soft)"
      />
      <path
        d={d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {steps.map((st, i) => (
        <circle key={i} cx={x(st.at)} cy={H - B} r="2.5" fill="var(--accent)" />
      ))}
      <text
        x={L - 6}
        y={y(waterMl) + 4}
        textAnchor="end"
        fontSize="10"
        fill="var(--muted)"
      >
        {waterMl} g
      </text>
      <text
        x={L - 6}
        y={H - B + 4}
        textAnchor="end"
        fontSize="10"
        fill="var(--muted)"
      >
        0
      </text>
      <text x={L} y={H - 4} fontSize="10" fill="var(--muted)">
        0:00
      </text>
      <text
        x={W - R}
        y={H - 4}
        textAnchor="end"
        fontSize="10"
        fill="var(--muted)"
      >
        {mmss(end)}
      </text>
    </svg>
  );
}
