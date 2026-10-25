/**
 * Single-choice chips backed by real radio inputs, so they submit with a
 * plain form and work with the keyboard.
 */
export function ChipRadios<T extends string>({
  name,
  options,
  value,
  defaultValue,
  onChange,
}: {
  name: string;
  options: readonly (readonly [T, string])[];
  value?: T;
  defaultValue?: T;
  onChange?: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <label key={v} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={v}
            {...(value !== undefined
              ? { checked: value === v, onChange: () => onChange?.(v) }
              : { defaultChecked: defaultValue === v })}
            className="peer sr-only"
          />
          <span className="inline-block rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium tabular-nums peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}
