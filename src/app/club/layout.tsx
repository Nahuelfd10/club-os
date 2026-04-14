import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";

import { ClubLogo } from "@/components/club-logo";
import { buttonClassNames } from "@/components/ui";
import { getActiveClubConfig } from "@/config/active-club";

const navItems = [
  { href: "/club#identidad", label: "Identidad" },
  { href: "/club#equipos", label: "Equipos" },
  { href: "/club#unete", label: "Unete" },
  { href: "/club#sponsors", label: "Sponsors" },
  { href: "/club#proyectos", label: "Proyectos" },
];

export async function generateMetadata(): Promise<Metadata> {
  const config = await getActiveClubConfig();
  const description = `${config.name} presenta su propuesta institucional, sponsors, proyectos y registro de socios en una landing clara y moderna.`;

  return {
    title: config.name,
    description,
    openGraph: {
      title: config.name,
      description,
      locale: "es_AR",
      type: "website",
    },
  };
}

export default async function ClubPublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getActiveClubConfig();

  return (
    <div className="club-page-shell min-h-screen">
      <div className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
        <header className="mx-auto flex w-full max-w-[100rem] items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/72 px-4 py-3 shadow-[0_22px_60px_-36px_rgba(2,8,23,0.95)] backdrop-blur-xl sm:px-6">
          <Link href="/club" className="flex min-w-0 items-center gap-3">
            <ClubLogo
              src={config.logo}
              alt={`Logo de ${config.name}`}
              className="h-11 w-auto max-h-11 max-w-[168px] shrink-0 rounded-2xl bg-white/92 p-1.5"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">Club</p>
              <p className="club-display truncate text-2xl leading-none text-white sm:text-[1.75rem]">{config.name}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white/72 transition-colors hover:bg-white/8 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={buttonClassNames({
                variant: "ghost",
                size: "md",
                className: "hidden border border-white/10 text-white hover:bg-white/10 hover:text-white sm:inline-flex",
              })}
            >
              Club OS
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "md" })}>
              Hacete socio
            </Link>
          </div>
        </header>
      </div>

      <div className="relative z-10 flex-1">{children}</div>

      <footer className="px-4 pb-6 pt-16 sm:px-6">
        <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-8 rounded-[2rem] border border-white/10 bg-slate-950/70 px-6 py-7 shadow-[0_30px_80px_-42px_rgba(2,8,23,0.9)] backdrop-blur-xl lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Comunidad deportiva</p>
            <h2 className="club-display mt-3 text-5xl leading-none text-white sm:text-6xl lg:text-7xl">{config.name}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {config.name} ahora se presenta con una presencia mucho mas fuerte: identidad, equipos, sponsors y proyectos en una experiencia publica pensada para sumar pertenencia.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <div className="mb-3 inline-flex rounded-full bg-white/10 p-2 text-white">
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-white">Vida de club</p>
              <p className="mt-1 text-sm text-slate-300">Una landing con mas escudo, mas nombre y mas sensacion de pertenencia.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <div className="mb-3 inline-flex rounded-full bg-white/10 p-2 text-[color:var(--club-accent)]">
                <Sparkles className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-white">Conversion mas clara</p>
              <p className="mt-1 text-sm text-slate-300">CTA, sponsors y proyectos ordenados para acercar nuevos socios y apoyos.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
