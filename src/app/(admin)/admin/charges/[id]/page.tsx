"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import { ChargePaymentModal } from "@/components/admin/charge-payment-modal";
import { paymentMethodLabel } from "@/config/payment-method";
import { Badge, Button, Card, Input } from "@/components/ui";
import {
  assignChargeToMissingMembers,
  assignChargeToMember,
  chargeHasPayments,
  formatBillingPeriod,
  getChargeById,
  getChargeFinancials,
  getChargePaymentsByMemberChargeId,
  getMemberChargesForCharge,
  getMissingMembersForCharge,
  registerChargePayment,
  updateCharge,
  type ChargeDetail,
  type ChargePaymentRow,
  type MemberChargeForChargeRow,
} from "@/lib/charges";
import {
  memberChargeStatusBadgeVariant,
  memberChargeStatusLabel,
  remainingAmount,
} from "@/lib/charges-ui";
import { formatDueDate, formatPaidAt } from "@/lib/datetime";
import { formatMoney } from "@/lib/formatters";
import { createExpense, deleteExpense, listExpensesByChargeId, updateExpense, type ExpenseRow } from "@/lib/expenses";
import { buildChargeDebtWhatsAppLink } from "@/lib/whatsapp-reminder";

type FilterKey = "all" | "pending" | "partial" | "paid";

