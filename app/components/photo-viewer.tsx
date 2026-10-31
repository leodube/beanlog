import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Bean } from "./bean";
import { ExpandIcon } from "./icons";
import { photoUrl } from "~/lib/photo";

/** A bag photo as a 4:3 header; tapping opens it full-screen. */
export function PhotoHeader({ id, alt }: { id: number; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View photo full size"
        className="relative overflow-hidden rounded-2xl bg-surface-2"
      >
        <img
          src={photoUrl(id)}
          alt={alt}
          className="aspect-[4/3] w-full object-cover"
        />
        <span className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-black/45 text-white">
          <ExpandIcon className="size-4" />
        </span>
      </button>
      {open && <PhotoViewer id={id} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Full-screen photo on black. Tap, Done or Escape closes it. */
function PhotoViewer({
  id,
  alt,
  onClose,
}: {
  id: number;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Portalled to <body> so no drawer or transformed parent can clip it.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 pt-safe pb-safe"
    >
      <div className="flex justify-end px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="rounded-full bg-white/15 px-4 py-1.5 text-[15px] font-medium text-white"
        >
          Done
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="flex min-h-0 flex-1 items-center justify-center p-4"
      >
        <img
          src={photoUrl(id)}
          alt={alt}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
      </button>
    </div>,
    document.body,
  );
}

/**
 * A bag photo thumbnail, or an empty tile in the same spot so lists line up.
 * Default size suits the coffee cards (4:5, like a bag).
 */
export function BagThumb({
  photoId,
  className = "h-20 w-16",
}: {
  photoId: number | null;
  className?: string;
}) {
  return photoId != null ? (
    <img
      src={photoUrl(photoId, "thumb")}
      alt=""
      loading="lazy"
      className={`${className} shrink-0 rounded-xl bg-surface-2 object-cover`}
    />
  ) : (
    <span
      className={`${className} grid shrink-0 place-items-center rounded-xl bg-surface-2`}
      aria-hidden="true"
    >
      <Bean className="size-6" fill="var(--line)" seam="var(--surface-2)" />
    </span>
  );
}
