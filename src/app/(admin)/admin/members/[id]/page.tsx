"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { formatMoney } from "@/lib/formatters";
import { generateReceipt } from "@/lib/generate-receipt-pdf";
import { buildWhatsAppLink } from "@/lib/whatsapp-reminder";
import {
  createPayment,
  deletePayment,
  getMemberById,
  getPaymentsByMemberId,
  updateMember,
} from "@/lib/supabase";
import { uiMessages } from "@/lib/ui-messages";
import type { Member } from "@/types";

type PaymentRow = {
  id: string;
  member_id: string;
  amount: number;
  month: string;
  paid_at: string | null;
};

type EditForm = {
  full_name: string;
  email: string;
  address: string;
  phone: string;
};

const formatMonth = (date: Date) => date.toISOString().slice(0, 7);

const addMonths = (month: string, offset: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return formatMonth(date);
};

const formatMonthLabel = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1);
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
};

type InfoIconName = "email" | "phone" | "location" | "calendar" | "id";

function InfoIcon({ name }: { name: InfoIconName }) {
  const pathByName: Record<InfoIconName, string> = {
    email:
      "M3.75 5.25h16.5A1.5 1.5 0 0 1 21.75 6.75v10.5a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5Zm0 1.5 8.25 5.25 8.25-5.25",
    phone:
      "M2.25 4.5c0-.828.672-1.5 1.5-1.5h2.379a1.5 1.5 0 0 1 1.455 1.139l.632 2.527a1.5 1.5 0 0 1-.405 1.443L6.692 9.23a12 12 0 0 0 5.077 5.077l1.121-1.119a1.5 1.5 0 0 1 1.443-.405l2.527.632a1.5 1.5 0 0 1 1.139 1.455v2.379c0 .828-.672 1.5-1.5 1.5h-.75C8.708 18.75 2.25 12.292 2.25 4.5Z",
    location:
      "M12 2.25a6 6 0 0 1 6 6c0 4.457-4.05 8.477-5.405 9.684a.9.9 0 0 1-1.19 0C10.05 16.727 6 12.707 6 8.25a6 6 0 0 1 6-6Zm0 3.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z",
    calendar:
      "M6.75 2.25a.75.75 0 0 1 .75.75V4.5h9V3a.75.75 0 0 1 1.5 0V4.5h1.5A2.25 2.25 0 0 1 21.75 6.75v11.25A2.25 2.25 0 0 1 19.5 20.25h-15A2.25 2.25 0 0 1 2.25 18V6.75A2.25 2.25 0 0 1 4.5 4.5H6V3a.75.75 0 0 1 .75-.75ZM3.75 9.75v8.25c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75V9.75h-17.5Z",
    id:
      "M3.75 5.25A2.25 2.25 0 0 1 6 3h12a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 18 21H6a2.25 2.25 0 0 1-2.25-2.25V5.25Zm3.75 2.25h9M7.5 11.25h5.25M7.5 15h3",
  };

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d={pathByName[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const memberId = params?.id ?? "";
  const currentMonth = formatMonth(new Date());
  const { config, isConfigLoading } = useActiveClubConfig();
  const monthlyFee = config.monthly_fee || 1000;

  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [payingMonth, setPayingMonth] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [isPayingAllDebt, setIsPayingAllDebt] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({
    full_name: "",
    email: "",
    address: "",
    phone: "",
  });

  const monthlyStatus = useMemo(() => {
    if (!member) {
      return [];
    }

    const paidMonths = new Set(payments.map((payment) => payment.month));
    const currentMonth = formatMonth(new Date());
    const maxPaidMonth = payments.reduce(
      (maxMonth, payment) => (payment.month > maxMonth ? payment.month : maxMonth),
      currentMonth
    );
    const endMonth = maxPaidMonth > currentMonth ? maxPaidMonth : currentMonth;

    const rows: Array<{ month: string; paid: boolean }> = [];
    let cursorMonth = formatMonth(new Date(member.created_at));
    while (cursorMonth <= endMonth) {
      rows.push({
        month: cursorMonth,
        paid: paidMonths.has(cursorMonth),
      });
      cursorMonth = addMonths(cursorMonth, 1);
    }

    return rows.reverse();
  }, [member, payments]);

  const paymentByMonth = useMemo(() => {
    const sortedByPaidAt = [...payments].sort((a, b) => {
      const aDate = a.paid_at ? new Date(a.paid_at).getTime() : 0;
      const bDate = b.paid_at ? new Date(b.paid_at).getTime() : 0;
      return bDate - aDate;
    });

    const map = new Map<string, PaymentRow>();
    for (const payment of sortedByPaidAt) {
      if (!map.has(payment.month)) {
        map.set(payment.month, payment);
      }
    }

    return map;
  }, [payments]);

  const pendingDebtMonths = useMemo(
    () =>
      member?.status === "active"
        ? monthlyStatus.filter((row) => !paymentByMonth.has(row.month)).map((row) => row.month)
        : [],
    [member?.status, monthlyStatus, paymentByMonth]
  );

  const totalDebtAmount = pendingDebtMonths.length * monthlyFee;

  const whatsappReminderUrl = useMemo(() => {
    if (!member || member.status !== "active" || pendingDebtMonths.length === 0) {
      return null;
    }
    return buildWhatsAppLink(member, pendingDebtMonths, config.name);
  }, [member, pendingDebtMonths, config.name]);

  const loadMemberData = useCallback(async () => {
    if (!memberId) {
      return;
    }

    setIsLoading(true);
    setActionMessage(null);
    try {
      const [memberData, paymentsData] = await Promise.all([
        getMemberById(memberId),
        getPaymentsByMemberId(memberId),
      ]);

      setMember(memberData);
      setPayments(paymentsData as PaymentRow[]);

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
  }, [memberId]);

  useEffect(() => {
    void loadMemberData();
  }, [loadMemberData]);

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

  const handlePayMonth = async (month: string) => {
    if (!member || member.status !== "active") {
      return;
    }

    const alreadyPaid = payments.some((payment) => payment.month === month);
    if (alreadyPaid) {
      setActionMessage(uiMessages.payment.duplicate);
      return;
    }

    const shouldContinue = window.confirm(uiMessages.payment.confirmCreate(formatMonthLabel(month)));
    if (!shouldContinue) {
      return;
    }

    setPayingMonth(month);
    try {
      await createPayment({
        member_id: member.id,
        amount: monthlyFee,
        month,
      });
      await loadMemberData();
      setActionMessage(uiMessages.payment.createSuccess);
    } catch (error) {
      console.error("Error al registrar pago del mes:", error);
      setActionMessage(error instanceof Error ? error.message : uiMessages.payment.createError);
    } finally {
      setPayingMonth(null);
    }
  };

  const handlePayAllDebt = async () => {
    if (!member || member.status !== "active" || pendingDebtMonths.length === 0) {
      return;
    }

    const shouldContinue = window.confirm(uiMessages.payment.confirmPayAll(pendingDebtMonths.length));
    if (!shouldContinue) {
      return;
    }

    setIsPayingAllDebt(true);
    try {
      for (const month of pendingDebtMonths) {
        await createPayment({
          member_id: member.id,
          amount: monthlyFee,
          month,
        });
      }
      await loadMemberData();
      setActionMessage(uiMessages.payment.payAllSuccess);
    } catch (error) {
      console.error("Error al pagar toda la deuda:", error);
      setActionMessage(error instanceof Error ? error.message : uiMessages.payment.payAllError);
    } finally {
      setIsPayingAllDebt(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const shouldContinue = window.confirm(uiMessages.payment.confirmDelete);
    if (!shouldContinue) {
      return;
    }

    setDeletingPaymentId(paymentId);
    try {
      await deletePayment(paymentId);
      await loadMemberData();
      setActionMessage(uiMessages.payment.deleteSuccess);
    } catch (error) {
      console.error("Error al eliminar pago:", error);
      setActionMessage(error instanceof Error ? error.message : uiMessages.payment.deleteError);
    } finally {
      setDeletingPaymentId(null);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Cargando detalle del socio...</p>
        </div>
      </section>
    );
  }

  if (!member) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-slate-700">No se encontro el socio solicitado.</p>
          <Link
            href="/admin/socios"
            className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
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
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
            <path d="M15.75 18.75 9 12l6.75-6.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver a socios
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3 mt-[-24px]">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-3xl font-bold tracking-tight text-slate-900">
            {member.full_name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isConfigLoading ? "Cargando..." : `Perfil y pagos · ${config.name}`}
          </p>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Editar
          </button>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-800">Estado</span>
          {member.status === "active" ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <Badge variant="warning">Pendiente</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          <InfoIcon name="calendar" />
          <span className="font-semibold text-slate-800">Registro</span>
          <span className="font-medium text-slate-900">
            {new Date(member.created_at).toLocaleDateString("es-AR")}
          </span>
        </div>
        <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-800">DNI</span>{" "}
          <span className="font-medium text-slate-900">{member.dni}</span>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Datos de contacto</h2>
        {!isEditing ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                <InfoIcon name="email" />
                Email
              </p>
              <p className="text-sm font-semibold text-slate-900">{member.email || "-"}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                <InfoIcon name="phone" />
                Telefono
              </p>
              <p className="text-sm font-semibold text-slate-900">{member.phone || "-"}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                <InfoIcon name="location" />
                Direccion
              </p>
              <p className="text-sm font-semibold text-slate-900">{member.address}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                <InfoIcon name="id" />
                DNI
              </p>
              <p className="text-sm font-semibold text-slate-900">{member.dni}</p>
            </article>
          </div>
        ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-slate-700">
                  Nombre
                </label>
                <input
                  id="full_name"
                  value={form.full_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500"
                />
              </div>
              <div>
                <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-700">
                  Direccion
                </label>
                <input
                  id="address"
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500"
                />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
                  Telefono
                </label>
                <input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
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
                  className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
        )}
      </section>

      {actionMessage ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{actionMessage}</p>
      ) : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Estado y pagos mensuales</h2>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Deuda total:</span>{" "}
              {totalDebtAmount > 0 ? (
                <Badge variant="danger">{formatMoney(totalDebtAmount)}</Badge>
              ) : (
                <Badge variant="success">{formatMoney(0)}</Badge>
              )}
            </p>
            {member.status === "active" && pendingDebtMonths.length > 0 ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span
                  title={
                    whatsappReminderUrl
                      ? undefined
                      : "No podés enviar un recordatorio porque el socio no tiene un número de teléfono configurado."
                  }
                  className="inline-flex"
                >
                  <button
                    type="button"
                    disabled={!whatsappReminderUrl}
                    onClick={() => {
                      if (whatsappReminderUrl) {
                        window.open(whatsappReminderUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className={
                      whatsappReminderUrl
                        ? "inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50"
                        : "inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 opacity-90 shadow-sm"
                    }
                  >
                    Enviar recordatorio
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => void handlePayAllDebt()}
                  disabled={isPayingAllDebt}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPayingAllDebt ? "Pagando deuda..." : "Pagar toda la deuda"}
                </button>
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-500">Sin deuda pendiente</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Mes</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Estado</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Monto</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Fecha de pago</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {monthlyStatus.map((row) => {
                  const payment = paymentByMonth.get(row.month);
                  const isPaid = Boolean(payment);

                  return (
                    <tr key={row.month}>
                      <td className="px-3 py-2 text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          <span>{row.month}</span>
                          {row.month === currentMonth ? (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                              Actual
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {member.status === "pending" ? (
                          <Badge variant="slate">No aplica</Badge>
                        ) : isPaid ? (
                          <Badge variant="success">Pagado</Badge>
                        ) : (
                          <Badge variant="danger">Debe</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {member.status === "pending"
                          ? "-"
                          : payment
                            ? formatMoney(payment.amount)
                            : formatMoney(monthlyFee)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {payment?.paid_at ? new Date(payment.paid_at).toLocaleString("es-AR") : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {member.status === "active" && !isPaid ? (
                          <button
                            type="button"
                            onClick={() => void handlePayMonth(row.month)}
                            disabled={payingMonth === row.month}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {payingMonth === row.month ? "Pagando..." : "Pagar"}
                          </button>
                        ) : isPaid && payment ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {member.status !== "pending" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  generateReceipt(
                                    {
                                      amount: payment.amount,
                                      month: payment.month,
                                      paid_at: payment.paid_at,
                                    },
                                    { full_name: member.full_name, dni: member.dni }
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
                                title="Descargar comprobante PDF"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  className="h-3.5 w-3.5 shrink-0 fill-none stroke-current stroke-[1.8]"
                                  aria-hidden
                                >
                                  <path
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                Comprobante
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void handleDeletePayment(payment.id)}
                              disabled={deletingPaymentId === payment.id}
                              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {deletingPaymentId === payment.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </div>
                        ) : member.status === "pending" ? (
                          <span className="text-xs font-semibold text-slate-500">No aplica</span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">Pagado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
    </section>
  );
}
