import Link from "next/link";
import { ArrowRight, CalendarDays, HandCoins, HeartHandshake, Megaphone, Trophy, Users } from "lucide-react";

import { clubEvents, clubOffers, clubProjects, clubSponsors, clubTeams } from "@/app/club/content";
import { ClubLogo } from "@/components/club-logo";
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
    description: "El club se vive con energia, sentimiento y una presencia que no pasa desapercibida.",
  },
  {
    title: "Comunidad",
    description: "Socios, familias y equipos conectados por algo mucho mas grande que una simple gestion.",
  },
  {
    title: "Compromiso",
    description: "Actividad visible, agenda viva y proyectos concretos para seguir haciendo crecer al club.",
  },
  {
    title: "Identidad",
    description: "Escudo, colores y nombre trabajando juntos para transmitir pertenencia desde el primer segundo.",
  },
] as const;

export default async function ClubHomePage() {
  const [config, stats] = await Promise.all([getActiveClubConfig(), getDashboardStats()]);
  const [featuredProject, ...otherProjects] = clubProjects;

  return (
    <main className="px-4 pb-12 pt-10 sm:px-6 sm:pt-12">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-8 sm:gap-10">
        <Reveal delayMs={40}>
          <section className="relative overflow-hidden rounded-[2.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(3,8,27,0.98)_0%,rgba(8,17,39,0.96)_52%,rgba(5,12,31,0.98)_100%)] p-6 shadow-[0_40px_110px_-52px_rgba(2,8,23,0.96)] sm:p-8 lg:p-10">
            <div
              aria-hidden
              className="absolute inset-0 opacity-90"
              style={{
                background:
                  "radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--club-accent) 18%, transparent) 0%, transparent 28%), radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--club-primary) 58%, transparent) 0%, transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.03) 0%, transparent 44%)",
              }}
            />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
            <div aria-hidden className="club-display pointer-events-none absolute -bottom-7 left-5 right-5 hidden text-[7.5rem] leading-none text-white/[0.04] lg:block">{config.name}</div>

            <div className="relative z-10 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)] p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72">
                    Comunidad deportiva
                  </span>
                  <span className="rounded-full border border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    Escudo, pertenencia y accion
                  </span>
                </div>

                <h1 className="club-display mt-6 max-w-4xl text-6xl leading-[0.9] text-white sm:text-7xl lg:text-[6.4rem]">
                  {config.name}
                  <span className="mt-2 block text-[color:var(--club-accent)]">equipo, pertenencia y pasion</span>
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Una landing institucional que pone al club en primer plano: el escudo como protagonista, los equipos
                  visibles y una forma clara de asociarse o apoyar su crecimiento.
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

                <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-[1.45rem] border border-white/10 bg-black/22 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Socios activos</p>
                    <AnimatedCount value={stats.activeMembers} className="mt-3 block text-3xl font-black text-white" />
                    <p className="mt-2 text-sm text-slate-300">Comunidad real en movimiento.</p>
                  </article>
                  <article className="rounded-[1.45rem] border border-white/10 bg-black/22 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Equipos</p>
                    <AnimatedCount value={clubTeams.length} className="mt-3 block text-3xl font-black text-white" />
                    <p className="mt-2 text-sm text-slate-300">Categorias para competir.</p>
                  </article>
                  <article className="rounded-[1.45rem] border border-white/10 bg-black/22 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Cuota mensual</p>
                    <p className="mt-3 text-3xl font-black text-white">{formatMoney(config.monthly_fee)}</p>
                    <p className="mt-2 text-sm text-slate-300">Clara desde la primera visita.</p>
                  </article>
                  <article className="rounded-[1.45rem] border border-white/10 bg-black/22 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Proyectos activos</p>
                    <AnimatedCount value={clubProjects.length} className="mt-3 block text-3xl font-black text-white" />
                    <p className="mt-2 text-sm text-slate-300">Objetivos listos para apoyar.</p>
                  </article>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[2.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)] p-5">
                  <ClubCrestShowcase logo={config.logo} name={config.name} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <article className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Identidad</p>
                    <h2 className="club-display mt-3 text-4xl leading-none text-white">mas que una landing</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Una forma de hacer sentir el club antes del primer click en registro.
                    </p>
                  </article>

                  <article className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Proximas fechas</p>
                    <div className="mt-4 space-y-3">
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
            className="relative overflow-hidden rounded-[2.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,14,34,0.96)_0%,rgba(8,18,40,0.94)_100%)] p-7 shadow-[0_34px_90px_-46px_rgba(2,8,23,0.95)] sm:p-10"
          >
            <ClubLogo
              src={config.logo}
              alt={`Escudo de ${config.name}`}
              className="pointer-events-none absolute -right-20 top-1/2 hidden h-[28rem] w-[28rem] -translate-y-1/2 opacity-[0.07] lg:block"
            />

            <div className="relative z-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Identidad del club</p>
                <h2 className="club-display mt-4 text-5xl leading-none text-white sm:text-6xl lg:text-7xl">
                  una presencia que se siente en cada bloque
                </h2>
                <p className="mt-5 text-base leading-7 text-slate-300">
                  El v0 funciona porque no se ve como una landing generica: se siente como marca deportiva. Esta
                  seccion empuja esa misma idea con mas contraste, mas ritmo visual y el escudo integrado al fondo.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {clubValues.map((value, index) => (
                  <article
                    key={value.title}
                    className={`rounded-[1.85rem] border p-6 ${
                      index === 0 || index === 3
                        ? "border-[color:color-mix(in_srgb,var(--club-accent)_22%,white)] bg-[linear-gradient(180deg,rgba(249,115,22,0.16)_0%,rgba(255,255,255,0.04)_100%)]"
                        : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Valor del club</p>
                    <h3 className="club-display mt-4 text-4xl leading-none text-white">{value.title}</h3>
                    <p className="mt-4 text-sm leading-6 text-slate-300">{value.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={110}>
          <section
            id="equipos"
            className="rounded-[2.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(5,12,29,0.96)_0%,rgba(10,18,39,0.94)_100%)] p-7 shadow-[0_34px_90px_-46px_rgba(2,8,23,0.95)] sm:p-10"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Equipos activos</p>
                <h2 className="club-display mt-4 text-5xl leading-none text-white sm:text-6xl lg:text-7xl">
                  el club se representa en cada categoria
                </h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white">
                <AnimatedCount value={clubTeams.length} className="mr-1 inline-block" />
                equipos en actividad
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {clubTeams.map((team, index) => (
                <article
                  key={team.name}
                  className={`relative overflow-hidden rounded-[1.9rem] border p-6 ${
                    index === 0
                      ? "border-[color:color-mix(in_srgb,var(--club-accent)_22%,white)] bg-[linear-gradient(180deg,rgba(249,115,22,0.14)_0%,rgba(255,255,255,0.04)_100%)]"
                      : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]"
                  }`}
                >
                  <span className="club-display pointer-events-none absolute -right-3 bottom-0 text-[5.5rem] leading-none text-white/[0.05]">
                    {team.name}
                  </span>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--club-accent)]">{team.name}</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">{team.schedule}</h3>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">{team.description}</p>
                  <div className="mt-6 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/72">
                    Competencia activa
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[1.9rem] border border-white/10 bg-black/18 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Agenda del club</p>
                <div className="mt-5 grid gap-3">
                  {clubEvents.map((event) => (
                    <div key={event.title} className="rounded-[1.25rem] border border-white/10 bg-white/4 p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[0.95rem] bg-white text-slate-950">
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{event.date.split(" ")[1]}</span>
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

              <article className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--club-primary)_84%,black)_0%,#091428_58%,color-mix(in_srgb,var(--club-accent)_24%,black)_100%)] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Que ofrece el club</p>
                <div className="mt-5 grid gap-3">
                  {clubOffers.map((offer) => {
                    const Icon = icons[offer.icon];

                    return (
                      <div key={offer.title} className="flex gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4">
                        <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 text-[color:var(--club-accent)]">
                          <Icon className="h-4 w-4" aria-hidden />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{offer.title}</p>
                          <p className="mt-1 text-sm leading-6 text-white/72">{offer.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={135}>
          <section
            id="unete"
            className="rounded-[2.35rem] border border-white/10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--club-primary)_90%,black)_0%,#09162a_44%,color-mix(in_srgb,var(--club-accent)_24%,black)_100%)] p-7 shadow-[0_36px_96px_-48px_rgba(2,8,23,0.96)] sm:p-10"
          >
            <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Unite al club</p>
                <h2 className="club-display mt-4 text-5xl leading-none text-white sm:text-6xl lg:text-7xl">
                  hay una forma de sumarte en cada paso
                </h2>
                <p className="mt-5 text-base leading-7 text-white/78 sm:text-lg">
                  La referencia de v0 empuja muy bien este mensaje: ser parte del club no es una sola accion. Puede ser
                  asociarte, acompanar, entrenar o ayudar a empujar proyectos concretos.
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
                <article className="rounded-[1.95rem] border border-white/10 bg-white/8 p-6 backdrop-blur">
                  <div className="inline-flex rounded-full bg-white/12 p-3 text-white">
                    <Users className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-white/42">Quiero ser parte</p>
                  <h3 className="club-display mt-3 text-4xl leading-none text-white">hacete socio</h3>
                  <p className="mt-4 text-sm leading-6 text-white/72">
                    Para vivir el dia a dia del club desde adentro, representar sus colores y sostener su comunidad.
                  </p>
                  <div className="mt-6">
                    <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "lg", fullWidth: true })}>
                      Quiero asociarme
                    </Link>
                  </div>
                </article>

                <article className="rounded-[1.95rem] border border-[color:color-mix(in_srgb,var(--club-accent)_24%,white)] bg-[linear-gradient(180deg,rgba(249,115,22,0.16)_0%,rgba(255,255,255,0.05)_100%)] p-6 backdrop-blur">
                  <div className="inline-flex rounded-full bg-white/12 p-3 text-[color:var(--club-accent)]">
                    <Megaphone className="h-5 w-5" aria-hidden />
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-white/42">Quiero colaborar</p>
                  <h3 className="club-display mt-3 text-4xl leading-none text-white">apoya un proyecto</h3>
                  <p className="mt-4 text-sm leading-6 text-white/72">
                    Para familias, sponsors y seguidores que quieran impulsar mejoras sin necesidad de asociarse.
                  </p>
                  <div className="mt-6">
                    <Link
                      href={`/club/proyectos/${featuredProject.slug}`}
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
            className="rounded-[2.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,35,0.95)_0%,rgba(10,20,44,0.92)_100%)] p-7 shadow-[0_34px_90px_-46px_rgba(2,8,23,0.94)] sm:p-10"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Sponsors</p>
                <h2 className="club-display mt-4 text-5xl leading-none text-white sm:text-6xl">
                  marcas que acompanan el camino del club
                </h2>
                <p className="mt-5 text-base leading-7 text-slate-300">
                  Esta es una de las dos secciones extra respecto al v0. La integro con el mismo lenguaje visual para
                  que se vea parte de la landing y no un agregado aparte.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/82">
                Espacio preparado para sponsors reales
              </div>
            </div>

            <div className="mt-8">
              <ClubSponsorsMarquee sponsors={clubSponsors} />
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={155}>
          <section
            id="proyectos"
            className="rounded-[2.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(5,12,30,0.96)_0%,rgba(8,17,38,0.94)_100%)] p-7 shadow-[0_34px_90px_-46px_rgba(2,8,23,0.95)] sm:p-10"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Proyectos del club</p>
                <h2 className="club-display mt-4 text-5xl leading-none text-white sm:text-6xl">
                  apoyar tambien es una forma de pertenecer
                </h2>
                <p className="mt-5 text-base leading-7 text-slate-300">
                  Esta es la otra seccion extra frente al v0. En vez de romper la experiencia, la usamos para reforzar
                  la misma idea de comunidad activa y colaboracion concreta.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
              <article className="rounded-[2rem] border border-[color:color-mix(in_srgb,var(--club-accent)_22%,white)] bg-[linear-gradient(180deg,rgba(249,115,22,0.14)_0%,rgba(255,255,255,0.03)_100%)] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Proyecto destacado</p>
                    <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">{featuredProject.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-slate-300">{featuredProject.description}</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/18 px-4 py-2 text-sm font-semibold text-white/84">
                    {Math.min(100, Math.round((featuredProject.current / featuredProject.goal) * 100))}%
                  </div>
                </div>

                <div className="mt-8 rounded-full bg-white/10">
                  <div
                    className="h-3 rounded-full bg-[linear-gradient(90deg,var(--club-primary),var(--club-accent))]"
                    style={{ width: `${Math.min(100, Math.round((featuredProject.current / featuredProject.goal) * 100))}%` }}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{formatMoney(featuredProject.current)}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/45">de {formatMoney(featuredProject.goal)}</p>
                  </div>
                  <Link href={`/club/proyectos/${featuredProject.slug}`} className={buttonClassNames({ variant: "accent", size: "lg" })}>
                    {featuredProject.ctaLabel}
                  </Link>
                </div>
              </article>

              <div className="grid gap-4">
                {otherProjects.map((project) => {
                  const progress = Math.min(100, Math.round((project.current / project.goal) * 100));

                  return (
                    <article
                      key={project.slug}
                      className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)] p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Proyecto activo</p>
                        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/78">
                          {progress}%
                        </div>
                      </div>
                      <h3 className="mt-4 text-xl font-bold tracking-tight text-white">{project.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{project.shortDescription}</p>
                      <div className="mt-5 rounded-full bg-white/10">
                        <div className="h-2.5 rounded-full bg-[linear-gradient(90deg,var(--club-primary),var(--club-accent))]" style={{ width: `${progress}%` }} />
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
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
