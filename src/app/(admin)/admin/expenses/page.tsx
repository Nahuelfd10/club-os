"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Td,
  Th,
} from "@/components/ui";
import { listChargesForSelect, type ChargeOption } from "@/lib/charges";
import { createExpense, deleteExpense, listExpenses, updateExpense, type ExpenseWithCharge } from "@/lib/expenses";
import { formatMoney } from "@/lib/formatters";

const todayISODate = () => new Date().toISOString().slice(0, 10);
const currentMonthKey = () => new Date().toISOString().slice(0, 7);

function formatExpenseDate(value: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es-AR");
}

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithCharge[]>([]);
  const [chargeOptions, setChargeOptions] = useState<ChargeOption[]>([]);
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
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
      const [rows, charges] = await Promise.all([listExpenses(), listChargesForSelect()]);
      setExpenses(rows);
      setChargeOptions(charges);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los egresos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredExpenses = useMemo(() => {
    const key = monthFilter.trim();
    const list = key ? expenses.filter((e) => e.date?.startsWith(key)) : expenses;
    return [...list].sort((a, b) => {
      const dateDiff = new Date(`${b.date}T12:00:00`).getTime() - new Date(`${a.date}T12:00:00`).getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [expenses, monthFilter]);

  const totalFiltered = useMemo(
    () => filteredExpenses.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0),
    [filteredExpenses]
  );

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
    if (isSaving) {
      return;
    }
    setModalOpen(false);
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
        title="Egresos"
        description="Gastos reales del club."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Nuevo egreso
          </button>
        }
      />

      <Card className="w-full border border-slate-200/80 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filtro</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="expenses-month" className="text-sm font-medium text-slate-700">
                Mes
              </label>
              <Input
                id="expenses-month"
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="text-sm sm:w-48"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total del mes</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatMoney(totalFiltered)}</p>
          </div>
        </div>

        {isLoading ? <p className="mt-4 text-slate-600">Cargando egresos...</p> : null}

        {!isLoading && errorMessage ? <Alert className="mt-4" variant="danger">{errorMessage}</Alert> : null}
        {!isLoading && actionMessage ? <Alert className="mt-4">{actionMessage}</Alert> : null}

        {!isLoading && !errorMessage && filteredExpenses.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No hay egresos registrados"
            description="Registrá el primero para empezar a ver los gastos reales del club."
            actions={
              <Button type="button" size="md" onClick={openCreate}>
                Nuevo egreso
              </Button>
            }
          />
        ) : null}

        {!isLoading && !errorMessage && filteredExpenses.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Descripción</Th>
                  <Th>Charge</Th>
                  <Th>Categoría</Th>
                  <Th>Monto</Th>
                  <Th>Fecha</Th>
                  <Th>Acciones</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="transition-colors hover:bg-slate-50">
                    <Td className="font-medium text-slate-900">{expense.description}</Td>
                    <Td className="text-slate-700">
                      {expense.charge?.name?.trim() ? (
                        expense.charge.name
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="text-slate-700">{expense.category?.trim() ? expense.category : <span className="text-slate-400">—</span>}</Td>
                    <Td className="tabular-nums text-slate-900">{formatMoney(expense.amount)}</Td>
                    <Td className="text-slate-700">{formatExpenseDate(expense.date)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(expense)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
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
                      </div>
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </Card>

      <AdminModal open={modalOpen} onClose={closeModal}>
        <h2 className="text-lg font-semibold text-slate-900">
          {editing ? "Editar egreso" : "Nuevo egreso"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">Completá los datos del gasto.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="expense-charge" className="mb-1 block text-sm font-medium text-slate-700">
              Charge (opcional)
            </label>
            <select
              id="expense-charge"
              value={formChargeId}
              onChange={(e) => setFormChargeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="">Sin relación</option>
              {chargeOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="expense-desc" className="mb-1 block text-sm font-medium text-slate-700">
              Descripción <span className="text-danger">*</span>
            </label>
            <Input
              id="expense-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Ej. Pago árbitros"
              className="text-sm"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="expense-category" className="mb-1 block text-sm font-medium text-slate-700">
              Categoría
            </label>
            <Input
              id="expense-category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="Ej. Torneo / Indumentaria"
              className="text-sm"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="expense-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Monto <span className="text-danger">*</span>
            </label>
            <Input
              id="expense-amount"
              type="text"
              inputMode="decimal"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0"
              className="text-sm"
            />
          </div>

          <div>
            <label htmlFor="expense-date" className="mb-1 block text-sm font-medium text-slate-700">
              Fecha
            </label>
            <Input
              id="expense-date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="text-sm"
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

