type ClubOsLogoProps = {
  className?: string;
};

export function ClubOsLogo({ className = "" }: ClubOsLogoProps) {
  return (
    <svg
      className={`logo logo-grid ${className}`.trim()}
      width="140"
      height="32"
      viewBox="0 0 140 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Club OS"
      role="img"
    >
      <rect x="2" y="6" width="8" height="8" rx="2" fill="#3B82F6" />
      <rect x="12" y="6" width="8" height="8" rx="2" fill="#3B82F6" />
      <rect x="2" y="16" width="8" height="8" rx="2" fill="#3B82F6" />
      <rect className="accent" x="12" y="16" width="8" height="8" rx="2" fill="#F97316" />

      <text x="30" y="21" fill="currentColor" fontFamily="var(--font-geist-sans), sans-serif" fontSize="14" fontWeight="700">
        Club OS
      </text>
    </svg>
  );
}
