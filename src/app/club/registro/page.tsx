"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, CreditCard, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

import { ClubLogo } from "@/components/club-logo";
import { Button, Card, FormField, Input, buttonClassNames, cardClassNames } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { formatMoney } from "@/lib/formatters";
import { DuplicateMemberDniError, insertMember } from "@/lib/supabase";

type MemberForm = {
  full_name: string;
  email: string;
  dni: string;
  address: string;
  phone: string;
};

const initialForm: MemberForm = {
  full_name: "",
  email: "",
  dni: "",
  address: "",
  phone: "",
};

export default function ClubRegistroPage() {
  const { config } = useActiveClubConfig();
  const [form, setForm] = useState<MemberForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const feeReference = formatMoney(config.monthly_fee);
  const dueDay = config.monthly_due_day ? `Dia ${config.monthly_due_day} de cada mes` : "A confirmar";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(false);
    setErrorMessage(null);
    setIsLoading(true);

    const payload = {
      ...form,
      email: form.email.trim() || undefined,
      phone: form.phone || undefined,
      status: "pending" as const,
    };

    try {
      await insertMember(payload);
      setSent(true);
      setForm(initialForm);
    } catch (error) {
      if (error instanceof DuplicateMemberDniError) {
        setErrorMessage(
          `Ya hay un socio registrado con el DNI ${error.dni}. Si creés que es un error, contactá al club.`
        );
      } else {
        const message =
          error instanceof Error ? error.message : "No se pudo guardar el registro.";
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="px-4 pb-8 pt-10 sm:px-6 sm:pt-12">
      <div className="mx-auto grid w-full max-w-[100rem] gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className={cardClassNames({ variant: "hero", className: "rounded-[2rem] p-7 sm:p-10" })}>
          <Link href="/club" className={buttonClassNames({ variant: "ghost", size: "sm", className: "mb-6 self-start" })}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al club
          </Link>

          <div className="flex min-w-0 items-center gap-4">
            <ClubLogo
              src={config.logo}
              alt={`Logo de ${config.name}`}
              className="h-14 w-14 shrink-0 rounded-[1.25rem] bg-white/85 p-2 shadow-[0_16px_30px_-22px_rgba(15,23,42,0.38)]"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/65">Alta de socios</p>
              <h1 className="mt-2 truncate text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Sumate a {config.name}
              </h1>
            </div>
          </div>

          <p className="mt-6 text-base leading-7 text-slate-600 sm:text-lg">
            Completa tus datos y el club recibira tu solicitud con todo lo necesario para avanzar con una alta prolija, clara y cercana.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="club-surface rounded-[1.5rem] p-5">
              <div className="mb-4 inline-flex rounded-full bg-primary/10 p-2 text-primary">
                <BadgeCheck className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-slate-900">Solicitud simple</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Tus datos llegan al panel del club listos para ser revisados y gestionados.</p>
            </article>
            <article className="club-surface rounded-[1.5rem] p-5">
              <div className="mb-4 inline-flex rounded-full bg-accent/10 p-2 text-accent">
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-slate-900">Proceso ordenado</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Una experiencia mejor presentada transmite mas confianza desde el primer paso.</p>
            </article>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <article className="club-metric-card rounded-[1.5rem] p-5">
              <div className="mb-4 inline-flex rounded-full bg-primary/10 p-2 text-primary">
                <CreditCard className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Cuota de referencia</p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{feeReference}</p>
              <p className="mt-2 text-sm text-slate-600">Valor actual comunicado por el club.</p>
            </article>
            <article className="club-metric-card rounded-[1.5rem] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Vencimiento</p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{dueDay}</p>
              <p className="mt-2 text-sm text-slate-600">Informacion visible para una administracion mas clara.</p>
            </article>
          </div>
        </section>

        <Card variant="default" className="rounded-[2rem] p-7 sm:p-10">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/65">Formulario</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Completa tus datos</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Solo te pedimos la informacion necesaria para iniciar el proceso de alta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField htmlFor="full_name" label="Nombre y apellido">
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                required
                disabled={isLoading}
                placeholder="Ej. Juan Perez"
              />
            </FormField>

            <FormField htmlFor="dni" label="DNI">
              <Input
                id="dni"
                value={form.dni}
                onChange={(event) => setForm((prev) => ({ ...prev, dni: event.target.value }))}
                required
                disabled={isLoading}
                placeholder="Ej. 12345678"
              />
            </FormField>

            <FormField htmlFor="email" label="Email (opcional)">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                disabled={isLoading}
                placeholder="nombre@correo.com"
              />
            </FormField>

            <FormField htmlFor="address" label="Domicilio">
              <Input
                id="address"
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                required
                disabled={isLoading}
                placeholder="Calle y numero"
              />
            </FormField>

            <FormField htmlFor="phone" label="Telefono (opcional)">
              <Input
                id="phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                disabled={isLoading}
                placeholder="Ej. 11 2345 6789"
              />
            </FormField>

            <Button type="submit" disabled={isLoading} fullWidth variant="accent" size="xl">
              {isLoading ? "Enviando..." : "Enviar registro"}
            </Button>
          </form>

          {sent ? (
            <p className="mt-5 rounded-[1.25rem] bg-success/10 px-4 py-3 text-sm font-medium text-success">
              Registro enviado correctamente.
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-5 rounded-[1.25rem] bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {errorMessage}
            </p>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
