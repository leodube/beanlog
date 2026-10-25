/** The coffee-bean mark used for ratings. */
export function Bean({
  className,
  fill = "var(--accent)",
  seam = "var(--surface)",
}: {
  className?: string;
  fill?: string;
  seam?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <ellipse
        cx="12"
        cy="12"
        rx="7"
        ry="9.5"
        transform="rotate(30 12 12)"
        fill={fill}
        stroke={fill}
        strokeWidth="1"
      />
      <path
        d="M8.6 4.8c3.2 3.2 3.4 10.8 6.8 14.4"
        fill="none"
        stroke={seam}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Rating pill: bean + value, e.g. 4.25. `label` adds a suffix such as " avg". */
export function RatingPill({
  value,
  label,
  size = "sm",
}: {
  value: number;
  label?: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft py-1 pr-2.5 pl-1.5 font-semibold tabular-nums ${size === "lg" ? "text-lg" : "text-sm"}`}
    >
      <Bean
        className={size === "lg" ? "size-7" : "size-4"}
        seam="var(--accent-soft)"
      />
      {value.toFixed(2)}
      {label && <span className="font-normal text-muted">{label}</span>}
    </span>
  );
}
