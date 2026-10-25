import type { ReactNode } from "react";

/** A pill showing the current choice, with a native select laid invisibly over it. */
export function Picker({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium">
      <span className="min-w-0 truncate">{text}</span>
      <svg
        className="size-3.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
      {children}
    </span>
  );
}
