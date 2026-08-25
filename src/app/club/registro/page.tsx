"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";

import { ClubLogo } from "@/components/club-logo";
import { Button, FormField, Input, buttonClassNames } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { formatMoney } from "@/lib/formatters";
import { useClubRoutes } from "@/lib/use-club-routes";

type MemberForm = {
  full_name: string;
  email: string;
  dni: string;
  address: string;
  city: string;
  phone: string;
  password: string;
  password_confirm: string;
};

const initialForm: MemberForm = {
  full_name: "",
  email: "",
  dni: "",
  address: "",
  city: "",
  phone: "",
  password: "",
  password_confirm: "",
};

const perks = [
  "Solicitud directa al panel del club",
  "Cuota y vencimiento visibles desde el inicio",
  "Revision administrativa sin perder tus datos",
  "Confirmacion clara cuando el club aprueba el alta",
];

export default function ClubRegistroPage() {
  const { config } = useActiveClubConfig();
  const routes = useClubRoutes();
  const [form, setForm] = useState<MemberForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const feeReference = formatMoney(config.monthly_fee);
  const dueDay = config.monthly_due_day ? `Vence el dia ${config.monthly_due_day}` : "Vencimiento a confirmar";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(false);
    setErrorMessage(null);
    setIsLoading(true);

    if (form.password.length < 8) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres.");
      setIsLoading(false);
      return;
    }

    if (form.password !== form.password_confirm) {
      setErrorMessage("Las contraseñas no coinciden.");
      setIsLoading(false);
      return;
    }

    const payload = {
      full_name: form.full_name,
      dni: form.dni,
      address: form.address,
      email: form.email.trim(),
      city: form.city.trim() || undefined,
      phone: form.phone || undefined,
      password: form.password,
      slug: routes.slug,
    };

    try {
      const response = await fetch("/api/auth/member-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error || "No se pudo guardar el registro.");
      }
      setSent(true);
      setForm(initialForm);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el registro.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
      <div className="mx-auto grid w-full max-w-[68rem] gap-8 lg:grid-cols-[0.9fr_1fr] lg:items-start">
        <section className="text-white">
          <Link
            href={routes.clubPath()}
            className={buttonClassNames({
              variant: "ghost",
              size: "sm",
              className: "mb-8 border border-white/10 text-white hover:bg-white/10 hover:text-white",
            })}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al club
          </Link>

          <p className="club-eyebrow text-white/48">Hacete socio</p>
          <h1 className="club-display mt-4 max-w-xl text-5xl font-semibold leading-[0.96] text-white sm:text-6xl">
            Sumate al club sin perderte en mensajes.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/68">
            Completa tus datos y el club recibe la solicitud en su panel. El alta queda pendiente hasta que la
            administracion la revise y confirme desde el sistema.
          </p>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.055] p-6">
            <div className="flex items-center gap-4">
              <ClubLogo
                src={config.logo}
                alt={`Logo de ${config.name}`}
                className="h-16 w-16 rounded-2xl bg-white p-2"
              />
              <div>
                <p className="text-sm font-semibold text-white">{config.name}</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="text-4xl font-semibold tracking-tight text-white">{feeReference}</span>
                  <span className="text-sm text-white/48">/ mes</span>
                </div>
                <p className="mt-1 text-sm text-white/54">{dueDay}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {perks.map((perk) => (
                <div key={perk} className="flex items-center gap-3 text-sm text-white/78">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-400/16 text-orange-200">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {perk}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] bg-white p-6 text-slate-950 shadow-[0_40px_100px_-44px_rgba(0,0,0,0.75)] sm:p-8">
          <div className="mb-7">
            <div className="mb-5 h-1 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-1/3 rounded-full bg-[linear-gradient(90deg,var(--club-primary),var(--club-accent))]" />
            </div>
            <p className="club-eyebrow text-slate-400">Paso 1 de 1 · Tus datos</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Quien se suma al club?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              El DNI y la contraseña te permiten entrar al portal. El email queda para recuperar el acceso.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="dni" label="DNI">
                <Input
                  id="dni"
                  value={form.dni}
                  onChange={(event) => setForm((prev) => ({ ...prev, dni: event.target.value }))}
                  required
                  disabled={isLoading}
                  placeholder="Sin puntos"
                />
              </FormField>

              <FormField htmlFor="phone" label="Telefono (opcional)">
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  disabled={isLoading}
                  placeholder="11 2345 6789"
                />
              </FormField>
            </div>

            <FormField htmlFor="email" label="Email">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
                disabled={isLoading}
                placeholder="nombre@correo.com"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
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

              <FormField htmlFor="city" label="Localidad">
                <Input
                  id="city"
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                  disabled={isLoading}
                  placeholder="Ej. Necochea"
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="password" label="Contraseña">
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  minLength={8}
                  disabled={isLoading}
                  placeholder="Minimo 8 caracteres"
                />
              </FormField>

              <FormField htmlFor="password_confirm" label="Repetir contraseña">
                <Input
                  id="password_confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.password_confirm}
                  onChange={(event) => setForm((prev) => ({ ...prev, password_confirm: event.target.value }))}
                  required
                  minLength={8}
                  disabled={isLoading}
                  placeholder="La misma contraseña"
                />
              </FormField>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p className="text-sm leading-6 text-slate-600">
                  El club revisa la solicitud antes de activarte como socio. Desde ese momento empieza el control de
                  cuota segun la configuracion vigente.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} fullWidth variant="accent" size="xl">
              {isLoading ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </form>

          {sent ? (
            <div className="mt-5 rounded-2xl border border-success/20 bg-success/10 p-4">
              <p className="text-sm font-semibold text-success">Solicitud enviada correctamente.</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Ya podes ingresar al portal con tu DNI y contraseña. El club va a revisar tu alta antes de activar la
                información de cuotas y pagos.
              </p>
              <Link
                href={routes.clubPath("login")}
                className={buttonClassNames({
                  variant: "primary",
                  size: "md",
                  className: "mt-4 w-full justify-center sm:w-auto",
                })}
              >
                Ingresar al portal
              </Link>
            </div>
          ) : null}
          {errorMessage ? (
            <p className="mt-5 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <BadgeCheck className="h-4 w-4 text-success" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-slate-950">Solicitud ordenada</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Tus datos entran directo al panel.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <CreditCard className="h-4 w-4 text-accent" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-slate-950">Cuota visible</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">El club sabe desde cuando cobrar.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
