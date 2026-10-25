import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

/**
 * A modal sheet whose open state lives in the URL (e.g. /settings?new=grinder),
 * so it renders on the server, survives a reload, and the back button closes it.
 * Bottom sheet on the phone, centred dialog on desktop.
 */
export function Sheet({
  title,
  closeTo,
  children,
}: {
  title: string;
  closeTo: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate(closeTo, { preventScrollReset: true });
    };
    window.addEventListener("keydown", onKey);
    // Keep the page behind from scrolling while the sheet is open.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [closeTo, navigate]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center">
      <Link
        to={closeTo}
        preventScrollReset
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-surface pt-5 px-safe pb-safe lg:w-[440px] lg:rounded-3xl lg:px-5 lg:pb-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <Link
            to={closeTo}
            preventScrollReset
            className="text-[15px] text-accent"
          >
            Cancel
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
