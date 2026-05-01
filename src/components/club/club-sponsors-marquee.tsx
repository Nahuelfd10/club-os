import type { PublicSponsor } from "@/lib/sponsors";

type ClubSponsorsMarqueeProps = {
  sponsors: PublicSponsor[];
};

export function ClubSponsorsMarquee({ sponsors }: ClubSponsorsMarqueeProps) {
  // Duplicamos el array para que la animación de marquee sea continua sin
  // saltos cuando el track llega al final.
  const repeated = [...sponsors, ...sponsors];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/64 py-5 shadow-[0_24px_52px_-38px_rgba(2,8,23,0.55)]">
      <div className="club-sponsors-track">
        {repeated.map((sponsor, index) => {
          const key = `${sponsor.id}-${index}`;
          // eslint-disable-next-line @next/next/no-img-element
          const logo = (
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              loading="lazy"
              className="h-12 w-auto object-contain"
            />
          );

          if (sponsor.url) {
            return (
              <a
                key={key}
                href={sponsor.url}
                target="_blank"
                rel="noreferrer"
                className="club-sponsor-pill"
                aria-label={sponsor.name}
              >
                {logo}
              </a>
            );
          }

          return (
            <div key={key} className="club-sponsor-pill" aria-label={sponsor.name}>
              {logo}
            </div>
          );
        })}
      </div>
    </div>
  );
}
