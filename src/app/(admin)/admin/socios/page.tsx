"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminModal } from "@/components/admin/admin-modal";
import { Badge, Button, Card, Input } from "@/components/ui";
import {
  CLUB_PAYMENT_METHOD_OPTIONS,
  DEFAULT_PAYMENT_METHOD,
  normalizePaymentMethod,
  type ClubPaymentMethod,
} from "@/config/payment-method";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { formatMoney } from "@/lib/formatters";
import { createPayment, listMembers, listPayments, updateMemberStatus } from "@/lib/supabase";
import { uiMessages } from "@/lib/ui-messages";

type MemberRow = {
  id: string;
  full_name: string;
  dni: string;
  status: "pending" | "active";
  created_at: string;
};

type StatusFilter = "all" | "pending" | "active";

/** Filtro por columna Pago: deuda mensual vs al día vs socios pendientes (no aplica). */
type PaymentFilter = "all" | "in_debt" | "up_to_date" | "na";

type PaymentRow = {
  member_id: string;
  month: string;
};

type MemberMonthOptions = {
  options: string[];
  /** Meses impagos desde alta hasta el mes actual (para registrar varios). */
  unpaidMonths: string[];
  preselectedMonth: string;
  paidMonths: Set<string>;
  debtMonthsCount: number;
};

const formatMonth = (date: Date) => date.toISOString().slice(0, 7);

const addMonths = (month: string, offset: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return formatMonth(date);
};

const formatMonthLabel = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1);
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
};

