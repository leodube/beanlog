import type { ReactNode } from "react";
import { Link } from "react-router";

/**
 * Content for an overlay route (brew entry, brew detail…).
 * Phone: a normal full-screen page under the shell header (which shows the
 * back button). Desktop: a drawer pinned to the right, over its section.
 */
export function Overlay({
  title,
  closeTo,
  closeLabel = "Close",
  children,
  footer,
}: {
  title: string;
  closeTo: string;
  closeLabel?: string;
  children: ReactNode;
  /** Sticky action bar (e.g. Save): above the home indicator on the phone, at the drawer's foot on desktop. */
  footer?: ReactNode;
}) {
  return (
    <>
      {/* Desktop: dim the section behind the drawer; clicking it closes. */}
      <Link
        to={closeTo}
        aria-label={closeLabel}
        tabIndex={-1}
        className="fixed inset-0 z-30 hidden bg-black/20 lg:block"
      />
      <section
        aria-label={title}
        className="flex min-h-[calc(100dvh-3rem)] flex-col bg-bg lg:fixed lg:inset-y-0 lg:right-0 lg:z-40 lg:min-h-0 lg:w-[440px] lg:border-l lg:border-line lg:shadow-2xl"
      >
        <div className="hidden items-center justify-between border-b border-line bg-surface px-4 py-3 lg:flex">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <Link to={closeTo} className="text-[15px] text-accent">
            {closeLabel}
          </Link>
        </div>
        <div className="flex-1 py-4 px-safe lg:overflow-y-auto lg:px-4">
          {children}
        </div>
        {footer && (
          <div className="sticky bottom-0 border-t border-line bg-surface pt-3 px-safe pb-safe lg:px-4 lg:pb-3">
            {footer}
          </div>
        )}
      </section>
    </>
  );
}