export default function AdminChargeDetailPage() {
  const params = useParams<{ id: string }>();
  const chargeId = params?.id ?? "";

  const [charge, setCharge] = useState<ChargeDetail | null>(null);
  const [hasPayments, setHasPayments] = useState<boolean | null>(null);
  const [rows, setRows] = useState<MemberChargeForChargeRow[]>([]);
  const [missingMembers, setMissingMembers] = useState<
    Array<{ id: string; full_name: string; dni: string; status: "pending" | "active" }>
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [financials, setFinancials] = useState<{
    total_expected: number;
    total_collected: number;
    total_expenses: number;
  } | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const [filter, setFilter] = useState<FilterKey>("all");

  const [expandedMcId, setExpandedMcId] = useState<string | null>(null);
  const [historyByMc, setHistoryByMc] = useState<Record<string, ChargePaymentRow[]>>({});
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);

  const [payModalRow, setPayModalRow] = useState<MemberChargeForChargeRow | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [assigningMissing, setAssigningMissing] = useState(false);
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseDeletingId, setExpenseDeletingId] = useState<string | null>(null);

  const formatExpenseDate = (value: string) => {
    if (!value) {
      return "—";
    }
    return new Date(`${value}T12:00:00`).toLocaleDateString("es-AR");
  };

  const loadAll = useCallback(async () => {
    if (!chargeId) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setActionMessage(null);
    try {
      const ch = await getChargeById(chargeId);
      setCharge(ch);
      if (!ch) {
        setRows([]);
        setMissingMembers([]);
        setHasPayments(null);
        setFinancials(null);
        setExpenses([]);
        return;
      }

      const membershipCharge = ch.category === "membership";
      const [hp, memberCharges, missing, fin] = await Promise.all([
        chargeHasPayments(chargeId),
        getMemberChargesForCharge(chargeId),
        membershipCharge
          ? Promise.resolve([])
          : getMissingMembersForCharge({ chargeId, groupId: ch.group?.id ?? null }),
        getChargeFinancials(chargeId),
      ]);
      setHasPayments(hp);
      setRows(memberCharges);
      setMissingMembers(missing);
      setFinancials(fin);

      setExpensesLoading(true);
      try {
        const exp = await listExpensesByChargeId(chargeId);
        setExpenses(exp);
      } finally {
        setExpensesLoading(false);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el cargo.");
    } finally {
      setIsLoading(false);
    }
  }, [chargeId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredRows = useMemo(() => {
    if (filter === "all") {
      return rows;
    }
    return rows.filter((row) => row.status === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const map: Record<FilterKey, number> = { all: rows.length, pending: 0, partial: 0, paid: 0 };
    for (const r of rows) {
      map[r.status] += 1;
    }
    return map;
  }, [rows]);

  const loadHistory = async (memberChargeId: string) => {
    setHistoryLoadingId(memberChargeId);
    try {
      const list = await getChargePaymentsByMemberChargeId(memberChargeId);
      setHistoryByMc((prev) => ({ ...prev, [memberChargeId]: list }));
    } catch (error) {
      console.error(error);
      setHistoryByMc((prev) => ({ ...prev, [memberChargeId]: [] }));
    } finally {
      setHistoryLoadingId(null);
    }
  };

  const toggleExpand = (memberChargeId: string) => {
    if (expandedMcId === memberChargeId) {
      setExpandedMcId(null);
      return;
    }
    setExpandedMcId(memberChargeId);
    if (!historyByMc[memberChargeId]) {
      void loadHistory(memberChargeId);
    }
  };

  const openPayModal = (row: MemberChargeForChargeRow) => {
    setPayModalRow(row);
  };

  const closePayModal = () => {
    setPayModalRow(null);
  };

  const submitPayment = async (payload: {
    amount: number;
    paid_at: string;
    payment_method: "transfer" | "cash" | "mercadopago";
  }) => {
    if (!payModalRow) {
      return;
    }
    const memberChargeId = payModalRow.id;
    await registerChargePayment({
      member_charge_id: memberChargeId,
      amount: payload.amount,
      paid_at: payload.paid_at,
      payment_method: payload.payment_method,
    });
    setActionMessage("Pago registrado.");
    await loadAll();
    if (expandedMcId === memberChargeId) {
      await loadHistory(memberChargeId);
    }
  };

  const openCreateExpense = () => {
    setEditingExpense(null);
    setExpenseDesc("");
    setExpenseCategory("");
    setExpenseAmount("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setExpenseModalOpen(true);
  };

  const openEditExpense = (expense: ExpenseRow) => {
    setEditingExpense(expense);
    setExpenseDesc(expense.description ?? "");
    setExpenseCategory(expense.category ?? "");
    setExpenseAmount(String(expense.amount ?? ""));
    setExpenseDate(expense.date ?? new Date().toISOString().slice(0, 10));
    setExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    if (expenseSaving) {
      return;
    }
    setExpenseModalOpen(false);
  };

  const saveExpense = async () => {
    if (!charge) {
      return;
    }
    const description = expenseDesc.trim();
    if (!description) {
      setActionMessage("La descripción del egreso es obligatoria.");
      return;
    }
    const raw = expenseAmount.replace(",", ".").trim();
    const amount = Number(raw);
    if (raw === "" || Number.isNaN(amount)) {
      setActionMessage("Indicá un monto válido para el egreso.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionMessage("El monto del egreso debe ser mayor a cero.");
      return;
    }
    const date = expenseDate.trim() || new Date().toISOString().slice(0, 10);

    setExpenseSaving(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          description,
          amount,
          category: expenseCategory.trim() || null,
          date,
          charge_id: charge.id,
        });
        setActionMessage("Egreso actualizado.");
      } else {
        await createExpense({
          description,
          amount,
          category: expenseCategory.trim() || null,
          date,
          charge_id: charge.id,
        });
        setActionMessage("Egreso registrado.");
      }
      setExpenseModalOpen(false);
      await loadAll();
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? error.message : "No se pudo guardar el egreso.");
    } finally {
      setExpenseSaving(false);
    }
  };

  const removeExpense = async (expense: ExpenseRow) => {
    const ok = window.confirm(`¿Eliminar el egreso "${expense.description}"?`);
    if (!ok) {
      return;
    }
    setExpenseDeletingId(expense.id);
    try {
      await deleteExpense(expense.id);
      setActionMessage("Egreso eliminado.");
      await loadAll();
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? error.message : "No se pudo eliminar el egreso.");
    } finally {
      setExpenseDeletingId(null);
    }
  };

  const openEdit = () => {
    if (!charge) {
      return;
    }
    setEditName(charge.name);
    setEditDescription(charge.description ?? "");
    setEditAmount(String(charge.amount));
    setEditDueDate(charge.due_date ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!charge) {
      return;
    }
    const name = editName.trim();
    if (!name) {
      setActionMessage("El nombre es obligatorio.");
      return;
    }
    const raw = editAmount.replace(",", ".").trim();
    const amount = Number(raw);
    if (raw === "" || Number.isNaN(amount)) {
      setActionMessage("Indicá un monto válido.");
      return;
    }
    setEditSaving(true);
    try {
      await updateCharge(charge.id, {
        name,
        description: editDescription.trim() || null,
        amount,
        due_date: editDueDate.trim() || null,
      });
      setEditOpen(false);
      setActionMessage("Cargo actualizado.");
      await loadAll();
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? error.message : "No se pudo actualizar el cargo.");
    } finally {
      setEditSaving(false);
    }
  };

  const assignMissing = async () => {
    if (!charge || charge.category === "membership" || missingMembers.length === 0) {
      return;
    }
    setAssigningMissing(true);
    setActionMessage(null);
    try {
      await assignChargeToMissingMembers(charge.id);
      setActionMessage("Miembros asignados correctamente.");
      await loadAll();
    } catch (error) {
      console.error(error);
      setActionMessage(
        error instanceof Error ? error.message : "No se pudieron asignar los miembros."
      );
    } finally {
      setAssigningMissing(false);
    }
  };

  const assignOne = async (memberId: string) => {
    if (!charge || charge.category === "membership") {
      return;
    }
    setAssigningMemberId(memberId);
    setActionMessage(null);
    try {
      const perMemberAmount =
        charge.type === "total"
          ? rows.length > 0
            ? rows[0].amount
            : charge.amount
          : charge.amount;
      await assignChargeToMember({
        member_id: memberId,
        charge_id: charge.id,
        amount: perMemberAmount,
      });
      setActionMessage("Miembro asignado al cargo.");
      await loadAll();
    } catch (error: unknown) {
      console.error(error);
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code === "23505") {
        setActionMessage("Ese socio ya tenía asignado este cargo.");
        await loadAll();
      } else {
        setActionMessage(
          error instanceof Error ? error.message : "No se pudo asignar el miembro."
        );
      }
    } finally {
      setAssigningMemberId(null);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Cargando cargo...</p>
        </div>
      </section>
    );
  }

  if (errorMessage || !charge) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-slate-700">{errorMessage ?? "No se encontró el cargo."}</p>
          <Link
            href="/admin/charges"
            className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Volver a cargos
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-6">
        <div>
          <Link
            href="/admin/charges"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            Volver a cargos
          </Link>
        </div>

        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl font-bold tracking-tight text-slate-900">
              {charge.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {charge.description?.trim() ? charge.description : "Sin descripción"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Grupo:{" "}
                <span className="text-slate-900">
                  {charge.group?.name ?? "Todo el club (socios activos)"}
                </span>
              </span>
              {charge.category ? (
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-900">
                  Categoría:{" "}
                  <span className="font-mono">
                    {charge.category === "membership"
                      ? "Cuota mensual"
                      : charge.category === "activity"
                        ? "Actividad"
                        : charge.category === "fee"
                          ? "Inscripción / otro"
                          : charge.category}
                  </span>
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Tipo:{" "}
                <span className="text-slate-900">
                  {charge.type === "total" ? "Total a dividir" : "Por persona"}
                </span>
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Monto: <span className="text-slate-900">{formatMoney(charge.amount)}</span>
              </span>
              {charge.category === "membership" ? (
                <>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-900">
                    Mes facturado:{" "}
                    <span className="font-mono capitalize text-indigo-950">
                      {charge.billing_period ? formatBillingPeriod(charge.billing_period) : "—"}
                    </span>
                  </span>
                </>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Vence: <span className="text-slate-900">{formatDueDate(charge.due_date)}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={openCreateExpense}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Registrar egreso
            </button>
            <button
              type="button"
              onClick={openEdit}
              disabled={Boolean(hasPayments)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              title={
                hasPayments
                  ? "Este cargo ya tiene pagos y no puede ser editado"
                  : undefined
              }
            >
              Editar
            </button>
            {hasPayments ? (
              <p className="max-w-xs text-right text-xs font-medium text-warning">
                Este cargo ya tiene pagos y no puede ser editado
              </p>
            ) : null}
          </div>
        </header>

        {actionMessage ? (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {actionMessage}
          </p>
        ) : null}

        <Card className="border border-slate-200/80 p-6">
          {(() => {
            const totalExpected = financials?.total_expected ?? rows.reduce((sum, r) => sum + r.amount, 0);
            const totalCollected = financials?.total_collected ?? rows.reduce((sum, r) => sum + r.paid_amount, 0);
            const totalExpenses = financials?.total_expenses ?? expenses.reduce((sum, e) => sum + e.amount, 0);
            const difference = totalCollected - totalExpenses;
            const pct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

            const status =
              Math.abs(totalExpenses - totalCollected) < 0.01
                ? { label: "Cubierto", variant: "success" as const }
                : totalExpenses > totalCollected
                  ? { label: "Déficit", variant: "danger" as const }
                  : { label: "Sobrante", variant: "slate" as const };

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">Resumen financiero</h2>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total esperado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatMoney(totalExpected)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Recaudado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatMoney(totalCollected)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Egresado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatMoney(totalExpenses)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Diferencia
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{formatMoney(difference)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Progreso de recaudación</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-700">{pct}%</p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatMoney(totalCollected)} / {formatMoney(totalExpected)}
                  </p>
                </div>
              </>
            );
          })()}
        </Card>

        <Card className="border border-slate-200/80 p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Egresos asociados</h2>
              <p className="mt-1 text-sm text-slate-600">
                {expensesLoading ? "Cargando..." : `${expenses.length} egreso(s) asociado(s) a este cargo.`}
              </p>
            </div>
            <Button type="button" size="md" onClick={openCreateExpense}>
              Registrar egreso
            </Button>
          </div>

          {expensesLoading ? (
            <p className="text-sm text-slate-600">Cargando egresos...</p>
          ) : expenses.length === 0 ? (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              No hay egresos asociados a este cargo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700">Descripción</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Monto</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Fecha</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {expenses.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{e.description}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-900">{formatMoney(e.amount)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatExpenseDate(e.date)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditExpense(e)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeExpense(e)}
                            disabled={expenseDeletingId === e.id}
                            className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {expenseDeletingId === e.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="border border-slate-200/80 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Miembros del cargo</h2>
              <p className="mt-1 text-sm text-slate-600">
                {rows.length} miembro(s) · Pendientes {counts.pending} · Parciales {counts.partial} ·
                Pagados {counts.paid}
              </p>
            </div>
            <div
              className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-slate-200/80 p-1"
              role="group"
              aria-label="Filtrar por estado"
            >
              {(
                [
                  ["all", `Todos (${counts.all})`],
                  ["pending", `Pendientes (${counts.pending})`],
                  ["partial", `Parciales (${counts.partial})`],
                  ["paid", `Pagados (${counts.paid})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    filter === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              No hay miembros para el filtro seleccionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700" aria-hidden />
                    <th className="px-3 py-2 font-semibold text-slate-700">Miembro</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Total</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Pagado</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Restante</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Estado</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.map((row) => {
                    const rem = remainingAmount(row);
                    const canPay = rem > 0.001;
                    const expanded = expandedMcId === row.id;
                    const history = historyByMc[row.id];
                    const waUrl =
                      canPay && row.member.phone
                        ? buildChargeDebtWhatsAppLink({
                            fullName: row.member.full_name,
                            phone: row.member.phone,
                            chargeName: charge.name,
                            groupName: charge.group?.name ?? "Sin grupo",
                            remainingFormatted: formatMoney(rem),
                          })
                        : null;

                    return (
                      <Fragment key={row.id}>
                        <tr className={expanded ? "bg-slate-50/60" : undefined}>
                          <td className="px-3 py-2 align-top">
                            <button
                              type="button"
                              onClick={() => toggleExpand(row.id)}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              aria-expanded={expanded}
                            >
                              {expanded ? "Ocultar" : "Ver pagos"}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/admin/socios/${row.member.id}`}
                              className="font-medium text-slate-900 underline-offset-2 hover:underline"
                            >
                              {row.member.full_name}
                            </Link>
                            <p className="text-xs text-slate-500">
                              DNI {row.member.dni} · {row.member.status === "active" ? "Activo" : "Pendiente"}
                            </p>
                          </td>
                          <td className="px-3 py-2 tabular-nums text-slate-900">
                            {formatMoney(row.amount)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-slate-700">
                            {formatMoney(row.paid_amount)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block min-w-[5.5rem] rounded-lg px-2.5 py-1 text-right text-base font-bold tabular-nums ${
                                rem <= 0.001
                                  ? "bg-success/10 text-success"
                                  : "bg-warning/10 text-warning ring-1 ring-warning/20"
                              }`}
                            >
                              {formatMoney(rem)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={memberChargeStatusBadgeVariant(row.status)}>
                              {memberChargeStatusLabel(row.status)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex min-w-[10.5rem] gap-1.5">
                              <button
                                type="button"
                                onClick={() => openPayModal(row)}
                                disabled={!canPay}
                                className="rounded-md bg-success px-2.5 py-1.5 text-center text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Registrar pago
                              </button>
                              {waUrl ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-md border border-success bg-success/10 px-2.5 py-1.5 text-center text-xs font-semibold text-success transition-colors hover:bg-success/15"
                                >
                                  WhatsApp
                                </a>
                              ) : canPay ? (
                                <span
                                  className="text-[11px] leading-tight text-slate-500"
                                  title="El socio no tiene teléfono configurado"
                                >
                                  Sin teléfono para WhatsApp
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>

                        {expanded ? (
                          <tr className="bg-slate-50/90">
                            <td colSpan={7} className="px-3 py-3 text-sm text-slate-700">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Historial de pagos
                              </p>
                              {historyLoadingId === row.id ? (
                                <p className="text-slate-600">Cargando...</p>
                              ) : history && history.length > 0 ? (
                                <ul className="space-y-1.5 border-l-2 border-slate-200 pl-3">
                                  {history.map((p) => (
                                    <li key={p.id} className="flex flex-wrap gap-x-3 gap-y-0.5">
                                      <span className="font-semibold tabular-nums text-slate-900">
                                        {formatMoney(p.amount)}
                                      </span>
                                      <span className="text-slate-600">
                                        {formatPaidAt(p.paid_at)}
                                      </span>
                                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                                        {paymentMethodLabel(p.payment_method)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-slate-600">Todavía no hay pagos registrados para este cargo.</p>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="border border-slate-200/80 p-6">
          {charge.category === "membership" ? (
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Asignación del período</h2>
              <p className="mt-1 text-sm text-slate-600">
                La cuota mensual se genera como una foto del período. Solo incluye a los socios activos al momento de
                la generación automática.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Si un socio se activa después, empieza a deber desde el próximo mes y no se agrega retroactivamente a
                esta cuota.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Miembros sin este cargo</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {missingMembers.length === 0
                      ? "No hay miembros faltantes."
                      : charge.group
                        ? `${missingMembers.length} miembro(s) activos del grupo no tienen este cargo.`
                        : `${missingMembers.length} socio(s) activo(s) aún no tienen este cargo asignado.`}
                  </p>
                </div>
                <Button
                  type="button"
                  size="md"
                  onClick={() => void assignMissing()}
                  disabled={assigningMissing || missingMembers.length === 0}
                  style={{ backgroundColor: "#0f172a" }}
                >
                  {assigningMissing ? "Asignando..." : "Asignar a todos"}
                </Button>
              </div>

              {missingMembers.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {missingMembers.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{m.full_name}</p>
                        <p className="text-xs text-slate-500">
                          DNI {m.dni} · {m.status === "active" ? "Activo" : "Pendiente"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void assignOne(m.id)}
                          disabled={assigningMemberId === m.id || assigningMissing}
                          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {assigningMemberId === m.id ? "Asignando..." : "Asignar"}
                        </button>
                        <Link
                          href={`/admin/socios/${m.id}`}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                        >
                          Ver socio
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </Card>
      </section>

      <ChargePaymentModal
        open={payModalRow !== null}
        onClose={closePayModal}
        title="Registrar pago"
        subtitle={payModalRow?.member.full_name ?? null}
        pendingAmount={payModalRow ? remainingAmount(payModalRow) : 0}
        onConfirm={submitPayment}
      />

      <AdminModal open={editOpen} onClose={() => !editSaving && setEditOpen(false)}>
        <h2 className="text-lg font-semibold text-slate-900">Editar cargo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Solo podés editar si el cargo no tiene pagos registrados.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="edit-charge-name" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre <span className="text-danger">*</span>
            </label>
            <Input
              id="edit-charge-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-charge-desc" className="mb-1 block text-sm font-medium text-slate-700">
              Descripción
            </label>
            <textarea
              id="edit-charge-desc"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500"
            />
          </div>
          <div>
            <label htmlFor="edit-charge-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Monto <span className="text-danger">*</span>
            </label>
            <Input
              id="edit-charge-amount"
              type="text"
              inputMode="decimal"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-charge-due" className="mb-1 block text-sm font-medium text-slate-700">
              Fecha de vencimiento
            </label>
            <Input
              id="edit-charge-due"
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={() => setEditOpen(false)} disabled={editSaving}>
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void saveEdit()} disabled={editSaving}>
            {editSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </AdminModal>

      <AdminModal open={expenseModalOpen} onClose={closeExpenseModal}>
        <h2 className="text-lg font-semibold text-slate-900">
          {editingExpense ? "Editar egreso" : "Registrar egreso"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Este egreso quedará asociado al cargo <span className="font-semibold text-slate-900">{charge.name}</span>.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="charge-exp-desc" className="mb-1 block text-sm font-medium text-slate-700">
              Descripción <span className="text-danger">*</span>
            </label>
            <Input
              id="charge-exp-desc"
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              placeholder="Ej. Pago seguro"
              className="text-sm"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="charge-exp-cat" className="mb-1 block text-sm font-medium text-slate-700">
              Categoría
            </label>
            <Input
              id="charge-exp-cat"
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              placeholder="Opcional"
              className="text-sm"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="charge-exp-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Monto <span className="text-danger">*</span>
            </label>
            <Input
              id="charge-exp-amount"
              type="text"
              inputMode="decimal"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="0"
              className="text-sm"
            />
          </div>

          <div>
            <label htmlFor="charge-exp-date" className="mb-1 block text-sm font-medium text-slate-700">
              Fecha
            </label>
            <Input
              id="charge-exp-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={closeExpenseModal} disabled={expenseSaving}>
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void saveExpense()} disabled={expenseSaving}>
            {expenseSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </AdminModal>
    </>
  );
}
