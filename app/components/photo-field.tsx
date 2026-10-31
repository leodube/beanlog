import { useEffect, useRef, useState } from "react";

import { CameraIcon } from "./icons";
import { photoUrl, preparePhoto } from "~/lib/photo";

/**
 * Bag photo picker for a multipart form. Tapping it offers the camera or the
 * photo library (iOS shows both for `accept="image/*"`). The picked photo is
 * resized here, then the resized photo and its thumbnail are put into hidden
 * file inputs (`photo`, `photoThumb`), so the original never leaves the phone.
 * `photoRemove=1` asks the server to delete the current photo.
 */
export function PhotoField({
  current,
  error,
}: {
  current: number | null;
  error?: string;
}) {
  const fullInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Free the preview's memory when it's replaced or the form goes away.
  useEffect(
    () => () => void (preview && URL.revokeObjectURL(preview)),
    [preview],
  );

  const setFiles = (full: Blob | null, thumb: Blob | null) => {
    const put = (
      input: HTMLInputElement | null,
      blob: Blob | null,
      name: string,
    ) => {
      if (!input) return;
      const dt = new DataTransfer();
      if (blob) dt.items.add(new File([blob], name, { type: "image/jpeg" }));
      input.files = dt.files;
    };
    put(fullInput.current, full, "photo.jpg");
    put(thumbInput.current, thumb, "thumb.jpg");
  };

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setProblem(null);
    try {
      const { full, thumb } = await preparePhoto(file);
      setFiles(full, thumb);
      setPreview(URL.createObjectURL(full));
      setRemoved(false);
    } catch {
      setProblem("That photo couldn't be read. Try another.");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setFiles(null, null);
    setPreview(null);
    setRemoved(current != null);
  }

  const shown =
    preview ??
    (current != null && !removed ? photoUrl(current, "thumb") : null);
  const picker = (label: string, className: string) => (
    <label className={className}>
      {label}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = ""; // picking the same photo again still fires
        }}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={fullInput}
        type="file"
        name="photo"
        hidden
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={thumbInput}
        type="file"
        name="photoThumb"
        hidden
        tabIndex={-1}
        aria-hidden="true"
      />
      {removed && <input type="hidden" name="photoRemove" value="1" />}

      {shown ? (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
          <img
            src={shown}
            alt="Bag photo"
            className="h-28 w-[5.5rem] shrink-0 rounded-xl object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-sm text-muted">
              {busy ? "Preparing photo…" : "Bag photo"}
            </span>
            <div className="flex flex-wrap gap-2">
              {picker(
                "Replace",
                "cursor-pointer rounded-full border border-line px-3.5 py-1.5 text-sm font-medium focus-within:ring-2 focus-within:ring-accent",
              )}
              <button
                type="button"
                onClick={remove}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-surface p-3 focus-within:ring-2 focus-within:ring-accent">
          <span className="grid h-28 w-[5.5rem] shrink-0 place-items-center rounded-xl bg-surface-2 text-accent">
            <CameraIcon className="size-7" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="font-medium text-accent">
              {busy ? "Preparing photo…" : "Add a photo"}
            </span>
            <span className="text-sm text-muted">
              Take one or choose from your library
            </span>
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {(problem ?? error) && (
        <span className="text-sm font-medium text-danger">
          {problem ?? error}
        </span>
      )}
    </div>
  );
}
