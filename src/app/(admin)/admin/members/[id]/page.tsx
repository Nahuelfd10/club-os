"use client";

import {
  Calendar,
  ChevronLeft,
  Edit3,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Send,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MemberChargesSection } from "@/components/admin/member-charges-section";
import { MemberGroupsSection } from "@/components/admin/member-groups-section";
import { MembershipMonthlySection } from "@/components/admin/membership-monthly-section";
import { Alert, buttonClassNames } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import {
  getMemberChargesForMember,
  isMembershipCategory,
  type MemberChargeWithDetails,
} from "@/lib/charges";
import { formatMoney } from "@/lib/formatters";
import { getMemberById, updateMember, updateMemberStatus } from "@/lib/supabase";
import type { Member } from "@/types";

type EditForm = {
  full_name: string;
  email: string;
  address: string;
  phone: string;
};

type FinanceTab = "membership" | "other";
type InfoIconName = "email" | "phone" | "location" | "calendar" | "id";

const infoIconByName: Record<InfoIconName, LucideIcon> = {
  email: Mail,
  phone: Phone,
  location: MapPin,
  calendar: Calendar,
  id: IdCard,
};

function InfoIcon({ name }: { name: InfoIconName }) {
  const Icon = infoIconByName[name];
  return <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function memberInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

function memberSince(date: string) {
  return new Date(date).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function memberStatusLabel(status: Member["status"]) {
  if (status === "active") return "Activo";
  if (status === "inactive") return "Baja";
  return "Pendiente";
}

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const memberId = params?.id ?? "";
  const { config, isConfigLoading } = useActiveClubConfig();

  const [member, setMember] = useState<Member | null>(null);
  const [memberCharges, setMemberCharges] = useState<MemberChargeWithDetails[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [financeTab, setFinanceTab] = useState<FinanceTab>("membership");
  const [form, setForm] = useState<EditForm>({
    full_name: "",
    email: "",
    address: "",
    phone: "",
  });

  const loadCharges = useCallback(async () => {
    if (!memberId) return;
    const data = await getMemberChargesForMember(memberId);
    setMemberCharges(data);
  }, [memberId]);

  const loadMemberData = useCallback(async () => {
    if (!memberId) return;

    setIsLoading(true);
    try {
      const [memberData] = await Promise.all([getMemberById(memberId), loadCharges()]);
      setMember(memberData);

      if (memberData) {
        setForm({
          full_name: memberData.full_name,
          email: memberData.email ?? "",
          address: memberData.address,
          phone: memberData.phone ?? "",
        });
      }
    } catch (error) {
      console.error("Error al cargar detalle del socio:", error);
    } finally {
      setIsLoading(false);
    }
  }, [memberId, loadCharges]);

  useEffect(() => {
    void loadMemberData();
  }, [loadMemberData]);

  const membershipCharges = useMemo(
    () => memberCharges?.filter((c) => isMembershipCategory(c.category)) ?? [],
    [memberCharges]
  );

  const otherCharges = useMemo(
    () => memberCharges?.filter((c) => !isMembershipCategory(c.category)) ?? [],
    [memberCharges]
  );

  const currentMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const membershipOverdueCharges = useMemo(
    () =>
      membershipCharges.filter((charge) => {
        if (!charge.billing_period) return false;
        return new Date(`${charge.billing_period}T12:00:00`) < currentMonthStart;
      }),
    [currentMonthStart, membershipCharges]
  );

  const membershipCurrentCharges = useMemo(
    () =>
      membershipCharges.filter((charge) => {
        if (!charge.billing_period) return false;
        return new Date(`${charge.billing_period}T12:00:00`).getTime() === currentMonthStart.getTime();
      }),
    [currentMonthStart, membershipCharges]
  );

  const otherDebt = useMemo(
    () => roundMoney(otherCharges.reduce((sum, charge) => sum + (charge.amount - charge.paid_amount), 0)),
    [otherCharges]
  );

  const membershipOverdueDebt = useMemo(
    () =>
      roundMoney(
        membershipOverdueCharges.reduce((sum, charge) => sum + (charge.amount - charge.paid_amount), 0)
      ),
    [membershipOverdueCharges]
  );

  const membershipCurrentDebt = useMemo(
    () =>
      roundMoney(
        membershipCurrentCharges.reduce((sum, charge) => sum + (charge.amount - charge.paid_amount), 0)
      ),
    [membershipCurrentCharges]
  );

  const membershipDueDebt = useMemo(
    () => roundMoney(membershipOverdueDebt + membershipCurrentDebt),
    [membershipCurrentDebt, membershipOverdueDebt]
  );

  const actionableDebt = useMemo(
    () => roundMoney(membershipOverdueDebt + membershipCurrentDebt + otherDebt),
    [membershipCurrentDebt, membershipOverdueDebt, otherDebt]
  );

  const hasCharges = (memberCharges?.length ?? 0) > 0;

  const handleSave = async () => {
    if (!member) return;

    setIsSaving(true);
    try {
      await updateMember(member.id, {
        full_name: form.full_name,
        email: form.email || undefined,
        address: form.address,
        phone: form.phone || undefined,
      });
      setIsEditing(false);
      await loadMemberData();
    } catch (error) {
      console.error("Error al actualizar socio:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!member) return;

    const ok = window.confirm(
      `Dar de baja a ${member.full_name}? El historial de pagos y cargos se conserva, pero dejara de figurar como socio activo.`
    );
    if (!ok) return;

    setIsChangingStatus(true);
    setActionMessage(null);
    try {
      await updateMemberStatus(member.id, "inactive");
      setMember((prev) => (prev ? { ...prev, status: "inactive" } : prev));
      setActionMessage("Socio dado de baja. El historial queda disponible para consulta.");
    } catch (error) {
      console.error("Error al dar de baja socio:", error);
      setActionMessage("No se pudo dar de baja el socio. Proba nuevamente.");
    } finally {
      setIsChangingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Cargando detalle del socio...</p>
        </div>
      </section>
    );
  }

  if (!member) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">No se encontro el socio solicitado.</p>
          <Link
            href="/admin/socios"
            className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            Volver a socios
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <Link
          href="/admin/socios"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          Volver a socios
        </Link>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
            {memberInitials(member.full_name)}
          </span>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary/60">Ficha del socio</p>
            <h1 className="break-words text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
              {member.full_name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              DNI {member.dni} · {memberStatusLabel(member.status)} desde {memberSince(member.created_at)}
              {isConfigLoading ? "" : ` · ${config.name}`}
            </p>
          </div>
        </div>

        {!isEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={buttonClassNames({ variant: "neutral", size: "md" })}
              disabled={!member.phone}
              title={member.phone ? undefined : "Carga un telefono para abrir WhatsApp."}
            >
              <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              Recordatorio
            </button>
            {member.status === "active" ? (
              <button
                type="button"
                onClick={() => void handleDeactivate()}
                disabled={isChangingStatus}
                className={buttonClassNames({ variant: "danger", size: "md" })}
              >
                {isChangingStatus ? "Procesando..." : "Dar de baja"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className={buttonClassNames({ variant: "primary", size: "md" })}
            >
              <Edit3 className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              Editar
            </button>
          </div>
        ) : null}
      </header>

      {actionMessage ? (
        <Alert variant={actionMessage.startsWith("No se pudo") ? "danger" : "success"}>{actionMessage}</Alert>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <article
          className={`rounded-2xl border p-4 shadow-sm ${
            actionableDebt > 0.001 ? "border-danger/25 bg-danger/5" : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Deuda total</p>
          <p className={`mt-2 text-2xl font-bold ${actionableDebt > 0.001 ? "text-danger" : "text-success"}`}>
            {formatMoney(actionableDebt)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {hasCharges ? "Incluye cuota exigible y otros cargos." : "Todavia no tiene cargos asignados."}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Cuota del club</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{formatMoney(membershipDueDebt)}</p>
          <p className="mt-1 text-xs text-slate-600">
            {membershipOverdueCharges.length > 0
              ? `${membershipOverdueCharges.length} cuota(s) vencida(s) + mes actual.`
              : membershipCurrentCharges.length > 0
                ? "Solo incluye la cuota exigible del periodo actual."
                : "No tiene cuota exigible en este momento."}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Cargos pendientes</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{formatMoney(otherDebt)}</p>
          <p className="mt-1 text-xs text-slate-600">{otherCharges.length} cargo(s) registrados</p>
        </article>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Datos del socio</p>
          <h2 className="text-lg font-semibold text-slate-950">Contacto y direccion</h2>
        </div>

        {!isEditing ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ContactCard icon="email" label="Email" value={member.email || "-"} />
            <ContactCard icon="phone" label="Telefono" value={member.phone || "-"} />
            <ContactCard icon="location" label="Direccion" value={member.address} />
            <ContactCard icon="id" label="DNI" value={member.dni} />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <EditInput
                id="full_name"
                label="Nombre"
                value={form.full_name}
                onChange={(value) => setForm((prev) => ({ ...prev, full_name: value }))}
              />
              <EditInput
                id="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
              />
              <EditInput
                id="address"
                label="Direccion"
                value={form.address}
                onChange={(value) => setForm((prev) => ({ ...prev, address: value }))}
              />
              <EditInput
                id="phone"
                label="Telefono"
                value={form.phone}
                onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="rounded-md bg-success px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setForm({
                      full_name: member.full_name,
                      email: member.email ?? "",
                      address: member.address,
                      phone: member.phone ?? "",
                    });
                  }}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <MemberGroupsSection memberId={member.id} />

      {memberCharges === null ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Cargando cargos...</p>
        </div>
      ) : (
        <>
          <section className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Cobros</p>
              <h2 className="text-lg font-semibold text-slate-950">Cuotas y cargos del socio</h2>
            </div>
            <div className="inline-flex w-fit flex-wrap gap-1 rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setFinanceTab("membership")}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  financeTab === "membership"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Cuotas del club
              </button>
              <button
                type="button"
                onClick={() => setFinanceTab("other")}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  financeTab === "other"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Otros cargos
              </button>
            </div>
          </section>

          {financeTab === "membership" ? (
            <MembershipMonthlySection rows={membershipCharges} memberStatus={member.status} onPaid={loadCharges} />
          ) : (
            <MemberChargesSection
              memberId={member.id}
              memberFullName={member.full_name}
              memberPhone={member.phone}
              clubName={config.name}
              paymentAlias={config.payment_alias}
              charges={otherCharges}
              onChargesRefresh={loadCharges}
            />
          )}
        </>
      )}
    </section>
  );
}

function ContactCard({ icon, label, value }: { icon: InfoIconName; label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        <InfoIcon name={icon} />
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function EditInput({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-600">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
      />
    </div>
  );
}
