import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  HandCoins,
  HeartHandshake,
  Megaphone,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import { clubEvents, clubOffers, clubProjects, clubSponsors, clubTeams } from "@/app/club/content";
import { ClubCrestShowcase } from "@/components/club/club-crest-showcase";
import { ClubSponsorsMarquee } from "@/components/club/club-sponsors-marquee";
import { AnimatedCount } from "@/components/marketing/animated-count";
import { Reveal } from "@/components/marketing/reveal";
import { buttonClassNames } from "@/components/ui";
import { getActiveClubConfig } from "@/config/active-club";
import { getDashboardStats } from "@/lib/dashboard";
import { formatMoney } from "@/lib/formatters";

const icons = { trophy: Trophy, heart: HeartHandshake, calendar: CalendarDays, handCoins: HandCoins } as const;
const clubValues = [
  {
    title: "Pasion",
    description: "El club se vive con energia, sentimiento y una marca que se reconoce a distancia.",
  },
  {
    title: "Comunidad",
    description: "Socios, familias y jugadores formando algo mas grande que un simple registro.",
  },
  {
    title: "Compromiso",
    description: "Equipos, agenda y proyectos visibles para mostrar movimiento real durante todo el ano.",
  },
  {
    title: "Identidad",
    description: "Escudo, colores y nombre trabajando juntos para darle presencia institucional al club.",
  },
] as const;

