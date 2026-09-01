"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import {
  Alert,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Table,
  TableBody,
  TableContainer,
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
  type ChargeListKind,
  type ChargeProgressSummary,
  type ChargeWithGroup,
} from "@/lib/charges";
import { formatDueDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/formatters";
import { useClubRoutes } from "@/lib/use-club-routes";

type ChargesView = "membership" | "lists";

function listKindLabel(kind: ChargeListKind) {
  return kind === "order" ? "Indumentaria" : "General";
}

function sortMembership(a: ChargeWithGroup, b: ChargeWithGroup) {
  const pa = a.billing_period?.trim() ?? "";
  const pb = b.billing_period?.trim() ?? "";
  return pa.localeCompare(pb);
}

function getBillingPeriodParts(billingPeriod: string | null) {
  if (!billingPeriod) return null;
  const isoPeriod = /^(\d{4})-(\d{2})/.exec(billingPeriod);
  if (isoPeriod) {
    return { year: Number(isoPeriod[1]), month: Number(isoPeriod[2]) };
  }
  const periodDate = new Date(`${billingPeriod}T12:00:00`);
  if (Number.isNaN(periodDate.getTime())) return null;
  return { year: periodDate.getFullYear(), month: periodDate.getMonth() + 1 };
}

function isSameBillingMonth(
  billingPeriod: string | null,
  currentPeriod: { year: number; month: number }
) {
  const period = getBillingPeriodParts(billingPeriod);
  return Boolean(period && period.year === currentPeriod.year && period.month === currentPeriod.month);
}

function isDueBillingMonth(
  billingPeriod: string | null,
  currentPeriod: { year: number; month: number }
) {
  const period = getBillingPeriodParts(billingPeriod);
  if (!period) return true;
  return period.year < currentPeriod.year || (period.year === currentPeriod.year && period.month <= currentPeriod.month);
}

function collectionProgressTone(paid: number, total: number) {
  if (total <= 0) return "bg-slate-300";
  const ratio = paid / total;
  if (ratio >= 0.7) return "bg-success";
  if (ratio >= 0.25) return "bg-accent";
  return "bg-danger";
}

export function AdminChargesPage({ view }: { view: ChargesView }) {
  const router = useRouter();
  const routes = useClubRoutes();
  const [charges, setCharges] = useState<ChargeWithGroup[]>([]);
  const [progressById, setProgressById] = useState<Record<string, ChargeProgressSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showFuture, setShowFuture] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [listKind, setListKind] = useState<ChargeListKind>("general");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [alias, setAlias] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setActionMessage(null);
    try {
      const chargeList = await listChargesWithGroup();
      const progress = await getChargeProgressByIds(chargeList.map((charge) => charge.id));
      setCharges(chargeList);
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
  const listCharges = useMemo(
    () => charges.filter((charge) => charge.category !== "membership"),
    [charges]
  );

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);

  const membershipYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    membershipCharges.forEach((charge) => {
      const period = getBillingPeriodParts(charge.billing_period);
      if (period) years.add(period.year);
    });
    return [...years].sort((a, b) => b - a);
  }, [membershipCharges]);

  const membershipForYear = useMemo(() => {
    return membershipCharges
      .filter((charge) => {
        if (!charge.billing_period) return selectedYear === new Date().getFullYear();
        return getBillingPeriodParts(charge.billing_period)?.year === selectedYear;
      })
      .sort(sortMembership);
  }, [membershipCharges, selectedYear]);

  const dueMembership = useMemo(
    () =>
      membershipForYear.filter((charge) => {
        return isDueBillingMonth(charge.billing_period, currentPeriod);
      }),
    [currentPeriod, membershipForYear]
  );
  const futureMembership = useMemo(
    () =>
      membershipForYear.filter((charge) => {
        return !isDueBillingMonth(charge.billing_period, currentPeriod);
      }),
    [currentPeriod, membershipForYear]
  );

  const displayedMembership = useMemo(
    () => (showFuture ? membershipForYear : dueMembership),
    [dueMembership, membershipForYear, showFuture]
  );

  const currentMembershipId = useMemo(() => {
    if (selectedYear !== currentPeriod.year) return null;
    return displayedMembership.find((charge) => isSameBillingMonth(charge.billing_period, currentPeriod))?.id ?? null;
  }, [currentPeriod, displayedMembership, selectedYear]);

  function resetCreate() {
    setListKind("general");
    setName("");
    setDescription("");
    setAlias("");
    setSupplierName("");
    setAmount("");
    setCreateOpen(true);
  }

  async function handleCreate() {
    const cleanName = name.trim();
    const cleanAlias = alias.trim();
    const cleanSupplier = supplierName.trim();
    const cleanDescription = [
      description.trim(),
      cleanAlias ? `Alias sugerido: ${cleanAlias}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const rawAmount = amount.replace(",", ".").trim();
    const parsedAmount = rawAmount ? Number(rawAmount) : 0;
    if (!cleanName) {
      setActionMessage("El nombre de la lista es obligatorio.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setActionMessage("Indica un monto esperado valido o dejalo vacio.");
      return;
    }

    setIsCreating(true);
    try {
      const created = await createCharge({
        name: cleanName,
        description: cleanDescription || null,
        amount: parsedAmount,
        type: "per_member",
        group_id: null,
        member_ids: [],
        due_date: null,
        definition_category: "activity",
        list_kind: listKind,
        supplier_name: cleanSupplier || null,
        auto_assign_lines: false,
      });
      setCreateOpen(false);
      setActionMessage("Lista creada. Ahora podes cargar personas, pegar WhatsApp o importar Excel.");
      router.push(routes.adminPath(`charges/lists/${created.id}`));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo crear la lista.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(charge: ChargeWithGroup) {
    const ok = window.confirm(`Eliminar la lista "${charge.name}"?`);
    if (!ok) return;
    setDeletingId(charge.id);
    try {
      await deleteCharge(charge.id);
      setActionMessage("Lista eliminada.");
      await load();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo eliminar la lista.");
    } finally {
      setDeletingId(null);
    }
  }

  const isMembershipView = view === "membership";
  const detailBasePath = isMembershipView ? "charges/membership" : "charges/lists";

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Cobranza"
        title={isMembershipView ? "Cuotas mensuales" : "Listas de recaudacion"}
        description={
          isMembershipView
            ? "La cuota mensual se genera automaticamente y marca el ritmo normal de cobranza del club."
            : "Listas puntuales para viajes, torneos, indumentaria, inscripciones u otros cobros manuales."
        }
        actions={!isMembershipView ? (
          <button
            type="button"
            onClick={() => resetCreate()}
            className={buttonClassNames({ variant: "primary", size: "md" })}
          >
            <Plus className="h-4 w-4" strokeWidth={1.9} aria-hidden />
            Nueva lista de recaudacion
          </button>
        ) : null}
      />

      {isMembershipView ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Año</span>
            <Select
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(Number(event.target.value));
                setShowFuture(false);
              }}
              className="w-auto rounded-lg px-3 py-2 text-sm"
            >
              {membershipYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </label>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-600">
          {isMembershipView ? "Cargando cuotas mensuales..." : "Cargando listas de recaudacion..."}
        </p>
      ) : null}
      {!isLoading && errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}
      {!isLoading && actionMessage ? <Alert>{actionMessage}</Alert> : null}

      {!isLoading && !errorMessage && isMembershipView ? (
        <section className="space-y-4">
            {membershipForYear.length === 0 ? (
              <EmptyState
                title={`No hay cuotas para ${selectedYear}.`}
                description="Cuando la automatizacion genere cuotas para ese anio, van a aparecer aca."
              />
            ) : (
              <ChargesTable
                allowDelete={false}
                charges={displayedMembership}
                description="Revisa las cuotas exigibles. Las futuras quedan colapsadas hasta que necesites operar."
                footer={
                  futureMembership.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                      <span>{futureMembership.length} cuotas futuras del {selectedYear} listas para cobro adelantado</span>
                      <button
                        type="button"
                        onClick={() => setShowFuture((prev) => !prev)}
                        className="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
                      >
                        {showFuture ? "Ocultar futuras" : "Ver futuras"} →
                      </button>
                    </div>
                  ) : null
                }
                progressById={progressById}
                deletingId={deletingId}
                onDelete={handleDelete}
                adminPath={routes.adminPath}
                detailBasePath={detailBasePath}
                currentChargeId={currentMembershipId}
                emptyText="No hay cuotas exigibles para este filtro."
                isMembershipTable
                title={`Cuotas mensuales · ${selectedYear}`}
              />
            )}
          </section>
      ) : null}

      {!isLoading && !errorMessage && !isMembershipView ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-950">Listas simples, con una variante para indumentaria</p>
            <p className="mt-1 text-sm text-slate-600">
              General cubre torneo, seguro, prode, viajes e inscripciones. Indumentaria es para ropa del club:
              muestra talle/detalle, señas y proveedor con mejor contexto.
            </p>
          </div>
            <ChargesTable
              charges={listCharges}
              description="Recaudaciones puntuales con personas, pagos parciales, pendientes e importacion desde Excel o WhatsApp."
              progressById={progressById}
              deletingId={deletingId}
              onDelete={handleDelete}
              adminPath={routes.adminPath}
              detailBasePath={detailBasePath}
              emptyText="Todavia no hay listas de recaudacion."
              showCategory
              title="Listas de recaudacion"
            />
          </section>
      ) : null}

      <AdminModal open={createOpen} onClose={() => !isCreating && setCreateOpen(false)} width="2xl">
        <h2 className="text-lg font-semibold text-white">Nueva lista de recaudacion</h2>
        <p className="mt-1 text-sm text-slate-300">
          Crea un espacio para cargar personas, pagos y pendientes sin abrir una planilla aparte.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">1. Categoria</p>
            <div className="grid gap-2 md:grid-cols-2">
              {(["general", "order"] as const).map((item) => {
                const selected = listKind === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setListKind(item)}
                    aria-pressed={selected}
                    className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      selected
                        ? "border-white/30 bg-white/10 text-white ring-2 ring-white/15"
                        : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{listKindLabel(item)}</p>
                      {selected ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950">
                          Seleccionada
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      {item === "order"
                        ? "Para ropa del club: camperas, camisetas, talles, proveedor y señas."
                        : "Para cualquier lista de personas que deben pagar algo: torneo, seguro, prode, viaje o inscripcion."}
                    </p>
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
                placeholder={
                  listKind === "order"
                    ? "Camperas 2026"
                    : "Torneo + seguro, Prode Mundial o Viaje regional"
                }
                className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              />
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="Notas internas opcionales"
                className="rounded-lg border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white shadow-none placeholder:text-slate-400 focus:border-white/20 focus:shadow-none"
              />
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Monto esperado por persona (opcional)"
                className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              />
              <Input
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                placeholder="Alias sugerido (opcional)"
                className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              />
              {listKind === "order" ? (
                <Input
                  value={supplierName}
                  onChange={(event) => setSupplierName(event.target.value)}
                  placeholder="Proveedor (opcional)"
                  className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
                />
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
            La lista se crea vacia. En el detalle vas a cargar personas, nombres externos,
            importaciones de Excel o texto pegado desde WhatsApp. Si despues necesitas una fecha objetivo,
            la podes agregar editando la lista.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={() => setCreateOpen(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void handleCreate()} disabled={isCreating}>
            {isCreating ? "Guardando..." : "Crear lista"}
          </Button>
        </div>
      </AdminModal>
    </section>
  );
}

function ChargesTable({
  allowDelete = true,
  charges,
  currentChargeId,
  description,
  footer,
  isMembershipTable = false,
  progressById,
  deletingId,
  onDelete,
  emptyText,
  showCategory = false,
  title,
  adminPath,
  detailBasePath,
}: {
  allowDelete?: boolean;
  charges: ChargeWithGroup[];
  currentChargeId?: string | null;
  description?: string;
  footer?: ReactNode;
  isMembershipTable?: boolean;
  progressById: Record<string, ChargeProgressSummary>;
  deletingId: string | null;
  onDelete: (charge: ChargeWithGroup) => void | Promise<void>;
  emptyText: string;
  showCategory?: boolean;
  title?: string;
  adminPath: (path?: string) => string;
  detailBasePath: string;
}) {
  if (charges.length === 0) {
    return <EmptyState title={emptyText} description="Cuando haya registros, van a aparecer en esta tabla." />;
  }

  return (
    <TableContainer
      footer={footer}
      header={
        title || description ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {title ? <h2 className="text-base font-semibold text-slate-950">{title}</h2> : null}
              {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
            </div>
          </div>
        ) : null
      }
    >
      <Table>
        <TableHead>
          <TableRow>
            <Th>Nombre</Th>
            {isMembershipTable ? <Th>Periodo</Th> : null}
            {showCategory && !isMembershipTable ? <Th>Tipo</Th> : null}
            {!isMembershipTable ? <Th>Alcance</Th> : null}
            <Th>Cobranza</Th>
            <Th>Monto</Th>
            {!isMembershipTable ? <Th>Fecha objetivo</Th> : null}
            <Th className="text-right">Acciones</Th>
          </TableRow>
        </TableHead>
        <TableBody>
          {charges.map((charge) => {
            const progress = progressById[charge.id];
            return (
              <TableRow key={charge.id} className="transition-colors hover:bg-slate-50">
                <Td className="font-medium">
                  <Link href={adminPath(`${detailBasePath}/${charge.id}`)} className="text-slate-950 underline-offset-2 hover:underline">
                    {charge.name}
                  </Link>
                </Td>
                {isMembershipTable ? (
                  <Td className="text-slate-700">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span>{charge.billing_period ? formatBillingPeriod(charge.billing_period) : "Sin periodo"}</span>
                      {charge.id === currentChargeId ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                          en curso
                        </span>
                      ) : null}
                    </span>
                  </Td>
                ) : null}
                {showCategory && !isMembershipTable ? <Td className="text-slate-600">{listKindLabel(charge.list_kind)}</Td> : null}
                {!isMembershipTable ? (
                  <Td className="text-slate-600">
                    {charge.group ? (
                      <Link href={adminPath(`groups/${charge.group.id}`)} className="underline-offset-2 hover:text-slate-950 hover:underline">
                        {charge.group.name}
                      </Link>
                    ) : (
                      "Lista sin grupo"
                    )}
                  </Td>
                ) : null}
                <Td className="text-slate-600">
                  {progress && progress.totalMembers > 0 ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-950">{progress.paidMembers} / {progress.totalMembers}</span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className={`block h-full rounded-full ${collectionProgressTone(progress.paidMembers, progress.totalMembers)}`}
                          style={{
                            width: `${Math.min(100, Math.max(0, (progress.paidMembers / progress.totalMembers) * 100))}%`,
                          }}
                        />
                      </span>
                      {progress.partialMembers > 0 ? ` (${progress.partialMembers} parciales)` : ""}
                    </span>
                  ) : (
                    <span className="text-slate-500">Sin lineas</span>
                  )}
                </Td>
                <Td className="tabular-nums text-slate-950">{formatMoney(charge.amount)}</Td>
                {!isMembershipTable ? (
                  <Td className="text-slate-600">
                    {charge.due_date ? formatDueDate(charge.due_date) : <span className="text-slate-400">-</span>}
                  </Td>
                ) : null}
                <Td>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={adminPath(`${detailBasePath}/${charge.id}`)}
                      className={buttonClassNames({ variant: "neutral", size: "sm" })}
                    >
                      Ver detalle
                    </Link>
                    {allowDelete ? (
                      <button
                        type="button"
                        onClick={() => void onDelete(charge)}
                        disabled={deletingId === charge.id}
                        className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {deletingId === charge.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    ) : null}
                  </div>
                </Td>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
