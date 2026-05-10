"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Td,
  Th,
  buttonClassNames,
} from "@/components/ui";
import { paymentMethodLabel } from "@/config/payment-method";
import {
  formatBillingPeriod,
  listChargePaymentsWithContext,
  listChargesForSelect,
  type ChargeOption,
  type ChargePaymentWithContext,
} from "@/lib/charges";
import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
  type ExpenseWithCharge,
} from "@/lib/expenses";
import { formatMoney } from "@/lib/formatters";

const todayISODate = () => new Date().toISOString().slice(0, 10);
const currentMonthKey = () => new Date().toISOString().slice(0, 7);

type MovementFilter = "all" | "income" | "expense";

type MovementRow = {
  id: string;
  type: MovementFilter;
  amount: number;
  happened_at: string;
  created_at: string;
  concept: string;
  detail: string;
  charge: { id: string; name: string } | null;
  sourceExpense: ExpenseWithCharge | null;
};

function formatExpenseDate(value: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es-AR");
}

function formatMovementDateTime(value: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentConcept(payment: ChargePaymentWithContext): string {
  const charge = payment.member_charge?.charge;
  if (!charge) {
    return "Pago registrado";
  }
  if (charge.category === "membership" && charge.billing_period) {
    return `Cuota mensual · ${formatBillingPeriod(charge.billing_period)}`;
  }
  return charge.name?.trim() || "Pago registrado";
}

function paymentDetail(payment: ChargePaymentWithContext): string {
  const memberName = payment.member_charge?.member?.full_name?.trim() || "Socio";
  const chargeName = payment.member_charge?.charge?.name?.trim();
  if (chargeName) {
    return `${memberName} · ${paymentMethodLabel(payment.payment_method)}`;
  }
  return `${memberName} · ${paymentMethodLabel(payment.payment_method)}`;
}

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithCharge[]>([]);
  const [payments, setPayments] = useState<ChargePaymentWithContext[]>([]);
  const [chargeOptions, setChargeOptions] = useState<ChargeOption[]>([]);
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [typeFilter, setTypeFilter] = useState<MovementFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseWithCharge | null>(null);
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(todayISODate());
  const [formChargeId, setFormChargeId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setActionMessage(null);
    setIsLoading(true);
    try {
      const [expenseRows, paymentRows, charges] = await Promise.all([
        listExpenses(),
        listChargePaymentsWithContext(),
        listChargesForSelect(),
      ]);
      setExpenses(expenseRows);
      setPayments(paymentRows);
      setChargeOptions(charges);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los movimientos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const movements = useMemo<MovementRow[]>(() => {
    const incomeRows: MovementRow[] = payments.map((payment) => ({
      id: `income-${payment.id}`,
      type: "income",
      amount: payment.amount,
      happened_at: payment.paid_at,
      created_at: payment.created_at,
      concept: paymentConcept(payment),
      detail: paymentDetail(payment),
      charge: payment.member_charge?.charge
        ? {
            id: payment.member_charge.charge.id,
            name: payment.member_charge.charge.name,
          }
        : null,
      sourceExpense: null,
    }));

    const expenseRows: MovementRow[] = expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      type: "expense",
      amount: expense.amount,
      happened_at: `${expense.date}T12:00:00`,
      created_at: expense.created_at,
      concept: expense.description,
      detail: expense.category?.trim() || "Egreso manual",
      charge: expense.charge,
      sourceExpense: expense,
    }));

    return [...incomeRows, ...expenseRows].sort((a, b) => {
      const dateDiff = new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [expenses, payments]);

  const filteredMovements = useMemo(() => {
    const monthKey = monthFilter.trim();
    return movements.filter((movement) => {
      if (typeFilter !== "all" && movement.type !== typeFilter) {
        return false;
      }
      if (!monthKey) {
        return true;
      }
      return movement.happened_at.slice(0, 7) === monthKey;
    });
  }, [monthFilter, movements, typeFilter]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const movement of filteredMovements) {
      if (movement.type === "income") {
        income += movement.amount;
      } else {
        expense += movement.amount;
      }
    }
    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [filteredMovements]);

  const openCreate = () => {
    setEditing(null);
    setFormDescription("");
    setFormCategory("");
    setFormAmount("");
    setFormDate(todayISODate());
    setFormChargeId("");
    setActionMessage(null);
    setModalOpen(true);
  };

  const openEdit = (expense: ExpenseWithCharge) => {
    setEditing(expense);
    setFormDescription(expense.description ?? "");
    setFormCategory(expense.category ?? "");
    setFormAmount(String(expense.amount ?? ""));
    setFormDate(expense.date ?? todayISODate());
    setFormChargeId(expense.charge_id ?? "");
    setActionMessage(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!isSaving) {
      setModalOpen(false);
    }
  };

  const handleSave = async () => {
    const description = formDescription.trim();
    if (!description) {
      setActionMessage("La descripción es obligatoria.");
      return;
    }

    const raw = formAmount.replace(",", ".").trim();
    const amount = Number(raw);
    if (raw === "" || Number.isNaN(amount)) {
      setActionMessage("Indicá un monto válido.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionMessage("El monto debe ser mayor a cero.");
      return;
    }

    const date = formDate.trim() || todayISODate();
    const charge_id = formChargeId.trim() ? formChargeId.trim() : null;

    setIsSaving(true);
    try {
      if (editing) {
        await updateExpense(editing.id, {
          description,
          amount,
          category: formCategory.trim() || null,
          date,
          charge_id,
        });
        setActionMessage("Egreso actualizado.");
      } else {
        await createExpense({
          description,
          amount,
          category: formCategory.trim() || null,
          date,
          charge_id,
        });
        setActionMessage("Egreso creado.");
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? error.message : "No se pudo guardar el egreso.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (expense: ExpenseWithCharge) => {
    const ok = window.confirm(`¿Eliminar el egreso "${expense.description}"?`);
    if (!ok) {
      return;
    }

    setDeletingId(expense.id);
    try {
      await deleteExpense(expense.id);
      setActionMessage("Egreso eliminado.");
      await load();
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? error.message : "No se pudo eliminar el egreso.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Caja"
        description="Ingresos y egresos reales del club. Los ingresos salen de pagos registrados; los egresos son gastos manuales."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className={buttonClassNames({ variant: "primary", size: "lg" })}
          >
            Registrar egreso
          </button>
        }
      />

      <Card className="w-full border-white/10 !bg-slate-950/58 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Lectura de caja</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <label htmlFor="movements-month" className="text-sm font-medium text-slate-300">
                  Mes
                </label>
                <Input
                  id="movements-month"
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="border-white/10 bg-white/[0.05] text-sm text-white focus:border-white/20 focus:bg-white/[0.08] sm:w-48"
                />
                <div className="flex flex-wrap gap-2">
                  {([
                    ["all", "Todos"],
                    ["income", "Ingresos"],
                    ["expense", "Egresos"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTypeFilter(value)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        typeFilter === value
                          ? "bg-white text-slate-950"
                          : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Ingresos</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-success">{formatMoney(summary.income)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Egresos</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-warning">{formatMoney(summary.expense)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Balance</p>
                <p
                  className={`mt-1 text-2xl font-bold tabular-nums ${
                    summary.balance >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {formatMoney(summary.balance)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? <p className="mt-4 text-slate-300">Cargando movimientos...</p> : null}

        {!isLoading && errorMessage ? <Alert className="mt-4" variant="danger">{errorMessage}</Alert> : null}
        {!isLoading && actionMessage ? <Alert className="mt-4">{actionMessage}</Alert> : null}

        {!isLoading && !errorMessage && filteredMovements.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No hay movimientos para este filtro"
            description="Los ingresos aparecen cuando registrás pagos en Cobros. Los egresos se cargan acá como gastos reales."
            actions={
              <Button type="button" size="md" onClick={openCreate}>
                Registrar egreso
              </Button>
            }
          />
        ) : null}

        {!isLoading && !errorMessage && filteredMovements.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Tipo</Th>
                  <Th>Concepto</Th>
                  <Th>Detalle</Th>
                  <Th>Cargo</Th>
                  <Th>Monto</Th>
                  <Th>Fecha</Th>
                  <Th>Acciones</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMovements.map((movement) => {
                  const expense = movement.sourceExpense;
                  const canEditExpense = movement.type === "expense" && expense;
                  return (
                    <TableRow key={movement.id} className="transition-colors hover:bg-white/[0.04]">
                      <Td>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            movement.type === "income"
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {movement.type === "income" ? "Ingreso" : "Egreso"}
                        </span>
                      </Td>
                      <Td className="font-medium text-white">{movement.concept}</Td>
                      <Td className="text-slate-300">{movement.detail}</Td>
                      <Td className="text-slate-300">
                        {movement.charge ? (
                          <Link
                            href={`/admin/charges/${movement.charge.id}`}
                            className="underline-offset-2 hover:text-white hover:underline"
                          >
                            {movement.charge.name}
                          </Link>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </Td>
                      <Td
                        className={`tabular-nums font-semibold ${
                          movement.type === "income" ? "text-success" : "text-warning"
                        }`}
                      >
                        {movement.type === "income" ? "+" : "-"}
                        {formatMoney(movement.amount)}
                      </Td>
                      <Td className="text-slate-300">
                        {movement.type === "income"
                          ? formatMovementDateTime(movement.happened_at)
                          : formatExpenseDate(movement.happened_at.slice(0, 10))}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          {movement.charge ? (
                            <Link
                              href={`/admin/charges/${movement.charge.id}`}
                              className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
                            >
                              Ver cargo
                            </Link>
                          ) : null}
                          {canEditExpense ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(expense)}
                                className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(expense)}
                                disabled={deletingId === expense.id}
                                className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {deletingId === expense.id ? "Eliminando..." : "Eliminar"}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </Td>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </Card>

      <AdminModal open={modalOpen} onClose={closeModal}>
        <h2 className="text-lg font-semibold text-white">{editing ? "Editar egreso" : "Registrar egreso"}</h2>
        <p className="mt-1 text-sm text-slate-300">
          Un egreso es plata que salió del club. Si está relacionado con un cobro o pedido, podés vincularlo sin crear deuda nueva.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="expense-charge" className="mb-1 block text-sm font-medium text-slate-300">
              Cargo vinculado (opcional)
            </label>
            <Select
              id="expense-charge"
              value={formChargeId}
              onChange={(e) => setFormChargeId(e.target.value)}
              className="rounded-lg border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white shadow-none focus:border-white/20 focus:shadow-none"
            >
              <option value="">Sin relación</option>
              {chargeOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="expense-desc" className="mb-1 block text-sm font-medium text-slate-300">
              Descripción <span className="text-danger">*</span>
            </label>
            <Input
              id="expense-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Ej. Pago árbitros"
              className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="expense-category" className="mb-1 block text-sm font-medium text-slate-300">
              Categoría
            </label>
            <Input
              id="expense-category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="Ej. Torneo / Indumentaria"
              className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="expense-amount" className="mb-1 block text-sm font-medium text-slate-300">
              Monto <span className="text-danger">*</span>
            </label>
            <Input
              id="expense-amount"
              type="text"
              inputMode="decimal"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0"
              className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
            />
          </div>

          <div>
            <label htmlFor="expense-date" className="mb-1 block text-sm font-medium text-slate-300">
              Fecha
            </label>
            <Input
              id="expense-date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="border-white/10 bg-white/[0.05] text-sm text-white focus:border-white/20 focus:bg-white/[0.08]"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={closeModal} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </AdminModal>
    </section>
  );
}