export default async function ClubHomePage() {
  const [config, stats] = await Promise.all([getActiveClubConfig(), getDashboardStats()]);

  return (
    <main className="px-4 pb-12 pt-10 sm:px-6 sm:pt-12">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-8 sm:gap-10">
        <Reveal delayMs={40}>
          <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.94)_0%,rgba(6,18,35,0.98)_100%)] p-7 shadow-[0_38px_100px_-48px_rgba(2,8,23,0.96)] sm:p-10 lg:p-12">
            <div
              aria-hidden
              className="absolute inset-0 opacity-90"
              style={{
                background:
                  "radial-gradient(circle at 14% 12%, color-mix(in srgb, var(--club-accent) 26%, transparent) 0%, transparent 24%), radial-gradient(circle at 86% 18%, color-mix(in srgb, var(--club-primary) 55%, transparent) 0%, transparent 30%), linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 42%)",
              }}
            />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />
            <div
              aria-hidden
              className="club-display pointer-events-none absolute -bottom-6 left-6 right-6 hidden overflow-hidden text-[7rem] leading-none text-white/[0.05] lg:block"
            >
              {config.name}
            </div>
            <div className="relative z-10 grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-center">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/72">
                    Comunidad deportiva
                  </span>
                  <span className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                    Escudo, pertenencia y accion
                  </span>
                </div>

                <h1 className="club-display mt-6 max-w-4xl text-6xl leading-[0.92] text-white sm:text-7xl lg:text-[6.2rem]">
                  {config.name}
                  <span className="mt-3 block text-[color:var(--club-accent)]">equipo, pertenencia y pasion</span>
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Una landing institucional con presencia real de club: escudo protagonista, equipos visibles,
                  caminos claros para asociarse y espacio para que sponsors y colaboradores acompanen el crecimiento.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "xl" })}>
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
                    Apoyar al club
                  </Link>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Socios activos</p>
                    <AnimatedCount value={stats.activeMembers} className="mt-3 block text-3xl font-black tracking-tight text-white" />
                    <p className="mt-2 text-sm text-slate-300">Comunidad real en movimiento.</p>
                  </article>
                  <article className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Equipos</p>
                    <AnimatedCount value={clubTeams.length} className="mt-3 block text-3xl font-black tracking-tight text-white" />
                    <p className="mt-2 text-sm text-slate-300">Espacios para entrenar y competir.</p>
                  </article>
                  <article className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Cuota mensual</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-white">{formatMoney(config.monthly_fee)}</p>
                    <p className="mt-2 text-sm text-slate-300">Transparente desde la primera visita.</p>
                  </article>
                  <article className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Proyectos activos</p>
                    <AnimatedCount value={clubProjects.length} className="mt-3 block text-3xl font-black tracking-tight text-white" />
                    <p className="mt-2 text-sm text-slate-300">Objetivos concretos para apoyar.</p>
                  </article>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-white/42">
                  <span>Club con presencia</span>
                  <span className="h-1 w-1 rounded-full bg-[color:var(--club-accent)]" />
                  <span>Deporte y pertenencia</span>
                  <span className="h-1 w-1 rounded-full bg-[color:var(--club-accent)]" />
                  <span>Identidad visible</span>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_26%,transparent_72%)] p-2">
                  <div
                    aria-hidden
                    className="absolute inset-x-[8%] top-[8%] h-[1px] bg-gradient-to-r from-transparent via-white/12 to-transparent"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-x-[16%] bottom-[8%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  />
                  <ClubCrestShowcase logo={config.logo} name={config.name} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <article className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Identidad</p>
                    <h2 className="club-display mt-3 text-3xl leading-none text-white">mas que una landing</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Es una forma de hacer sentir el club antes del primer click en registro.
                    </p>
                  </article>

                  <article className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Proximas fechas</p>
                    <div className="mt-3 space-y-3">
                      {clubEvents.slice(0, 2).map((event) => (
                        <div key={event.title} className="rounded-[1.1rem] border border-white/8 bg-white/4 px-3 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--club-accent)]">
                            {event.date}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">{event.title}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={80}>
          <section
            id="identidad"
            className="rounded-[2.25rem] border border-white/10 bg-slate-950/58 p-7 shadow-[0_30px_80px_-42px_rgba(2,8,23,0.92)] backdrop-blur-xl sm:p-10"
          >
            <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Identidad del club</p>
                <h2 className="club-display mt-4 text-5xl leading-none text-white sm:text-6xl">
                  una marca que se siente antes de leer
                </h2>
                <p className="mt-5 text-base leading-7 text-slate-300">
                  La landing tiene que hablar como club: mostrar actividad, mover pertenencia y dejar claro que
                  asociarse o colaborar son acciones concretas, no botones sueltos.
                </p>
                <div className="mt-8 rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--club-accent)]">
                    Idea central
                  </p>
                  <p className="mt-3 text-xl font-semibold text-white">
                    Mas escudo, mas nombre, mas energia de club.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Esa es la logica de la referencia de v0 y la estoy trasladando aca con el contenido que ya tenias.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {clubValues.map((value, index) => (
                  <article
                    key={value.title}
                    className={`rounded-[1.8rem] border p-6 ${
                      index === 0 || index === 3
                        ? "border-[color:color-mix(in_srgb,var(--club-accent)_24%,white)] bg-[linear-gradient(180deg,rgba(249,115,22,0.14)_0%,rgba(255,255,255,0.03)_100%)]"
                        : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_100%)]"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Valor del club</p>
                    <h3 className="club-display mt-4 text-4xl leading-none text-white">{value.title}</h3>
                    <p className="mt-4 text-sm leading-6 text-slate-300">{value.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-4">
              {clubOffers.map((offer) => {
                const Icon = icons[offer.icon];

                return (
                  <article key={offer.title} className="rounded-[1.5rem] border border-white/10 bg-black/18 p-5">
                    <div className="inline-flex rounded-full bg-white/10 p-3 text-[color:var(--club-accent)]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-white">{offer.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{offer.description}</p>
                  </article>
                );
              })}
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={130}>
          <section
            id="equipos"
            className="rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.86)_0%,rgba(8,15,32,0.92)_100%)] p-7 shadow-[0_30px_80px_-42px_rgba(2,8,23,0.95)] sm:p-10"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Equipos activos</p>
                <h2 className="club-display mt-4 text-5xl leading-none text-white sm:text-6xl">
                  espacios para competir y representar al club
                </h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white">
                <AnimatedCount value={clubTeams.length} className="mr-1 inline-block" />
                equipos en actividad
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="grid gap-4">
                {clubTeams.map((team, index) => (
                  <article
                    key={team.name}
                    className={`rounded-[1.7rem] border p-5 backdrop-blur ${
                      index === 0
                        ? "border-[color:color-mix(in_srgb,var(--club-accent)_24%,white)] bg-[linear-gradient(135deg,rgba(249,115,22,0.12)_0%,rgba(255,255,255,0.04)_100%)]"
                        : "border-white/10 bg-white/6"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--club-accent)]">
                          {team.name}
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">{team.schedule}</h3>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                        Activo
                      </span>
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">{team.description}</p>
                  </article>
                ))}
              </div>

              <div className="grid gap-4">
                <article className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Agenda del club</p>
                  <div className="mt-5 space-y-3">
                    {clubEvents.map((event) => (
                      <div key={event.title} className="rounded-[1.25rem] border border-white/10 bg-black/18 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[0.9rem] bg-white text-slate-950">
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em]">
                              {event.date.split(" ")[1]}
                            </span>
                            <span className="text-base font-black">{event.date.split(" ")[0]}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{event.title}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{event.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--club-primary)_82%,black)_0%,color-mix(in_srgb,var(--club-accent)_28%,black)_100%)] p-6">
                  <div className="inline-flex rounded-full bg-white/12 p-3 text-white">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="club-display mt-5 text-4xl leading-none text-white">sumate a la vida del club</h3>
                  <p className="mt-4 text-sm leading-6 text-white/78">
                    Si te interesa entrenar, acompanar o aportar, la landing ahora lo comunica con mucha mas claridad.
                  </p>
                  <div className="mt-6">
                    <Link href="/club/registro" className={buttonClassNames({ variant: "accent", size: "lg" })}>
                      Quiero ser parte
                    </Link>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={140}>
          <section
            id="unete"
            className="rounded-[2.25rem] border border-white/10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--club-primary)_90%,black)_0%,#09162a_50%,color-mix(in_srgb,var(--club-accent)_20%,black)_100%)] p-7 shadow-[0_34px_90px_-46px_rgba(2,8,23,0.96)] sm:p-10"
          >
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Unete al club</p>
                <h2 className="club-display mt-4 text-5xl leading-none text-white sm:text-6xl lg:text-7xl">
                  hay una forma de ser parte para cada persona
                </h2>
                <p className="mt-5 text-base leading-7 text-white/78 sm:text-lg">
                  Esta seccion busca acercarse mucho mas al tramo final del v0: una propuesta clara para sumarte,
                  participar y apoyar sin perder la fuerza de la marca del club.
                </p>

                <div className="mt-8 grid gap-3">
                  {clubOffers.map((offer) => (
                    <div key={offer.title} className="flex items-start gap-3 rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-4">
                      <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--club-accent)]" />
                      <div>
                        <p className="text-sm font-semibold text-white">{offer.title}</p>
                        <p className="mt-1 text-sm leading-6 text-white/70">{offer.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <article className="rounded-[1.9rem] border border-white/10 bg-white/8 p-6 backdrop-blur">
                  <div className="inline-flex rounded-full bg-white/12 p-3 text-white">
                    <Users className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-white/45">Quiero ser parte</p>
                  <h3 className="club-display mt-3 text-4xl leading-none text-white">hacete socio</h3>
                  <p className="mt-4 text-sm leading-6 text-white/72">
                    Para vivir el dia a dia del club, entrenar, acompanar y formar parte de la comunidad.
                  </p>
                  <div className="mt-6">
                    <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "lg", fullWidth: true })}>
                      Quiero asociarme
                    </Link>
                  </div>
                </article>

                <article className="rounded-[1.9rem] border border-[color:color-mix(in_srgb,var(--club-accent)_26%,white)] bg-[linear-gradient(180deg,rgba(249,115,22,0.14)_0%,rgba(255,255,255,0.06)_100%)] p-6 backdrop-blur">
                  <div className="inline-flex rounded-full bg-white/12 p-3 text-[color:var(--club-accent)]">
                    <Megaphone className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-white/45">Quiero colaborar</p>
                  <h3 className="club-display mt-3 text-4xl leading-none text-white">apoya un proyecto</h3>
                  <p className="mt-4 text-sm leading-6 text-white/72">
                    Para sponsors, familias y seguidores que quieran ayudar sin necesidad de asociarse.
                  </p>
                  <div className="mt-6">
                    <Link
                      href={`/club/proyectos/${clubProjects[0].slug}`}
                      className={buttonClassNames({ variant: "accent", size: "lg", fullWidth: true })}
                    >
                      Ver como colaborar
                    </Link>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={145}>
          <section
            id="sponsors"
            className="rounded-[2.25rem] border border-white/10 bg-slate-950/60 p-7 shadow-[0_30px_80px_-42px_rgba(2,8,23,0.9)] backdrop-blur-xl sm:p-10"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Sponsors</p>
            <h2 className="club-display mt-4 text-5xl leading-none text-white sm:text-6xl">
              marcas que acompanan el camino del club
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
              Esta es una de las secciones extra frente al v0 original: deja visible el espacio comercial e
              institucional para sponsors reales sin romper el tono deportivo del resto de la landing.
            </p>
            <div className="mt-8">
              <ClubSponsorsMarquee sponsors={clubSponsors} />
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={150}>
          <section
            id="proyectos"
            className="rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.88)_0%,rgba(8,15,32,0.96)_100%)] p-7 shadow-[0_30px_80px_-42px_rgba(2,8,23,0.95)] sm:p-10"
          >
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Proyectos del club</p>
              <h2 className="club-display mt-4 text-5xl leading-none text-white sm:text-6xl">
                apoyar tambien es una forma de pertenecer
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-300">
                Esta es la otra seccion que agregamos sobre la idea base de v0: proyectos concretos para que familias,
                sponsors y seguidores colaboren aunque no se asocien.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {clubProjects.map((project) => {
                const progress = Math.min(100, Math.round((project.current / project.goal) * 100));

                return (
                  <article
                    key={project.slug}
                    className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/6 backdrop-blur"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Proyecto activo</p>
                        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/78">
                          {progress}%
                        </div>
                      </div>
                      <h3 className="mt-4 text-2xl font-bold tracking-tight text-white">{project.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{project.shortDescription}</p>
                      <div className="mt-6 rounded-full bg-white/10">
                        <div className="h-3 rounded-full bg-[linear-gradient(90deg,var(--club-primary),var(--club-accent))]" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{formatMoney(project.current)}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-white/45">de {formatMoney(project.goal)}</p>
                        </div>
                        <Link
                          href={`/club/proyectos/${project.slug}`}
                          className={buttonClassNames({
                            variant: "ghost",
                            size: "md",
                            className: "border border-white/10 text-white hover:bg-white/10 hover:text-white",
                          })}
                        >
                          Colaborar
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={160}>
          <section className="rounded-[2.5rem] border border-white/10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--club-primary)_86%,black)_0%,#08152b_52%,color-mix(in_srgb,var(--club-accent)_34%,black)_100%)] p-7 shadow-[0_38px_100px_-48px_rgba(2,8,23,0.96)] sm:p-10 lg:p-12">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="max-w-3xl">
                <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/72">
                  CTA final
                </span>
                <h2 className="club-display mt-5 text-5xl leading-none text-white sm:text-6xl lg:text-7xl">
                  hacete socio o sumate a un proyecto del club
                </h2>
                <p className="mt-5 text-base leading-7 text-white/78 sm:text-lg">
                  La nueva landing prioriza identidad, actividad y conversion: exactamente el tono del v0, pero
                  adaptado a tus datos y sumando sponsors y proyectos.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "xl" })}>
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
                    Ver proyectos
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
                  <div className="mb-4 inline-flex rounded-full bg-white/12 p-2 text-white">
                    <Users className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-white">Asociate</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">Para vivir el club desde adentro.</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
                  <div className="mb-4 inline-flex rounded-full bg-white/12 p-2 text-[color:var(--club-accent)]">
                    <Megaphone className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-white">Colabora</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">Para apoyar proyectos sin asociarte.</p>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
