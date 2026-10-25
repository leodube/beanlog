import { useMatches, type UIMatch } from "react-router";

/**
 * Per-route metadata for the shell, set with `export const handle = { … }`.
 * - title:   shown in the header (and the browser tab via meta).
 * - overlay: a page that opens over its section (brew entry, brew detail).
 *            Full screen with a back button on the phone, a drawer on desktop.
 * - backLabel: text for the phone's back button on an overlay ("Cancel" for forms).
 * - backTo:  where the phone's back button goes, given the page's pathname
 *            (defaults to the section, e.g. /coffee/3/edit → /coffee/3).
 * - pushed:  a page opened from the header (Settings) that gets a back button.
 */
export type RouteHandle = {
  title?: string;
  overlay?: boolean;
  backLabel?: string;
  backTo?: (pathname: string) => string;
  pushed?: boolean;
};

type Match = UIMatch<unknown, RouteHandle | undefined>;

/** The section (first titled route) and the page (deepest titled route). */
export function useShellMatches() {
  const matches = (useMatches() as Match[]).filter((m) => m.handle?.title);
  const section = matches[0];
  const page = matches.at(-1);
  return {
    section,
    page,
    overlay: Boolean(page?.handle?.overlay && page !== section),
  };
}
