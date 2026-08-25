import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, HandCoins, HeartHandshake, Trophy, Users } from "lucide-react";

import { clubEvents, clubProjects, clubTeams } from "@/app/club/content";
import { ClubLogo } from "@/components/club-logo";
import { ClubSponsorsMarquee } from "@/components/club/club-sponsors-marquee";
import { AnimatedCount } from "@/components/marketing/animated-count";
import { Reveal } from "@/components/marketing/reveal";
import { buttonClassNames } from "@/components/ui";
import { getActiveClubConfig } from "@/config/active-club";
import { getPublicClubStats } from "@/lib/dashboard";
import { formatMoney } from "@/lib/formatters";
import { clubPath } from "@/lib/routes";
import { listPublicSponsors } from "@/lib/sponsors";

const valueCards = [
  { title: "Pertenencia", description: "Una presencia publica que muestra escudo, equipos y comunidad.", icon: HeartHandshake },
  { title: "Actividad", description: "Agenda, categorias y proyectos visibles para socios y familias.", icon: CalendarDays },
  { title: "Apoyo", description: "Proyectos claros para que cada aporte tenga un destino entendible.", icon: HandCoins },
];

export default async function ClubHomePage() {
  const [config, stats, sponsors] = await Promise.all([
    getActiveClubConfig(),
    getPublicClubStats(),
    listPublicSponsors(),
  ]);
  const [featuredProject, ...otherProjects] = clubProjects;

  return (
    <main className="px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
      <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-10">
        <Reveal delayMs={40}>
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(11,18,32,0.98)_0%,rgba(20,33,61,0.94)_62%,rgba(27,42,78,0.92)_100%)] p-7 shadow-[0_40px_110px_-58px_rgba(2,8,23,0.95)] sm:p-10 lg:p-12">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,color-mix(in_srgb,var(--club-accent)_22%,transparent),transparent_32%),radial-gradient(circle_at_92%_0%,color-mix(in_srgb,var(--club-primary)_45%,transparent),transparent_34%)]"
            />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-center">
              <div>
                <p className="club-eyebrow text-white/48">Comunidad deportiva</p>
                <h1 className="club-display mt-5 max-w-4xl text-5xl font-semibold leading-[0.96] text-white sm:text-6xl lg:text-7xl">
                  {config.name}
                  <span className="block text-orange-300">equipo, pertenencia y club.</span>
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
                  Una landing clara para mostrar que el club esta vivo: sus equipos, su cuota, sus proyectos y la forma
                  simple de sumarse como socio.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={clubPath("registro")} className={buttonClassNames({ variant: "primary", size: "xl" })}>
                    Hacete socio
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link
                    href="#proyectos"
                    className={buttonClassNames({
                      variant: "ghost",
                      size: "xl",
                      className: "border border-white/10 text-white hover:bg-white/10 hover:text-white",
                    })}
                  >
                    Apoyar proyecto
                  </Link>
                </div>
              </div>

              <aside className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-5 text-white">
                <ClubLogo
                  src={config.logo}
                  alt={`Escudo de ${config.name}`}
                  className="mx-auto h-36 w-36 rounded-[1.75rem] bg-white p-4 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.75)]"
                />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <HeroStat label="Socios" value={<AnimatedCount value={stats.activeMembers} />} />
                  <HeroStat label="Equipos" value={<AnimatedCount value={clubTeams.length} />} />
                  <HeroStat label="Cuota" value={formatMoney(config.monthly_fee)} />
                  <HeroStat label="Proyectos" value={<AnimatedCount value={clubProjects.length} />} />
                </div>
              </aside>
            </div>
          </section>
        </Reveal>

        <section id="identidad" className="grid gap-4 md:grid-cols-3">
          {valueCards.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delayMs={70 + index * 70}>
                <article className="h-full rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_70px_-48px_rgba(2,8,23,0.9)] backdrop-blur">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/8 text-orange-300">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/64">{item.description}</p>
                </article>
              </Reveal>
            );
          })}
        </section>

        <Reveal delayMs={90}>
          <section id="equipos" className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 backdrop-blur sm:p-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="club-eyebrow text-sky-300/70">Equipos activos</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Categorias que representan al club.
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/72">
                {clubTeams.length} equipos
              </span>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {clubTeams.map((team, index) => (
                <Reveal key={team.name} delayMs={80 + index * 80}>
                  <article className="h-full rounded-3xl border border-white/10 bg-black/18 p-5">
                    <p className="club-eyebrow text-orange-300/80">{team.name}</p>
                    <h3 className="mt-3 text-xl font-semibold text-white">{team.schedule}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/64">{team.description}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>
        </Reveal>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal delayMs={80}>
            <article className="h-full rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 backdrop-blur sm:p-9">
              <p className="club-eyebrow text-sky-300/70">Agenda</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Proximas fechas</h2>
              <div className="mt-6 grid gap-3">
                {clubEvents.map((event, index) => (
                  <Reveal key={event.title} delayMs={70 + index * 70}>
                    <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">{event.date}</p>
                      <h3 className="mt-2 text-sm font-semibold text-white">{event.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/62">{event.description}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </article>
          </Reveal>

          <Reveal delayMs={120}>
            <article id="proyectos" className="h-full rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(255,255,255,0.045)_48%,rgba(249,115,22,0.14))] p-7 backdrop-blur sm:p-9">
              <p className="club-eyebrow text-sky-300/70">Proyecto destacado</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">{featuredProject.title}</h2>
              <p className="mt-4 text-sm leading-6 text-white/66">{featuredProject.description}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Reveal delayMs={90}>
                  <ProjectStat label="Objetivo" value={formatMoney(featuredProject.goal)} />
                </Reveal>
                <Reveal delayMs={160}>
                  <ProjectStat label="Recaudado" value={formatMoney(featuredProject.current)} />
                </Reveal>
                <Reveal delayMs={230}>
                  <ProjectStat label="Avance" value={`${Math.round((featuredProject.current / featuredProject.goal) * 100)}%`} />
                </Reveal>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={clubPath(`proyectos/${featuredProject.slug}`)} className={buttonClassNames({ variant: "accent", size: "lg" })}>
                  Ver proyecto
                </Link>
                {otherProjects.slice(0, 2).map((project) => (
                  <Link
                    key={project.slug}
                    href={clubPath(`proyectos/${project.slug}`)}
                    className="inline-flex items-center rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white"
                  >
                    {project.title}
                  </Link>
                ))}
              </div>
            </article>
          </Reveal>
        </section>

        {sponsors.length > 0 ? (
          <Reveal delayMs={100}>
            <section id="sponsors" className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 backdrop-blur sm:p-9">
              <div className="mb-6 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-orange-300" aria-hidden />
                <div>
                  <p className="club-eyebrow text-white/42">Sponsors</p>
                  <h2 className="text-xl font-semibold text-white">Marcas que acompanian al club</h2>
                </div>
              </div>
              <ClubSponsorsMarquee sponsors={sponsors} />
            </section>
          </Reveal>
        ) : null}

        <Reveal delayMs={80}>
          <section id="unete" className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 text-center backdrop-blur sm:p-12">
            <Users className="mx-auto h-8 w-8 text-sky-300" aria-hidden />
            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Sumate a {config.name}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/66">
              Completa el formulario de alta y el club recibe tu solicitud en el panel para revisarla sin perder datos.
            </p>
            <div className="mt-7">
              <Link href={clubPath("registro")} className={buttonClassNames({ variant: "primary", size: "xl" })}>
                Hacete socio
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
      <p className="club-eyebrow text-white/38">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function ProjectStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
