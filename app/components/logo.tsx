/**
 * The B{ean}log mark: a coffee bean whose crease is a curly brace. Same
 * drawing as public/favicon.svg; the colours stay fixed so the mark looks
 * the same in light and dark mode, like the app icon.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="#95561a" />
      <g transform="translate(32 32) rotate(30) scale(2.05)">
        <ellipse rx="7" ry="9.5" fill="#f8ecdc" />
        <path
          d="M1.3-7.5c-1.6 0-2.1.9-2.1 2.2v2.6c0 1.3-.6 2.1-1.6 2.7 1 .6 1.6 1.4 1.6 2.7v2.6c0 1.3.5 2.2 2.1 2.2"
          fill="none"
          stroke="#95561a"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** "B{ean}log" with the braces in the accent colour. */
export function Wordmark() {
  return (
    <>
      B<span className="text-accent">&#123;</span>ean
      <span className="text-accent">&#125;</span>log
    </>
  );
}
