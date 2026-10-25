import { useEffect, useRef, useState, type ReactNode } from "react";

const round = (v: number, step: number) =>
  Number((Math.round(v / step) * step).toFixed(4));

/**
 * Number field with − / + buttons (thumb-sized) that you can also type into.
 * Typing is free-form; the value snaps to `step` when the field loses focus.
 */
export function Stepper({
  label,
  unit,
  name,
  value,
  onChange,
  step,
  min = 0,
  max = 9999,
  decimals = 0,
  aside,
}: {
  label: string;
  unit: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  decimals?: number;
  /** Shown to the right of the label, e.g. "Recipe 15 g · Reset". */
  aside?: ReactNode;
}) {
  const fmt = (v: number) => v.toFixed(decimals);
  const [text, setText] = useState(fmt(value));
  const typing = useRef(false);
  // Follow outside changes (recipe prefill, Reset, ± buttons), but never
  // reformat what you're in the middle of typing.
  useEffect(() => {
    if (!typing.current) setText(fmt(value));
  }, [value, decimals]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (v: number) => {
    const next = Math.min(max, Math.max(min, round(v, step)));
    onChange(next);
    setText(fmt(next));
  };
  const id = `f-${name}`;

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm text-muted">
          {label}
        </label>
        {aside}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => set(value - step)}
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-xl active:scale-95"
        >
          −
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
          <input
            id={id}
            name={name}
            value={text}
            inputMode="decimal"
            autoComplete="off"
            onChange={(e) => {
              setText(e.target.value);
              const v = parseFloat(e.target.value.replace(",", "."));
              if (!Number.isNaN(v)) onChange(v);
            }}
            onFocus={() => (typing.current = true)}
            onBlur={() => {
              typing.current = false;
              set(value);
            }}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), set(value))
            }
            className="w-full min-w-0 bg-transparent text-center text-2xl font-semibold tabular-nums outline-none"
          />
          {unit && <span className="shrink-0 text-sm text-muted">{unit}</span>}
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => set(value + step)}
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-xl active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}
