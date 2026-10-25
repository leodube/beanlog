import type { ReactNode } from "react";

/** Labelled form field with an optional hint and error message. */
export function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-muted">
        {label}
        {optional && <span className="font-normal"> · optional</span>}
      </span>
      {children}
      {error && (
        <span className="text-sm font-medium text-danger">{error}</span>
      )}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-surface p-2.5 outline-none focus:border-accent";
export const primaryButton =
  "w-full rounded-2xl bg-accent py-3.5 text-[17px] font-semibold text-accent-fg active:scale-[0.99] disabled:opacity-60";
