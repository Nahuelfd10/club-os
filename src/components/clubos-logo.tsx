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
      <style>{`
        .logo-grid rect {
          transition: all 0.25s ease;
        }

        .logo-grid:hover rect {
          filter: drop-shadow(0 0 6px rgba(59,130,246,0.6));
        }

        .logo-grid rect.accent {
          transform-origin: center;
        }

        .logo-grid:hover rect.accent {
          animation: clubos-pulse 1.2s ease-in-out infinite;
          filter: drop-shadow(0 0 8px rgba(249,115,22,0.8));
        }

        @keyframes clubos-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>

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
