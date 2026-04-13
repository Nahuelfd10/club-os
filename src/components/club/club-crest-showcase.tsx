import { ClubLogo } from "@/components/club-logo";

type ClubCrestShowcaseProps = {
  logo: string;
  name: string;
};

export function ClubCrestShowcase({ logo, name }: ClubCrestShowcaseProps) {
  return (
    <div className="club-crest-stage relative mx-auto flex aspect-[4/5] w-full max-w-[360px] items-center justify-center">
      <div className="club-crest-glow club-crest-glow-primary" aria-hidden />
      <div className="club-crest-glow club-crest-glow-accent" aria-hidden />
      <div className="club-crest-shadow" aria-hidden />

      <div className="club-crest-shell">
        <div className="club-crest-shell-inner">
          <div className="club-crest-badge">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">Club</span>
            <span className="mt-1 text-center text-xl font-black tracking-tight text-white">{name}</span>
          </div>

          <div className="club-crest-mark">
            <ClubLogo
              src={logo}
              alt={`Escudo de ${name}`}
              className="h-[78%] w-[78%] object-contain drop-shadow-[0_22px_36px_rgba(15,23,42,0.32)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
