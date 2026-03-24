"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useActiveClubConfig } from "@/config/use-active-club-config";
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

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const memberId = params?.id ?? "";
  const currentMonth = formatMonth(new Date());
  const { config } = useActiveClubConfig();
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

  const loadMemberData = async () => {
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
  };

  useEffect(() => {
    void loadMemberData();
  }, [memberId]);

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
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-600">Cargando detalle del socio...</p>
        </div>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-700">No se encontro el socio solicitado.</p>
          <Link
            href="/admin/socios"
            className="mt-3 inline-block text-sm text-slate-600 hover:text-slate-900"
          >
            Volver a socios
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <nav className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <Link href="/admin" className="font-medium hover:text-slate-900">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <Link href="/admin/socios" className="font-medium hover:text-slate-900">
            Socios
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-slate-900">Socio</span>
        </nav>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold" style={{ color: "var(--club-primary)" }}>
              Detalle de socio
            </h1>
            <div className="flex items-center gap-2">
              <Link href="/admin/socios" className="text-sm text-slate-600 hover:text-slate-900">
                Volver
              </Link>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--club-primary)" }}
                >
                  Editar
                </button>
              ) : null}
            </div>
          </div>

          {!isEditing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Nombre:</span> {member.full_name}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">DNI:</span> {member.dni}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Email:</span> {member.email || "-"}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Direccion:</span> {member.address}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Telefono:</span> {member.phone || "-"}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Estado:</span> {member.status}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Fecha de creacion:</span>{" "}
                {new Date(member.created_at).toLocaleString("es-AR")}
              </p>
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

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold" style={{ color: "var(--club-primary)" }}>
            Estado y pagos mensuales
          </h2>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Deuda total:</span> ${totalDebtAmount}
            </p>
            {member.status === "active" && pendingDebtMonths.length > 0 ? (
              <button
                type="button"
                onClick={() => void handlePayAllDebt()}
                disabled={isPayingAllDebt}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPayingAllDebt ? "Pagando deuda..." : "Pagar toda la deuda"}
              </button>
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
                        {member.status === "pending" ? "No aplica" : isPaid ? "Pagado" : "Debe"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {member.status === "pending" ? "-" : payment ? `$${payment.amount}` : `$${monthlyFee}`}
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
                          <button
                            type="button"
                            onClick={() => void handleDeletePayment(payment.id)}
                            disabled={deletingPaymentId === payment.id}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {deletingPaymentId === payment.id ? "Eliminando..." : "Eliminar"}
                          </button>
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
      </div>
    </main>
  );
}
