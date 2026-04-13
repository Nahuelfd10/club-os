import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";

import { ClubLogo } from "@/components/club-logo";
import { buttonClassNames } from "@/components/ui";
import { getActiveClubConfig } from "@/config/active-club";

const navItems = [
  { href: "/club#ofrece", label: "Beneficios" },
  { href: "/club#agenda", label: "Agenda" },
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
        <header className="club-surface mx-auto flex w-full max-w-[100rem] items-center justify-between gap-4 rounded-[1.75rem] px-4 py-3 sm:px-6">
          <Link href="/club" className="flex min-w-0 items-center gap-3">
            <ClubLogo
              src={config.logo}
              alt={`Logo de ${config.name}`}
              className="h-11 w-auto max-h-11 max-w-[168px] shrink-0 rounded-2xl bg-white/80 p-1.5"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/65">Club</p>
              <p className="truncate text-base font-semibold text-slate-950 sm:text-lg">{config.name}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white/80 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/" className={buttonClassNames({ variant: "ghost", size: "md", className: "hidden sm:inline-flex" })}>
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
        <div className="club-surface mx-auto flex w-full max-w-[100rem] flex-col gap-8 rounded-[2rem] px-6 py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/65">Comunidad deportiva</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Un club para vivir actividad, comunidad y proyectos compartidos.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              {config.name} se presenta aca como una experiencia publica del club: beneficios, agenda, sponsors, proyectos y una forma clara de acercarse o sumarse.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="club-metric-card rounded-[1.5rem] p-4">
              <div className="mb-3 inline-flex rounded-full bg-primary/10 p-2 text-primary">
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-slate-900">Vida de club</p>
              <p className="mt-1 text-sm text-slate-600">Actividad, comunidad y pertenencia mostradas con una imagen mucho mas fuerte.</p>
            </div>
            <div className="club-metric-card rounded-[1.5rem] p-4">
              <div className="mb-3 inline-flex rounded-full bg-accent/10 p-2 text-accent">
                <Sparkles className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-slate-900">Conversion mas clara</p>
              <p className="mt-1 text-sm text-slate-600">CTA, beneficios y proyectos trabajando para acercar nuevos socios y apoyos.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
