import Image from "next/image";
import Link from "next/link";

import type { ClubSponsor } from "@/app/club/content";

type ClubSponsorsMarqueeProps = {
  sponsors: ClubSponsor[];
};

export function ClubSponsorsMarquee({ sponsors }: ClubSponsorsMarqueeProps) {
  const repeated = [...sponsors, ...sponsors];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/82 py-5 shadow-[0_24px_52px_-38px_rgba(15,23,42,0.24)]">
      <div className="club-sponsors-track">
        {repeated.map((sponsor, index) => (
          <Link
            key={`${sponsor.name}-${index}`}
            href={sponsor.url}
            target="_blank"
            rel="noreferrer"
            className="club-sponsor-pill"
          >
            <Image src={sponsor.logoSrc} alt={sponsor.name} width={240} height={96} className="h-12 w-auto object-contain" />
          </Link>
        ))}
      </div>
    </div>
  );
}