export default function SociosPage() {
  const router = useRouter();
  const { config, isConfigLoading } = useActiveClubConfig();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentModalMemberId, setPaymentModalMemberId] = useState<string | null>(null);
  const [modalUnpaidMonths, setModalUnpaidMonths] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [modalPaymentMethod, setModalPaymentMethod] =
    useState<ClubPaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const totalMembers = members.length;
  const pendingMembers = members.filter((member) => member.status === "pending").length;
  const activeMembers = members.filter((member) => member.status === "active").length;

  const getMonthOptionsForMember = useCallback((member: MemberRow): MemberMonthOptions => {
    const memberPayments = payments
      .filter((payment) => payment.member_id === member.id)
      .map((payment) => payment.month);
    const paidMonths = new Set(memberPayments);

    const createdMonth = formatMonth(new Date(member.created_at));
    const unpaidMonths: string[] = [];

    let cursorMonth = createdMonth;
    while (cursorMonth <= currentMonth) {
      if (!paidMonths.has(cursorMonth)) {
        unpaidMonths.push(cursorMonth);
      }
      cursorMonth = addMonths(cursorMonth, 1);
    }

    const oldestDebtMonths = unpaidMonths.slice(0, 3);
    const nextMonth = addMonths(currentMonth, 1);
    const options = Array.from(new Set([...oldestDebtMonths, currentMonth, nextMonth]));
    const preselectedMonth = oldestDebtMonths.length > 0 ? oldestDebtMonths[0] : currentMonth;

    return {
      options,
      unpaidMonths,
      preselectedMonth,
      paidMonths,
      debtMonthsCount: unpaidMonths.length,
    };
  }, [payments, currentMonth]);

  const filteredMembers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return members.filter((member) => {
      const matchesStatus = statusFilter === "all" ? true : member.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : member.full_name.toLowerCase().includes(normalizedSearch) ||
            member.dni.toLowerCase().includes(normalizedSearch);

      const { debtMonthsCount } = getMonthOptionsForMember(member);
      const matchesPayment =
        paymentFilter === "all"
          ? true
          : paymentFilter === "na"
            ? member.status === "pending"
            : paymentFilter === "in_debt"
              ? member.status === "active" && debtMonthsCount > 0
              : member.status === "active" && debtMonthsCount === 0;

      return matchesStatus && matchesSearch && matchesPayment;
    });
  }, [members, searchTerm, statusFilter, paymentFilter, getMonthOptionsForMember]);

  const openPaymentModal = (memberId: string) => {
    const member = members.find((item) => item.id === memberId);
    if (!member) {
      return;
    }

    const { unpaidMonths } = getMonthOptionsForMember(member);
    setPaymentModalMemberId(memberId);
    setModalUnpaidMonths(unpaidMonths);
    setSelectedMonths(unpaidMonths.length > 0 ? new Set(unpaidMonths) : new Set());
    setModalPaymentMethod(DEFAULT_PAYMENT_METHOD);
  };

  const closePaymentModal = () => {
    setPaymentModalMemberId(null);
    setModalUnpaidMonths([]);
    setSelectedMonths(new Set());
    setModalPaymentMethod(DEFAULT_PAYMENT_METHOD);
  };

  const toggleSelectedMonth = (month: string) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const loadAdminData = async () => {
    setErrorMessage(null);
    setActionMessage(null);
    setIsLoading(true);

    try {
      const [membersData, paymentsData] = await Promise.all([listMembers(), listPayments()]);
      setMembers(membersData);
      setPayments(paymentsData as PaymentRow[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los datos.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

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

  const handleRegisterPayment = async () => {
    const memberId = paymentModalMemberId;
    if (!memberId) {
      return;
    }

    const member = members.find((item) => item.id === memberId);
    if (!member) {
      return;
    }

    const months = Array.from(selectedMonths).sort();
    if (months.length === 0) {
      setActionMessage("Seleccioná al menos un mes.");
      return;
    }

    const monthlyFee = config.monthly_fee || 1000;
    setPayingId(memberId);

    try {
      for (const month of months) {
        await createPayment({
          member_id: memberId,
          amount: monthlyFee,
          month,
          payment_method: modalPaymentMethod,
        });
      }
      await loadAdminData();
      closePaymentModal();
      setActionMessage(
        months.length === 1
          ? uiMessages.payment.createSuccess
          : `Se registraron ${months.length} pagos correctamente.`
      );
    } catch (error) {
      console.error("Error al registrar pago:", error);
      setActionMessage(error instanceof Error ? error.message : uiMessages.payment.createError);
    } finally {
      setPayingId(null);
    }
  };

  const modalMember = paymentModalMemberId
    ? members.find((m) => m.id === paymentModalMemberId)
    : null;
  const modalTotalAmount = (config.monthly_fee || 1000) * selectedMonths.size;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Socios</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isConfigLoading ? "Cargando configuracion..." : `Gestion de socios de ${config.name}`}
          </p>
        </div>
        <Link
          href="/registro"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Anadir socio
        </Link>
      </header>

      <Card className="w-full p-6">

        {isLoading ? <p className="mt-4 text-slate-600">Cargando socios...</p> : null}

        {!isLoading && errorMessage ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}
        {!isLoading && actionMessage ? (
          <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {actionMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage && members.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Todavia no hay socios registrados.
          </p>
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

                <div
                  className="hidden h-8 w-px shrink-0 bg-slate-200 lg:block"
                  aria-hidden
                />

                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="shrink-0 text-sm font-medium text-slate-600">Pago</span>
                  <div
                    className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-slate-200/80 p-1"
                    role="group"
                    aria-label="Filtrar por situacion de pago"
                  >
                    {(
                      [
                        ["all", "Todos"],
                        ["in_debt", "Deben"],
                        ["up_to_date", "Al dia"],
                        ["na", "No aplica"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPaymentFilter(value)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          paymentFilter === value
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
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                No hay socios que coincidan con el filtro actual.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">Nombre</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">DNI</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Estado</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Pago</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Fecha de creacion</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredMembers.map((member) => (
                      (() => {
                        const { debtMonthsCount } = getMonthOptionsForMember(member);
                        const isInDebt = debtMonthsCount > 0;
                        const debtLabel =
                          debtMonthsCount === 1
                            ? "Debe 1 mes"
                            : debtMonthsCount > 1
                              ? `Debe ${debtMonthsCount} meses`
                              : "Al dia";

                        return (
                          <tr
                            key={member.id}
                            onClick={() => router.push(`/admin/socios/${member.id}`)}
                            className="cursor-pointer transition-colors hover:bg-slate-50"
                          >
                            <td className="px-3 py-2 text-slate-900">{member.full_name}</td>
                            <td className="px-3 py-2 text-slate-700">{member.dni}</td>
                            <td className="px-3 py-2 text-slate-700">
                              {member.status === "active" ? (
                                <Badge variant="success">Activo</Badge>
                              ) : (
                                <Badge variant="warning">Pendiente</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {member.status === "pending" ? (
                                <Badge variant="slate">No aplica</Badge>
                              ) : isInDebt ? (
                                <Badge variant="danger">{debtLabel}</Badge>
                              ) : (
                                <Badge variant="success">{debtLabel}</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {new Date(member.created_at).toLocaleString("es-AR")}
                            </td>
                            <td className="px-3 py-2">
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
                              ) : null}{" "}
                              {member.status === "active" && isInDebt ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openPaymentModal(member.id);
                                  }}
                                  disabled={payingId === member.id}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  Registrar pago
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Card>

      <AdminModal open={paymentModalMemberId !== null} onClose={closePaymentModal}>
        <h2 className="text-lg font-semibold text-slate-900">Registrar pago</h2>
        {modalMember ? (
          <p className="mt-1 text-sm font-medium text-slate-800">{modalMember.full_name}</p>
        ) : null}
        <p className="mt-1 text-sm text-slate-600">
          Marcá uno o más meses impagos y el método de cobro. El total se actualiza según la selección.
        </p>

        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {[...modalUnpaidMonths].sort().map((monthKey) => (
            <label
              key={monthKey}
              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedMonths.has(monthKey)}
                onChange={() => toggleSelectedMonth(monthKey)}
              />
              <span>
                <span className="font-medium text-slate-900">{formatMonthLabel(monthKey)}</span>
                <span className="ml-1 text-xs text-slate-500">{monthKey}</span>
              </span>
            </label>
          ))}
        </div>
        {modalUnpaidMonths.length === 0 ? (
          <p className="mt-2 text-sm text-amber-800">No hay meses impagos para registrar.</p>
        ) : null}

        <p className="mt-4 text-xl font-bold tabular-nums text-slate-900">
          Total: {formatMoney(modalTotalAmount)}
        </p>

        <div className="mt-4 space-y-2">
          <label htmlFor="payment-method-modal" className="text-sm font-medium text-slate-700">
            Método de pago
          </label>
          <select
            id="payment-method-modal"
            name="payment_method"
            required
            value={modalPaymentMethod}
            onChange={(event) =>
              setModalPaymentMethod(normalizePaymentMethod(event.target.value))
            }
            className="app-select w-full"
          >
            {CLUB_PAYMENT_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            type="button"
            onClick={closePaymentModal}
            disabled={payingId === paymentModalMemberId}
            variant="neutral"
            size="md"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleRegisterPayment()}
            disabled={
              payingId === paymentModalMemberId ||
              selectedMonths.size === 0 ||
              modalUnpaidMonths.length === 0
            }
            size="md"
            style={{ backgroundColor: "#059669" }}
          >
            {payingId === paymentModalMemberId ? "Registrando..." : "Confirmar"}
          </Button>
        </div>
      </AdminModal>
    </section>
  );
}
