"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { ClubLogo } from "@/components/club-logo";
import { Button, Card, FormField, Input } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { insertMember } from "@/lib/supabase";

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

export default function RegistroPage() {
  const { config } = useActiveClubConfig();
  const [form, setForm] = useState<MemberForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      const message = error instanceof Error ? error.message : "No se pudo guardar el registro.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <Card className="mx-auto w-full max-w-2xl p-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <ClubLogo
              src={config.logo}
              alt={`Logo de ${config.name}`}
              className="h-10 w-auto max-h-10 max-w-[160px] shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tracking-wide text-slate-900">{config.name}</p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">Registro de socios</h1>
            </div>
          </div>
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-slate-600 hover:text-slate-900 sm:pt-1"
          >
            Volver
          </Link>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField htmlFor="full_name" label="Nombre y apellido">
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
              required
              disabled={isLoading}
            />
          </FormField>

          <FormField htmlFor="dni" label="DNI">
            <Input
              id="dni"
              value={form.dni}
              onChange={(event) => setForm((prev) => ({ ...prev, dni: event.target.value }))}
              required
              disabled={isLoading}
            />
          </FormField>

          <FormField htmlFor="email" label="Email (opcional)">
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              disabled={isLoading}
            />
          </FormField>

          <FormField htmlFor="address" label="Domicilio">
            <Input
              id="address"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              required
              disabled={isLoading}
            />
          </FormField>

          <FormField htmlFor="phone" label="Telefono (opcional)">
            <Input
              id="phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              disabled={isLoading}
            />
          </FormField>

          <Button
            type="submit"
            disabled={isLoading}
            fullWidth
            variant="accent"
            size="lg"
          >
            {isLoading ? "Enviando..." : "Enviar registro"}
          </Button>
        </form>

        {sent ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Registro enviado correctamente.
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}
      </Card>
    </main>
  );
}
