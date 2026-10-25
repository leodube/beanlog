// Small hand-drawn SVG charts for Stats. They size to their container (so text
// stays crisp instead of scaling), and marks with a `data-tip` show a tooltip:
// on hover with a mouse, on tap with a finger.
import { useEffect, useRef, useState, type ReactNode } from "react";

import { monthLabel, shortDate } from "~/lib/stats";

function useWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setWidth(Math.round(e.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Shows the nearest `data-tip` (newline-separated text) under the pointer. */
export function TipArea({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );
  const show = (e: React.PointerEvent | React.MouseEvent) => {
    const el = (e.target as Element).closest("[data-tip]");
    const r = box.current!.getBoundingClientRect();
    setTip(
      el
        ? {
            text: el.getAttribute("data-tip")!,
            x: e.clientX - r.left,
            y: e.clientY - r.top,
          }
        : null,
    );
  };
  return (
    <div
      ref={box}
      className="relative"
      onPointerMove={(e) => e.pointerType === "mouse" && show(e)}
      onPointerLeave={() => setTip(null)}
      onClick={show}
    >
      {children}
      {tip && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-56 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2 text-sm whitespace-pre-line shadow-lg"
          style={{
            left: Math.min(
              Math.max(tip.x, 90),
              (box.current?.clientWidth ?? 0) - 90,
            ),
            top: tip.y - 12,
          }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

const niceMax = (v: number) =>
  [2, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].find((x) => x >= v) ??
  Math.ceil(v / 10) * 10;

// ---------- Brews per week ----------

export function WeeklyBars({
  weeks,
}: {
  weeks: { week: string; n: number }[];
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = 160,
    L = 26,
    R = 4,
    T = 8,
    B = 22;
  const max = niceMax(Math.max(1, ...weeks.map((w) => w.n)));
  const bw = (W - L - R) / Math.max(1, weeks.length);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  let lastMonth = "",
    lastX = -Infinity;
  return (
    <div ref={ref} className="w-full">
      <TipArea>
        <svg
          width={W}
          height={H}
          className="block overflow-visible"
          role="img"
          aria-label="Brews per week"
        >
          {[0, max / 2, max].map((t) => (
            <g key={t}>
              <line
                x1={L}
                x2={W - R}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--line)"
                strokeDasharray={t ? "2 3" : undefined}
              />
              <text
                x={L - 6}
                y={y(t) + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="var(--muted)"
                className="tabular-nums"
              >
                {t}
              </text>
            </g>
          ))}
          {weeks.map((w, i) => {
            const x = L + i * bw;
            const m = monthLabel(w.week);
            const label =
              m !== lastMonth && x - lastX >= 32
                ? ((lastMonth = m), (lastX = x), m)
                : m !== lastMonth
                  ? ((lastMonth = m), null)
                  : null;
            return (
              <g key={w.week}>
                {label && (
                  <text x={x + 1} y={H - 6} fontSize="10" fill="var(--muted)">
                    {label}
                  </text>
                )}
                <rect
                  x={x + 1}
                  y={y(w.n)}
                  width={Math.max(1, bw - 2)}
                  height={Math.max(0, y(0) - y(w.n))}
                  rx={Math.min(4, Math.max(0, (bw - 2) / 2))}
                  fill="var(--accent)"
                />
                <rect
                  x={x}
                  y={T}
                  width={bw}
                  height={H - T - B}
                  fill="transparent"
                  data-tip={`Week of ${shortDate(w.week)}\n${w.n} brew${w.n === 1 ? "" : "s"}`}
                />
              </g>
            );
          })}
        </svg>
      </TipArea>
    </div>
  );
}

// ---------- Rating over time ----------

export function RatingChart({
  points,
}: {
  points: {
    id: number;
    day: string;
    rating: number;
    avg: number;
    tip: string;
  }[];
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  if (!points.length)
    return <p className="text-sm text-muted">No rated brews in this period.</p>;
  const H = 160,
    L = 26,
    R = 6,
    T = 8,
    B = 22;
  const t = (d: string) => Date.parse(d + "T12:00:00Z");
  const t0 = t(points[0].day),
    t1 = Math.max(t0 + 86400000, t(points.at(-1)!.day));
  const x = (d: string) => L + ((t(d) - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - 1) / 4) * (H - T - B);
  const line = points
    .map(
      (p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.avg).toFixed(1)}`,
    )
    .join(" ");
  // One label per month, skipping any that would crowd the previous one.
  const months: string[] = [];
  let seen = "";
  for (const p of points) {
    const m = monthLabel(p.day);
    if (m === seen) continue;
    seen = m;
    if (!months.length || x(p.day) - x(months.at(-1)!) >= 32)
      months.push(p.day);
  }
  const last = points.at(-1)!;
  return (
    <div ref={ref} className="w-full">
      <TipArea>
        <svg
          width={W}
          height={H}
          className="block overflow-visible"
          role="img"
          aria-label="Brew ratings over time"
        >
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line
                x1={L}
                x2={W - R}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--line)"
                strokeDasharray={v > 1 ? "2 3" : undefined}
              />
              <text
                x={L - 6}
                y={y(v) + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="var(--muted)"
              >
                {v}
              </text>
            </g>
          ))}
          {months.map((d) => (
            <text key={d} x={x(d)} y={H - 6} fontSize="10" fill="var(--muted)">
              {monthLabel(d)}
            </text>
          ))}
          {points.map((p) => (
            <circle
              key={p.id}
              cx={x(p.day)}
              cy={y(p.rating)}
              r="3"
              fill="var(--accent)"
              fillOpacity="0.3"
            />
          ))}
          <path
            d={line}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={x(last.day)}
            cy={y(last.avg)}
            r="4.5"
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth="2"
          />
          {points.map((p) => (
            <circle
              key={`t${p.id}`}
              cx={x(p.day)}
              cy={y(p.rating)}
              r="9"
              fill="transparent"
              data-tip={p.tip}
            />
          ))}
        </svg>
      </TipArea>
    </div>
  );
}

// ---------- Ratings per recipe ----------

export function RecipeStrips({
  rows,
}: {
  rows: {
    key: string;
    name: string;
    brewer: string;
    n: number;
    ratings: number[];
    avg: number | null;
  }[];
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const LBL = Math.min(150, W * 0.36),
    VAL = 40,
    rowH = 34,
    H = rows.length * rowH + 22;
  const x = (v: number) => LBL + ((v - 0.5) / 4.75) * (W - LBL - VAL);
  return (
    <div ref={ref} className="w-full">
      <TipArea>
        <svg
          width={W}
          height={H}
          className="block"
          role="img"
          aria-label="Ratings by recipe"
        >
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line
                x1={x(v)}
                x2={x(v)}
                y1="0"
                y2={rows.length * rowH}
                stroke="var(--line)"
                strokeDasharray="2 3"
              />
              <text
                x={x(v)}
                y={H - 6}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted)"
              >
                {v}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cy = i * rowH + rowH / 2;
            const counts = new Map<number, number>();
            const label =
              r.name.length > 18 ? r.name.slice(0, 17) + "…" : r.name;
            return (
              <g key={r.key}>
                <text x="0" y={cy - 2} fontSize="12" fill="var(--fg)">
                  {label}
                </text>
                <text x="0" y={cy + 11} fontSize="10" fill="var(--muted)">
                  {r.brewer} · {r.n}
                </text>
                <line
                  x1={x(0.5)}
                  x2={x(5.25)}
                  y1={cy}
                  y2={cy}
                  stroke="var(--line)"
                />
                {r.ratings.map((v, j) => {
                  const c = (counts.get(v) ?? 0) + 1;
                  counts.set(v, c);
                  return (
                    <circle
                      key={j}
                      cx={x(v)}
                      cy={cy + (((c - 1) % 5) - 2) * 2.2}
                      r="3.5"
                      fill="var(--accent)"
                      fillOpacity="0.35"
                    />
                  );
                })}
                {r.avg != null && (
                  <>
                    <line
                      x1={x(r.avg)}
                      x2={x(r.avg)}
                      y1={cy - 10}
                      y2={cy + 10}
                      stroke="var(--fg)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <text
                      x={W - VAL + 6}
                      y={cy + 4}
                      fontSize="11"
                      fill="var(--fg)"
                      className="tabular-nums"
                    >
                      {r.avg.toFixed(2)}
                    </text>
                  </>
                )}
                <rect
                  x="0"
                  y={i * rowH}
                  width={W}
                  height={rowH}
                  fill="transparent"
                  data-tip={`${r.name}\n${r.n} brews · ${r.ratings.length} rated\nAverage ${r.avg?.toFixed(2)} · range ${Math.min(...r.ratings).toFixed(2)}–${Math.max(...r.ratings).toFixed(2)}`}
                />
              </g>
            );
          })}
        </svg>
      </TipArea>
    </div>
  );
}

// ---------- Grind vs extraction ----------

/** Within ±0.2 of centre counts as balanced, as on the compass. */
const BAL = 0.2;

export function GrindScatter({
  points,
  fit,
  format,
}: {
  points: { x: number; y: number; tip: string }[];
  fit: { a: number; b: number; x0: number | null } | null;
  format: (v: number) => string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = 190,
    L = 58,
    R = 10,
    T = 10,
    B = 24;
  const xs = points.map((p) => p.x);
  let lo = Math.min(...xs),
    hi = Math.max(...xs);
  if (fit?.x0 != null) {
    lo = Math.min(lo, fit.x0);
    hi = Math.max(hi, fit.x0);
  }
  const pad = Math.max(0.5, (hi - lo) * 0.08);
  lo -= pad;
  hi += pad;
  const x = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  const y = (v: number) => T + ((v + 1) / 2) * (H - T - B);
  const span = hi - lo,
    step = span > 16 ? 4 : span > 8 ? 2 : span > 3 ? 1 : span > 1.5 ? 0.5 : 0.1;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step)
    ticks.push(Math.round(v * 100) / 100);
  const seen = new Map<string, number>();
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return (
    <div ref={ref} className="w-full">
      <TipArea>
        <svg
          width={W}
          height={H}
          className="block"
          role="img"
          aria-label="Sour to bitter by grind setting"
        >
          <rect
            x={L}
            y={y(-BAL)}
            width={W - L - R}
            height={y(BAL) - y(-BAL)}
            fill="var(--accent-soft)"
          />
          <line
            x1={L}
            x2={W - R}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--accent)"
            strokeDasharray="3 3"
          />
          <text
            x={L - 6}
            y={y(-1) + 8}
            textAnchor="end"
            fontSize="10"
            fill="var(--muted)"
          >
            Sour
          </text>
          <text
            x={L - 6}
            y={y(0) + 3.5}
            textAnchor="end"
            fontSize="10"
            fill="var(--accent)"
          >
            Balanced
          </text>
          <text
            x={L - 6}
            y={y(1)}
            textAnchor="end"
            fontSize="10"
            fill="var(--muted)"
          >
            Bitter
          </text>
          <line x1={L} x2={L} y1={T} y2={H - B} stroke="var(--line)" />
          {ticks.map((v) => (
            <text
              key={v}
              x={x(v)}
              y={H - 7}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted)"
              className="tabular-nums"
            >
              {format(v)}
            </text>
          ))}
          <text
            x={W - R}
            y={T + 8}
            textAnchor="end"
            fontSize="10"
            fill="var(--muted)"
          >
            coarser →
          </text>
          {points.map((p, i) => {
            const k = `${p.x}|${p.y}`;
            const n = (seen.get(k) ?? 0) + 1;
            seen.set(k, n);
            return (
              <circle
                key={i}
                cx={x(p.x) + (n - 1) * 3}
                cy={y(p.y)}
                r="3.5"
                fill="var(--accent)"
                fillOpacity="0.4"
              />
            );
          })}
          {fit && (
            <line
              x1={x(lo)}
              x2={x(hi)}
              y1={y(clamp(fit.a + fit.b * lo))}
              y2={y(clamp(fit.a + fit.b * hi))}
              stroke="var(--fg)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
          {fit?.x0 != null && (
            <>
              <line
                x1={x(fit.x0)}
                x2={x(fit.x0)}
                y1={T}
                y2={H - B}
                stroke="var(--fg)"
                strokeDasharray="2 3"
              />
              <circle
                cx={x(fit.x0)}
                cy={y(0)}
                r="5"
                fill="var(--fg)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
              <text
                x={x(fit.x0) + (x(fit.x0) > W - 70 ? -8 : 8)}
                y={T + 10}
                textAnchor={x(fit.x0) > W - 70 ? "end" : "start"}
                fontSize="11"
                fontWeight="600"
                fill="var(--fg)"
                className="tabular-nums"
              >
                ≈ {fit.x0.toFixed(1)}
              </text>
            </>
          )}
          {points.map((p, i) => (
            <circle
              key={`t${i}`}
              cx={x(p.x)}
              cy={y(p.y)}
              r="9"
              fill="transparent"
              data-tip={p.tip}
            />
          ))}
        </svg>
      </TipArea>
    </div>
  );
}
