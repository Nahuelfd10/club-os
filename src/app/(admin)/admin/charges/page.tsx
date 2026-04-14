"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useActiveClubConfig } from "@/config/use-active-club-config";
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
  buttonClassNames,
} from "@/components/ui";
import {
  createCharge,
  deleteCharge,
  formatBillingPeriod,
  generateMonthlyCharges,
  listChargesWithGroup,
  type ChargeWithGroup,
  type CreateChargeDefinitionCategory,
} from "@/lib/charges";
import { formatDueDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/formatters";
import { listAllGroupsForSelect } from "@/lib/groups";

function categoryTableLabel(category: string | null): string {
  if (!category) {
    return "—";
  }
  if (category === "membership") {
    return "Cuota mensual";
  }
  if (category === "activity") {
    return "Actividad";
  }
  if (category === "fee") {
    return "Inscripción / otro";
  }
  return category;
}

function categoryHelpText(
  category: Exclude<CreateChargeDefinitionCategory, "membership">,
  groupId: string
): string {
  const scope = groupId.trim() ? "el grupo elegido" : "todos los socios activos";
  if (category === "activity") {
    return `Cargo de actividad (entrenamiento, viaje, torneo, etc.). Se asigna a ${scope}.`;
  }
  return `Inscripción u otros cargos no mensuales. Se asigna a ${scope}.`;
}

function categoryCardCopy(category: Exclude<CreateChargeDefinitionCategory, "membership">): {
  title: string;
  description: string;
} {
  if (category === "activity") {
    return {
      title: "Actividad",
      description: "Cobros por entrenamientos, viajes, torneos u otros conceptos del club o de un grupo.",
    };
  }
  return {
    title: "Inscripción / otro",
    description: "Matrículas, gastos administrativos o cualquier cobro no mensual.",
  };
}

type ManualChargeCategory = Exclude<CreateChargeDefinitionCategory, "membership">;

type ChargeCounts = {
  total: number;
  membership: number;
  activity: number;
  fee: number;
};

const initialChargeCounts: ChargeCounts = {
  total: 0,
  membership: 0,
  activity: 0,
  fee: 0,
};

export default function AdminChargesPage() {
  const { config, isConfigLoading } = useActiveClubConfig();
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
  const [formDefinitionCategory, setFormDefinitionCategory] =
    useState<ManualChargeCategory>("activity");
  const [formDueDate, setFormDueDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingMembership, setIsGeneratingMembership] = useState(false);
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
        error instanceof Error ? error.message : "No se pudieron cargar los cobros."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openCreateModal = (category: ManualChargeCategory = "activity") => {
    setCreateOpen(true);
    setFormName("");
    setFormDescription("");
    setFormAmount("");
    setFormType("per_member");
    setFormDefinitionCategory(category);
    setFormGroupId("");
    setFormDueDate("");
  };

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const name = formName.trim();
    if (!name) {
      setActionMessage("El nombre es obligatorio.");
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
        group_id: formGroupId.trim() || null,
        due_date: formDueDate.trim() || null,
        definition_category: formDefinitionCategory,
      });
      setCreateOpen(false);
      setActionMessage("Cobro creado correctamente.");
      await load();
    } catch (error: unknown) {
      console.error(error);
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code === "23505") {
        setActionMessage(
          "No se pudo generar las deudas: hay un duplicado entre socio y cargo. El cobro no se guardó."
        );
      } else {
        setActionMessage(
          error instanceof Error ? error.message : "No se pudo crear el cobro."
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (charge: ChargeWithGroup) => {
    const ok = window.confirm(`¿Eliminar el cobro "${charge.name}"?`);
    if (!ok) {
      return;
    }
    setDeletingId(charge.id);
    try {
      await deleteCharge(charge.id);
      setActionMessage("Cobro eliminado.");
      await load();
    } catch (error) {
      console.error(error);
      setActionMessage(
        error instanceof Error ? error.message : "No se pudo eliminar el cobro."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateMembershipCharges = async () => {
    setIsGeneratingMembership(true);
    setActionMessage(null);
    try {
      await generateMonthlyCharges();
      setActionMessage("Cuotas del club generadas y asignadas correctamente.");
      await load();
    } catch (error) {
      console.error(error);
      setActionMessage(
        error instanceof Error ? error.message : "No se pudieron generar las cuotas del club."
      );
    } finally {
      setIsGeneratingMembership(false);
    }
  };

  const chargeCounts = useMemo(
    () =>
      charges.reduce<ChargeCounts>((acc, charge) => {
        acc.total += 1;
        if (charge.category === "membership") {
          acc.membership += 1;
        } else if (charge.category === "activity") {
          acc.activity += 1;
        } else {
          acc.fee += 1;
        }
        return acc;
      }, { ...initialChargeCounts }),
    [charges]
  );

  const membershipCharges = useMemo(
    () => charges.filter((charge) => charge.category === "membership"),
    [charges]
  );

  const manualCharges = useMemo(
    () => charges.filter((charge) => charge.category !== "membership"),
    [charges]
  );

  const lastPeriod = useMemo(() => {
    return membershipCharges
      .map((c) => c.billing_period)
      .filter((p): p is string => Boolean(p && String(p).trim()))
      .sort()
      .at(-1);
  }, [membershipCharges]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Cobros"
        description="La cuota del club y los cobros manuales usan el mismo motor, pero no necesitan el mismo flujo."
        actions={
          <button
            type="button"
            onClick={() => openCreateModal("activity")}
            className={buttonClassNames({ variant: "primary", size: "lg" })}
          >
            Nuevo cobro manual
          </button>
        }
      />

      <Card className="w-full border-white/10 !bg-slate-950/58 p-6">
        {!isLoading && !errorMessage ? (
          <div className="mb-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <section className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Cuota del club</p>
              <h2 className="mt-1 text-xl font-bold text-white">
                {isConfigLoading ? "Cargando..." : formatMoney(config.monthly_fee)}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Se configura desde el club y se genera por mes. No debería cargarse manualmente como un cobro común.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Cuotas generadas</p>
                  <p className="mt-1 text-2xl font-bold text-white">{membershipCharges.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Último período generado</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-white">
                    {lastPeriod ? formatBillingPeriod(lastPeriod) : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Día configurado</p>
                  <p className="mt-1 text-2xl font-bold text-white">{config.monthly_due_day ?? "—"}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleGenerateMembershipCharges()}
                    disabled={isGeneratingMembership}
                    className="inline-flex rounded-lg bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isGeneratingMembership ? "Generando..." : "Generar cuotas pendientes"}
                  </button>
                  <Link
                    href="/admin/settings"
                    className="inline-flex rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"
                  >
                    Configurar cuota del club
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Cobros manuales</p>
              <h2 className="mt-1 text-xl font-bold text-white">{manualCharges.length}</h2>
              <p className="mt-2 text-sm text-slate-300">
                Usa <span className="font-semibold text-white">Nuevo cobro manual</span> para actividades, inscripciones y otros cargos extraordinarios.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Actividades por grupo o para todo el club.</li>
                <li>Inscripciones, viajes, torneos y cobros puntuales.</li>
                <li>Montos por persona o totales a dividir.</li>
              </ul>
            </section>
          </div>
        ) : null}

        {!isLoading ? (
          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Total</p>
              <p className="mt-1 text-2xl font-bold text-white">{chargeCounts.total}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Cuota mensual</p>
              <p className="mt-1 text-2xl font-bold text-white">{chargeCounts.membership}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Actividad</p>
              <p className="mt-1 text-2xl font-bold text-white">{chargeCounts.activity}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Inscripción / otro</p>
              <p className="mt-1 text-2xl font-bold text-white">{chargeCounts.fee}</p>
            </div>
          </div>
        ) : null}

        {!isLoading && !errorMessage ? (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-white">Criterio de uso</p>
            <p className="mt-1 text-sm text-slate-300">
              La cuota del club queda separada a nivel operativo. En esta pantalla, el flujo manual queda reservado para actividades, inscripciones y otros cargos extraordinarios.
            </p>
          </div>
        ) : null}

        {isLoading ? <p className="text-slate-300">Cargando cobros...</p> : null}

        {!isLoading && errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

        {!isLoading && actionMessage ? <Alert>{actionMessage}</Alert> : null}

        {!isLoading && !errorMessage ? (
          <div className="mt-8 space-y-10">
            <section>
              <h3 className="text-base font-semibold text-white">Cuota del club</h3>
              <p className="mt-1 text-sm text-slate-300">
                Cargos de categoría cuota mensual, generados por período facturado.
              </p>
              {membershipCharges.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300">No hay cuotas del club generadas todavía.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <Th>Nombre</Th>
                        <Th>Período</Th>
                        <Th>Monto</Th>
                        <Th>Vencimiento</Th>
                        <Th>Acciones</Th>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {membershipCharges.map((charge) => (
                        <TableRow key={charge.id} className="transition-colors hover:bg-white/[0.04]">
                          <Td className="font-medium">
                            <Link
                              href={`/admin/charges/${charge.id}`}
                              className="text-white underline-offset-2 hover:underline"
                            >
                              {charge.name}
                            </Link>
                          </Td>
                          <Td className="capitalize text-slate-300">
                            {charge.billing_period ? formatBillingPeriod(charge.billing_period) : "—"}
                          </Td>
                          <Td className="tabular-nums text-white">{formatMoney(charge.amount)}</Td>
                          <Td className="text-slate-300">{formatDueDate(charge.due_date)}</Td>
                          <Td>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/admin/charges/${charge.id}`}
                                className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
                              >
                                Ver detalle
                              </Link>
                              <button
                                type="button"
                                onClick={() => void handleDelete(charge)}
                                disabled={deletingId === charge.id}
                                className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {deletingId === charge.id ? "Eliminando..." : "Eliminar"}
                              </button>
                            </div>
                          </Td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-base font-semibold text-white">Cobros manuales</h3>
              <p className="mt-1 text-sm text-slate-300">
                Actividades, inscripciones y otros cargos (no cuota del club).
              </p>
              {manualCharges.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  title="Todavía no hay cobros manuales registrados."
                  description="La cuota del club se gestiona arriba. Aquí solo aparecerán actividades, inscripciones y otros cobros manuales."
                  actions={
                    <Button type="button" size="md" onClick={() => openCreateModal("activity")}>
                      Nuevo cobro manual
                    </Button>
                  }
                />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <Th>Nombre</Th>
                        <Th>Categoría</Th>
                        <Th>Grupo</Th>
                        <Th>Tipo</Th>
                        <Th>Monto</Th>
                        <Th>Vencimiento</Th>
                        <Th>Acciones</Th>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {manualCharges.map((charge) => (
                        <TableRow key={charge.id} className="transition-colors hover:bg-white/[0.04]">
                          <Td className="font-medium">
                            <Link
                              href={`/admin/charges/${charge.id}`}
                              className="text-white underline-offset-2 hover:underline"
                            >
                              {charge.name}
                            </Link>
                          </Td>
                          <Td className="text-slate-300">{categoryTableLabel(charge.category)}</Td>
                          <Td className="text-slate-300">
                            {charge.group ? (
                              <Link
                                href={`/admin/groups/${charge.group.id}`}
                                className="text-slate-300 underline-offset-2 hover:text-white hover:underline"
                              >
                                {charge.group.name}
                              </Link>
                            ) : (
                              <span className="text-slate-400">Todo el club</span>
                            )}
                          </Td>
                          <Td className="text-slate-300">
                            {charge.type === "total" ? "Total a dividir" : "Por persona"}
                          </Td>
                          <Td className="tabular-nums text-white">
                            {formatMoney(charge.amount)}
                          </Td>
                          <Td className="text-slate-300">{formatDueDate(charge.due_date)}</Td>
                          <Td>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/admin/charges/${charge.id}`}
                                className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
                              >
                                Ver detalle
                              </Link>
                              <button
                                type="button"
                                onClick={() => void handleDelete(charge)}
                                disabled={deletingId === charge.id}
                                className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {deletingId === charge.id ? "Eliminando..." : "Eliminar"}
                              </button>
                            </div>
                          </Td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </Card>

      <AdminModal open={createOpen} onClose={() => !isCreating && setCreateOpen(false)}>
        <h2 className="text-lg font-semibold text-white">Nuevo cobro manual</h2>
        <p className="mt-1 text-sm text-slate-300">
          Este flujo queda para cobros manuales: actividades, inscripciones y otros conceptos extraordinarios.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Categoría <span className="text-danger">*</span>
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              {(["activity", "fee"] as const satisfies ManualChargeCategory[]).map((category) => {
                const selected = formDefinitionCategory === category;
                const copy = categoryCardCopy(category);

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFormDefinitionCategory(category)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? "border-white/20 bg-white/10 text-white"
                        : "border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.08]"
                    }`}
                  >
                    <p className="text-sm font-semibold">{copy.title}</p>
                    <p
                      className={`mt-1 text-xs leading-5 ${
                        selected ? "text-slate-200" : "text-slate-300"
                      }`}
                    >
                      {copy.description}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {categoryHelpText(formDefinitionCategory, formGroupId)}
            </p>
          </div>

          <div>
            <label htmlFor="charge-name" className="mb-1 block text-sm font-medium text-slate-300">
              Nombre <span className="text-danger">*</span>
            </label>
            <Input
              id="charge-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej. Viaje regional"
              className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
            />
          </div>

          <div>
            <label htmlFor="charge-desc" className="mb-1 block text-sm font-medium text-slate-300">
              Descripción
            </label>
            <textarea
              id="charge-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              placeholder="Opcional"
              className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-white/20"
            />
          </div>

          <div>
            <label htmlFor="charge-amount" className="mb-1 block text-sm font-medium text-slate-300">
              Monto <span className="text-danger">*</span>
            </label>
            <Input
              id="charge-amount"
              type="text"
              inputMode="decimal"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0"
              className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
            />
            <p className="mt-1 text-xs text-slate-400">
              {formType === "total"
                ? formGroupId.trim()
                  ? "Monto total del cobro. Se divide entre los miembros del grupo al crear."
                  : "Monto total del cobro. Se divide entre todos los socios activos al crear."
                : formGroupId.trim()
                  ? "Monto por persona. Se asigna igual a cada miembro del grupo."
                  : "Monto por persona. Se asigna a cada socio activo."}
            </p>
          </div>

          <div>
            <label htmlFor="charge-type" className="mb-1 block text-sm font-medium text-slate-300">
              Tipo de cargo <span className="text-danger">*</span>
            </label>
            <select
              id="charge-type"
              value={formType}
              onChange={(e) => setFormType(e.target.value as "per_member" | "total")}
              className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            >
              <option value="per_member">Por persona</option>
              <option value="total">Total a dividir</option>
            </select>
          </div>

          <div>
            <label htmlFor="charge-group" className="mb-1 block text-sm font-medium text-slate-300">
              Grupo deportivo
            </label>
            <select
              id="charge-group"
              value={formGroupId}
              onChange={(e) => setFormGroupId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            >
              <option value="">Todo el club (socios activos)</option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Deja “Todo el club” para cobros que aplican a todos los socios activos, sin filtrar por equipo.
            </p>
            {groupOptions.length === 0 ? (
              <p className="mt-1 text-xs text-warning">
                No hay grupos creados; igual puedes usar “Todo el club”.
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="charge-due" className="mb-1 block text-sm font-medium text-slate-300">
              Fecha de vencimiento
            </label>
            <Input
              id="charge-due"
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className="border-white/10 bg-white/[0.05] text-sm text-white focus:border-white/20 focus:bg-white/[0.08]"
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
            disabled={isCreating}
          >
            {isCreating ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </AdminModal>
    </section>
  );
}
