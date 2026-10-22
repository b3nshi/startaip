/** Brand mark: three rising bars (costs, tracked) on a dark tile. Same artwork as src/app/icon.svg. */
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Startup Costs" className={className}>
      <rect width="64" height="64" rx="14" fill="#18181b" />
      <rect x="13" y="36" width="10" height="15" rx="2.5" fill="#fafafa" />
      <rect x="27" y="27" width="10" height="24" rx="2.5" fill="#fafafa" />
      <rect x="41" y="13" width="10" height="38" rx="2.5" fill="#34d399" />
    </svg>
  );
}
