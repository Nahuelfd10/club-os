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
  Textarea,
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
import { listMembers } from "@/lib/supabase";

type ManualChargeCategory = Exclude<CreateChargeDefinitionCategory, "membership">;
type ChargesTab = "membership" | "manual";
type ChargeScenario = "simple" | "order";
type AudienceMode = "all" | "group" | "members";
type MemberOption = { id: string; full_name: string; dni: string; status: "pending" | "active" };

const scenarioCopy: Record<
  ChargeScenario,
  { title: string; description: string; example: string }
> = {
  simple: {
    title: "Cobro a socios",
    description: "Viajes, torneos, inscripciones, matriculas o aportes puntuales.",
    example: "Ej. Viaje regional o matricula 2026.",
  },
  order: {
    title: "Pedido / indumentaria",
    description: "Lista variable con talles, cantidades, externos y pagos parciales.",
    example: "Ej. Camperas 2026 con planilla.",
  },
};

function scenarioToFormState(
  scenario: ChargeScenario,
  simpleCategory: ManualChargeCategory
): {
  category: ManualChargeCategory;
  auto_assign_lines: boolean;
} {
  if (scenario === "order") {
    return { category: "activity", auto_assign_lines: false };
  }
  return { category: simpleCategory, auto_assign_lines: true };
}

function categoryLabel(category: string | null) {
  if (category === "membership") return "Cuota mensual";
  if (category === "activity") return "Cobro / pedido";
  if (category === "fee") return "Inscripcion / matricula";
  return category || "-";
}

function sortMembership(a: ChargeWithGroup, b: ChargeWithGroup) {
  const pa = a.billing_period?.trim() ?? "";
  const pb = b.billing_period?.trim() ?? "";
  return pa.localeCompare(pb);
}

