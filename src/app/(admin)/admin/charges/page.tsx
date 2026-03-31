"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import { Button, Card, Input } from "@/components/ui";
import {
  createCharge,
  deleteCharge,
  listChargesWithGroup,
  type ChargeWithGroup,
} from "@/lib/charges";
import { formatMoney } from "@/lib/formatters";
import { listAllGroupsForSelect } from "@/lib/groups";

function formatDueDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR");
  } catch {
    return iso;
  }
}

export default function AdminChargesPage() {
  const [charges, setCharges] = useState<ChargeWithGroup[]>([]);
  const [groupOptions, setGroupOptions] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState<"per_member" | "total">("per_member");
  const [formGroupId, setFormGroupId] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setActionMessage(null);
    setIsLoading(true);
    try {
      const [chargeList, groups] = await Promise.all([
        listChargesWithGroup(),
        listAllGroupsForSelect(),
      ]);
      setCharges(chargeList);
      setGroupOptions(groups);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron cargar los cargos."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const name = formName.trim();
    if (!name) {
      setActionMessage("El nombre es obligatorio.");
      return;
    }
    if (!formGroupId) {
      setActionMessage("Elegí un grupo.");
      return;
    }
    const raw = formAmount.replace(",", ".").trim();
    const amount = Number(raw);
    if (raw === "" || Number.isNaN(amount)) {
      setActionMessage("Indicá un monto válido.");
      return;
    }

    setIsCreating(true);
    try {
      await createCharge({
        name,
        description: formDescription.trim() || null,
        amount,
        type: formType,
        group_id: formGroupId,
        due_date: formDueDate.trim() || null,
      });
      setCreateOpen(false);
      setActionMessage("Cargo creado correctamente.");
      await load();
    } catch (error: unknown) {
      console.error(error);
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code === "23505") {
        setActionMessage(
          "No se pudo generar las deudas: hay un duplicado (socio y cargo). El cargo no se guardó."
        );
      } else {
        setActionMessage(
          error instanceof Error ? error.message : "No se pudo crear el cargo."
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (charge: ChargeWithGroup) => {
    const ok = window.confirm(`¿Eliminar el cargo "${charge.name}"?`);
    if (!ok) {
      return;
    }
    setDeletingId(charge.id);
    try {
      await deleteCharge(charge.id);
      setActionMessage("Cargo eliminado.");
      await load();
    } catch (error) {
      console.error(error);
      setActionMessage(
        error instanceof Error ? error.message : "No se pudo eliminar el cargo."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cargos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Gastos o cuotas extraordinarias asociados a un grupo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateOpen(true);
            setFormName("");
            setFormDescription("");
            setFormAmount("");
            setFormType("per_member");
            setFormGroupId(groupOptions[0]?.id ?? "");
            setFormDueDate("");
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Crear cargo
        </button>
      </header>

      <Card className="w-full border border-slate-200/80 p-6">
        {isLoading ? <p className="text-slate-600">Cargando cargos...</p> : null}

        {!isLoading && errorMessage ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}

        {!isLoading && actionMessage ? (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {actionMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage && charges.length === 0 ? (
          <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Todavía no hay cargos registrados.
          </p>
        ) : null}

        {!isLoading && !errorMessage && charges.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Nombre</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Grupo</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Tipo</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Monto</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Vencimiento</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {charges.map((charge) => (
                  <tr key={charge.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-900">{charge.name}</td>
                    <td className="px-3 py-2 text-slate-700">
                      <Link
                        href={`/admin/groups/${charge.group.id}`}
                        className="text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline"
                      >
                        {charge.group.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {charge.type === "total" ? "Total a dividir" : "Por persona"}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-900">
                      {formatMoney(charge.amount)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{formatDueDate(charge.due_date)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/charges/${charge.id}`}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          Ver detalle
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(charge)}
                          disabled={deletingId === charge.id}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {deletingId === charge.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <AdminModal open={createOpen} onClose={() => !isCreating && setCreateOpen(false)}>
        <h2 className="text-lg font-semibold text-slate-900">Nuevo cargo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Asociá un gasto o cobro al grupo correspondiente.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="charge-name" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre <span className="text-red-600">*</span>
            </label>
            <Input
              id="charge-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej. Viaje regional"
              className="text-sm"
            />
          </div>
          <div>
            <label htmlFor="charge-desc" className="mb-1 block text-sm font-medium text-slate-700">
              Descripción
            </label>
            <textarea
              id="charge-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              placeholder="Opcional"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500"
            />
          </div>
          <div>
            <label htmlFor="charge-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Monto <span className="text-red-600">*</span>
            </label>
            <Input
              id="charge-amount"
              type="text"
              inputMode="decimal"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0"
              className="text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              {formType === "total"
                ? "Monto total del cargo (se divide entre los miembros del grupo al crear)."
                : "Monto por persona (se asigna igual a cada miembro)."}
            </p>
          </div>
          <div>
            <label htmlFor="charge-type" className="mb-1 block text-sm font-medium text-slate-700">
              Tipo de cargo <span className="text-red-600">*</span>
            </label>
            <select
              id="charge-type"
              value={formType}
              onChange={(e) => setFormType(e.target.value as "per_member" | "total")}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="per_member">Por persona</option>
              <option value="total">Total a dividir</option>
            </select>
          </div>
          <div>
            <label htmlFor="charge-group" className="mb-1 block text-sm font-medium text-slate-700">
              Grupo <span className="text-red-600">*</span>
            </label>
            <select
              id="charge-group"
              value={formGroupId}
              onChange={(e) => setFormGroupId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="">Seleccionar...</option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {groupOptions.length === 0 ? (
              <p className="mt-1 text-xs text-amber-800">
                No hay grupos. Creá uno antes desde Grupos.
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="charge-due" className="mb-1 block text-sm font-medium text-slate-700">
              Fecha de vencimiento
            </label>
            <Input
              id="charge-due"
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="neutral"
            size="md"
            onClick={() => setCreateOpen(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="md"
            onClick={() => void handleCreate()}
            disabled={isCreating || groupOptions.length === 0}
          >
            {isCreating ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </AdminModal>
    </section>
  );
}
