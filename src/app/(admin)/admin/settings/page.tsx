"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, CreditCard, ImageIcon, Mail, Save, type LucideIcon } from "lucide-react";

import { ClubLogoUpload } from "@/components/admin/club-logo-upload";
import { SponsorsSection } from "@/components/admin/sponsors-section";
import {
  CLUB_PAYMENT_METHOD_OPTIONS,
  DEFAULT_PAYMENT_METHOD,
  type ClubPaymentMethod,
} from "@/config/payment-method";
import { getActiveClubConfig } from "@/config/active-club";
import { Button, Card, FormField, Input, PageHeader, Select } from "@/components/ui";
import {
  getClubSettings,
  updateClubSettingsById,
  type ClubSettings,
} from "@/lib/supabase";
import { uiMessages } from "@/lib/ui-messages";

type SettingsSnapshot = Pick<
  ClubSettings,
  | "name"
  | "monthly_fee"
  | "monthly_due_day"
  | "primary_color"
  | "accent_color"
  | "send_payment_confirmation_email"
  | "payment_alias"
  | "payment_method"
>;

const settingsNav = [
  { href: "#identidad", label: "Identidad del club" },
  { href: "#cobranza", label: "Valores de cobranza" },
  { href: "#notificaciones", label: "Notificaciones" },
  { href: "#sponsors", label: "Sponsors" },
];

const buildSettingsSnapshot = (settings: ClubSettings): SettingsSnapshot => ({
  name: settings.name,
  monthly_fee: settings.monthly_fee,
  monthly_due_day: settings.monthly_due_day,
  primary_color: settings.primary_color,
  accent_color: settings.accent_color,
  send_payment_confirmation_email: settings.send_payment_confirmation_email,
  payment_alias: settings.payment_alias,
  payment_method: settings.payment_method,
});

