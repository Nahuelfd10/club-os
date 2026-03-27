import Link from "next/link";

import { ClubLogo } from "@/components/club-logo";
import { getActiveClubConfig } from "@/config/active-club";

const teams = [
  {
    name: "Masculino",
    squad: "22 jugadores",
    schedule: "Mar y Jue - 20:00",
    description: "Equipo principal compitiendo en liga local.",
  },
  {
    name: "Femenino",
    squad: "18 jugadoras",
    schedule: "Lun y Mie - 19:00",
    description: "Equipo en crecimiento constante.",
  },
  {
    name: "+40",
    squad: "25 jugadores",
    schedule: "Sab - 10:00",
    description: "Para quienes nunca dejan de jugar.",
  },
];

export default async function Home() {
  const config = await getActiveClubConfig();

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 md:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <ClubLogo
              src={config.logo}
              alt={`Logo de ${config.name}`}
              className="h-10 w-auto max-h-10 max-w-[160px] shrink-0"
            />
            <p className="truncate text-lg font-bold tracking-wide text-slate-900">{config.name}</p>
          </div>
          <Link
            href="/registro"
            className="rounded-full bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Hacete socio
          </Link>
        </header>

        <div className="grid gap-6 rounded-2xl bg-white p-8 shadow-sm md:grid-cols-2 md:p-10">
          <div className="space-y-4">
            <p
              className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white"
            >
              Temporada 2026
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
              Mas que un club, una familia.
            </h1>
            <p className="max-w-xl text-base text-slate-600 md:text-lg">
              Bienvenido a {config.name}. Forma parte de una comunidad que vive el futbol con
              compromiso, companerismo y pasion.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/registro"
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Hacete socio
              </Link>
              <a
                href="#equipos"
                className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
              >
                Conoce los equipos
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-100 p-4 text-center">
            <div className="rounded-lg bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">3</p>
              <p className="text-sm text-slate-600">Equipos</p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">+150</p>
              <p className="text-sm text-slate-600">Socios</p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">2018</p>
              <p className="text-sm text-slate-600">Fundacion</p>
            </div>
          </div>
        </div>

        <section id="equipos" className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Nuestros equipos</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {teams.map((team) => (
              <article key={team.name} className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">{team.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{team.description}</p>
                <p className="mt-4 text-sm text-slate-700">
                  <span className="font-semibold">Plantel:</span> {team.squad}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Entrenamiento:</span> {team.schedule}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
