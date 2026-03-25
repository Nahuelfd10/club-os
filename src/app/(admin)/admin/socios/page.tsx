"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge, Button, Card, Input } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
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

type PaymentRow = {
  member_id: string;
  month: string;
};

type MemberMonthOptions = {
  options: string[];
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
  const [paymentMonthOptions, setPaymentMonthOptions] = useState<string[]>([]);
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const totalMembers = members.length;
  const pendingMembers = members.filter((member) => member.status === "pending").length;
  const activeMembers = members.filter((member) => member.status === "active").length;

  const filteredMembers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return members.filter((member) => {
      const matchesStatus = statusFilter === "all" ? true : member.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : member.full_name.toLowerCase().includes(normalizedSearch) ||
            member.dni.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [members, searchTerm, statusFilter]);

  const getMonthOptionsForMember = (member: MemberRow): MemberMonthOptions => {
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
      preselectedMonth,
      paidMonths,
      debtMonthsCount: unpaidMonths.length,
    };
  };

  const openPaymentModal = (memberId: string) => {
    const member = members.find((item) => item.id === memberId);
    if (!member) {
      return;
    }

    const { options, preselectedMonth } = getMonthOptionsForMember(member);
    setPaymentModalMemberId(memberId);
    setPaymentMonthOptions(options);
    setSelectedPaymentMonth(preselectedMonth);
  };

  const closePaymentModal = () => {
    setPaymentModalMemberId(null);
    setPaymentMonthOptions([]);
    setSelectedPaymentMonth("");
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

  const handleRegisterPayment = async (memberId: string, month: string) => {
    const member = members.find((item) => item.id === memberId);
    if (!member) {
      return;
    }

    const { options, paidMonths } = getMonthOptionsForMember(member);
    if (!month) {
      return;
    }

    if (!options.includes(month)) {
      console.error(uiMessages.payment.invalidMonth);
      return;
    }

    if (paidMonths.has(month)) {
      setActionMessage(uiMessages.payment.duplicate);
      return;
    }

    const confirmText = uiMessages.payment.confirmCreate(formatMonthLabel(month));
    const shouldContinue = window.confirm(confirmText);
    if (!shouldContinue) {
      return;
    }

    setPayingId(memberId);

    try {
      await createPayment({
        member_id: memberId,
        amount: config.monthly_fee || 1000,
        month,
      });
      await loadAdminData();
      closePaymentModal();
      setActionMessage(uiMessages.payment.createSuccess);
    } catch (error) {
      console.error("Error al registrar pago:", error);
      setActionMessage(error instanceof Error ? error.message : uiMessages.payment.createError);
    } finally {
      setPayingId(null);
    }
  };

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

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
                style={{
                  backgroundColor: statusFilter === "all" ? "#0f172a" : "#64748b",
                }}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
                style={{
                  backgroundColor: statusFilter === "pending" ? "#0f172a" : "#64748b",
                }}
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
                style={{
                  backgroundColor: statusFilter === "active" ? "#0f172a" : "#64748b",
                }}
              >
                Activos
              </button>
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

      {paymentModalMemberId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
          onClick={closePaymentModal}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Registrar pago
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Elegi el mes a registrar para este socio.
            </p>

            <div className="mt-4 space-y-2">
              <label htmlFor="payment-month" className="text-sm font-medium text-slate-700">
                Mes
              </label>
              <select
                id="payment-month"
                value={selectedPaymentMonth}
                onChange={(event) => setSelectedPaymentMonth(event.target.value)}
                className="app-select"
              >
                {paymentMonthOptions.map((monthOption) => (
                  <option key={monthOption} value={monthOption}>
                    {monthOption}
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
                onClick={() => void handleRegisterPayment(paymentModalMemberId, selectedPaymentMonth)}
                disabled={payingId === paymentModalMemberId || !selectedPaymentMonth}
                size="md"
                style={{ backgroundColor: "#059669" }}
              >
                {payingId === paymentModalMemberId ? "Registrando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
