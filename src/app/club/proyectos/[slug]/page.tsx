import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, HandCoins } from "lucide-react";
import { notFound } from "next/navigation";

import { clubProjects, getClubProjectBySlug } from "@/app/club/content";
import { ProjectContributionPanel } from "@/components/club/project-contribution-panel";
import { buttonClassNames, cardClassNames } from "@/components/ui";
import { formatMoney } from "@/lib/formatters";

type ProjectDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return clubProjects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const project = getClubProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const progress = Math.min(100, Math.round((project.current / project.goal) * 100));
  const otherProjects = clubProjects.filter((item) => item.slug !== project.slug).slice(0, 2);

  return (
    <main className="px-4 pb-10 pt-10 sm:px-6 sm:pt-12">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-8 sm:gap-10">
        <section className={cardClassNames({ variant: "hero", className: "overflow-hidden rounded-[2rem] p-7 sm:p-10 lg:p-12" })}>
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Link href="/club#proyectos" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Volver a proyectos
              </Link>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="club-kicker">Proyecto activo</span>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.25)]">
                  {progress}% completado
                </div>
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {project.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{project.description}</p>

              <div className="mt-8 rounded-[1.6rem] bg-white/88 p-5 shadow-[0_20px_42px_-32px_rgba(15,23,42,0.24)]">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Recaudado</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{formatMoney(project.current)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Objetivo</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{formatMoney(project.goal)}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-full bg-slate-200">
                  <div
                    className="h-3 rounded-full bg-[linear-gradient(90deg,var(--club-primary),var(--club-accent))]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <article className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/86 p-3 shadow-[0_26px_60px_-36px_rgba(15,23,42,0.35)]">
              <Image src={project.imageSrc} alt={project.imageAlt} width={1200} height={900} className="h-[420px] w-full rounded-[1.45rem] object-cover" />
            </article>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-6">
            <article className={cardClassNames({ className: "rounded-[2rem] p-7 sm:p-8" })}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Estado del proyecto</p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">Qué ya está encaminado</h2>

              <div className="mt-6 space-y-3">
                {project.updates.map((update) => (
                  <div key={update} className="flex gap-3 rounded-[1.3rem] bg-slate-50 px-4 py-4">
                    <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <BadgeCheck className="h-4 w-4" aria-hidden />
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{update}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className={cardClassNames({ className: "rounded-[2rem] p-7 sm:p-8" })}>
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <HandCoins className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Historial de aportes</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Colaboraciones visibles</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {project.contributions.map((contribution) => (
                  <div key={contribution.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-slate-200/80 bg-white px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{contribution.displayName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {contribution.isAnonymous ? "Aporte anónimo" : "Aporte registrado"}
                      </p>
                      {contribution.note ? <p className="mt-2 text-sm text-slate-600">{contribution.note}</p> : null}
                    </div>
                    <div className="rounded-full bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                      {formatMoney(contribution.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="grid gap-6">
            <ProjectContributionPanel ctaLabel={project.ctaLabel} />

            <article className={cardClassNames({ variant: "hero", className: "rounded-[2rem] p-7 sm:p-8" })}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Otros proyectos</p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">Más formas de ayudar al club</h2>

              <div className="mt-6 grid gap-3">
                {otherProjects.map((item) => {
                  const itemProgress = Math.min(100, Math.round((item.current / item.goal) * 100));

                  return (
                    <div key={item.slug} className="rounded-[1.4rem] bg-white/88 p-5 shadow-[0_20px_42px_-32px_rgba(15,23,42,0.22)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{itemProgress}%</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.shortDescription}</p>
                      <div className="mt-4">
                        <Link href={`/club/proyectos/${item.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
                          Ver proyecto
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[1.4rem] bg-slate-950 px-5 py-5 text-white">
                <p className="text-sm font-semibold">¿Querés formar parte del club además de colaborar?</p>
                <div className="mt-4">
                  <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "lg" })}>
                    Hacete socio
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
