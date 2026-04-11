"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Alert,
  Badge,
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
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { formatMoney } from "@/lib/formatters";
import { listMemberChargeBalancesSplit, type MemberChargeBalancesSplit } from "@/lib/charges";
import { listMembers, updateMemberStatus } from "@/lib/supabase";

type MemberRow = {
  id: string;
  full_name: string;
  dni: string;
  status: "pending" | "active";
  created_at: string;
};

type SociosTab = "directorio" | "solicitudes";

type DebtSliceFilter = "all" | "in_debt" | "up_to_date";

function splitMapFromRows(rows: MemberChargeBalancesSplit[]) {
  const map = new Map<string, MemberChargeBalancesSplit>();
  for (const b of rows) {
    map.set(b.member_id, b);
  }
  return map;
}

export default function SociosPage() {
  const router = useRouter();
  const { config, isConfigLoading } = useActiveClubConfig();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [balanceByMemberId, setBalanceByMemberId] = useState<Map<string, MemberChargeBalancesSplit>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SociosTab>("directorio");
  const [membershipFilter, setMembershipFilter] = useState<DebtSliceFilter>("all");
  const [otherDebtFilter, setOtherDebtFilter] = useState<DebtSliceFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const [membersData, balances] = await Promise.all([listMembers(), listMemberChargeBalancesSplit()]);
      setMembers(membersData);
      setBalanceByMemberId(splitMapFromRows(balances));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los datos.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);
  const pendingMembers = useMemo(() => members.filter((m) => m.status === "pending"), [members]);

  const filteredDirectorio = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return activeMembers.filter((member) => {
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : member.full_name.toLowerCase().includes(normalizedSearch) ||
            member.dni.toLowerCase().includes(normalizedSearch);

      const bal = balanceByMemberId.get(member.id);
      const memRem = bal?.membershipRemaining ?? 0;
      const othRem = bal?.otherRemaining ?? 0;
      const memDebt = memRem > 0.001;
      const othDebt = othRem > 0.001;

      const matchesMembership =
        membershipFilter === "all"
          ? true
          : membershipFilter === "in_debt"
            ? memDebt
            : !memDebt;

      const matchesOther =
        otherDebtFilter === "all" ? true : otherDebtFilter === "in_debt" ? othDebt : !othDebt;

      return matchesSearch && matchesMembership && matchesOther;
    });
  }, [activeMembers, searchTerm, membershipFilter, otherDebtFilter, balanceByMemberId]);

  const filteredSolicitudes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return pendingMembers.filter((member) => {
      if (normalizedSearch.length === 0) {
        return true;
      }
      return (
        member.full_name.toLowerCase().includes(normalizedSearch) ||
        member.dni.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [pendingMembers, searchTerm]);

  const handleApprove = async (memberId: string) => {
    setApprovingId(memberId);

    try {
      await updateMemberStatus(memberId, "active");
      setMembers((prev) =>
        prev.map((member) =>
          member.id === memberId
            ? {
                ...member,
                status: "active",
              }
            : member
        )
      );
      setActiveTab("directorio");
    } catch (error) {
      console.error("Error al aprobar socio:", error);
    } finally {
      setApprovingId(null);
    }
  };

  const totalMembers = members.length;
  const pendingCount = pendingMembers.length;
  const activeCount = activeMembers.length;

  const tabClass = (tab: SociosTab) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Padron y solicitudes"
        title="Socios"
        description={
          isConfigLoading ? "Cargando configuracion..." : `Gestion de socios de ${config.name}`
        }
        actions={
          <Link href="/registro" className={buttonClassNames({ variant: "primary", size: "lg" })}>
            Añadir socio
          </Link>
        }
      />

      <Card className="w-full p-6">
        {isLoading ? (
          <div className="mt-2 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-[1rem] bg-slate-100/90" />
              ))}
            </div>
            <div className="h-12 animate-pulse rounded-[1rem] bg-slate-100/90" />
            <div className="h-64 animate-pulse rounded-[1.5rem] bg-slate-100/90" />
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <Alert className="mt-4" variant="danger">
            {errorMessage}
          </Alert>
        ) : null}

        {!isLoading && !errorMessage && members.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="Todavía no hay socios registrados."
            description="Podés dar de alta un socio desde el registro público."
            actions={
              <Link href="/registro" className={buttonClassNames({ variant: "primary", size: "lg" })}>
                Añadir socio
              </Link>
            }
          />
        ) : null}

        {!isLoading && !errorMessage && members.length > 0 ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="club-surface-muted rounded-[1rem] px-3 py-3 text-sm text-slate-700">
                <span className="font-semibold">Total:</span> {totalMembers}
              </div>
              <div className="club-surface-muted rounded-[1rem] px-3 py-3 text-sm text-slate-700">
                <span className="font-semibold">Solicitudes:</span> {pendingCount}
              </div>
              <div className="club-surface-muted rounded-[1rem] px-3 py-3 text-sm text-slate-700">
                <span className="font-semibold">Activos:</span> {activeCount}
              </div>
            </div>

            <div
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              role="tablist"
              aria-label="Vista de socios"
            >
              <div className="inline-flex flex-wrap gap-1 rounded-[1rem] bg-slate-100/90 p-1.5">
                <button type="button" role="tab" aria-selected={activeTab === "directorio"} className={tabClass("directorio")} onClick={() => setActiveTab("directorio")}>
                  Directorio
                  {activeCount > 0 ? (
                    <span className="ml-1.5 text-xs text-slate-500">({activeCount})</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "solicitudes"}
                  className={tabClass("solicitudes")}
                  onClick={() => setActiveTab("solicitudes")}
                >
                  Solicitudes
                  {pendingCount > 0 ? (
                    <span className="ml-1.5 font-semibold text-amber-700">({pendingCount})</span>
                  ) : (
                    <span className="ml-1.5 text-xs text-slate-500">(0)</span>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {activeTab === "directorio"
                  ? "Socios activos: cuota mensual y otros cargos por separado."
                  : "Personas que enviaron el formulario de alta y esperan aprobación."}
              </p>
            </div>

            {activeTab === "directorio" ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Filtros
                  </p>
                  <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 lg:gap-y-3">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <span className="shrink-0 text-sm font-medium text-slate-600">Cuota club</span>
                      <div
                        className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-slate-200/80 p-1"
                        role="group"
                        aria-label="Filtrar por estado de la cuota mensual"
                      >
                        {(
                          [
                            ["all", "Todos"],
                            ["in_debt", "Debe cuotas"],
                            ["up_to_date", "Al día"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setMembershipFilter(value)}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                              membershipFilter === value
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="hidden h-8 w-px shrink-0 bg-slate-200 lg:block" aria-hidden />

                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <span className="shrink-0 text-sm font-medium text-slate-600">Otros cargos</span>
                      <div
                        className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-slate-200/80 p-1"
                        role="group"
                        aria-label="Filtrar por saldo de cargos que no son cuota"
                      >
                        {(
                          [
                            ["all", "Todos"],
                            ["in_debt", "Con deuda"],
                            ["up_to_date", "Al día"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setOtherDebtFilter(value)}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                              otherDebtFilter === value
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nombre o DNI"
                    className="text-sm"
                  />
                </div>

                {filteredDirectorio.length === 0 ? (
                  <EmptyState
                    title="No hay socios que coincidan con el filtro actual."
                    description="Probá limpiando filtros o cambiando el término de búsqueda."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <Th>Nombre</Th>
                          <Th>DNI</Th>
                          <Th>Cuota</Th>
                          <Th>Otros cargos</Th>
                          <Th>Fecha de creación</Th>
                          <Th>Acciones</Th>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredDirectorio.map((member) => {
                          const bal = balanceByMemberId.get(member.id);
                          const memRem = bal?.membershipRemaining ?? 0;
                          const memLines = bal?.membershipPendingLines ?? 0;
                          const othRem = bal?.otherRemaining ?? 0;
                          const othLines = bal?.otherPendingLines ?? 0;
                          const memDebt = memRem > 0.001;
                          const othDebt = othRem > 0.001;

                          return (
                            <tr
                              key={member.id}
                              onClick={() => router.push(`/admin/socios/${member.id}`)}
                              className="cursor-pointer transition-colors hover:bg-slate-50"
                            >
                              <Td className="text-slate-900">{member.full_name}</Td>
                              <Td className="text-slate-700">{member.dni}</Td>
                              <Td className="text-slate-700">
                                {memDebt ? (
                                  <span className="inline-flex flex-col gap-0.5">
                                    <Badge variant="danger">{formatMoney(memRem)}</Badge>
                                    {memLines > 0 ? (
                                      <span className="text-xs text-slate-500">
                                        {memLines} cuota{memLines === 1 ? "" : "s"} pend.
                                      </span>
                                    ) : null}
                                  </span>
                                ) : (
                                  <Badge variant="success">Al día</Badge>
                                )}
                              </Td>
                              <Td className="text-slate-700">
                                {othDebt ? (
                                  <span className="inline-flex flex-col gap-0.5">
                                    <Badge variant="danger">{formatMoney(othRem)}</Badge>
                                    {othLines > 0 ? (
                                      <span className="text-xs text-slate-500">
                                        {othLines} cargo{othLines === 1 ? "" : "s"} pend.
                                      </span>
                                    ) : null}
                                  </span>
                                ) : (
                                  <Badge variant="success">Al día</Badge>
                                )}
                              </Td>
                              <Td className="text-slate-700">
                                {new Date(member.created_at).toLocaleString("es-AR")}
                              </Td>
                              <Td>
                                <Link
                                  href={`/admin/socios/${member.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                                >
                                  Cargos y pagos
                                </Link>
                              </Td>
                            </tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nombre o DNI"
                    className="text-sm"
                  />
                </div>

                {filteredSolicitudes.length === 0 ? (
                  <EmptyState
                    title="No hay solicitudes pendientes."
                    description="Las nuevas altas aparecerán aquí cuando envíen el formulario de registro."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <Th>Nombre</Th>
                          <Th>DNI</Th>
                          <Th>Fecha de creación</Th>
                          <Th>Acciones</Th>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredSolicitudes.map((member) => (
                          <tr
                            key={member.id}
                            onClick={() => router.push(`/admin/socios/${member.id}`)}
                            className="cursor-pointer transition-colors hover:bg-slate-50"
                          >
                            <Td className="text-slate-900">{member.full_name}</Td>
                            <Td className="text-slate-700">{member.dni}</Td>
                            <Td className="text-slate-700">
                              {new Date(member.created_at).toLocaleString("es-AR")}
                            </Td>
                            <Td>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleApprove(member.id);
                                }}
                                disabled={approvingId === member.id}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {approvingId === member.id ? "Aprobando..." : "Aprobar"}
                              </button>
                            </Td>
                          </tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </Card>
    </section>
  );
}
