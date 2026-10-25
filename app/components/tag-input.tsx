import { useState } from "react";

/**
 * Free-text tags (e.g. a roaster's tasting notes). Chips sit above a
 * full-width input; Enter or a comma adds, Backspace on empty removes the last.
 * Each tag submits as a repeated hidden field called `name`.
 */
export function TagInput({
  name,
  defaultValue = [],
  placeholder,
}: {
  name: string;
  defaultValue?: string[];
  placeholder?: string;
}) {
  const [tags, setTags] = useState(defaultValue);
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const t = raw.replace(/,$/, "").trim();
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase()))
      setTags([...tags, t]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2.5">
      {tags.map((t) => (
        <input key={t} type="hidden" name={name} value={t} />
      ))}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full border border-line py-1 pr-1.5 pl-2.5 text-sm"
            >
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                onClick={() => setTags(tags.filter((x) => x !== t))}
                className="text-muted"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) =>
          e.target.value.endsWith(",")
            ? add(e.target.value)
            : setDraft(e.target.value)
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // don't submit the form
            add(draft);
          } else if (e.key === "Backspace" && !draft && tags.length)
            setTags(tags.slice(0, -1));
        }}
        // Typed but not yet added when the form is saved: keep it.
        onBlur={() => draft.trim() && add(draft)}
        placeholder={tags.length ? "Add another" : placeholder}
        enterKeyHint="done"
        autoComplete="off"
        className="w-full rounded-lg bg-surface-2 px-2.5 py-2 outline-none"
      />
    </div>
  );
}