export default function AdminSettingsPage() {
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<SettingsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aliasCopyFeedback, setAliasCopyFeedback] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    if (!clubSettings || !initialSettings) return false;

    const currentSnapshot = buildSettingsSnapshot(clubSettings);
    return (
      currentSnapshot.name !== initialSettings.name ||
      currentSnapshot.monthly_fee !== initialSettings.monthly_fee ||
      currentSnapshot.monthly_due_day !== initialSettings.monthly_due_day ||
      currentSnapshot.primary_color !== initialSettings.primary_color ||
      currentSnapshot.accent_color !== initialSettings.accent_color ||
      currentSnapshot.send_payment_confirmation_email !== initialSettings.send_payment_confirmation_email ||
      currentSnapshot.payment_alias !== initialSettings.payment_alias ||
      currentSnapshot.payment_method !== initialSettings.payment_method
    );
  }, [clubSettings, initialSettings]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getClubSettings();
        if (settings) {
          setClubSettings(settings);
          setInitialSettings(buildSettingsSnapshot(settings));
          return;
        }

        const config = await getActiveClubConfig();
        const fallbackSettings: ClubSettings = {
          id: "",
          name: config.name,
          monthly_fee: config.monthly_fee,
          monthly_due_day: config.monthly_due_day,
          primary_color: config.primary_color,
          accent_color: config.accent_color,
          send_payment_confirmation_email: false,
          logo_url: null,
          payment_alias: null,
          payment_method: DEFAULT_PAYMENT_METHOD,
        };
        setClubSettings(fallbackSettings);
        setInitialSettings(buildSettingsSnapshot(fallbackSettings));
      } catch (error) {
        console.error("Error al cargar configuracion:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!hasUnsavedChanges) return;

    if (clubSettings && initialSettings && clubSettings.monthly_fee !== initialSettings.monthly_fee) {
      const ok = window.confirm(
        `Vas a cambiar la cuota mensual de $${initialSettings.monthly_fee} a $${clubSettings.monthly_fee}.\n\n` +
          "Esto afecta solo los cargos mensuales futuros y los actuales que aun esten pendientes. " +
          "Los meses ya pagados o con pago parcial no se modifican.\n\nConfirmas el cambio?"
      );
      if (!ok) return;
    }

    setIsSaving(true);

    try {
      if (!clubSettings?.id) {
        setMessage(uiMessages.settings.noConfigId);
        return;
      }

      await updateClubSettingsById(clubSettings.id, {
        name: clubSettings.name,
        monthly_fee: clubSettings.monthly_fee,
        monthly_due_day: clubSettings.monthly_due_day,
        primary_color: clubSettings.primary_color,
        accent_color: clubSettings.accent_color,
        send_payment_confirmation_email: clubSettings.send_payment_confirmation_email,
        payment_alias: clubSettings.payment_alias?.trim() || null,
        payment_method: clubSettings.payment_method,
      });
      setInitialSettings(buildSettingsSnapshot(clubSettings));
      setMessage(uiMessages.settings.saveSuccess);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : uiMessages.settings.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPaymentAlias = async () => {
    const value = clubSettings?.payment_alias?.trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setAliasCopyFeedback(true);
      window.setTimeout(() => setAliasCopyFeedback(false), 2000);
    } catch {
      setMessage("No se pudo copiar al portapapeles.");
    }
  };

  const handleTogglePaymentEmail = () => {
    setClubSettings((prev) =>
      prev ? { ...prev, send_payment_confirmation_email: !prev.send_payment_confirmation_email } : prev
    );
  };

  const handleTestEmail = async () => {
    setMessage(null);
    setIsSendingTestEmail(true);

    try {
      const response = await fetch("/api/test-email", { method: "GET" });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        response?: { data?: { id?: string } };
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "No se pudo ejecutar el test de email.");
      }

      const emailId = result.response?.data?.id;
      setMessage(emailId ? `Test email enviado. Resend ID: ${emailId}` : "Test email ejecutado correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo ejecutar el test de email.");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  if (isLoading) {
    return (
      <section>
        <Card className="w-full rounded-[1.5rem] border-slate-200 bg-white p-6">
          <p className="text-slate-600">Cargando configuracion...</p>
        </Card>
      </section>
    );
  }

  if (!clubSettings) return null;

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Configuracion"
        title="Ajustes del club"
        description="Identidad visual, valores de cobranza, notificaciones y sponsors del producto."
        actions={
          <Button
            type="submit"
            form="settings-form"
            disabled={isSaving || !hasUnsavedChanges || !clubSettings.id}
            size="lg"
          >
            <Save className="h-4 w-4" aria-hidden />
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-8 space-y-1">
            {settingsNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">
            <Card id="identidad" className="rounded-[1.5rem] border-slate-200 bg-white p-6">
              <SectionHeader
                icon={ImageIcon}
                title="Identidad del club"
                description="Estos datos aparecen en la landing publica del club y dentro del panel."
              />

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <ClubLogoUpload
                  settingsId={clubSettings.id || null}
                  logoUrl={clubSettings.logo_url}
                  onLogoUpdated={(publicUrl) =>
                    setClubSettings((prev) => (prev ? { ...prev, logo_url: publicUrl } : prev))
                  }
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FormField htmlFor="name" label="Nombre del club">
                  <Input
                    id="name"
                    value={clubSettings.name}
                    onChange={(event) =>
                      setClubSettings((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                    }
                    required
                  />
                </FormField>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Preview publico</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">{clubSettings.name}</p>
                  <p className="mt-1 text-sm text-slate-600">Landing, emails y panel administrativo.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ColorField
                  id="primary_color"
                  label="Color primario"
                  value={clubSettings.primary_color}
                  onChange={(value) =>
                    setClubSettings((prev) => (prev ? { ...prev, primary_color: value } : prev))
                  }
                />
                <ColorField
                  id="accent_color"
                  label="Color de acento"
                  value={clubSettings.accent_color}
                  onChange={(value) =>
                    setClubSettings((prev) => (prev ? { ...prev, accent_color: value } : prev))
                  }
                />
              </div>
            </Card>

            <Card id="cobranza" className="rounded-[1.5rem] border-slate-200 bg-white p-6">
              <SectionHeader
                icon={CreditCard}
                title="Valores de cobranza"
                description="Configuracion base para cuota mensual, vencimiento y alias de pago."
              />

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FormField htmlFor="monthly_fee" label="Cuota mensual">
                  <Input
                    id="monthly_fee"
                    type="number"
                    min="0"
                    value={clubSettings.monthly_fee}
                    onChange={(event) =>
                      setClubSettings((prev) =>
                        prev ? { ...prev, monthly_fee: Number(event.target.value) || 0 } : prev
                      )
                    }
                    required
                  />
                </FormField>

                <FormField htmlFor="monthly_due_day" label="Dia de vencimiento mensual">
                  <Input
                    id="monthly_due_day"
                    type="number"
                    min="1"
                    max="31"
                    value={clubSettings.monthly_due_day ?? 10}
                    onChange={(event) =>
                      setClubSettings((prev) =>
                        prev ? { ...prev, monthly_due_day: Number(event.target.value) || 1 } : prev
                      )
                    }
                    required
                  />
                </FormField>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                El cambio de cuota se aplica a cargos mensuales futuros y pendientes. No modifica meses ya pagados o con pago parcial.
              </p>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_16rem]">
                <FormField htmlFor="payment_alias" label="Alias para transferencias">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="payment_alias"
                      name="payment_alias"
                      type="text"
                      autoComplete="off"
                      placeholder="Ej: CVU, alias o CBU"
                      value={clubSettings.payment_alias ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setClubSettings((prev) =>
                          prev ? { ...prev, payment_alias: value === "" ? null : value } : prev
                        );
                      }}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="neutral"
                      size="md"
                      className="shrink-0"
                      disabled={!clubSettings.payment_alias?.trim()}
                      onClick={() => void handleCopyPaymentAlias()}
                    >
                      {aliasCopyFeedback ? "Copiado" : "Copiar alias"}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Este alias se usa en los recordatorios de pago.</p>
                </FormField>

                <FormField htmlFor="payment_method" label="Metodo default">
                  <Select
                    id="payment_method"
                    value={clubSettings.payment_method}
                    onChange={(event) =>
                      setClubSettings((prev) =>
                        prev ? { ...prev, payment_method: event.target.value as ClubPaymentMethod } : prev
                      )
                    }
                  >
                    {CLUB_PAYMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
            </Card>

            <Card id="notificaciones" className="rounded-[1.5rem] border-slate-200 bg-white p-6">
              <SectionHeader
                icon={Bell}
                title="Notificaciones"
                description="Automatizaciones livianas para confirmar pagos y probar el canal de email."
              />

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={clubSettings.send_payment_confirmation_email}
                      onClick={handleTogglePaymentEmail}
                      className={`mt-1 inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                        clubSettings.send_payment_confirmation_email ? "bg-primary" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          clubSettings.send_payment_confirmation_email ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>

                    <div>
                      <p className="text-sm font-semibold text-slate-950">Email automatico al registrar pagos</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        El socio recibe una confirmacion cuando el admin registra un pago.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleTestEmail()}
                    disabled={isSendingTestEmail}
                    variant="neutral"
                    size="md"
                  >
                    <Mail className="h-4 w-4" aria-hidden />
                    {isSendingTestEmail ? "Enviando..." : "Test email"}
                  </Button>
                </div>
              </div>
            </Card>

            {message ? (
              <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                {message}
              </p>
            ) : null}
          </form>

          <Card id="sponsors" className="rounded-[1.5rem] border-slate-200 bg-white p-6">
            <SponsorsSection />
          </Card>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormField htmlFor={id} label={label}>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.35)]">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 shrink-0 rounded-lg border border-slate-200 bg-white p-1"
        />
        <span className="font-mono text-sm text-slate-700">{value}</span>
      </div>
    </FormField>
  );
}
