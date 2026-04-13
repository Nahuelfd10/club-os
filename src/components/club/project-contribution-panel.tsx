"use client";

import { useState } from "react";

import { Button, FormField, Input } from "@/components/ui";

type ProjectContributionPanelProps = {
  ctaLabel: string;
};

const suggestedAmounts = [5000, 10000, 20000, 40000];

export function ProjectContributionPanel({ ctaLabel }: ProjectContributionPanelProps) {
  const [isAnonymous, setIsAnonymous] = useState(false);

  return (
    <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_48px_-38px_rgba(15,23,42,0.28)]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Colaborar</p>
      <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Aporta al proyecto del club</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        La estructura ya queda preparada para recibir aportes de socios, familias, seguidores o sponsors, incluso en modo anonimo.
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {suggestedAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
          >
            ${amount.toLocaleString("es-AR")}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {!isAnonymous ? (
          <>
            <FormField htmlFor="contributor_name" label="Nombre (opcional)">
              <Input id="contributor_name" placeholder="Ej. Juan Perez" />
            </FormField>
            <FormField htmlFor="contributor_email" label="Email (opcional)">
              <Input id="contributor_email" type="email" placeholder="nombre@correo.com" />
            </FormField>
          </>
        ) : null}

        <FormField htmlFor="contributor_note" label="Mensaje (opcional)">
          <Input id="contributor_note" placeholder="Ej. Fuerza con este proyecto" />
        </FormField>

        <label className="flex items-center gap-3 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(event) => setIsAnonymous(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Quiero colaborar de forma anonima
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" size="xl">
          {ctaLabel}
        </Button>
        <Button type="button" variant="outline" size="xl">
          Consultar primero
        </Button>
      </div>
    </div>
  );
}
