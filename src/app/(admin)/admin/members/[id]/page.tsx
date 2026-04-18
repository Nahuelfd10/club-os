"use client";

import {
  Calendar,
  ChevronLeft,
  IdCard,
  Mail,
  MapPin,
  Phone,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MemberChargesSection } from "@/components/admin/member-charges-section";
import { MemberGroupsSection } from "@/components/admin/member-groups-section";
import { MembershipMonthlySection } from "@/components/admin/membership-monthly-section";
import { Badge, buttonClassNames } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import {
  getMemberChargesForMember,
  isMembershipCategory,
  type MemberChargeWithDetails,
} from "@/lib/charges";
import { formatMoney } from "@/lib/formatters";
import { getMemberById, updateMember } from "@/lib/supabase";
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

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const memberId = params?.id ?? "";
  const { config, isConfigLoading } = useActiveClubConfig();

  const [member, setMember] = useState<Member | null>(null);
  const [memberCharges, setMemberCharges] = useState<MemberChargeWithDetails[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [financeTab, setFinanceTab] = useState<FinanceTab>("membership");
  const [form, setForm] = useState<EditForm>({
    full_name: "",
    email: "",
    address: "",
    phone: "",
  });

  const loadCharges = useCallback(async () => {
    if (!memberId) {
      return;
    }
    const data = await getMemberChargesForMember(memberId);
    setMemberCharges(data);
  }, [memberId]);

  const loadMemberData = useCallback(async () => {
    if (!memberId) {
      return;
    }

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
        if (!charge.billing_period) {
          return false;
        }
        return new Date(`${charge.billing_period}T12:00:00`) < currentMonthStart;
      }),
    [currentMonthStart, membershipCharges]
  );

  const membershipCurrentCharges = useMemo(
    () =>
      membershipCharges.filter((charge) => {
        if (!charge.billing_period) {
          return false;
        }
        return new Date(`${charge.billing_period}T12:00:00`).getTime() === currentMonthStart.getTime();
      }),
    [currentMonthStart, membershipCharges]
  );

  const otherDebt = useMemo(
    () =>
      roundMoney(
        otherCharges.reduce((sum, charge) => sum + (charge.amount - charge.paid_amount), 0)
      ),
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
    if (!member) {
      return;
    }

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

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-950/58 p-6 shadow-sm">
          <p className="text-slate-300">Cargando detalle del socio...</p>
        </div>
      </section>
    );
  }

  if (!member) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-950/58 p-6 shadow-sm">
          <p className="text-slate-300">No se encontró el socio solicitado.</p>
          <Link
            href="/admin/socios"
            className="mt-3 inline-block text-sm font-medium text-white/72 hover:text-white"
          >
            Volver a socios
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/admin/socios"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-300 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          Volver a socios
        </Link>
      </div>

      <header className="mt-[-24px] flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/42">Ficha del socio</p>
          <h1 className="break-words text-3xl font-bold tracking-tight text-white">
            {member.full_name}
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            {isConfigLoading ? "Cargando..." : `Perfil financiero y de contacto · ${config.name}`}
          </p>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={buttonClassNames({
              variant: "ghost",
              size: "lg",
              className: "border border-white/10 text-white hover:bg-white/10 hover:text-white",
            })}
          >
            Editar
          </button>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
          <span className="font-semibold text-white">Estado</span>
          {member.status === "active" ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <Badge variant="warning">Pendiente</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
          <InfoIcon name="calendar" />
          <span className="font-semibold text-white">Registro</span>
          <span className="font-medium text-white">
            {new Date(member.created_at).toLocaleDateString("es-AR")}
          </span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-300">
          <span className="font-semibold text-white">DNI</span>{" "}
          <span className="font-medium text-white">{member.dni}</span>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Deuda total</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatMoney(actionableDebt)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {hasCharges ? "Incluye atraso, cuota actual y otros cargos." : "Todavía no tiene cargos asignados."}
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Cuota del club</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatMoney(membershipDueDebt)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {membershipOverdueCharges.length > 0
              ? `${membershipOverdueCharges.length} mes(es) vencido(s) + cuota actual.`
              : membershipCurrentCharges.length > 0
                ? "Solo incluye la cuota exigible del período actual."
                : "No tiene cuota exigible en este momento."}
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Deuda de cargos</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatMoney(otherDebt)}</p>
          <p className="mt-1 text-xs text-slate-400">{otherCharges.length} registro(s)</p>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/58 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-white">Datos de contacto</h2>
        {!isEditing ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-white/[0.08] px-2 py-1 text-xs font-semibold text-slate-400">
                <InfoIcon name="email" />
                Email
              </p>
              <p className="text-sm font-semibold text-white">{member.email || "-"}</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-white/[0.08] px-2 py-1 text-xs font-semibold text-slate-400">
                <InfoIcon name="phone" />
                Teléfono
              </p>
              <p className="text-sm font-semibold text-white">{member.phone || "-"}</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-white/[0.08] px-2 py-1 text-xs font-semibold text-slate-400">
                <InfoIcon name="location" />
                Dirección
              </p>
              <p className="text-sm font-semibold text-white">{member.address}</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-white/[0.08] px-2 py-1 text-xs font-semibold text-slate-400">
                <InfoIcon name="id" />
                DNI
              </p>
              <p className="text-sm font-semibold text-white">{member.dni}</p>
            </article>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-slate-300">
                Nombre
              </label>
              <input
                id="full_name"
                value={form.full_name}
                onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              />
            </div>
            <div>
              <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-300">
                Dirección
              </label>
              <input
                id="address"
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-300">
                Teléfono
              </label>
              <input
                id="phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              />
            </div>

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
                className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm font-semibold text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <MemberGroupsSection memberId={member.id} />

      {memberCharges === null ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/58 p-6 shadow-sm">
          <p className="text-sm text-slate-300">Cargando cargos...</p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-white/10 bg-slate-950/58 p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFinanceTab("membership")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  financeTab === "membership"
                    ? "bg-white text-slate-950"
                    : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                }`}
              >
                Cuotas del club
              </button>
              <button
                type="button"
                onClick={() => setFinanceTab("other")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  financeTab === "other"
                    ? "bg-white text-slate-950"
                    : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                }`}
              >
                Otros cargos
              </button>
            </div>
          </section>

          {financeTab === "membership" ? (
            <MembershipMonthlySection
              rows={membershipCharges}
              memberStatus={member.status}
              onPaid={loadCharges}
            />
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
