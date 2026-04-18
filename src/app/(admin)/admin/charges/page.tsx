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
  getChargeProgressByIds,
  listChargesWithGroup,
  type ChargeProgressSummary,
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
type ChargesTab = "membership" | "manual";

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
  const [formDefinitionCategory, setFormDefinitionCategory] =
    useState<ManualChargeCategory>("activity");
  const [formDueDate, setFormDueDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [chargeProgressById, setChargeProgressById] = useState<Record<string, ChargeProgressSummary>>({});
  const [activeTab, setActiveTab] = useState<ChargesTab>("membership");
  const [selectedMembershipYear, setSelectedMembershipYear] = useState<number>(new Date().getFullYear());
  const [showFutureMembership, setShowFutureMembership] = useState(false);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setActionMessage(null);
    setIsLoading(true);
    try {
      const [chargeList, groups] = await Promise.all([
        listChargesWithGroup(),
        listAllGroupsForSelect(),
      ]);
      const progress = await getChargeProgressByIds(chargeList.map((charge) => charge.id));
      setCharges(chargeList);
      setGroupOptions(groups);
      setChargeProgressById(progress);
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

  const membershipCharges = useMemo(
    () => charges.filter((charge) => charge.category === "membership"),
    [charges]
  );

  const manualCharges = useMemo(
    () => charges.filter((charge) => charge.category !== "membership"),
    [charges]
  );

  const currentMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const membershipYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    membershipCharges.forEach((charge) => {
      if (charge.billing_period) {
        years.add(new Date(`${charge.billing_period}T12:00:00`).getFullYear());
      }
    });
    return [...years].sort((a, b) => b - a);
  }, [membershipCharges]);

  useEffect(() => {
    if (membershipYears.length === 0) {
      return;
    }
    if (!membershipYears.includes(selectedMembershipYear)) {
      setSelectedMembershipYear(membershipYears[0]);
    }
  }, [membershipYears, selectedMembershipYear]);

  const membershipChargesForYear = useMemo(() => {
    return membershipCharges
      .filter((charge) => {
        if (!charge.billing_period) {
          return selectedMembershipYear === new Date().getFullYear();
        }
        return new Date(`${charge.billing_period}T12:00:00`).getFullYear() === selectedMembershipYear;
      })
      .sort((a, b) => {
        const pa = a.billing_period?.trim() ?? "";
        const pb = b.billing_period?.trim() ?? "";
        return pa.localeCompare(pb);
      });
  }, [membershipCharges, selectedMembershipYear]);

  const membershipRelevantCharges = useMemo(() => {
    return membershipChargesForYear.filter((charge) => {
      if (!charge.billing_period) {
        return true;
      }
      const periodDate = new Date(`${charge.billing_period}T12:00:00`);
      return periodDate <= currentMonthStart;
    });
  }, [currentMonthStart, membershipChargesForYear]);

  const membershipFutureCharges = useMemo(() => {
    return membershipChargesForYear.filter((charge) => {
      if (!charge.billing_period) {
        return false;
      }
      const periodDate = new Date(`${charge.billing_period}T12:00:00`);
      return periodDate > currentMonthStart;
    });
  }, [currentMonthStart, membershipChargesForYear]);

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
        {isLoading ? <p className="text-slate-300">Cargando cobros...</p> : null}

        {!isLoading && errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

        {!isLoading && actionMessage ? <Alert>{actionMessage}</Alert> : null}

        {!isLoading && !errorMessage ? (
          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("membership")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "membership"
                    ? "bg-white text-slate-950"
                    : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                }`}
              >
                Cuotas del club
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "manual"
                    ? "bg-white text-slate-950"
                    : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                }`}
              >
                Cobros manuales
              </button>
            </div>

            {activeTab === "membership" ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">Cuotas del club</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      Revisa por año las cuotas ya exigibles y deja las futuras colapsadas hasta que necesites operar
                      sobre ellas.
                    </p>
                  </div>
                  <label className="space-y-1 text-sm text-slate-300">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-white/45">Año</span>
                    <select
                      value={selectedMembershipYear}
                      onChange={(event) => {
                        setSelectedMembershipYear(Number(event.target.value));
                        setShowFutureMembership(false);
                      }}
                      className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    >
                      {membershipYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-slate-200">
                    Visibles: {membershipRelevantCharges.length}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-slate-200">
                    Futuras: {membershipFutureCharges.length}
                  </span>
                </div>

                {membershipChargesForYear.length === 0 ? (
                  <EmptyState
                    className="mt-2"
                    title={`No hay cuotas para ${selectedMembershipYear}.`}
                    description="Cuando existan cuotas generadas para ese año, aparecerán aquí."
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <Th>Nombre</Th>
                            <Th>Período</Th>
                            <Th>Cobranza</Th>
                            <Th>Monto</Th>
                            <Th>Acciones</Th>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {membershipRelevantCharges.map((charge) => (
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
                              <Td className="text-slate-300">
                                {(() => {
                                  const summary = chargeProgressById[charge.id];
                                  if (!summary || summary.totalMembers === 0) {
                                    return <span className="text-slate-400">Sin socios</span>;
                                  }
                                  return (
                                    <div className="text-xs">
                                      <p className="font-semibold text-white">
                                        Pagaron {summary.paidMembers} de {summary.totalMembers}
                                      </p>
                                      {summary.partialMembers > 0 ? (
                                        <p className="mt-0.5 text-slate-400">
                                          Parciales: {summary.partialMembers}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                })()}
                              </Td>
                              <Td className="tabular-nums text-white">{formatMoney(charge.amount)}</Td>
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

                    {membershipFutureCharges.length > 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">Cuotas futuras del {selectedMembershipYear}</p>
                            <p className="mt-1 text-sm text-slate-300">
                              Hay {membershipFutureCharges.length} cuota(s) ya generadas para cobro adelantado.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="neutral"
                            size="md"
                            onClick={() => setShowFutureMembership((prev) => !prev)}
                          >
                            {showFutureMembership ? "Ocultar futuras" : "Ver futuras"}
                          </Button>
                        </div>

                        {showFutureMembership ? (
                          <div className="mt-4 overflow-x-auto">
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <Th>Nombre</Th>
                                  <Th>Período</Th>
                                  <Th>Cobranza</Th>
                                  <Th>Monto</Th>
                                  <Th>Acciones</Th>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {membershipFutureCharges.map((charge) => (
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
                                    <Td className="text-slate-300">
                                      {(() => {
                                        const summary = chargeProgressById[charge.id];
                                        if (!summary || summary.totalMembers === 0) {
                                          return <span className="text-slate-400">Sin socios</span>;
                                        }
                                        return (
                                          <div className="text-xs">
                                            <p className="font-semibold text-white">
                                              Pagaron {summary.paidMembers} de {summary.totalMembers}
                                            </p>
                                            {summary.partialMembers > 0 ? (
                                              <p className="mt-0.5 text-slate-400">
                                                Parciales: {summary.partialMembers}
                                              </p>
                                            ) : null}
                                          </div>
                                        );
                                      })()}
                                    </Td>
                                    <Td className="tabular-nums text-white">{formatMoney(charge.amount)}</Td>
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
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </section>
            ) : (
              <section>
                <h3 className="text-base font-semibold text-white">Cobros manuales</h3>
                <p className="mt-1 text-sm text-slate-300">
                  Actividades, inscripciones y otros cargos extraordinarios. Aquí sigue disponible el vencimiento y el
                  resto de la operatoria manual.
                </p>
                {manualCharges.length === 0 ? (
                  <EmptyState
                    className="mt-4"
                    title="Todavía no hay cobros manuales registrados."
                    description="La cuota del club se gestiona en la pestaña anterior. Aquí solo aparecerán actividades, inscripciones y otros cobros manuales."
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
            )}
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
