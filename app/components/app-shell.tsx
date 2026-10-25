import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";

import { LogoMark, Wordmark } from "./logo";

import {
  BackIcon,
  BrewsIcon,
  CoffeeIcon,
  PlusIcon,
  RecipesIcon,
  SettingsIcon,
  StatsIcon,
} from "./icons";
import { useShellMatches } from "./route-handle";

const SECTIONS = [
  { to: "/brews", label: "Brews", Icon: BrewsIcon },
  { to: "/coffee", label: "Coffee", Icon: CoffeeIcon },
  { to: "/recipes", label: "Recipes", Icon: RecipesIcon },
  { to: "/stats", label: "Stats", Icon: StatsIcon },
] as const;

/**
 * Phone: header + content + bottom tab bar (Brews, Coffee, Log, Recipes, Stats).
 * Desktop (lg, 1024px+): fixed sidebar + header + content.
 * Overlay pages hide the tab bar on the phone and show a back button.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { overlay } = useShellMatches();
  return (
    <div className="min-h-dvh lg:pl-60">
      <Sidebar />
      <Header />
      <main className={overlay ? "lg:pb-0" : "pb-28 lg:pb-0"}>{children}</main>
      {!overlay && <TabBar />}
    </div>
  );
}

function Header() {
  const { section, page, overlay } = useShellMatches();
  const navigate = useNavigate();
  const location = useLocation();
  const pushed = Boolean(page?.handle?.pushed);
  // "default" is the first entry in this tab's history: nothing to go back to.
  const canGoBack = location.key !== "default";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface pt-safe">
      <div className="relative flex h-12 items-center justify-between gap-3 px-safe lg:px-8">
        {/* Phone: back button for overlays and pushed pages */}
        <div className="flex min-w-16 items-center lg:hidden">
          {overlay && section && (
            <Link
              to={page?.handle?.backTo?.(page.pathname) ?? section.pathname}
              className="flex items-center gap-0.5 text-[15px] text-accent"
            >
              {page?.handle?.backLabel ? (
                page.handle.backLabel
              ) : (
                <>
                  <BackIcon className="size-5" />
                  {section.handle?.title}
                </>
              )}
            </Link>
          )}
          {pushed && (
            <button
              type="button"
              onClick={() => (canGoBack ? navigate(-1) : navigate("/brews"))}
              className="flex items-center gap-0.5 text-[15px] text-accent"
            >
              <BackIcon className="size-5" />
              Back
            </button>
          )}
        </div>

        {/* Phone shows the page title; desktop keeps the section title while a drawer is open */}
        <h1 className="absolute left-1/2 -translate-x-1/2 truncate text-[17px] font-semibold lg:static lg:translate-x-0">
          <span className="lg:hidden">{page?.handle?.title}</span>
          <span className="hidden lg:inline">
            {(overlay ? section : page)?.handle?.title}
          </span>
        </h1>

        <div className="flex min-w-16 justify-end lg:hidden">
          {!overlay && !pushed && (
            <Link
              to="/settings"
              aria-label="Settings"
              className="grid size-9 place-items-center rounded-full text-muted"
            >
              <SettingsIcon className="size-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function TabBar() {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-20 flex items-end border-t border-line bg-surface pt-1 px-safe pb-safe lg:hidden"
    >
      {SECTIONS.slice(0, 2).map((s) => (
        <Tab key={s.to} {...s} />
      ))}
      <Link
        to="/brews/new"
        aria-label="Log a brew"
        className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted"
      >
        <span className="-mt-5 grid size-14 place-items-center rounded-full bg-accent text-accent-fg shadow-lg">
          <PlusIcon className="size-7" />
        </span>
        Log
      </Link>
      {SECTIONS.slice(2).map((s) => (
        <Tab key={s.to} {...s} />
      ))}
    </nav>
  );
}

function Tab({ to, label, Icon }: (typeof SECTIONS)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium ${isActive ? "text-accent" : "text-muted"}`
      }
    >
      <Icon className="size-6" />
      {label}
    </NavLink>
  );
}

function Sidebar() {
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium ${isActive ? "bg-accent-soft text-accent" : "text-muted hover:text-fg"}`;
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-1 border-r border-line bg-surface p-4 lg:flex">
      <Link
        to="/brews"
        aria-label="B{ean}log"
        className="mb-4 flex items-center gap-2.5 px-2 text-xl font-semibold tracking-tight"
      >
        <LogoMark className="size-8" />
        <span aria-hidden="true">
          <Wordmark />
        </span>
      </Link>
      <Link
        to="/brews/new"
        className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-accent py-2.5 font-semibold text-accent-fg"
      >
        <PlusIcon className="size-5" />
        Log brew
      </Link>
      <nav aria-label="Sections" className="flex flex-col gap-0.5">
        {SECTIONS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={item}>
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <NavLink to="/settings" className={(s) => `mt-auto ${item(s)}`}>
        <SettingsIcon className="size-5" />
        Settings
      </NavLink>
    </aside>
  );
}
