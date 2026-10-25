import { useRef, type ReactNode } from "react";

import { Bean, RatingPill } from "./bean";
import {
  adviseCompass,
  COMPASS_STEP,
  describeCompass,
  snapCompass,
  type Compass,
} from "~/lib/compass";

// The ±1 edges sit 12% in from the pad's edges, clear of the labels.
const R = 38;
const pos = (v: number) => 50 + v * R;

/**
 * Taste compass pad: tap or drag; snaps to a 9 × 9 grid (0.25 steps); arrow
 * keys move one step. Submits as compassStrength / compassExtraction.
 */
export function TasteCompass({
  value,
  onChange,
}: {
  value: Compass | null;
  onChange: (c: Compass | null) => void;
}) {
  const pad = useRef<HTMLDivElement>(null);
  const place = (x: number, y: number) => {
    const box = pad.current!.getBoundingClientRect();
    const toV = (p: number, start: number, size: number) =>
      snapCompass((((p - start) / size) * 100 - 50) / R);
    const next = {
      strength: toV(x, box.left, box.width),
      extraction: toV(y, box.top, box.height),
    };
    if (
      !value ||
      next.strength !== value.strength ||
      next.extraction !== value.extraction
    )
      onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        type="hidden"
        name="compassStrength"
        value={value?.strength ?? ""}
      />
      <input
        type="hidden"
        name="compassExtraction"
        value={value?.extraction ?? ""}
      />
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Where did this cup land?</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm text-accent"
          >
            Clear
          </button>
        )}
      </div>
      <div
        ref={pad}
        tabIndex={0}
        role="group"
        aria-label={`Taste compass. ${value ? describeCompass(value) : "Not placed"}. Arrow keys move the marker.`}
        className="relative mx-auto aspect-square w-full max-w-72 cursor-crosshair touch-none rounded-2xl border border-line bg-surface-2 select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          place(e.clientX, e.clientY);
        }}
        onPointerMove={(e) =>
          e.currentTarget.hasPointerCapture(e.pointerId) &&
          place(e.clientX, e.clientY)
        }
        onKeyDown={(e) => {
          const d = (
            {
              ArrowLeft: ["strength", -1],
              ArrowRight: ["strength", 1],
              ArrowUp: ["extraction", -1],
              ArrowDown: ["extraction", 1],
            } as const
          )[e.key as "ArrowLeft"];
          if (!d) return;
          e.preventDefault();
          const cur = value ?? { strength: 0, extraction: 0 };
          onChange({
            ...cur,
            [d[0]]: snapCompass(cur[d[0]] + d[1] * COMPASS_STEP),
          });
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          <line
            x1="50"
            y1="6"
            x2="50"
            y2="94"
            stroke="var(--line)"
            strokeWidth="0.6"
          />
          <line
            x1="6"
            y1="50"
            x2="94"
            y2="50"
            stroke="var(--line)"
            strokeWidth="0.6"
          />
          <line
            x1="12"
            y1="12"
            x2="88"
            y2="88"
            stroke="var(--line)"
            strokeWidth="0.4"
            strokeDasharray="1.5 2"
          />
          <line
            x1="88"
            y1="12"
            x2="12"
            y2="88"
            stroke="var(--line)"
            strokeWidth="0.4"
            strokeDasharray="1.5 2"
          />
          <circle
            cx="50"
            cy="50"
            r="10"
            fill="var(--accent-soft)"
            stroke="var(--accent)"
            strokeWidth="0.5"
            strokeDasharray="1.5 1.5"
          />
          <g fill="var(--muted)" fillOpacity="0.18">
            {Array.from({ length: 81 }, (_, i) => (
              <circle
                key={i}
                cx={pos(((i % 9) - 4) / 4)}
                cy={pos((Math.floor(i / 9) - 4) / 4)}
                r="0.8"
              />
            ))}
          </g>
        </svg>
        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[11px] font-semibold tracking-widest uppercase">
          Sour
        </span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] font-semibold tracking-widest uppercase">
          Bitter
        </span>
        <span className="absolute top-1/2 left-1 -translate-y-1/2 rotate-180 text-[11px] font-semibold tracking-widest uppercase [writing-mode:vertical-rl]">
          Strong
        </span>
        <span className="absolute top-1/2 right-1 -translate-y-1/2 text-[11px] font-semibold tracking-widest uppercase [writing-mode:vertical-rl]">
          Weak
        </span>
        {value ? (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 drop-shadow-md"
            style={{
              left: `${pos(value.strength)}%`,
              top: `${pos(value.extraction)}%`,
            }}
          >
            <Bean className="size-9" />
          </div>
        ) : (
          <span className="pointer-events-none absolute top-[60%] left-1/2 -translate-x-1/2 text-xs whitespace-nowrap text-muted">
            Tap to place
          </span>
        )}
      </div>
      <p
        className={`text-center ${value ? "font-medium" : "text-sm text-muted"}`}
      >
        {value ? describeCompass(value) : "Not placed"}
      </p>
      {value && (
        <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">
          <b>Next time:</b> {adviseCompass(value)}
        </p>
      )}
    </div>
  );
}

/** Small read-only compass with a dot, for lists and the brew page. */
export function CompassGlyph({
  value,
  className = "size-7",
}: {
  value: Compass;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="9"
        fill="var(--surface-2)"
        stroke="var(--line)"
      />
      <line x1="20" y1="5" x2="20" y2="35" stroke="var(--line)" />
      <line x1="5" y1="20" x2="35" y2="20" stroke="var(--line)" />
      <circle
        cx="20"
        cy="20"
        r="4.5"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="0.8"
        strokeDasharray="1.5 1.5"
      />
      <circle
        cx={20 + value.strength * 15}
        cy={20 + value.extraction * 15}
        r="4"
        fill="var(--accent)"
        stroke="var(--surface)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/**
 * The compass frame with no reading. Used in lists so rows keep one height
 * and a missing reading is easy to spot.
 */
export function EmptyCompass({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`${className} shrink-0`}
      role="img"
      aria-label="No compass reading"
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="9"
        fill="none"
        stroke="var(--muted)"
        strokeOpacity="0.45"
        strokeDasharray="3 2.5"
      />
      <line
        x1="20"
        y1="8"
        x2="20"
        y2="32"
        stroke="var(--muted)"
        strokeOpacity="0.35"
      />
      <line
        x1="8"
        y1="20"
        x2="32"
        y2="20"
        stroke="var(--muted)"
        strokeOpacity="0.35"
      />
    </svg>
  );
}

/** Rating chip over a compass (or its empty frame), centred in one column. */
export function RatingCompassColumn({
  rating,
  compass,
  notRated,
}: {
  rating: number | null;
  compass: Compass | null;
  notRated: ReactNode;
}) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
      {rating != null ? <RatingPill value={rating} /> : notRated}
      {compass ? (
        <CompassGlyph value={compass} className="size-16" />
      ) : (
        <EmptyCompass className="size-16" />
      )}
    </div>
  );
}
