export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <rect width="64" height="64" rx="14" fill="currentColor" />
      <path
        d="M20 18h24M20 28h24M20 18c14 0 14 20 0 20l18 12"
        fill="none"
        stroke="var(--background, #fff)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
