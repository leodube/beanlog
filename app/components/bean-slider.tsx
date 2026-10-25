import { useRef } from "react";

import { Bean } from "./bean";

const STEP = 0.25;
const clamp = (v: number) =>
  Math.min(5, Math.max(STEP, Math.round(v / STEP) * STEP));

/**
 * Drag-to-rate slider: 0.25 to 5 in 0.25 steps, ticks every 0.5, bean thumb.
 * `null` means not rated. Pass `name` to also submit the value with a form.
 * `onCommit` fires when a drag ends or a key changes the value (for autosave).
 */
export function BeanSlider({
  value,
  onChange,
  onCommit,
  name,
  label = "Rating",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  onCommit?: (v: number | null) => void;
  name?: string;
  label?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const latest = useRef(value);
  latest.current = value;

  const fromX = (x: number) => {
    const box = track.current!.getBoundingClientRect();
    const v = clamp(((x - box.left) / box.width) * 5);
    if (v !== latest.current) onChange(v);
    latest.current = v;
  };
  const pct = ((value ?? 0) / 5) * 100;
  const on = value != null;

  return (
    <div className="flex flex-col gap-3">
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-3 pl-1.5 text-base font-semibold tabular-nums">
          <Bean
            className="size-6"
            fill={on ? "var(--accent)" : "var(--muted)"}
            seam="var(--accent-soft)"
          />
          {on ? (
            value.toFixed(2)
          ) : (
            <span className="font-medium text-muted">Drag to rate</span>
          )}
        </span>
        {on && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              onCommit?.(null);
            }}
            className="text-sm text-accent"
          >
            Clear
          </button>
        )}
      </div>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0.25}
        aria-valuemax={5}
        aria-valuenow={value ?? undefined}
        aria-valuetext={on ? `${value.toFixed(2)} out of 5` : "Not rated"}
        className="relative mx-4 h-12 cursor-pointer touch-none select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragging.current = true;
          fromX(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && fromX(e.clientX)}
        onPointerUp={() => {
          dragging.current = false;
          onCommit?.(latest.current);
        }}
        onKeyDown={(e) => {
          const d = {
            ArrowRight: STEP,
            ArrowUp: STEP,
            ArrowLeft: -STEP,
            ArrowDown: -STEP,
          }[e.key];
          if (!d) return;
          e.preventDefault();
          const v = clamp((value ?? 0) + d);
          onChange(v);
          onCommit?.(v);
        }}
      >
        {Array.from({ length: 11 }, (_, i) => (
          <span
            key={i}
            className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${i * 10}%`,
              background:
                on && i / 2 <= value ? "var(--accent)" : "var(--line)",
            }}
          />
        ))}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md"
          style={{ left: `${pct}%` }}
        >
          <Bean
            className="size-11"
            fill={on ? "var(--accent)" : "var(--muted)"}
          />
        </div>
      </div>
    </div>
  );
}
