import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

/**
 * A modal sheet. Bottom sheet on the phone, centred dialog on desktop.
 *
 * - With `closeTo`, its open state lives in the URL (e.g. /settings?new=grinder),
 *   so it renders on the server, survives a reload, and Back closes it.
 * - With `onClose`, it's local UI state (e.g. the recipe picker inside the brew
 *   form), so opening it never navigates away from a half-filled form.
 */
export function Sheet({
  title,
  closeTo,
  onClose,
  children,
}: {
  title: string;
  closeTo?: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const close = () =>
    onClose
      ? onClose()
      : closeTo && navigate(closeTo, { preventScrollReset: true });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    // Keep the page behind from scrolling while the sheet is open.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const closeControl = (
    className: string,
    children?: ReactNode,
    extra: Record<string, unknown> = {},
  ) =>
    closeTo ? (
      <Link to={closeTo} preventScrollReset className={className} {...extra}>
        {children}
      </Link>
    ) : (
      <button type="button" onClick={close} className={className} {...extra}>
        {children}
      </button>
    );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center">
      {closeControl("absolute inset-0 bg-black/40", null, {
        "aria-label": "Close",
        tabIndex: -1,
      })}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-surface pt-5 px-safe pb-safe lg:w-[440px] lg:rounded-3xl lg:px-5 lg:pb-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          {closeControl("text-[15px] text-accent", onClose ? "Done" : "Cancel")}
        </div>
        {children}
      </div>
    </div>
  );
}
