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
} from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { formatMoney } from "@/lib/formatters";
import { listMemberChargeBalances } from "@/lib/charges";
import { listMembers, updateMemberStatus } from "@/lib/supabase";

type MemberRow = {
  id: string;
  full_name: string;
  dni: string;
  status: "pending" | "active";
  created_at: string;
};

type StatusFilter = "all" | "pending" | "active";

/** Saldo de cargos: con deuda vs al día vs no aplica (pendiente de aprobación). */
type DebtFilter = "all" | "in_debt" | "up_to_date" | "na";

export default function SociosPage() {
  const router = useRouter();
  const { config, isConfigLoading } = useActiveClubConfig();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [balanceByMemberId, setBalanceByMemberId] = useState<
    Map<string, { remaining: number; pendingLines: number }>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [debtFilter, setDebtFilter] = useState<DebtFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const [membersData, balances] = await Promise.all([listMembers(), listMemberChargeBalances()]);
      setMembers(membersData);
      const map = new Map<string, { remaining: number; pendingLines: number }>();
      for (const b of balances) {
        map.set(b.member_id, { remaining: b.remaining, pendingLines: b.pendingLines });
      }
      setBalanceByMemberId(map);
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

  const filteredMembers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return members.filter((member) => {
      const matchesStatus = statusFilter === "all" ? true : member.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : member.full_name.toLowerCase().includes(normalizedSearch) ||
            member.dni.toLowerCase().includes(normalizedSearch);

      const bal = balanceByMemberId.get(member.id);
      const remaining = bal?.remaining ?? 0;
      const inDebt = member.status === "active" && remaining > 0.001;

      const matchesDebt =
        debtFilter === "all"
          ? true
          : debtFilter === "na"
            ? member.status === "pending"
            : debtFilter === "in_debt"
              ? inDebt
              : member.status === "active" && !inDebt;

      return matchesStatus && matchesSearch && matchesDebt;
    });
  }, [members, searchTerm, statusFilter, debtFilter, balanceByMemberId]);

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
    } catch (error) {
      console.error("Error al aprobar socio:", error);
    } finally {
      setApprovingId(null);
    }
  };

  const totalMembers = members.length;
  const pendingMembers = members.filter((member) => member.status === "pending").length;
  const activeMembers = members.filter((member) => member.status === "active").length;

  return (
    <section className="space-y-4">
      <PageHeader
        title="Socios"
        description={
          isConfigLoading ? "Cargando configuración..." : `Gestión de socios de ${config.name}`
        }
        actions={
          <Link
            href="/registro"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Añadir socio
          </Link>
        }
      />

      <Card className="w-full p-6">
        {isLoading ? <p className="mt-4 text-slate-600">Cargando socios...</p> : null}

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
              <Link
                href="/registro"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Añadir socio
              </Link>
            }
          />
        ) : null}

        {!isLoading && !errorMessage && members.length > 0 ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold">Total:</span> {totalMembers}
              </div>
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold">Pendientes:</span> {pendingMembers}
              </div>
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold">Activos:</span> {activeMembers}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Filtros
              </p>
              <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 lg:gap-y-3">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="shrink-0 text-sm font-medium text-slate-600">Estado</span>
                  <div
                    className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-slate-200/80 p-1"
                    role="group"
                    aria-label="Filtrar por estado del socio"
                  >
                    {(
                      [
                        ["all", "Todos"],
                        ["pending", "Pendientes"],
                        ["active", "Activos"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setStatusFilter(value)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          statusFilter === value
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
                  <span className="shrink-0 text-sm font-medium text-slate-600">Cargos</span>
                  <div
                    className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-slate-200/80 p-1"
                    role="group"
                    aria-label="Filtrar por saldo de cargos"
                  >
                    {(
                      [
                        ["all", "Todos"],
                        ["in_debt", "Con deuda"],
                        ["up_to_date", "Al día"],
                        ["na", "No aplica"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDebtFilter(value)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          debtFilter === value
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

            {filteredMembers.length === 0 ? (
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
                      <Th>Estado</Th>
                      <Th>Saldo cargos</Th>
                      <Th>Fecha de creación</Th>
                      <Th>Acciones</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMembers.map((member) => {
                      const bal = balanceByMemberId.get(member.id);
                      const remaining = bal?.remaining ?? 0;
                      const pendingLines = bal?.pendingLines ?? 0;
                      const isInDebt = member.status === "active" && remaining > 0.001;

                      return (
                        <tr
                          key={member.id}
                          onClick={() => router.push(`/admin/socios/${member.id}`)}
                          className="cursor-pointer transition-colors hover:bg-slate-50"
                        >
                          <Td className="text-slate-900">{member.full_name}</Td>
                          <Td className="text-slate-700">{member.dni}</Td>
                          <Td className="text-slate-700">
                            {member.status === "active" ? (
                              <Badge variant="success">Activo</Badge>
                            ) : (
                              <Badge variant="warning">Pendiente</Badge>
                            )}
                          </Td>
                          <Td className="text-slate-700">
                            {member.status === "pending" ? (
                              <Badge variant="slate">No aplica</Badge>
                            ) : isInDebt ? (
                              <span className="inline-flex flex-col gap-0.5">
                                <Badge variant="danger">{formatMoney(remaining)}</Badge>
                                {pendingLines > 0 ? (
                                  <span className="text-xs text-slate-500">
                                    {pendingLines} cargo{pendingLines === 1 ? "" : "s"} pend.
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
                            {member.status === "pending" ? (
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
                            ) : (
                              <Link
                                href={`/admin/socios/${member.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                              >
                                Cargos y pagos
                              </Link>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : null}
      </Card>
    </section>
  );
}
