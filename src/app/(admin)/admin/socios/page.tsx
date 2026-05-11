"use client";

import { Download, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Badge,
  EmptyState,
  Input,
  SegmentedControl,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Td,
  Th,
  buttonClassNames,
} from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { listMemberChargeBalancesSplit, type MemberChargeBalancesSplit } from "@/lib/charges";
import { formatMoney } from "@/lib/formatters";
import { listMembers, updateMemberStatus } from "@/lib/supabase";
import type { MemberStatus } from "@/types";

type MemberRow = {
  id: string;
  full_name: string;
  dni: string;
  status: MemberStatus;
  created_at: string;
};

type SociosTab = "directorio" | "solicitudes" | "bajas";
type DebtSliceFilter = "all" | "in_debt" | "up_to_date";

function splitMapFromRows(rows: MemberChargeBalancesSplit[]) {
  const map = new Map<string, MemberChargeBalancesSplit>();
  for (const b of rows) {
    map.set(b.member_id, b);
  }
  return map;
}

function memberInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || "S";
}

function memberSince(date: string) {
  return `desde ${new Date(date).toLocaleDateString("es-AR", {
    month: "short",
    year: "numeric",
  })}`;
}

function registerDate(date: string) {
  return new Date(date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export default function SociosPage() {
  const router = useRouter();
  const { isConfigLoading } = useActiveClubConfig();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [balanceByMemberId, setBalanceByMemberId] = useState<Map<string, MemberChargeBalancesSplit>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SociosTab>("directorio");
  const [membershipFilter, setMembershipFilter] = useState<DebtSliceFilter>("all");
  const [otherDebtFilter, setOtherDebtFilter] = useState<DebtSliceFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
  const inactiveMembers = useMemo(() => members.filter((m) => m.status === "inactive"), [members]);

  const filteredDirectorio = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return activeMembers.filter((member) => {
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : member.full_name.toLowerCase().includes(normalizedSearch) ||
            member.dni.toLowerCase().includes(normalizedSearch);

      const bal = balanceByMemberId.get(member.id);
      const memDebt = (bal?.membershipRemaining ?? 0) > 0.001;
      const othDebt = (bal?.otherRemaining ?? 0) > 0.001;

      const matchesMembership =
        membershipFilter === "all" ? true : membershipFilter === "in_debt" ? memDebt : !memDebt;
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

  const filteredBajas = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return inactiveMembers.filter((member) => {
      if (normalizedSearch.length === 0) {
        return true;
      }
      return (
        member.full_name.toLowerCase().includes(normalizedSearch) ||
        member.dni.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [inactiveMembers, searchTerm]);

  const handleApprove = async (memberId: string) => {
    setApprovingId(memberId);

    try {
      await updateMemberStatus(memberId, "active");
      setMembers((prev) =>
        prev.map((member) => (member.id === memberId ? { ...member, status: "active" } : member))
      );
      setActiveTab("directorio");
      setActionMessage(
        "Socio aprobado. La cuota mensual se asigna según la regla vigente del club; no se cobra retroactivo automáticamente."
      );
    } catch (error) {
      console.error("Error al aprobar socio:", error);
    } finally {
      setApprovingId(null);
    }
  };

  const handleExport = () => {
    const rows =
      activeTab === "directorio"
        ? filteredDirectorio.map((member) => {
            const bal = balanceByMemberId.get(member.id);
            return [
              member.full_name,
              member.dni,
              formatMoney(bal?.membershipRemaining ?? 0),
              formatMoney(bal?.otherRemaining ?? 0),
              registerDate(member.created_at),
            ];
          })
        : activeTab === "solicitudes"
          ? filteredSolicitudes.map((member) => [member.full_name, member.dni, registerDate(member.created_at)])
          : filteredBajas.map((member) => [member.full_name, member.dni, registerDate(member.created_at)]);
    const headers =
      activeTab === "directorio"
        ? ["Nombre", "DNI", "Saldo cuota", "Saldo otros cargos", "Registro"]
        : ["Nombre", "DNI", "Registro"];
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeTab === "directorio" ? "socios.csv" : activeTab === "solicitudes" ? "solicitudes.csv" : "bajas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalMembers = members.length;
  const pendingCount = pendingMembers.length;
  const activeCount = activeMembers.length;
  const inactiveCount = inactiveMembers.length;

  return (
    <section className="space-y-5">
      <header className="border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary/70">
              Padrón y solicitudes
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-[2.15rem]">Socios</h1>
            <p className="mt-1 text-sm text-slate-600">
              {isConfigLoading
                ? "Cargando configuración..."
                : `${totalMembers} personas registradas · ${activeCount} activos · ${pendingCount} esperando aprobación · ${inactiveCount} bajas.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className={buttonClassNames({ variant: "neutral", size: "md" })}
              disabled={isLoading || members.length === 0}
            >
              <Download className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              Exportar
            </button>
            <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "md" })}>
              <Plus className="h-4 w-4" strokeWidth={1.9} aria-hidden />
              Añadir socio
            </Link>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : null}

      {!isLoading && errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}
      {!isLoading && actionMessage ? <Alert variant="success">{actionMessage}</Alert> : null}

      {!isLoading && !errorMessage && members.length === 0 ? (
        <EmptyState
          title="Todavía no hay socios registrados."
          description="Podés dar de alta un socio desde el registro público."
          actions={
            <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "md" })}>
              <Plus className="h-4 w-4" strokeWidth={1.9} aria-hidden />
              Añadir socio
            </Link>
          }
        />
      ) : null}

      {!isLoading && !errorMessage && members.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-fit flex-wrap gap-1 rounded-full bg-slate-100 p-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "directorio"}
                onClick={() => setActiveTab("directorio")}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  activeTab === "directorio"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Directorio <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === "directorio" ? "bg-nav-active !text-white" : "bg-slate-300 text-slate-800"}`}>{activeCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "solicitudes"}
                onClick={() => setActiveTab("solicitudes")}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  activeTab === "solicitudes"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Solicitudes <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === "solicitudes" ? "bg-nav-active !text-white" : "bg-slate-300 text-slate-800"}`}>{pendingCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "bajas"}
                onClick={() => setActiveTab("bajas")}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  activeTab === "bajas"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Bajas <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === "bajas" ? "bg-nav-active !text-white" : "bg-slate-300 text-slate-800"}`}>{inactiveCount}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Cuota mensual y otros cargos se gestionan por separado.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {activeTab === "directorio" ? (
              <div className="flex flex-wrap gap-2">
                <SegmentedControl
                  label="Cuota"
                  value={membershipFilter}
                  onChange={setMembershipFilter}
                  ariaLabel="Filtrar por estado de cuota"
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "in_debt", label: "Debe", tone: "accent" },
                    { value: "up_to_date", label: "Al día", tone: "success" },
                  ]}
                />
                <SegmentedControl
                  label="Cargos"
                  value={otherDebtFilter}
                  onChange={setOtherDebtFilter}
                  ariaLabel="Filtrar por saldo de cargos"
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "in_debt", label: "Con deuda", tone: "accent" },
                    { value: "up_to_date", label: "Al día", tone: "success" },
                  ]}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                {activeTab === "solicitudes"
                  ? "Personas que enviaron el formulario y esperan aprobación."
                  : "Socios dados de baja. Conservan historial de pagos, cargos y datos de contacto."}
              </p>
            )}

            <div className="relative w-full lg:w-[300px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} aria-hidden />
              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar nombre o DNI..."
                className="rounded-full py-2.5 pl-9"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Total</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{totalMembers}</p>
              <p className="text-xs text-slate-600">socios registrados</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Activos</p>
              <p className="mt-2 text-2xl font-bold text-success">{activeCount}</p>
              <p className="text-xs text-slate-600">aprobados</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Solicitudes</p>
              <p className="mt-2 text-2xl font-bold text-accent">{pendingCount}</p>
              <p className="text-xs text-slate-600">esperando</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Bajas</p>
              <p className="mt-2 text-2xl font-bold text-slate-500">{inactiveCount}</p>
              <p className="text-xs text-slate-600">fuera del padrón activo</p>
            </div>
          </div>

          {activeTab === "directorio" ? (
            filteredDirectorio.length === 0 ? (
              <EmptyState
                title="No hay socios que coincidan con el filtro actual."
                description="Probá limpiando filtros o cambiando el término de búsqueda."
              />
            ) : (
              <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <Th>Nombre</Th>
                        <Th>DNI</Th>
                        <Th>Cuota</Th>
                        <Th>Otros cargos</Th>
                        <Th>Registro</Th>
                        <Th className="text-right">Acciones</Th>
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
                            <Td>
                              <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                                  {memberInitials(member.full_name)}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-slate-950">{member.full_name}</span>
                                  <span className="text-xs text-slate-500">{memberSince(member.created_at)}</span>
                                </span>
                              </div>
                            </Td>
                            <Td className="tabular-nums text-slate-600">{member.dni}</Td>
                            <Td>
                              {memDebt ? (
                                <span className="inline-flex flex-col gap-0.5">
                                  <Badge variant="danger">{formatMoney(memRem)}</Badge>
                                  {memLines > 0 ? <span className="text-xs text-slate-500">{memLines} cuotas pend.</span> : null}
                                </span>
                              ) : (
                                <Badge variant="success">Al día</Badge>
                              )}
                            </Td>
                            <Td>
                              {othDebt ? (
                                <span className="inline-flex flex-col gap-0.5">
                                  <Badge variant="danger">{formatMoney(othRem)}</Badge>
                                  {othLines > 0 ? <span className="text-xs text-slate-500">{othLines} cargos pend.</span> : null}
                                </span>
                              ) : (
                                <Badge variant="success">Al día</Badge>
                              )}
                            </Td>
                            <Td className="text-slate-700">{registerDate(member.created_at)}</Td>
                            <Td className="text-right">
                              <Link
                                href={`/admin/socios/${member.id}`}
                                onClick={(event) => event.stopPropagation()}
                                className={buttonClassNames({
                                  variant: memDebt || othDebt ? "primary" : "neutral",
                                  size: "sm",
                                })}
                              >
                                Cargos y pagos
                              </Link>
                            </Td>
                          </tr>
                        );
                      })}
                    </TableBody>
                  </Table>
              </TableContainer>
            )
          ) : activeTab === "solicitudes" ? (
            filteredSolicitudes.length === 0 ? (
            <EmptyState
              title="No hay solicitudes pendientes."
              description="Las nuevas altas aparecerán aquí cuando envíen el formulario de registro."
            />
            ) : (
            <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <Th>Nombre</Th>
                      <Th>DNI</Th>
                      <Th>Registro</Th>
                      <Th className="text-right">Acciones</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSolicitudes.map((member) => (
                      <tr
                        key={member.id}
                        onClick={() => router.push(`/admin/socios/${member.id}`)}
                        className="cursor-pointer transition-colors hover:bg-slate-50"
                      >
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                              {memberInitials(member.full_name)}
                            </span>
                            <span className="font-semibold text-slate-950">{member.full_name}</span>
                          </div>
                        </Td>
                        <Td className="tabular-nums text-slate-600">{member.dni}</Td>
                        <Td className="text-slate-700">{registerDate(member.created_at)}</Td>
                        <Td className="text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleApprove(member.id);
                            }}
                            disabled={approvingId === member.id}
                            className={buttonClassNames({ variant: "primary", size: "sm" })}
                          >
                            {approvingId === member.id ? "Aprobando..." : "Aprobar"}
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
            </TableContainer>
            )
          ) : filteredBajas.length === 0 ? (
            <EmptyState
              title="No hay socios dados de baja."
              description="Cuando marques una baja desde la ficha del socio, aparecerá en esta sección."
            />
          ) : (
            <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <Th>Nombre</Th>
                      <Th>DNI</Th>
                      <Th>Registro</Th>
                      <Th className="text-right">Acciones</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBajas.map((member) => (
                      <tr
                        key={member.id}
                        onClick={() => router.push(`/admin/socios/${member.id}`)}
                        className="cursor-pointer transition-colors hover:bg-slate-50"
                      >
                        <Td>
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                              {memberInitials(member.full_name)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-slate-950">{member.full_name}</span>
                              <span className="text-xs text-slate-500">{memberSince(member.created_at)}</span>
                            </span>
                          </div>
                        </Td>
                        <Td className="tabular-nums text-slate-600">{member.dni}</Td>
                        <Td className="text-slate-700">{registerDate(member.created_at)}</Td>
                        <Td className="text-right">
                          <Link
                            href={`/admin/socios/${member.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className={buttonClassNames({ variant: "neutral", size: "sm" })}
                          >
                            Ver ficha
                          </Link>
                        </Td>
                      </tr>
                    ))}
                  </TableBody>
                </Table>
            </TableContainer>
          )}
        </>
      ) : null}
    </section>
  );
}