export default function AdminChargesPage() {
  const [charges, setCharges] = useState<ChargeWithGroup[]>([]);
  const [groupOptions, setGroupOptions] = useState<{ id: string; name: string }[]>([]);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [progressById, setProgressById] = useState<Record<string, ChargeProgressSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ChargesTab>("membership");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showFuture, setShowFuture] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [scenario, setScenario] = useState<ChargeScenario>("simple");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [chargeType, setChargeType] = useState<"per_member" | "total">("per_member");
  const [audience, setAudience] = useState<AudienceMode>("all");
  const [groupId, setGroupId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [simpleCategory, setSimpleCategory] = useState<ManualChargeCategory>("activity");

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setActionMessage(null);
    try {
      const [chargeList, groups, members] = await Promise.all([
        listChargesWithGroup(),
        listAllGroupsForSelect(),
        listMembers(),
      ]);
      const progress = await getChargeProgressByIds(chargeList.map((charge) => charge.id));
      setCharges(chargeList);
      setGroupOptions(groups);
      setMemberOptions(
        (members ?? [])
          .filter((member) => member.status === "active")
          .map((member) => ({
            id: member.id,
            full_name: member.full_name,
            dni: member.dni,
            status: member.status,
          }))
      );
      setProgressById(progress);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los cobros.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    const years = new Set<number>([new Date().getFullYear()]);
    membershipCharges.forEach((charge) => {
      if (charge.billing_period) {
        years.add(new Date(`${charge.billing_period}T12:00:00`).getFullYear());
      }
    });
    return [...years].sort((a, b) => b - a);
  }, [membershipCharges]);

  const membershipForYear = useMemo(() => {
    return membershipCharges
      .filter((charge) => {
        if (!charge.billing_period) return selectedYear === new Date().getFullYear();
        return new Date(`${charge.billing_period}T12:00:00`).getFullYear() === selectedYear;
      })
      .sort(sortMembership);
  }, [membershipCharges, selectedYear]);

  const currentMembership = useMemo(
    () =>
      membershipForYear.find((charge) => {
        if (!charge.billing_period) return false;
        return new Date(`${charge.billing_period}T12:00:00`).getTime() === currentMonthStart.getTime();
      }) ?? null,
    [currentMonthStart, membershipForYear]
  );

  const dueMembership = useMemo(
    () =>
      membershipForYear.filter((charge) => {
        if (!charge.billing_period) return true;
        return new Date(`${charge.billing_period}T12:00:00`) <= currentMonthStart;
      }),
    [currentMonthStart, membershipForYear]
  );
  const futureMembership = useMemo(
    () =>
      membershipForYear.filter((charge) => {
        if (!charge.billing_period) return false;
        return new Date(`${charge.billing_period}T12:00:00`) > currentMonthStart;
      }),
    [currentMonthStart, membershipForYear]
  );

  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    return memberOptions
      .filter((member) => {
        if (!term) return true;
        return member.full_name.toLowerCase().includes(term) || member.dni.toLowerCase().includes(term);
      })
      .slice(0, 18);
  }, [memberOptions, memberSearch]);

  const selectedMembers = useMemo(() => {
    const selected = new Set(memberIds);
    return memberOptions.filter((member) => selected.has(member.id));
  }, [memberIds, memberOptions]);

  function resetCreate(nextScenario: ChargeScenario = "simple") {
    setScenario(nextScenario);
    setName("");
    setDescription("");
    setAmount("");
    setDueDate("");
    setChargeType("per_member");
    setAudience("all");
    setGroupId("");
    setMemberSearch("");
    setMemberIds([]);
    setSimpleCategory("activity");
    setCreateOpen(true);
  }

  function toggleMember(memberId: string) {
    setMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }

  async function handleCreate() {
    const cleanName = name.trim();
    const rawAmount = amount.replace(",", ".").trim();
    const parsedAmount = Number(rawAmount);
    if (!cleanName) {
      setActionMessage("El nombre del cobro es obligatorio.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setActionMessage("Indica un monto valido mayor a cero.");
      return;
    }
    if (scenario !== "order" && audience === "group" && !groupId) {
      setActionMessage("Elegi un grupo o cambia el alcance del cobro.");
      return;
    }
    if (scenario !== "order" && audience === "members" && memberIds.length === 0) {
      setActionMessage("Elegi al menos una persona para este cobro.");
      return;
    }

    setIsCreating(true);
    try {
      const state = scenarioToFormState(scenario, simpleCategory);
      await createCharge({
        name: cleanName,
        description: description.trim() || null,
        amount: parsedAmount,
        type: scenario === "order" ? "per_member" : chargeType,
        group_id: scenario !== "order" && audience === "group" ? groupId : null,
        member_ids: scenario !== "order" && audience === "members" ? memberIds : [],
        due_date: dueDate || null,
        definition_category: state.category,
        auto_assign_lines: state.auto_assign_lines,
      });
      setCreateOpen(false);
      setActionMessage(
        scenario === "order"
          ? "Pedido creado. Ahora podes cargar lineas o importar una planilla."
          : "Cobro creado con sus lineas iniciales."
      );
      await load();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo crear el cobro.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(charge: ChargeWithGroup) {
    const ok = window.confirm(`Eliminar el cobro "${charge.name}"?`);
    if (!ok) return;
    setDeletingId(charge.id);
    try {
      await deleteCharge(charge.id);
      setActionMessage("Cobro eliminado.");
      await load();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo eliminar el cobro.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Cobros"
        description="Cuotas, pedidos y cobros puntuales en un solo lugar: quien debe, cuanto pago y que falta hacer."
        actions={
          <button
            type="button"
            onClick={() => resetCreate("simple")}
            className={buttonClassNames({ variant: "primary", size: "lg" })}
          >
            Nuevo cobro
          </button>
        }
      />

      <Card className="w-full border-white/10 !bg-slate-950/58 p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => resetCreate("simple")}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.08]"
          >
            <p className="text-sm font-semibold text-white">Cobro a socios</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Cuotas especiales, viajes, torneos, inscripciones o matriculas.
            </p>
          </button>
          <button
            type="button"
            onClick={() => resetCreate("order")}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.08]"
          >
            <p className="text-sm font-semibold text-white">Pedido / indumentaria</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">Crea un cobro vacio para cargar lineas variables o importar Excel.</p>
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("membership")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "membership"
                ? "bg-white text-slate-950"
                : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            }`}
          >
            Cuota mensual
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
            Cobros y pedidos
          </button>
        </div>

        {isLoading ? <p className="mt-4 text-slate-300">Cargando cobros...</p> : null}
        {!isLoading && errorMessage ? <Alert className="mt-4" variant="danger">{errorMessage}</Alert> : null}
        {!isLoading && actionMessage ? <Alert className="mt-4">{actionMessage}</Alert> : null}

        {!isLoading && !errorMessage && activeTab === "membership" ? (
          <section className="mt-6 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Cuota mensual</h2>
                <p className="mt-1 text-sm text-slate-300">
                  La cuota se genera automaticamente para socios activos. El mes actual queda primero para operar rapido.
                </p>
              </div>
              <label className="space-y-1 text-sm text-slate-300">
                <span className="block text-xs font-semibold uppercase tracking-wide text-white/45">Anio</span>
                <Select
                  value={selectedYear}
                  onChange={(event) => {
                    setSelectedYear(Number(event.target.value));
                    setShowFuture(false);
                  }}
                  className="rounded-lg border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white shadow-none focus:border-white/20 focus:shadow-none"
                >
                  {membershipYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            {currentMembership ? (
              <CurrentMonthCard charge={currentMembership} progress={progressById[currentMembership.id]} />
            ) : null}

            {membershipForYear.length === 0 ? (
              <EmptyState
                title={`No hay cuotas para ${selectedYear}.`}
                description="Cuando la automatizacion genere cuotas para ese anio, van a aparecer aca."
              />
            ) : (
              <ChargesTable
                charges={dueMembership}
                progressById={progressById}
                deletingId={deletingId}
                onDelete={handleDelete}
                emptyText="No hay cuotas exigibles para este filtro."
              />
            )}

            {futureMembership.length > 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Cuotas futuras</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {futureMembership.length} cuota(s) generadas para cobro adelantado.
                    </p>
                  </div>
                  <Button type="button" variant="neutral" size="md" onClick={() => setShowFuture((prev) => !prev)}>
                    {showFuture ? "Ocultar futuras" : "Ver futuras"}
                  </Button>
                </div>
                {showFuture ? (
                  <div className="mt-4">
                    <ChargesTable
                      charges={futureMembership}
                      progressById={progressById}
                      deletingId={deletingId}
                      onDelete={handleDelete}
                      emptyText="No hay cuotas futuras."
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {!isLoading && !errorMessage && activeTab === "manual" ? (
          <section className="mt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Cobros y pedidos</h2>
              <p className="mt-1 text-sm text-slate-300">
                Todo lo que no es cuota mensual: viajes, inscripciones, pedidos de indumentaria y listas variables.
              </p>
            </div>
            <ChargesTable
              charges={manualCharges}
              progressById={progressById}
              deletingId={deletingId}
              onDelete={handleDelete}
              emptyText="Todavia no hay cobros manuales."
              showCategory
            />
          </section>
        ) : null}
      </Card>

      <AdminModal open={createOpen} onClose={() => !isCreating && setCreateOpen(false)} width="2xl">
        <h2 className="text-lg font-semibold text-white">Nuevo cobro</h2>
        <p className="mt-1 text-sm text-slate-300">
          Elegi el caso real. La cuota mensual se genera sola; aca creas cobros adicionales.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">1. Tipo de cobro</p>
            <div className="grid gap-2 md:grid-cols-2">
              {(["simple", "order"] as const).map((item) => {
                const selected = scenario === item;
                const copy = scenarioCopy[item];
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setScenario(item);
                      if (item === "order") {
                        setAudience("members");
                        setMemberIds([]);
                        setGroupId("");
                      }
                    }}
                    className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      selected
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    <p className="text-sm font-semibold">{copy.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{copy.description}</p>
                    <p className="mt-2 text-[11px] italic leading-4 text-slate-400">{copy.example}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">2. Datos</p>
            <div className="space-y-3">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={scenario === "order" ? "Camperas 2026" : "Viaje regional, matricula 2026"}
                className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              />
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="Notas internas opcionales"
                className="rounded-lg border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white shadow-none placeholder:text-slate-400 focus:border-white/20 focus:shadow-none"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={scenario === "order" ? "Monto sugerido por unidad" : "Monto"}
                  className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
                />
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="border-white/10 bg-white/[0.05] text-sm text-white focus:border-white/20 focus:bg-white/[0.08]"
                />
              </div>
              {scenario === "simple" ? (
                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/45">
                    Categoria para reportes
                  </span>
                  <Select
                    value={simpleCategory}
                    onChange={(event) => setSimpleCategory(event.target.value as ManualChargeCategory)}
                    className="rounded-lg border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white shadow-none focus:border-white/20 focus:shadow-none"
                  >
                    <option value="activity">Actividad / viaje / torneo / otro</option>
                    <option value="fee">Inscripcion / matricula</option>
                  </Select>
                  <span className="block text-xs leading-5 text-slate-400">
                    No cambia el flujo de carga; solo ayuda a ordenar listados y reportes.
                  </span>
                </label>
              ) : null}
            </div>
          </div>

          {scenario !== "order" ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">3. A quien se le cobra</p>
              <div className="space-y-3">
                <div className="grid gap-2 md:grid-cols-3">
                  {(
                    [
                      ["all", "Todo el club", "Socios activos actuales"],
                      ["group", "Un grupo", "Usar grupo como atajo"],
                      ["members", "Personas puntuales", "Elegir nombres a mano"],
                    ] as const
                  ).map(([value, label, hint]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAudience(value);
                        if (value !== "group") setGroupId("");
                        if (value !== "members") {
                          setMemberIds([]);
                          setMemberSearch("");
                        }
                      }}
                      className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        audience === value
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="mt-1 text-xs text-slate-400">{hint}</p>
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Select
                    value={chargeType}
                    onChange={(event) => setChargeType(event.target.value as "per_member" | "total")}
                    className="rounded-lg border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white shadow-none focus:border-white/20 focus:shadow-none"
                  >
                    <option value="per_member">Por persona</option>
                    <option value="total">Total a dividir</option>
                  </Select>
                  {audience === "group" ? (
                    <Select
                      value={groupId}
                      onChange={(event) => setGroupId(event.target.value)}
                      className="rounded-lg border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white shadow-none focus:border-white/20 focus:shadow-none"
                    >
                      <option value="">Elegir grupo</option>
                      {groupOptions.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
                      {audience === "members"
                        ? `Seleccionados: ${memberIds.length}`
                        : "Se asigna a todos los socios activos."}
                    </div>
                  )}
                </div>

                {audience === "members" ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <Input
                      value={memberSearch}
                      onChange={(event) => setMemberSearch(event.target.value)}
                      placeholder="Buscar por nombre o DNI"
                      className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
                    />
                    {selectedMembers.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleMember(member.id)}
                            className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
                          >
                            {member.full_name} x
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 grid max-h-52 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                      {filteredMembers.map((member) => {
                        const selected = memberIds.includes(member.id);
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleMember(member.id)}
                            className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                              selected
                                ? "border-success/35 bg-success/12 text-white"
                                : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                            }`}
                          >
                            <span className="block font-semibold">{member.full_name}</span>
                            <span className="text-slate-400">DNI {member.dni}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
              El pedido se crea vacio. En el detalle vas a cargar personas, externos, talles, cantidades o importar una planilla.
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={() => setCreateOpen(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void handleCreate()} disabled={isCreating}>
            {isCreating ? "Guardando..." : scenario === "order" ? "Crear pedido" : "Crear cobro"}
          </Button>
        </div>
      </AdminModal>
    </section>
  );
}

function CurrentMonthCard({
  charge,
  progress,
}: {
  charge: ChargeWithGroup;
  progress?: ChargeProgressSummary;
}) {
  const paid = progress?.paidMembers ?? 0;
  const total = progress?.totalMembers ?? 0;
  const partial = progress?.partialMembers ?? 0;
  return (
    <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-success">Mes actual</p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {charge.billing_period ? formatBillingPeriod(charge.billing_period) : charge.name}
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {total > 0 ? `${paid} de ${total} socios pagaron` : "Todavia no hay socios asignados"}.
            {partial > 0 ? ` ${partial} con pago parcial.` : ""}
          </p>
        </div>
        <Link
          href={`/admin/charges/${charge.id}`}
          className="rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Ver deudores y cobrar
        </Link>
      </div>
    </div>
  );
}

function ChargesTable({
  charges,
  progressById,
  deletingId,
  onDelete,
  emptyText,
  showCategory = false,
}: {
  charges: ChargeWithGroup[];
  progressById: Record<string, ChargeProgressSummary>;
  deletingId: string | null;
  onDelete: (charge: ChargeWithGroup) => void | Promise<void>;
  emptyText: string;
  showCategory?: boolean;
}) {
  if (charges.length === 0) {
    return <EmptyState title={emptyText} description="Cuando haya registros, van a aparecer en esta tabla." />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHead>
          <TableRow>
            <Th>Nombre</Th>
            {showCategory ? <Th>Tipo</Th> : null}
            <Th>Alcance</Th>
            <Th>Cobranza</Th>
            <Th>Monto</Th>
            <Th>Vencimiento</Th>
            <Th>Acciones</Th>
          </TableRow>
        </TableHead>
        <TableBody>
          {charges.map((charge) => {
            const progress = progressById[charge.id];
            return (
              <TableRow key={charge.id} className="transition-colors hover:bg-white/[0.04]">
                <Td className="font-medium">
                  <Link href={`/admin/charges/${charge.id}`} className="text-white underline-offset-2 hover:underline">
                    {charge.name}
                  </Link>
                </Td>
                {showCategory ? <Td className="text-slate-300">{categoryLabel(charge.category)}</Td> : null}
                <Td className="text-slate-300">
                  {charge.group ? (
                    <Link href={`/admin/groups/${charge.group.id}`} className="underline-offset-2 hover:text-white hover:underline">
                      {charge.group.name}
                    </Link>
                  ) : (
                    "Todo el club / manual"
                  )}
                </Td>
                <Td className="text-slate-300">
                  {progress && progress.totalMembers > 0 ? (
                    <span className="text-xs">
                      <span className="font-semibold text-white">{progress.paidMembers} de {progress.totalMembers}</span>
                      {progress.partialMembers > 0 ? ` (${progress.partialMembers} parciales)` : ""}
                    </span>
                  ) : (
                    <span className="text-slate-400">Sin lineas</span>
                  )}
                </Td>
                <Td className="tabular-nums text-white">{formatMoney(charge.amount)}</Td>
                <Td className="text-slate-300">
                  {charge.billing_period ? formatBillingPeriod(charge.billing_period) : formatDueDate(charge.due_date)}
                </Td>
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
                      onClick={() => void onDelete(charge)}
                      disabled={deletingId === charge.id}
                      className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {deletingId === charge.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </Td>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
