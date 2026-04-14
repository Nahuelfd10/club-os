import { ClubLogo } from "@/components/club-logo";

type ClubCrestShowcaseProps = {
  logo: string;
  name: string;
};

export function ClubCrestShowcase({ logo, name }: ClubCrestShowcaseProps) {
  return (
    <div className="club-crest-stage relative mx-auto flex aspect-square w-full max-w-[420px] items-center justify-center">
      <div
        aria-hidden
        className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_42%,transparent_72%)]"
      />
      <div aria-hidden className="absolute inset-[12%] rounded-full border border-white/8" />
      <div aria-hidden className="absolute inset-[24%] rounded-full border border-white/6" />
      <div
        aria-hidden
        className="absolute inset-x-[18%] top-[14%] h-[28%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.03)_56%,transparent_76%)] blur-2xl"
      />
      <div className="club-crest-glow club-crest-glow-primary" aria-hidden />
      <div className="club-crest-glow club-crest-glow-accent" aria-hidden />
      <div className="club-crest-shadow" aria-hidden />

      <ClubLogo
        src={logo}
        alt={`Escudo de ${name}`}
        className="relative z-10 h-[100%] w-[100%] object-contain drop-shadow-[0_34px_68px_rgba(2,8,23,0.68)]"
      />
    </div>
  );
}
