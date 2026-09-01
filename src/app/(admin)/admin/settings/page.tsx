"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CreditCard, ExternalLink, ImageIcon, Mail, Palette, Save, type LucideIcon } from "lucide-react";

import { AdminModal } from "@/components/admin/admin-modal";
import { ClubLogoUpload } from "@/components/admin/club-logo-upload";
import { SponsorsSection } from "@/components/admin/sponsors-section";
import {
  CLUB_PAYMENT_METHOD_OPTIONS,
  DEFAULT_PAYMENT_METHOD,
  type ClubPaymentMethod,
} from "@/config/payment-method";
import { getActiveClubConfig } from "@/config/active-club";
import { Alert, Button, Card, FormField, Input, PageHeader, Select } from "@/components/ui";
import {
  changeClubPaymentAlias,
  formatBillingPeriod,
  listOpenClubAliasChangeTargets,
  type OpenClubAliasChangeTarget,
} from "@/lib/charges";
import { formatMoney } from "@/lib/formatters";
import { clubPath } from "@/lib/routes";
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

function aliasTargetDisplayName(target: OpenClubAliasChangeTarget) {
  if (target.charge_type === "Cuota mensual" && target.billing_period) {
    return `${target.charge_name} - ${formatBillingPeriod(target.billing_period)}`;
  }
  return target.charge_name;
}

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
  const [aliasDecisionOpen, setAliasDecisionOpen] = useState(false);
  const [aliasTargets, setAliasTargets] = useState<OpenClubAliasChangeTarget[]>([]);
  const [isLoadingAliasTargets, setIsLoadingAliasTargets] = useState(false);

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

  const saveSettings = async (applyAliasToOpenCharges: boolean) => {
    setMessage(null);
    setIsSaving(true);

    try {
      if (!clubSettings?.id) {
        setMessage(uiMessages.settings.noConfigId);
        return;
      }

      const nextAlias = clubSettings.payment_alias?.trim() || null;
      const aliasChanged = initialSettings
        ? nextAlias !== (initialSettings.payment_alias?.trim() || null)
        : false;

      await updateClubSettingsById(clubSettings.id, {
        name: clubSettings.name,
        monthly_fee: clubSettings.monthly_fee,
        monthly_due_day: clubSettings.monthly_due_day,
        primary_color: clubSettings.primary_color,
        accent_color: clubSettings.accent_color,
        send_payment_confirmation_email: clubSettings.send_payment_confirmation_email,
        ...(aliasChanged ? {} : { payment_alias: nextAlias }),
        payment_method: clubSettings.payment_method,
      });

      if (aliasChanged) {
        await changeClubPaymentAlias({
          new_alias: nextAlias,
          apply_to_open_charges: applyAliasToOpenCharges,
        });
      }

      const savedSettings = { ...clubSettings, payment_alias: nextAlias };
      setClubSettings(savedSettings);
      setInitialSettings(buildSettingsSnapshot(savedSettings));
      setAliasDecisionOpen(false);
      setAliasTargets([]);
      setMessage(uiMessages.settings.saveSuccess);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : uiMessages.settings.saveError);
    } finally {
      setIsSaving(false);
    }
  };

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

    const nextAlias = clubSettings?.payment_alias?.trim() || null;
    const currentAlias = initialSettings?.payment_alias?.trim() || null;
    if (nextAlias !== currentAlias) {
      setIsLoadingAliasTargets(true);
      try {
        setAliasTargets(await listOpenClubAliasChangeTargets());
        setAliasDecisionOpen(true);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No se pudieron revisar los cobros abiertos.");
      } finally {
        setIsLoadingAliasTargets(false);
      }
      return;
    }

    await saveSettings(false);
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

  const currentAliasLabel = initialSettings?.payment_alias?.trim() || "Alias pendiente";
  const nextAliasLabel = clubSettings.payment_alias?.trim() || "Alias pendiente";
  const aliasTargetsTotal = aliasTargets.reduce((sum, target) => sum + target.pending_amount, 0);

  return (
    <>
    <section className="space-y-5">
      <PageHeader
        eyebrow="Configuracion"
        title="Ajustes del club"
        description="Identidad visual, valores de cobranza, notificaciones y sponsors del producto."
        actions={
          <Button
            type="submit"
            form="settings-form"
            disabled={isSaving || isLoadingAliasTargets || !hasUnsavedChanges || !clubSettings.id}
            size="lg"
          >
            <Save className="h-4 w-4" aria-hidden />
            {isSaving ? "Guardando..." : isLoadingAliasTargets ? "Revisando..." : "Guardar cambios"}
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

                <PublicPreview
                  clubName={clubSettings.name}
                  primaryColor={clubSettings.primary_color}
                  accentColor={clubSettings.accent_color}
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ColorField
                  id="primary_color"
                  label="Color primario"
                  value={clubSettings.primary_color}
                  description="Marca acciones principales, links, foco de campos y acentos del panel."
                  onChange={(value) =>
                    setClubSettings((prev) => (prev ? { ...prev, primary_color: value } : prev))
                  }
                />
                <ColorField
                  id="accent_color"
                  label="Color de acento"
                  value={clubSettings.accent_color}
                  description="Resalta llamadas secundarias, sponsors, proyectos y detalles de la landing."
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
    <AdminModal
      open={aliasDecisionOpen}
      onClose={() => {
        if (isSaving) return;
        setAliasDecisionOpen(false);
      }}
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary/70">Cambio de alias</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Elegí desde cuándo usar el nuevo alias</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Vas a cambiar el alias del club de <span className="font-semibold text-slate-900">{currentAliasLabel}</span>{" "}
            a <span className="font-semibold text-slate-900">{nextAliasLabel}</span>. Los pagos y comprobantes ya
            registrados conservan la cuenta histórica.
          </p>
        </div>

        {aliasTargets.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Cobros abiertos que podrían actualizarse</p>
                <p className="mt-1 text-xs text-slate-500">
                  {aliasTargets.length} cobro(s), {formatMoney(aliasTargetsTotal)} pendiente total.
                </p>
              </div>
            </div>
            <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white">
              {aliasTargets.map((target) => (
                <div
                  key={target.charge_id}
                  className="grid gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 sm:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {aliasTargetDisplayName(target)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{target.charge_type}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-950">
                      {formatMoney(target.pending_amount)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {target.pending_lines} pendiente(s)
                      {target.partial_lines > 0 ? `, ${target.partial_lines} parcial(es)` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Alert>Hoy no hay cuotas ni listas abiertas con saldo pendiente usando el alias del club.</Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="neutral"
            size="md"
            onClick={() => void saveSettings(false)}
            disabled={isSaving}
            fullWidth
          >
            Usar sólo para futuros cobros
          </Button>
          <Button
            type="button"
            size="md"
            onClick={() => void saveSettings(true)}
            disabled={isSaving}
            fullWidth
          >
            Usar también en cobros abiertos
          </Button>
        </div>
      </div>
    </AdminModal>
    </>
  );
}

function PublicPreview({
  clubName,
  primaryColor,
  accentColor,
}: {
  clubName: string;
  primaryColor: string;
  accentColor: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.55)]"
      style={
        {
          "--preview-primary": primaryColor,
          "--preview-accent": accentColor,
        } as React.CSSProperties
      }
    >
      <div className="bg-[radial-gradient(circle_at_12%_0%,color-mix(in_srgb,var(--preview-accent)_30%,transparent),transparent_34%),radial-gradient(circle_at_92%_0%,color-mix(in_srgb,var(--preview-primary)_48%,transparent),transparent_38%)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/56">Vista publica</p>
            <p className="mt-3 text-lg font-semibold leading-tight">{clubName}</p>
            <p className="mt-1 text-sm leading-5 text-white/70">Así se propaga la identidad a la landing y al registro.</p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[color:var(--preview-accent)]">
            <Palette className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
          <span className="rounded-lg bg-[color:var(--preview-primary)] px-3 py-2 text-center text-white">Accion principal</span>
          <span className="rounded-lg bg-[color:var(--preview-accent)] px-3 py-2 text-center text-white">Acento visual</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={clubPath()}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-white/90"
          >
            Ver landing
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link
            href={clubPath("registro")}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/14 bg-white/8 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/14"
          >
            Ver registro
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
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
  description,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  description: string;
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
      <p className="text-xs leading-5 text-slate-500">{description}</p>
    </FormField>
  );
}
