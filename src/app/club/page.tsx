import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, HandCoins, HeartHandshake, Megaphone, Trophy, Users } from "lucide-react";

import { clubEvents, clubGallery, clubOffers, clubProjects, clubSponsors, clubTeams } from "@/app/club/content";
import { ClubCrestShowcase } from "@/components/club/club-crest-showcase";
import { ClubSponsorsMarquee } from "@/components/club/club-sponsors-marquee";
import { AnimatedCount } from "@/components/marketing/animated-count";
import { Reveal } from "@/components/marketing/reveal";
import { buttonClassNames, cardClassNames } from "@/components/ui";
import { getActiveClubConfig } from "@/config/active-club";
import { getDashboardStats } from "@/lib/dashboard";
import { formatMoney } from "@/lib/formatters";

const icons = { trophy: Trophy, heart: HeartHandshake, calendar: CalendarDays, handCoins: HandCoins } as const;

export default async function ClubHomePage() {
  const [config, stats] = await Promise.all([getActiveClubConfig(), getDashboardStats()]);
  return (
    <main className="px-4 pb-10 pt-10 sm:px-6 sm:pt-12">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-8 sm:gap-10">
        <section className="flex flex-col gap-6">
          <Reveal delayMs={40}>
            <div className={cardClassNames({ variant: "hero", className: "relative overflow-hidden rounded-[2rem] p-7 sm:p-10 lg:p-12" })}>
              <div aria-hidden className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(circle at top left, color-mix(in srgb, var(--club-primary) 28%, transparent) 0%, transparent 48%), radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--club-accent) 22%, transparent) 0%, transparent 32%)" }} />
              <div className="relative z-10 grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3"><span className="club-kicker">Comunidad deportiva</span><div className="rounded-full border border-white/60 bg-white/72 px-3 py-1.5 text-xs font-semibold text-slate-700">{config.name}</div></div>
                  <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Sumate a {config.name}: <span className="club-gradient-text">deporte, comunidad y proyectos que hacen crecer al club.</span></h1>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Una landing publica para mostrar identidad, movimiento y caminos claros para asociarse o colaborar.</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "xl" })}>Hacete socio<ArrowRight className="h-4 w-4" aria-hidden /></Link>
                    <Link href="#proyectos" className={buttonClassNames({ variant: "outline", size: "xl" })}>Colaborar con el club</Link>
                  </div>
                  <div className="mt-10 grid gap-3 sm:grid-cols-3">
                    <article className="club-metric-card rounded-[1.45rem] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Socios activos</p><AnimatedCount value={stats.activeMembers} className="mt-3 block text-3xl font-bold tracking-tight text-slate-950" /><p className="mt-2 text-sm text-slate-600">Comunidad real.</p></article>
                    <article className="club-metric-card rounded-[1.45rem] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Equipos activos</p><AnimatedCount value={clubTeams.length} className="mt-3 block text-3xl font-bold tracking-tight text-slate-950" /><p className="mt-2 text-sm text-slate-600">Espacios para competir.</p></article>
                    <article className="club-metric-card rounded-[1.45rem] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Cuota mensual</p><p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{formatMoney(config.monthly_fee)}</p><p className="mt-2 text-sm text-slate-600">Visible desde el inicio.</p></article>
                  </div>
                </div>
                <ClubCrestShowcase logo={config.logo} name={config.name} />
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={110}>
            <div className="grid gap-4">
              <div className={cardClassNames({ className: "rounded-[2rem] p-6 sm:p-8" })}><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/65">Identidad del club</p><h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">El escudo, los colores y la vida del club tienen que sentirse protagonistas.</h2><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-[1.45rem] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--club-primary)_18%,white)_0%,rgba(255,255,255,0.9)_65%)] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Marca</p><p className="mt-3 text-lg font-semibold text-slate-950">Reconocible antes de leer una linea.</p></div><div className="rounded-[1.45rem] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--club-accent)_16%,white)_0%,rgba(255,255,255,0.92)_64%)] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Objetivo</p><p className="mt-3 text-lg font-semibold text-slate-950">Sumar socios y abrir formas de apoyar.</p></div></div></div>
              <div id="galeria" className="grid gap-4 sm:grid-cols-3">{clubGallery.map((item, index) => <article key={item.title} className="group relative overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/88 p-3 shadow-[0_26px_60px_-36px_rgba(15,23,42,0.35)]"><Image src={item.src} alt={item.title} width={1200} height={900} className={`w-full rounded-[1.45rem] object-cover transition-transform duration-500 group-hover:scale-[1.02] ${index === 0 ? "h-[260px] sm:col-span-2" : "h-[260px]"}`} /><div className="absolute inset-x-8 bottom-6 rounded-[1.3rem] bg-slate-950/78 px-5 py-4 text-white backdrop-blur"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">Vida del club</p><p className="mt-2 text-lg font-semibold">{item.title}</p><p className="mt-1 text-sm text-slate-300">{item.description}</p></div></article>)}</div>
            </div>
          </Reveal>
        </section>

        <Reveal delayMs={80}>
          <section id="ofrece" className={cardClassNames({ className: "rounded-[2rem] p-7 sm:p-10" })}>
            <span className="club-kicker">Que ofrece el club</span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Deporte, agenda, comunidad y proyectos visibles.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">{clubOffers.map((offer) => { const Icon = icons[offer.icon]; return <article key={offer.title} className="club-surface-muted rounded-[1.5rem] p-5"><div className="inline-flex rounded-full bg-white p-3 text-primary"><Icon className="h-5 w-5" aria-hidden /></div><h3 className="mt-5 text-lg font-semibold text-slate-950">{offer.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{offer.description}</p></article>; })}</div>
          </section>
        </Reveal>

        <Reveal delayMs={120}>
          <section id="agenda" className={cardClassNames({ variant: "hero", className: "rounded-[2rem] p-7 sm:p-8" })}>
            <span className="club-kicker">Proximas fechas</span>
            <div className="mt-6 space-y-3">
              {clubEvents.map((event) => (
                <article key={event.title} className="club-surface rounded-[1.4rem] p-4">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[1rem] bg-slate-950 text-white">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{event.date.split(" ")[1]}</span>
                      <span className="text-base font-bold">{event.date.split(" ")[0]}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{event.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{event.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={130}>
          <section className={cardClassNames({ className: "rounded-[2rem] p-7 sm:p-8" })}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/65">Equipos activos</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Espacios para entrenar y competir.</h2>
              </div>
              <span className="rounded-full bg-primary/8 px-4 py-2 text-sm font-semibold text-primary">
                <AnimatedCount value={clubTeams.length} className="mr-1 inline-block" />
                equipos
              </span>
            </div>
            <div className="mt-6 grid gap-3">
              {clubTeams.map((team) => (
                <article key={team.name} className="club-surface-muted rounded-[1.4rem] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">{team.name}</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">{team.schedule}</h3>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">Activo</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{team.description}</p>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={100}>
          <section id="sponsors" className={cardClassNames({ variant: "hero", className: "rounded-[2rem] p-7 sm:p-10" })}>
            <span className="club-kicker">Sponsors</span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Marcas que acompanan el camino del club.</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              La franja ya queda preparada para sponsors reales y por ahora usa logos demo clickeables para validar la experiencia.
            </p>
            <div className="mt-8">
              <ClubSponsorsMarquee sponsors={clubSponsors} />
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={110}>
          <section id="proyectos" className={cardClassNames({ className: "rounded-[2rem] p-7 sm:p-10" })}>
            <span className="club-kicker">Proyectos del club</span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Asociarse y colaborar no son lo mismo, y ambos caminos merecen su espacio.
            </h2>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <article className="club-surface rounded-[1.75rem] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Quiero ser parte</p>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">Hacete socio</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Para vivir el club desde adentro y formar parte del dia a dia.</p>
                <div className="mt-6">
                  <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "lg" })}>
                    Quiero asociarme
                  </Link>
                </div>
              </article>

              <article className="club-surface rounded-[1.75rem] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Quiero colaborar</p>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">Apoya un proyecto del club</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Para sponsors, familias y seguidores que quieran ayudar sin asociarse.</p>
                <div className="mt-6">
                  <Link href={`/club/proyectos/${clubProjects[0].slug}`} className={buttonClassNames({ variant: "outline", size: "lg" })}>
                    Ver como colaborar
                  </Link>
                </div>
              </article>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {clubProjects.map((project) => {
                const progress = Math.min(100, Math.round((project.current / project.goal) * 100));

                return (
                  <article key={project.slug} className="club-surface-muted overflow-hidden rounded-[1.75rem] p-0">
                    <Image src={project.imageSrc} alt={project.imageAlt} width={1200} height={900} className="h-48 w-full object-cover" />
                    <div className="p-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Proyecto activo</p>
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{progress}%</div>
                      </div>
                      <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{project.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{project.shortDescription}</p>
                      <div className="mt-6 rounded-full bg-slate-200">
                        <div className="h-3 rounded-full bg-[linear-gradient(90deg,var(--club-primary),var(--club-accent))]" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{formatMoney(project.current)}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">de {formatMoney(project.goal)}</p>
                        </div>
                        <Link href={`/club/proyectos/${project.slug}`} className={buttonClassNames({ variant: "outline", size: "md" })}>
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

        <Reveal delayMs={140}>
          <section className={cardClassNames({ variant: "hero", className: "rounded-[2rem] p-7 sm:p-10 lg:p-12" })}>
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="max-w-3xl">
                <span className="club-kicker">CTA final</span>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                  El club puede crecer sumando socios, seguidores, sponsors y colaboradores.
                </h2>
                <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">La landing ya transmite identidad, actividad y formas concretas de participar.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "xl" })}>
                    Hacete socio
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link href="#proyectos" className={buttonClassNames({ variant: "ghost", size: "xl" })}>
                    Ver proyectos
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="club-surface rounded-[1.5rem] p-5">
                  <div className="mb-4 inline-flex rounded-full bg-primary/10 p-2 text-primary">
                    <Users className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-slate-950">Asociate</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Para vivir el club desde adentro.</p>
                </div>
                <div className="club-surface rounded-[1.5rem] p-5">
                  <div className="mb-4 inline-flex rounded-full bg-accent/10 p-2 text-accent">
                    <Megaphone className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-slate-950">Colabora</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Para apoyar proyectos sin asociarte.</p>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
