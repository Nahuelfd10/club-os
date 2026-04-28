"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Mail } from "lucide-react";

import { ClubLogoUpload } from "@/components/admin/club-logo-upload";
import { DEFAULT_PAYMENT_METHOD } from "@/config/payment-method";
import { getActiveClubConfig } from "@/config/active-club";
import { Button, Card, FormField, Input, PageHeader } from "@/components/ui";
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
>;

const buildSettingsSnapshot = (settings: ClubSettings): SettingsSnapshot => ({
  name: settings.name,
  monthly_fee: settings.monthly_fee,
  monthly_due_day: settings.monthly_due_day,
  primary_color: settings.primary_color,
  accent_color: settings.accent_color,
  send_payment_confirmation_email: settings.send_payment_confirmation_email,
  payment_alias: settings.payment_alias,
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
    if (!clubSettings || !initialSettings) {
      return false;
    }

    const currentSnapshot = buildSettingsSnapshot(clubSettings);

    return (
      currentSnapshot.name !== initialSettings.name ||
      currentSnapshot.monthly_fee !== initialSettings.monthly_fee ||
      currentSnapshot.monthly_due_day !== initialSettings.monthly_due_day ||
      currentSnapshot.primary_color !== initialSettings.primary_color ||
      currentSnapshot.accent_color !== initialSettings.accent_color ||
      currentSnapshot.send_payment_confirmation_email !== initialSettings.send_payment_confirmation_email ||
      currentSnapshot.payment_alias !== initialSettings.payment_alias
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

    if (!hasUnsavedChanges) {
      return;
    }

    setIsSaving(true);

    try {
      if (!clubSettings?.id) {
        console.error("No hay ID de configuración");
        setMessage(uiMessages.settings.noConfigId);
        return;
      }

      console.log("Updating config ID:", clubSettings.id);
      await updateClubSettingsById(clubSettings.id, {
        name: clubSettings.name,
        monthly_fee: clubSettings.monthly_fee,
        monthly_due_day: clubSettings.monthly_due_day,
        primary_color: clubSettings.primary_color,
        accent_color: clubSettings.accent_color,
        send_payment_confirmation_email: clubSettings.send_payment_confirmation_email,
        payment_alias: clubSettings.payment_alias?.trim() || null,
      });
      setInitialSettings(buildSettingsSnapshot(clubSettings));
      setMessage(uiMessages.settings.saveSuccess);
    } catch (error) {
      console.error("Error al guardar configuracion:", error);
      setMessage(error instanceof Error ? error.message : uiMessages.settings.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPaymentAlias = async () => {
    const value = clubSettings?.payment_alias?.trim();
    if (!value) {
      return;
    }
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
      prev
        ? {
            ...prev,
            send_payment_confirmation_email: !prev.send_payment_confirmation_email,
          }
        : prev
    );
  };

  const handleTestEmail = async () => {
    setMessage(null);
    setIsSendingTestEmail(true);

    try {
      const response = await fetch("/api/test-email", {
        method: "GET",
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        response?: {
          data?: { id?: string };
        };
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "No se pudo ejecutar el test de email.");
      }

      const emailId = result.response?.data?.id;
      setMessage(
        emailId
          ? `Test email enviado. Resend ID: ${emailId}`
          : "Test email ejecutado correctamente."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo ejecutar el test de email.");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  if (isLoading) {
    return (
      <section>
        <Card className="mx-auto w-full max-w-3xl border-white/10 !bg-slate-950/58 p-6">
          <p className="text-slate-300">Cargando configuracion...</p>
        </Card>
      </section>
    );
  }

  if (!clubSettings) {
    return null;
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Configuracion del club"
        description="Personaliza identidad visual, valores y notificaciones del panel."
      />

      <Card className="mx-auto w-full max-w-3xl border-white/10 !bg-slate-950/58 p-6">
        <div
          className="mb-5 rounded-xl border border-white/10 p-4"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Preview del tema</p>
          <p className="mt-1 text-sm font-medium text-white">{clubSettings.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ClubLogoUpload
            settingsId={clubSettings.id || null}
            logoUrl={clubSettings.logo_url}
            onLogoUpdated={(publicUrl) =>
              setClubSettings((prev) => (prev ? { ...prev, logo_url: publicUrl } : prev))
            }
          />

          <FormField htmlFor="name" label="Nombre">
            <Input
              id="name"
              value={clubSettings.name}
              onChange={(event) =>
                setClubSettings((prev) => (prev ? { ...prev, name: event.target.value } : prev))
              }
              required
              className="border-white/10 bg-white/[0.05] text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
            />
          </FormField>

          <FormField htmlFor="monthly_fee" label="Cuota mensual">
            <Input
              id="monthly_fee"
              type="number"
              min="0"
              value={clubSettings.monthly_fee}
              onChange={(event) =>
                setClubSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        monthly_fee: Number(event.target.value) || 0,
                      }
                    : prev
                )
              }
              required
              className="border-white/10 bg-white/[0.05] text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
            />
          </FormField>

          <FormField htmlFor="monthly_due_day" label="Día de vencimiento mensual">
            <div className="space-y-1">
              <Input
                id="monthly_due_day"
                type="number"
                min="1"
                max="31"
                value={clubSettings.monthly_due_day ?? 10}
                onChange={(event) =>
                  setClubSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          monthly_due_day: Number(event.target.value) || 1,
                        }
                      : prev
                  )
                }
                required
                className="border-white/10 bg-white/[0.05] text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              />
              <p className="text-xs text-slate-400">
                Se usar&aacute; para calcular el vencimiento de las cuotas generadas autom&aacute;ticamente por
                adelantado para los meses futuros.
              </p>
            </div>
          </FormField>

          <FormField htmlFor="payment_alias" label="Alias para transferencias">
            <div className="space-y-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <Input
                  id="payment_alias"
                  name="payment_alias"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej: CVU, alias o CBU"
                  value={clubSettings.payment_alias ?? ""}
                  onChange={(event) => {
                    const v = event.target.value;
                    setClubSettings((prev) =>
                      prev ? { ...prev, payment_alias: v === "" ? null : v } : prev
                    );
                  }}
                  className="border-white/10 bg-white/[0.05] text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08] sm:min-w-0 sm:flex-1"
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
              <p className="text-xs text-slate-400">Este alias se enviará en los recordatorios de pago</p>
            </div>
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField htmlFor="primary_color" label="Color primario">
              <input
                id="primary_color"
                type="color"
                value={clubSettings.primary_color}
                onChange={(event) =>
                  setClubSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          primary_color: event.target.value,
                        }
                      : prev
                  )
                }
                className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1"
              />
            </FormField>

            <FormField htmlFor="accent_color" label="Color de acento">
              <input
                id="accent_color"
                type="color"
                value={clubSettings.accent_color}
                onChange={(event) =>
                  setClubSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          accent_color: event.target.value,
                        }
                      : prev
                  )
                }
                className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1"
              />
            </FormField>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 inline-flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
                <Mail className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </span>
              <h3 className="text-base font-semibold text-white">Notificaciones</h3>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={clubSettings.send_payment_confirmation_email}
                  onClick={handleTogglePaymentEmail}
                  className={`mt-0.5 inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                    clubSettings.send_payment_confirmation_email ? "bg-slate-900" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      clubSettings.send_payment_confirmation_email ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>

                <div>
                <p className="text-sm font-semibold text-white">Enviar email automatico al registrar pagos</p>
                <p className="text-sm text-slate-300">El socio recibira un email de confirmacion</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void handleTestEmail()}
                  disabled={isSendingTestEmail}
                  variant="neutral"
                  size="md"
                >
                  {isSendingTestEmail ? "Enviando test..." : "Test email"}
                </Button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSaving || !hasUnsavedChanges || !clubSettings.id}
            fullWidth
            variant="primary"
            size="lg"
          >
            {isSaving ? "Guardando..." : "Guardar configuracion"}
          </Button>
        </form>

        {message ? (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300">{message}</p>
        ) : null}
      </Card>
    </section>
  );
}
