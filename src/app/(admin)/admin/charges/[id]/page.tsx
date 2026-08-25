"use client";

import { Check, ChevronDown, ChevronLeft, MessageCircle, Pencil, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import { ChargePaymentModal } from "@/components/admin/charge-payment-modal";
import { ImportChargeLines } from "@/components/admin/import-charge-lines";
import {
  CLUB_PAYMENT_METHOD_OPTIONS,
  DEFAULT_PAYMENT_METHOD,
  paymentMethodLabel,
  type ClubPaymentMethod,
} from "@/config/payment-method";
import { Alert, Badge, Button, Input, PageHeader, SegmentedControl, Select, TableContainer, Textarea } from "@/components/ui";
import {
  createChargeExtraContribution,
  listChargeExtraContributions,
  type ChargeExtraContributionRow,
} from "@/lib/charge-contributions";
import {
  addChargeLine,
  assignChargeToMissingMembers,
  assignChargeToMember,
  assignLineToMember,
  chargeHasPayments,
  deleteChargeLine,
  formatBillingPeriod,
  getChargeById,
  getChargeFinancials,
  getChargePaymentsByMemberChargeId,
  getMemberChargesForCharge,
  getMissingMembersForCharge,
  registerChargePayment,
  updateCharge,
  updateChargeLine,
  updateMemberChargeTracking,
  chargeLineDisplayName,
  MEMBER_CHARGE_TRACKING_OPTIONS,
  type ChargeDetail,
  type ChargeListKind,
  type ChargePaymentRow,
  type MemberChargeForChargeRow,
  type MemberChargeTrackingStatus,
} from "@/lib/charges";
import { listMembers } from "@/lib/supabase";
import {
  memberChargeStatusLabel,
  remainingAmount,
} from "@/lib/charges-ui";
import { formatDueDate, formatPaidAt } from "@/lib/datetime";
import { formatMoney } from "@/lib/formatters";
import { createExpense, deleteExpense, listExpensesByChargeId, updateExpense, type ExpenseRow } from "@/lib/expenses";
import { useClubRoutes } from "@/lib/use-club-routes";
import {
  buildChargeDebtWhatsAppLink,
  buildChargeDebtWhatsAppMessage,
  digitsOnly,
} from "@/lib/whatsapp-reminder";
import type { MemberStatus } from "@/types";

type FilterKey = "all" | "pending" | "partial" | "paid";
type TrackingFilterKey = "all" | MemberChargeTrackingStatus;
type SegmentTone = "default" | "muted" | "accent" | "success";

function chargeCategoryLabel(category: string | null): string {
  if (category === "membership") return "Cuota mensual";
  if (category === "activity") return "Actividad";
  if (category === "fee") return "Inscripcion / otro";
  return category ?? "Cobro";
}

function chargeScopeLabel(charge: ChargeDetail): string {
  return charge.group?.name ?? "Todo el club - activos";
}

function listKindLabel(kind: ChargeListKind): string {
  return kind === "order" ? "Indumentaria" : "General";
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lineStatusPillClass(status: MemberChargeForChargeRow["status"]): string {
  if (status === "paid") {
    return "border-success/20 bg-success/10 text-success";
  }

  if (status === "partial") {
    return "border-warning/25 bg-warning/10 text-warning";
  }

  return "border-warning/25 bg-warning/10 text-warning";
}

function trackingPillClass(status: MemberChargeTrackingStatus): string {
  if (status === "closed") {
    return "border-success/25 bg-success/10 text-success";
  }

  if (status === "message_sent") {
    return "border-sky-300 bg-sky-50 text-sky-700";
  }

  if (status === "responded") {
    return "border-violet-300 bg-violet-50 text-violet-700";
  }

  if (status === "promised" || status === "partial_payment") {
    return "border-warning/30 bg-warning/10 text-warning";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function trackingLabel(status: MemberChargeTrackingStatus): string {
  return MEMBER_CHARGE_TRACKING_OPTIONS.find((option) => option.value === status)?.label ?? "Sin contactar";
}

function trackingSegmentTone(status: MemberChargeTrackingStatus): SegmentTone {
  if (status === "not_contacted") {
    return "muted";
  }

  if (status === "closed") {
    return "success";
  }

  if (status === "promised" || status === "partial_payment") {
    return "accent";
  }

  return "default";
}

export default function AdminChargeDetailPage() {
  const params = useParams<{ id: string }>();
  const routes = useClubRoutes();
  const chargeId = params?.id ?? "";

  const [charge, setCharge] = useState<ChargeDetail | null>(null);
  const [hasPayments, setHasPayments] = useState<boolean | null>(null);
  const [rows, setRows] = useState<MemberChargeForChargeRow[]>([]);
  const [missingMembers, setMissingMembers] = useState<
    Array<{ id: string; full_name: string; dni: string; status: MemberStatus }>
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [financials, setFinancials] = useState<{
    total_expected: number;
    total_collected: number;
    total_expenses: number;
  } | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [trackingFilter, setTrackingFilter] = useState<TrackingFilterKey>("all");

  const [expandedMcId, setExpandedMcId] = useState<string | null>(null);
  const [historyByMc, setHistoryByMc] = useState<Record<string, ChargePaymentRow[]>>({});
  const [chargePayments, setChargePayments] = useState<ChargePaymentRow[]>([]);
  const [extraContributions, setExtraContributions] = useState<ChargeExtraContributionRow[]>([]);
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [trackingUpdatingId, setTrackingUpdatingId] = useState<string | null>(null);

  const [payModalRow, setPayModalRow] = useState<MemberChargeForChargeRow | null>(null);
  const [contributionModalOpen, setContributionModalOpen] = useState(false);
  const [contributionRow, setContributionRow] = useState<MemberChargeForChargeRow | null>(null);
  const [contributionSource, setContributionSource] = useState<"line" | "member" | "club" | "external">("line");
  const [contributionMemberId, setContributionMemberId] = useState("");
  const [contributionExternalName, setContributionExternalName] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionDate, setContributionDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [contributionMethod, setContributionMethod] = useState<"transfer" | "cash" | "mercadopago">("transfer");
  const [contributionNote, setContributionNote] = useState("");
  const [contributionSaving, setContributionSaving] = useState(false);
  const [selectedWhatsAppIds, setSelectedWhatsAppIds] = useState<string[]>([]);
  const [whatsAppBatchOpen, setWhatsAppBatchOpen] = useState(false);
  const [whatsAppBatchIndex, setWhatsAppBatchIndex] = useState(0);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editSupplierName, setEditSupplierName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [assigningMissing, setAssigningMissing] = useState(false);
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);

  // Lineas (member_charges): agregar/editar/eliminar manualmente.
  type MemberOption = { id: string; full_name: string; dni: string; status: MemberStatus };
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [lineEditingId, setLineEditingId] = useState<string | null>(null);
  const [lineMode, setLineMode] = useState<"member" | "external">("member");
  const [lineMemberId, setLineMemberId] = useState("");
  const [lineExternalName, setLineExternalName] = useState("");
  const [lineDescription, setLineDescription] = useState("");
  const [lineQuantity, setLineQuantity] = useState("1");
  const [lineAmount, setLineAmount] = useState("");
  const [lineSaving, setLineSaving] = useState(false);
  const [lineFormError, setLineFormError] = useState<string | null>(null);
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
  // Pop-up para reasignar linea externa a socio (un select por fila externa).
  const [assigningExternalLineId, setAssigningExternalLineId] = useState<string | null>(null);
  const [externalAssignMemberId, setExternalAssignMemberId] = useState("");

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseMethod, setExpenseMethod] = useState<ClubPaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [expenseOrigin, setExpenseOrigin] = useState("Club / caja");
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseDeletingId, setExpenseDeletingId] = useState<string | null>(null);

  const formatExpenseDate = (value: string) => {
    if (!value) {
      return "-";
    }
    return new Date(`${value}T12:00:00`).toLocaleDateString("es-AR");
  };

  const loadAll = useCallback(async () => {
    if (!chargeId) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setActionMessage(null);
    try {
      const ch = await getChargeById(chargeId);
      setCharge(ch);
      if (!ch) {
        setRows([]);
        setMissingMembers([]);
        setHasPayments(null);
        setFinancials(null);
        setExpenses([]);
        setChargePayments([]);
        setExtraContributions([]);
        return;
      }

      const membershipCharge = ch.category === "membership";
      const [hp, memberCharges, missing, fin, membersList] = await Promise.all([
        chargeHasPayments(chargeId),
        getMemberChargesForCharge(chargeId),
        membershipCharge
          ? Promise.resolve([])
          : getMissingMembersForCharge({ chargeId, groupId: ch.group?.id ?? null }),
        getChargeFinancials(chargeId),
        listMembers(),
      ]);
      setHasPayments(hp);
      setAllMembers(
        (membersList ?? []).map((m) => ({
          id: m.id,
          full_name: m.full_name,
          dni: m.dni,
          status: m.status,
        }))
      );
      setRows(memberCharges);
      setMissingMembers(missing);
      setFinancials(fin);
      const paymentLists = await Promise.all(
        memberCharges.map((row) => getChargePaymentsByMemberChargeId(row.id))
      );
      setChargePayments(paymentLists.flat());
      setExtraContributions(membershipCharge ? [] : await listChargeExtraContributions(chargeId));

      setExpensesLoading(true);
      try {
        const exp = await listExpensesByChargeId(chargeId);
        setExpenses(exp);
      } finally {
        setExpensesLoading(false);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar el cargo.");
    } finally {
      setIsLoading(false);
    }
  }, [chargeId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filter !== "all" && row.status !== filter) {
        return false;
      }
      if (trackingFilter !== "all" && row.tracking_status !== trackingFilter) {
        return false;
      }
      return true;
    });
  }, [rows, filter, trackingFilter]);

  const whatsAppEligibleRows = useMemo(() => {
    return filteredRows.filter((row) => {
      if (!row.member?.phone) {
        return false;
      }
      if (digitsOnly(row.member.phone).length < 8) {
        return false;
      }
      return remainingAmount(row) > 0.001;
    });
  }, [filteredRows]);

  const whatsAppNoPhoneRows = useMemo(() => {
    return filteredRows.filter((row) => {
      if (!row.member || remainingAmount(row) <= 0.001) {
        return false;
      }
      return !row.member.phone || digitsOnly(row.member.phone).length < 8;
    });
  }, [filteredRows]);

  const visiblePaidRows = useMemo(
    () => filteredRows.filter((row) => remainingAmount(row) <= 0.001),
    [filteredRows]
  );

  const extraContributionsTotal = useMemo(
    () => extraContributions.reduce((sum, item) => sum + item.amount, 0),
    [extraContributions]
  );

  const contributionByLine = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of extraContributions) {
      if (!item.member_charge_id) continue;
      map.set(item.member_charge_id, (map.get(item.member_charge_id) ?? 0) + item.amount);
    }
    return map;
  }, [extraContributions]);

  const rowById = useMemo(() => {
    const map = new Map<string, MemberChargeForChargeRow>();
    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  }, [rows]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of allMembers) {
      map.set(member.id, member.full_name);
    }
    return map;
  }, [allMembers]);

  const listMovements = useMemo(() => {
    const payments = chargePayments.map((payment) => {
      const row = rowById.get(payment.member_charge_id);
      return {
        id: `payment-${payment.id}`,
        date: payment.paid_at,
        createdAt: payment.created_at,
        type: "Pago" as const,
        person: row ? chargeLineDisplayName(row) : "Linea eliminada",
        amount: payment.amount,
        method: payment.payment_method,
        note: row ? "Aplicado al saldo" : "",
      };
    });

    const contributions = extraContributions.map((item) => {
      const row = item.member_charge_id ? rowById.get(item.member_charge_id) : null;
      return {
        id: `extra-${item.id}`,
        date: item.contributed_at,
        createdAt: item.created_at,
        type: "Aporte extra" as const,
        person:
          row
            ? chargeLineDisplayName(row)
            : item.member_id
              ? memberNameById.get(item.member_id) ?? "Socio"
              : item.contributor_name ?? "Aporte externo",
        amount: item.amount,
        method: item.payment_method,
        note: item.note ?? "",
      };
    });

    const expenseMovements = expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.spent_at,
      createdAt: expense.created_at,
      type: "Egreso" as const,
      person: expense.origin_label?.trim() || "Club / caja",
      amount: expense.amount,
      method: expense.payment_method,
      note: [expense.description, expense.category].filter(Boolean).join(" - "),
    }));

    return [...payments, ...contributions, ...expenseMovements].sort((a, b) => {
      const byMovementDate = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (byMovementDate !== 0) return byMovementDate;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [chargePayments, expenses, extraContributions, memberNameById, rowById]);

  const selectedWhatsAppRows = useMemo(() => {
    const selected = new Set(selectedWhatsAppIds);
    return rows.filter((row) => selected.has(row.id) && row.member?.phone && remainingAmount(row) > 0.001);
  }, [rows, selectedWhatsAppIds]);

  const counts = useMemo(() => {
    const map: Record<FilterKey, number> = { all: rows.length, pending: 0, partial: 0, paid: 0 };
    for (const r of rows) {
      map[r.status] += 1;
    }
    return map;
  }, [rows]);

  const trackingCounts = useMemo(() => {
    const map: Record<TrackingFilterKey, number> = {
      all: rows.length,
      not_contacted: 0,
      message_sent: 0,
      responded: 0,
      promised: 0,
      partial_payment: 0,
      closed: 0,
    };
    for (const row of rows) {
      map[row.tracking_status] += 1;
    }
    return map;
  }, [rows]);

  const dailyCollection = useMemo(() => {
    const paymentsWithDates = chargePayments
      .map((payment) => ({
        ...payment,
        date: new Date(payment.paid_at),
      }))
      .filter((payment) => !Number.isNaN(payment.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const referenceDate =
      paymentsWithDates.at(-1)?.date ??
      (charge?.billing_period ? new Date(`${charge.billing_period}T12:00:00`) : new Date());
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totals = new Map<string, number>();

    for (const payment of paymentsWithDates) {
      if (payment.date.getFullYear() !== year || payment.date.getMonth() !== month) {
        continue;
      }
      const key = dateKey(payment.date);
      totals.set(key, (totals.get(key) ?? 0) + payment.amount);
    }

    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month, index + 1, 12);
      const amount = totals.get(dateKey(date)) ?? 0;
      return {
        day: index + 1,
        amount,
      };
    });
    const maxAmount = Math.max(...days.map((day) => day.amount), 0);

    return {
      days,
      maxAmount,
      label: monthLabel(referenceDate),
    };
  }, [charge?.billing_period, chargePayments]);

  useEffect(() => {
    const available = new Set(whatsAppEligibleRows.map((row) => row.id));
    setSelectedWhatsAppIds((prev) => prev.filter((id) => available.has(id)));
  }, [whatsAppEligibleRows]);

  /**
   * Detecta nombres externos que se repiten (ej. "Diame" en 7 lineas de
   * Camperas) para sugerir bulk-assign. Solo agrupa cuando hay 2+ lineas
   * con el mismo external_name normalizado y todas siguen siendo externas.
   */
  const externalNameGroups = useMemo(() => {
    const map = new Map<string, MemberChargeForChargeRow[]>();
    for (const row of rows) {
      if (row.member_id || !row.external_name) continue;
      const key = row.external_name.trim().toLowerCase();
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .filter(([, list]) => list.length >= 2)
      .map(([, list]) => ({
        displayName: list[0].external_name?.trim() ?? "",
        rows: list,
      }))
      .sort((a, b) => b.rows.length - a.rows.length);
  }, [rows]);

  const [bulkAssignName, setBulkAssignName] = useState<string | null>(null);
  const [bulkAssignMemberId, setBulkAssignMemberId] = useState("");
  const [bulkAssignSaving, setBulkAssignSaving] = useState(false);

  const openBulkAssign = (displayName: string) => {
    setBulkAssignName(displayName);
    setBulkAssignMemberId("");
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignName || !bulkAssignMemberId) return;
    const group = externalNameGroups.find((g) => g.displayName === bulkAssignName);
    if (!group) return;
    setBulkAssignSaving(true);
    setActionMessage(null);
    let okCount = 0;
    let errCount = 0;
    for (const row of group.rows) {
      try {
        await assignLineToMember(row.id, bulkAssignMemberId);
        okCount += 1;
      } catch {
        errCount += 1;
      }
    }
    setBulkAssignSaving(false);
    setBulkAssignName(null);
    setBulkAssignMemberId("");
    setActionMessage(
      errCount === 0
        ? `Reasigne ${okCount} linea(s) al socio.`
        : `Reasigne ${okCount} linea(s); ${errCount} con error.`
    );
    await loadAll();
  };

  const loadHistory = async (memberChargeId: string) => {
    setHistoryLoadingId(memberChargeId);
    try {
      const list = await getChargePaymentsByMemberChargeId(memberChargeId);
      setHistoryByMc((prev) => ({ ...prev, [memberChargeId]: list }));
    } catch (error) {
      console.error(error);
      setHistoryByMc((prev) => ({ ...prev, [memberChargeId]: [] }));
    } finally {
      setHistoryLoadingId(null);
    }
  };

  const toggleExpand = (memberChargeId: string) => {
    if (expandedMcId === memberChargeId) {
      setExpandedMcId(null);
      return;
    }
    setExpandedMcId(memberChargeId);
    if (!historyByMc[memberChargeId]) {
      void loadHistory(memberChargeId);
    }
  };

  const openPayModal = (row: MemberChargeForChargeRow) => {
    setPayModalRow(row);
  };

  const closePayModal = () => {
    setPayModalRow(null);
  };

  const openContributionModal = (row?: MemberChargeForChargeRow) => {
    setContributionRow(row ?? null);
    setContributionSource(row ? "line" : "club");
    setContributionMemberId(row?.member_id ?? "");
    setContributionExternalName(row ? chargeLineDisplayName(row) : "");
    setContributionAmount("");
    setContributionDate(new Date().toISOString().slice(0, 16));
    setContributionMethod("transfer");
    setContributionNote(row ? `Aporte extra de ${chargeLineDisplayName(row)}` : "");
    setContributionModalOpen(true);
  };

  const closeContributionModal = () => {
    if (!contributionSaving) {
      setContributionModalOpen(false);
    }
  };

  const submitContribution = async () => {
    if (!charge) return;
    const amount = Number(contributionAmount.replace(",", ".").trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionMessage("Indica un monto valido para el aporte extra.");
      return;
    }

    const sourceName =
      contributionSource === "club"
        ? "Club"
        : contributionSource === "line" && contributionRow
          ? chargeLineDisplayName(contributionRow)
          : contributionExternalName.trim();

    if (contributionSource === "external" && !sourceName) {
      setActionMessage("Indica quien hizo el aporte.");
      return;
    }
    if (contributionSource === "member" && !contributionMemberId) {
      setActionMessage("Elegi el socio que hizo el aporte.");
      return;
    }

    setContributionSaving(true);
    try {
      await createChargeExtraContribution({
        charge_id: charge.id,
        member_charge_id: contributionSource === "line" ? contributionRow?.id ?? null : null,
        member_id:
          contributionSource === "line"
            ? contributionRow?.member_id ?? null
            : contributionSource === "member"
              ? contributionMemberId || null
              : null,
        contributor_name:
          contributionSource === "member"
            ? null
            : sourceName,
        amount,
        contributed_at: contributionDate ? new Date(contributionDate).toISOString() : new Date().toISOString(),
        payment_method: contributionMethod,
        note: contributionNote,
      });
      setContributionModalOpen(false);
      setActionMessage("Aporte extra registrado.");
      await loadAll();
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? error.message : "No se pudo registrar el aporte extra.");
    } finally {
      setContributionSaving(false);
    }
  };

  const submitPayment = async (payload: {
    amount: number;
    paid_at: string;
    payment_method: "transfer" | "cash" | "mercadopago";
  }) => {
    if (!payModalRow) {
      return;
    }
    const memberChargeId = payModalRow.id;
    await registerChargePayment({
      member_charge_id: memberChargeId,
      amount: payload.amount,
      paid_at: payload.paid_at,
      payment_method: payload.payment_method,
    });
    setActionMessage("Pago registrado.");
    await loadAll();
    if (expandedMcId === memberChargeId) {
      await loadHistory(memberChargeId);
    }
  };

  const handleTrackingChange = async (
    row: MemberChargeForChargeRow,
    trackingStatus: MemberChargeTrackingStatus,
    options?: { silent?: boolean }
  ) => {
    setTrackingUpdatingId(row.id);
    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              tracking_status: trackingStatus,
              tracking_updated_at: new Date().toISOString(),
            }
          : item
      )
    );
    try {
      await updateMemberChargeTracking(row.id, {
        tracking_status: trackingStatus,
        tracking_note: row.tracking_note,
        tracking_next_action_at: row.tracking_next_action_at,
      });
      if (!options?.silent) {
        setActionMessage("Seguimiento actualizado.");
      }
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "No se pudo actualizar el seguimiento."
      );
      await loadAll();
    } finally {
      setTrackingUpdatingId(null);
    }
  };

  const buildWhatsAppBatchMessage = (row: MemberChargeForChargeRow) => {
    if (!charge || !row.member) {
      return "";
    }

    return buildChargeDebtWhatsAppMessage({
      fullName: row.member.full_name,
      chargeName: charge.name,
      groupName: charge.group?.name ?? "Sin grupo",
      remainingFormatted: formatMoney(remainingAmount(row)),
    });
  };

  const buildWhatsAppBatchUrl = (row: MemberChargeForChargeRow) => {
    if (!row.member?.phone) {
      return null;
    }
    const digits = digitsOnly(row.member.phone);
    if (digits.length < 8) {
      return null;
    }
    return `https://wa.me/${digits}?text=${encodeURIComponent(buildWhatsAppBatchMessage(row))}`;
  };

  const toggleWhatsAppSelection = (rowId: string) => {
    setSelectedWhatsAppIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const selectVisibleWhatsAppRows = () => {
    setSelectedWhatsAppIds(whatsAppEligibleRows.map((row) => row.id));
  };

  const openWhatsAppBatch = () => {
    if (selectedWhatsAppRows.length === 0) {
      setActionMessage("Selecciona al menos un socio con saldo y telefono.");
      return;
    }
    setWhatsAppBatchIndex(0);
    setCopyMessage(null);
    setWhatsAppBatchOpen(true);
  };

  const closeWhatsAppBatch = () => {
    setWhatsAppBatchOpen(false);
    setCopyMessage(null);
  };

  const currentWhatsAppBatchRow = selectedWhatsAppRows[whatsAppBatchIndex] ?? null;

  const goToNextWhatsApp = () => {
    setCopyMessage(null);
    setWhatsAppBatchIndex((prev) => Math.min(prev + 1, Math.max(0, selectedWhatsAppRows.length - 1)));
  };

  const markCurrentWhatsAppSent = async (options?: { next?: boolean }) => {
    if (!currentWhatsAppBatchRow) {
      return;
    }
    await handleTrackingChange(currentWhatsAppBatchRow, "message_sent", { silent: true });
    if (options?.next && whatsAppBatchIndex < selectedWhatsAppRows.length - 1) {
      goToNextWhatsApp();
    } else {
      setActionMessage("Mensaje marcado como enviado.");
    }
  };

  const copyCurrentWhatsAppMessage = async () => {
    if (!currentWhatsAppBatchRow) {
      return;
    }
    try {
      await navigator.clipboard.writeText(buildWhatsAppBatchMessage(currentWhatsAppBatchRow));
      setCopyMessage("Mensaje copiado.");
    } catch {
      setCopyMessage("No se pudo copiar automaticamente. Podes seleccionar el texto manualmente.");
    }
  };

  const openCurrentWhatsApp = async () => {
    if (!currentWhatsAppBatchRow) {
      return;
    }
    const url = buildWhatsAppBatchUrl(currentWhatsAppBatchRow);
    if (!url) {
      setCopyMessage("Este socio no tiene un telefono valido.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    await markCurrentWhatsAppSent();
  };

  const openCreateExpense = () => {
    setEditingExpense(null);
    setExpenseDesc("");
    setExpenseCategory("");
    setExpenseAmount("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setExpenseMethod(DEFAULT_PAYMENT_METHOD);
    setExpenseOrigin("Club / caja");
    setExpenseModalOpen(true);
  };

  const openEditExpense = (expense: ExpenseRow) => {
    setEditingExpense(expense);
    setExpenseDesc(expense.description ?? "");
    setExpenseCategory(expense.category ?? "");
    setExpenseAmount(String(expense.amount ?? ""));
    setExpenseDate(expense.date ?? new Date().toISOString().slice(0, 10));
    setExpenseMethod(expense.payment_method ?? DEFAULT_PAYMENT_METHOD);
    setExpenseOrigin(expense.origin_label?.trim() || "Club / caja");
    setExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    if (expenseSaving) {
      return;
    }
    setExpenseModalOpen(false);
  };

  const saveExpense = async () => {
    if (!charge) {
      return;
    }
    const description = expenseDesc.trim();
    if (!description) {
      setActionMessage("La descripcion del egreso es obligatoria.");
      return;
    }
    const raw = expenseAmount.replace(",", ".").trim();
    const amount = Number(raw);
    if (raw === "" || Number.isNaN(amount)) {
      setActionMessage("Indica un monto valido para el egreso.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionMessage("El monto del egreso debe ser mayor a cero.");
      return;
    }
    const date = expenseDate.trim() || new Date().toISOString().slice(0, 10);

    setExpenseSaving(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          description,
          amount,
          category: expenseCategory.trim() || null,
          date,
          payment_method: expenseMethod,
          origin_label: expenseOrigin,
          charge_id: charge.id,
        });
        setActionMessage("Egreso actualizado.");
      } else {
        await createExpense({
          description,
          amount,
          category: expenseCategory.trim() || null,
          date,
          spent_at: new Date().toISOString(),
          payment_method: expenseMethod,
          origin_label: expenseOrigin,
          charge_id: charge.id,
        });
        setActionMessage("Egreso registrado.");
      }
      setExpenseModalOpen(false);
      await loadAll();
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? error.message : "No se pudo guardar el egreso.");
    } finally {
      setExpenseSaving(false);
    }
  };

  const removeExpense = async (expense: ExpenseRow) => {
    const ok = window.confirm(`Eliminar el egreso "${expense.description}"?`);
    if (!ok) {
      return;
    }
    setExpenseDeletingId(expense.id);
    try {
      await deleteExpense(expense.id);
      setActionMessage("Egreso eliminado.");
      await loadAll();
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? error.message : "No se pudo eliminar el egreso.");
    } finally {
      setExpenseDeletingId(null);
    }
  };

  const openEdit = () => {
    if (!charge) {
      return;
    }
    setEditName(charge.name);
    setEditDescription(charge.description ?? "");
    setEditAmount(String(charge.amount));
    setEditDueDate(charge.due_date ?? "");
    setEditSupplierName(charge.supplier_name ?? "");
    setEditOpen(true);
  };

  // ----- Lineas (member_charges) -----
  const resetLineForm = () => {
    setLineEditingId(null);
    setLineMode("member");
    setLineMemberId("");
    setLineExternalName("");
    setLineDescription("");
    setLineQuantity("1");
    setLineAmount("");
    setLineFormError(null);
  };

  const openAddLine = () => {
    resetLineForm();
    setLineModalOpen(true);
  };

  const openEditLine = (row: MemberChargeForChargeRow) => {
    setLineEditingId(row.id);
    if (row.member_id) {
      setLineMode("member");
      setLineMemberId(row.member_id);
      setLineExternalName("");
    } else {
      setLineMode("external");
      setLineMemberId("");
      setLineExternalName(row.external_name ?? "");
    }
    setLineDescription(row.description ?? "");
    setLineQuantity(String(row.quantity ?? 1));
    setLineAmount(String(row.amount));
    setLineFormError(null);
    setLineModalOpen(true);
  };

  const closeLineModal = () => {
    if (!lineSaving) {
      setLineModalOpen(false);
      resetLineForm();
    }
  };

  const handleSaveLine = async () => {
    if (!charge) return;
    const description = lineDescription.trim() || null;
    const qtyNum = Number(lineQuantity.replace(",", ".").trim());
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setLineFormError("La cantidad debe ser mayor a cero.");
      return;
    }
    const rawAmount = lineAmount.replace(",", ".").trim();
    const amountNum = Number(rawAmount);
    if (rawAmount === "" || !Number.isFinite(amountNum) || amountNum <= 0) {
      setLineFormError("Indica un monto mayor a cero.");
      return;
    }

    if (lineMode === "member" && !lineMemberId) {
      setLineFormError("Elegi un socio o cambia el modo a 'Externo'.");
      return;
    }
    if (lineMode === "external" && !lineExternalName.trim()) {
      setLineFormError("Indica el nombre del comprador externo.");
      return;
    }

    setLineSaving(true);
    setLineFormError(null);
    try {
      const payload = {
        member_id: lineMode === "member" ? lineMemberId : null,
        external_name: lineMode === "external" ? lineExternalName.trim() : null,
        description,
        quantity: Math.floor(qtyNum),
        amount: amountNum,
      };
      if (lineEditingId) {
        await updateChargeLine(lineEditingId, payload);
        setActionMessage("Linea actualizada.");
      } else {
        await addChargeLine(charge.id, payload);
        setActionMessage("Linea agregada.");
      }
      setLineModalOpen(false);
      resetLineForm();
      await loadAll();
    } catch (error) {
      setLineFormError(error instanceof Error ? error.message : "No se pudo guardar la linea.");
    } finally {
      setLineSaving(false);
    }
  };

  const handleDeleteLine = async (row: MemberChargeForChargeRow) => {
    const label = chargeLineDisplayName(row);
    const hasPaid = (row.paid_amount ?? 0) > 0;
    const ok = window.confirm(
      hasPaid
        ? `La linea "${label}" tiene ${formatMoney(row.paid_amount)} cobrado. Si la borras, tambien se eliminan los pagos asociados. Continuar?`
        : `Eliminar la linea "${label}"?`
    );
    if (!ok) return;
    setDeletingLineId(row.id);
    setActionMessage(null);
    try {
      await deleteChargeLine(row.id);
      setActionMessage("Linea eliminada.");
      await loadAll();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo eliminar la linea.");
    } finally {
      setDeletingLineId(null);
    }
  };

  const handleAssignExternalLine = async (lineId: string) => {
    if (!externalAssignMemberId) {
      return;
    }
    setActionMessage(null);
    try {
      await assignLineToMember(lineId, externalAssignMemberId);
      setActionMessage("Linea reasignada al socio.");
      setAssigningExternalLineId(null);
      setExternalAssignMemberId("");
      await loadAll();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo reasignar la linea.");
    }
  };

  const saveEdit = async () => {
    if (!charge) {
      return;
    }
    const name = editName.trim();
    if (!name) {
      setActionMessage("El nombre es obligatorio.");
      return;
    }
    const raw = editAmount.replace(",", ".").trim();
    const amount = Number(raw);
    if (raw === "" || Number.isNaN(amount)) {
      setActionMessage("Indica un monto valido.");
      return;
    }
    setEditSaving(true);
    try {
      await updateCharge(charge.id, {
        name,
        description: editDescription.trim() || null,
        amount,
        due_date: editDueDate.trim() || null,
        list_kind: charge.list_kind,
        supplier_name: editSupplierName.trim() || null,
      });
      setEditOpen(false);
      setActionMessage("Cargo actualizado.");
      await loadAll();
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? error.message : "No se pudo actualizar el cargo.");
    } finally {
      setEditSaving(false);
    }
  };

  const assignMissing = async () => {
    if (!charge || charge.category === "membership" || missingMembers.length === 0) {
      return;
    }
    setAssigningMissing(true);
    setActionMessage(null);
    try {
      await assignChargeToMissingMembers(charge.id);
      setActionMessage("Miembros asignados correctamente.");
      await loadAll();
    } catch (error) {
      console.error(error);
      setActionMessage(
        error instanceof Error ? error.message : "No se pudieron asignar los miembros."
      );
    } finally {
      setAssigningMissing(false);
    }
  };

  const assignOne = async (memberId: string) => {
    if (!charge || charge.category === "membership") {
      return;
    }
    setAssigningMemberId(memberId);
    setActionMessage(null);
    try {
      const perMemberAmount =
        charge.type === "total"
          ? rows.length > 0
            ? rows[0].amount
            : charge.amount
          : charge.amount;
      await assignChargeToMember({
        member_id: memberId,
        charge_id: charge.id,
        amount: perMemberAmount,
      });
      setActionMessage("Miembro asignado al cargo.");
      await loadAll();
    } catch (error: unknown) {
      console.error(error);
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code === "23505") {
        setActionMessage("Ese socio ya tenia asignado este cargo.");
        await loadAll();
      } else {
        setActionMessage(
          error instanceof Error ? error.message : "No se pudo asignar el miembro."
        );
      }
    } finally {
      setAssigningMemberId(null);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Cargando cargo...</p>
        </div>
      </section>
    );
  }

  if (errorMessage || !charge) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-slate-700">{errorMessage ?? "No se encontro el cargo."}</p>
          <Link
            href={routes.adminPath("charges")}
            className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Volver a cuotas y listas
          </Link>
        </div>
      </section>
    );
  }

  const isMembershipCharge = charge.category === "membership";
  const isOrderList = !isMembershipCharge && charge.list_kind === "order";
  const tableColSpan = isMembershipCharge ? 10 : 11;

  return (
    <>
      <section className="space-y-6">
        <Link
          href={routes.adminPath("charges")}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          Volver a cuotas y listas
        </Link>

        <PageHeader
          eyebrow={`Cobranza${
            isMembershipCharge && charge.billing_period
              ? ` - ${formatBillingPeriod(charge.billing_period)}`
              : isMembershipCharge
                ? " - Cuota mensual"
                : ""
          }`}
          title={charge.name}
          description={
            isMembershipCharge
              ? `Cuota mensual generada automaticamente para ${rows.length} socio(s).`
              : charge.description?.trim()
              ? charge.description
              : "Lista de recaudacion del club."
          }
          actions={
            <>
              <Button
                type="button"
                size="md"
                variant="neutral"
                onClick={openEdit}
                disabled={Boolean(hasPayments)}
                title={hasPayments ? "Este cargo ya tiene pagos y no puede ser editado" : undefined}
              >
                Editar
              </Button>
              {!isMembershipCharge ? (
                <Button type="button" size="md" onClick={openCreateExpense}>
                  Registrar egreso
                </Button>
              ) : null}
            </>
          }
        />

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            Grupo <span className="ml-1 text-slate-950">{chargeScopeLabel(charge)}</span>
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            Categoria{" "}
            <span className="ml-1 text-slate-950">
              {isMembershipCharge ? chargeCategoryLabel(charge.category) : listKindLabel(charge.list_kind)}
            </span>
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            Monto <span className="ml-1 text-slate-950">{formatMoney(charge.amount)}</span>
          </span>
          {charge.category === "membership" ? (
            <span className="rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
              Mes facturado{" "}
              <span className="ml-1 capitalize text-slate-950">
                {charge.billing_period ? formatBillingPeriod(charge.billing_period) : "-"}
              </span>
            </span>
          ) : (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              Tipo <span className="ml-1 text-slate-950">{charge.type === "total" ? "Total a dividir" : "Por persona"}</span>
            </span>
          )}
          {hasPayments ? (
            <span className="rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
              Ya tiene pagos - no editable
            </span>
          ) : null}
          {isOrderList && charge.supplier_name ? (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              Proveedor <span className="ml-1 text-slate-950">{charge.supplier_name}</span>
            </span>
          ) : null}
        </div>

        <header className="hidden">
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl font-bold tracking-tight text-slate-900">
              {charge.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {charge.description?.trim() ? charge.description : "Sin descripcion"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Grupo:{" "}
                <span className="text-slate-900">
                  {charge.group?.name ?? "Todo el club (socios activos)"}
                </span>
              </span>
              {charge.category ? (
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-900">
                  Categoria:{" "}
                  <span className="font-mono">
                    {charge.category === "membership"
                      ? "Cuota mensual"
                      : charge.category === "activity"
                        ? "Actividad"
                        : charge.category === "fee"
                          ? "Inscripcion / otro"
                          : charge.category}
                  </span>
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Tipo:{" "}
                <span className="text-slate-900">
                  {charge.type === "total" ? "Total a dividir" : "Por persona"}
                </span>
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Monto: <span className="text-slate-900">{formatMoney(charge.amount)}</span>
              </span>
              {charge.category === "membership" ? (
                <>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-900">
                    Mes facturado:{" "}
                    <span className="font-mono capitalize text-indigo-950">
                      {charge.billing_period ? formatBillingPeriod(charge.billing_period) : "-"}
                    </span>
                  </span>
                </>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Fecha objetivo: <span className="text-slate-900">{formatDueDate(charge.due_date)}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button type="button" size="md" onClick={openCreateExpense}>
              Registrar egreso
            </Button>
            <Button
              type="button"
              size="md"
              variant="neutral"
              onClick={openEdit}
              disabled={Boolean(hasPayments)}
              title={
                hasPayments
                  ? "Este cargo ya tiene pagos y no puede ser editado"
                  : undefined
              }
            >
              Editar
            </Button>
            {hasPayments ? (
              <p className="max-w-xs text-right text-xs font-medium text-warning">
                Este cargo ya tiene pagos y no puede ser editado
              </p>
            ) : null}
          </div>
        </header>

        {actionMessage ? <Alert variant="info">{actionMessage}</Alert> : null}

        <section>
          {(() => {
            const totalExpected = isMembershipCharge
              ? charge.amount * rows.length
              : rows.reduce((sum, r) => sum + r.amount, 0);
            const lineCollected = rows.reduce((sum, r) => sum + r.paid_amount, 0);
            const totalCollected = lineCollected + (isMembershipCharge ? 0 : extraContributionsTotal);
            const totalExpenses = isMembershipCharge
              ? 0
              : financials?.total_expenses ?? expenses.reduce((sum, e) => sum + e.amount, 0);
            const pendingTotal = Math.max(0, totalExpected - totalCollected);
            const difference = isMembershipCharge ? pendingTotal : totalCollected - totalExpenses;
            const pct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

            const status =
              Math.abs(totalExpenses - totalCollected) < 0.01
                ? { label: "Cubierto", variant: "success" as const }
                : totalExpenses > totalCollected
                  ? { label: "Deficit", variant: "danger" as const }
                  : { label: "Sobrante", variant: "slate" as const };

            const financialStatus = isMembershipCharge
              ? pendingTotal <= 0.01
                ? { label: "Cuota completa", variant: "success" as const }
                : { label: `${formatMoney(pendingTotal)} pendiente`, variant: "warning" as const }
              : status;

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">Resumen financiero</h2>
                  <Badge variant={financialStatus.variant}>{financialStatus.label}</Badge>
                </div>
                <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${isMembershipCharge ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total esperado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatMoney(totalExpected)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Recaudado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatMoney(totalCollected)}
                    </p>
                    {!isMembershipCharge && extraContributionsTotal > 0 ? (
                      <p className="mt-1 text-xs font-semibold text-success">
                        Incluye {formatMoney(extraContributionsTotal)} en aportes extra
                      </p>
                    ) : null}
                  </div>
                  {!isMembershipCharge ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Egresado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatMoney(totalExpenses)}
                    </p>
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {isMembershipCharge ? "Pendiente" : "Diferencia"}
                    </p>
                    <p className={`mt-1 text-2xl font-bold tabular-nums ${isMembershipCharge && pendingTotal > 0.01 ? "text-danger" : "text-slate-900"}`}>
                      {formatMoney(difference)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Progreso de recaudacion</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-700">{pct}%</p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      aria-hidden
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{formatMoney(totalCollected)} cobrados</span>
                    <span>{formatMoney(pendingTotal)} restantes</span>
                  </div>
                </div>

                {isMembershipCharge ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Recaudacion diaria</p>
                        <p className="mt-0.5 text-xs capitalize text-slate-500">
                          Pagos registrados en {dailyCollection.label}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-slate-500">
                        {chargePayments.length} pago(s)
                      </p>
                    </div>
                    <div className="mt-4 flex h-32 items-end gap-1 overflow-x-auto border-b border-slate-200 pb-2">
                      {dailyCollection.days.map((day) => {
                        const height =
                          dailyCollection.maxAmount > 0
                            ? Math.max(8, Math.round((day.amount / dailyCollection.maxAmount) * 112))
                            : 4;
                        return (
                          <div
                            key={day.day}
                            className="flex min-w-5 flex-1 flex-col items-center justify-end"
                            title={`Dia ${day.day}: ${formatMoney(day.amount)}`}
                          >
                            <div
                              className={`w-full max-w-6 rounded-t-sm transition-colors ${
                                day.amount > 0 ? "bg-success" : "bg-slate-200"
                              }`}
                              style={{ height }}
                              aria-hidden
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <span>Dia 1</span>
                      <span>Dia {dailyCollection.days.length}</span>
                    </div>
                  </div>
                ) : null}
              </>
            );
          })()}
        </section>

        {!isMembershipCharge ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Aportes extra y movimientos</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {extraContributions.length} aporte(s) extra - {listMovements.length} movimiento(s) en la lista.
                </p>
              </div>
              <Button type="button" size="md" variant="neutral" onClick={() => openContributionModal()}>
                Registrar aporte extra
              </Button>
            </div>

            {extraContributions.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-success">Aportes extra</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                    {formatMoney(extraContributionsTotal)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pagos de lineas</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                    {formatMoney(rows.reduce((sum, row) => sum + row.paid_amount, 0))}
                  </p>
                </div>
              </div>
            ) : null}

            {listMovements.length > 0 ? (
              <TableContainer>
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">Fecha</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Tipo</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Origen</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Monto</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {listMovements.map((movement) => (
                      <tr key={movement.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-600">{formatPaidAt(movement.date)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              movement.type === "Egreso"
                                ? "border-danger/20 bg-danger/10 text-danger"
                                : movement.type === "Aporte extra"
                                  ? "border-success/20 bg-success/10 text-success"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            {movement.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">{movement.person}</td>
                        <td
                          className={`px-3 py-2 text-right font-semibold tabular-nums ${
                            movement.type === "Egreso" ? "text-danger" : "text-slate-900"
                          }`}
                        >
                          {movement.type === "Egreso" ? "-" : "+"}
                          {formatMoney(movement.amount)}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {movement.method ? paymentMethodLabel(movement.method) : movement.note || "-"}
                          {movement.method && movement.note ? ` - ${movement.note}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            ) : (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                Todavia no hay movimientos registrados en esta lista.
              </p>
            )}
          </section>
        ) : null}

        {!isMembershipCharge ? (
        <section className="space-y-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Egresos asociados</h2>
              <p className="mt-1 text-sm text-slate-600">
                {expensesLoading ? "Cargando..." : `${expenses.length} egreso(s) asociado(s) a esta lista.`}
              </p>
            </div>
            <Button type="button" size="md" onClick={openCreateExpense}>
              Registrar egreso
            </Button>
          </div>

          {expensesLoading ? (
            <p className="text-sm text-slate-600">Cargando egresos...</p>
          ) : expenses.length === 0 ? (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              No hay egresos asociados a esta lista.
            </p>
          ) : (
            <TableContainer>
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700">Descripcion</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Origen</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Monto</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Metodo</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Fecha</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {expenses.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{e.description}</td>
                      <td className="px-3 py-2 text-slate-700">{e.origin_label?.trim() || "Club / caja"}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-900">{formatMoney(e.amount)}</td>
                      <td className="px-3 py-2 text-slate-700">{paymentMethodLabel(e.payment_method)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatExpenseDate(e.date)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="neutral"
                            onClick={() => openEditExpense(e)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => void removeExpense(e)}
                            disabled={expenseDeletingId === e.id}
                          >
                            {expenseDeletingId === e.id ? "Eliminando..." : "Eliminar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          )}
        </section>
        ) : null}

        <section className="space-y-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isMembershipCharge ? "Socios de la cuota" : "Personas / pedidos de esta lista"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {rows.length} {isMembershipCharge ? "socio(s)" : "persona(s)"} - Pendientes {counts.pending} - Parciales {counts.partial} -
                Pagadas {counts.paid}
              </p>
            </div>
            {!isMembershipCharge ? (
              <div className="flex flex-wrap gap-2">
                <ImportChargeLines chargeId={charge.id} expectedAmount={charge.amount} listKind={charge.list_kind} onImported={() => void loadAll()} />
                <Button type="button" size="sm" onClick={openAddLine}>
                  + Agregar persona
                </Button>
              </div>
            ) : null}
            <div className="flex w-full flex-wrap gap-2">
              <SegmentedControl
                label="Pago"
                value={filter}
                onChange={setFilter}
                ariaLabel="Filtrar por estado de pago"
                options={(
                  [
                    { value: "all", label: `Todos (${counts.all})` },
                    { value: "pending", label: `Pendientes (${counts.pending})`, tone: "accent" },
                    { value: "partial", label: `Parciales (${counts.partial})`, tone: "accent" },
                    { value: "paid", label: `Pagados (${counts.paid})`, tone: "success" },
                  ] as const
                ).filter((option) => option.value === "all" || counts[option.value] > 0 || filter === option.value)}
              />
              <SegmentedControl
                label="Seguimiento"
                value={trackingFilter}
                onChange={setTrackingFilter}
                ariaLabel="Filtrar por seguimiento"
                options={[
                  { value: "all", label: `Todos (${trackingCounts.all})` },
                  ...MEMBER_CHARGE_TRACKING_OPTIONS.filter(
                    (option) => trackingCounts[option.value] > 0 || trackingFilter === option.value
                  ).map((option) => ({
                    value: option.value,
                    label: `${option.label} (${trackingCounts[option.value]})`,
                    tone: trackingSegmentTone(option.value),
                  })),
                ]}
              />
            </div>
          </div>

          {/* Sugerencia de bulk assign cuando hay nombres externos repetidos */}
          {!isMembershipCharge && externalNameGroups.length > 0 ? (
            <div className="mb-3 space-y-2">
              {externalNameGroups.map((group) => (
                <div
                  key={group.displayName}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info/20 bg-info/5 px-3 py-2 text-sm text-slate-800"
                >
                  <div className="min-w-0">
                    <p>
                      Hay{" "}
                      <strong>{group.rows.length} lineas con nombre &ldquo;{group.displayName}&rdquo;</strong>,
                      todas externas. Asignarlas todas al mismo socio?
                    </p>
                    {bulkAssignName === group.displayName ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Select
                          value={bulkAssignMemberId}
                          onChange={(e) => setBulkAssignMemberId(e.target.value)}
                          className="rounded-md border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 shadow-none focus:shadow-none"
                        >
                          <option value="">Elegi un socio...</option>
                          {allMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.full_name} - {m.dni}
                            </option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleBulkAssign()}
                          disabled={!bulkAssignMemberId || bulkAssignSaving}
                        >
                          {bulkAssignSaving
                            ? "Asignando..."
                            : `Asignar las ${group.rows.length}`}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="neutral"
                          onClick={() => setBulkAssignName(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {bulkAssignName !== group.displayName ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openBulkAssign(group.displayName)}
                    >
                      Asignar todas
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center">
              <p className="text-base font-semibold text-slate-900">
                {isMembershipCharge
                  ? "Esta cuota todavia no tiene socios asignados"
                  : "Esta lista todavia no tiene personas cargadas"}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                {isMembershipCharge
                  ? "La cuota mensual se asigna desde el padron activo del club."
                  : isOrderList
                    ? "Arranca cargando compradores, talles, cantidades y señas. El proveedor queda como referencia de la lista."
                    : "Arranca cargando personas desde WhatsApp, Excel o una fila manual. Despues revisa los pagos y prepara el seguimiento desde esta misma pantalla."}
              </p>
              {!isMembershipCharge ? (
                <div className="mt-5 space-y-4">
                  <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2 text-left">
                    {(isOrderList
                      ? ["Importar la planilla de talles", "Registrar señas o pagos parciales", "Vincular egresos al proveedor"]
                      : ["Pegar una lista de WhatsApp", "Importar una planilla simple", "Registrar pagos y preparar seguimiento"]
                    ).map((tip) => (
                      <div key={tip} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {tip}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <ImportChargeLines chargeId={charge.id} expectedAmount={charge.amount} listKind={charge.list_kind} onImported={() => void loadAll()} />
                    <Button type="button" size="md" onClick={openAddLine}>
                      + Agregar persona
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : filteredRows.length === 0 ? (
            <Alert variant="info">No hay lineas que coincidan con el filtro seleccionado.</Alert>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/20 bg-success/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-success">WhatsApp por lote</p>
                  <p className="mt-0.5 text-xs text-slate-700">
                    {selectedWhatsAppRows.length > 0
                      ? `${selectedWhatsAppRows.length} socio(s) seleccionado(s) para contactar.`
                      : `${whatsAppEligibleRows.length} listos - ${whatsAppNoPhoneRows.length} sin telefono - ${visiblePaidRows.length} al dia.`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="neutral"
                    onClick={selectVisibleWhatsAppRows}
                    disabled={whatsAppEligibleRows.length === 0}
                  >
                    Seleccionar visibles
                  </Button>
                  {selectedWhatsAppIds.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="neutral"
                      onClick={() => setSelectedWhatsAppIds([])}
                    >
                      Limpiar
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    onClick={openWhatsAppBatch}
                    disabled={selectedWhatsAppRows.length === 0}
                  >
                    Preparar mensajes
                  </Button>
                </div>
              </div>

              <TableContainer>
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700" aria-label="Seleccionar para WhatsApp" />
                    <th className="px-3 py-2 font-semibold text-slate-700" aria-hidden />
                    <th className="px-3 py-2 font-semibold text-slate-700">{isOrderList ? "Persona / comprador" : "Persona"}</th>
                    {!isMembershipCharge ? (
                      <th className="px-3 py-2 font-semibold text-slate-700">{isOrderList ? "Talle / detalle" : "Detalle"}</th>
                    ) : null}
                    <th className="px-3 py-2 font-semibold text-slate-700">Cant.</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Total</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">{isOrderList ? "Seña / pagado" : "Pagado"}</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">{isOrderList ? "Pendiente" : "Restante"}</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Estado</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Seguimiento</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.map((row) => {
                    const rem = remainingAmount(row);
                    const canPay = rem > 0.001;
                    const expanded = expandedMcId === row.id;
                    const history = historyByMc[row.id];
                    const rowExtra = contributionByLine.get(row.id) ?? 0;
                    const waUrl =
                      canPay && row.member?.phone
                        ? buildChargeDebtWhatsAppLink({
                            fullName: row.member.full_name,
                            phone: row.member.phone,
                            chargeName: charge.name,
                            groupName: charge.group?.name ?? "Sin grupo",
                            remainingFormatted: formatMoney(rem),
                          })
                        : null;

                    return (
                      <Fragment key={row.id}>
                        <tr className={expanded ? "bg-slate-50/60" : undefined}>
                          <td className="px-3 py-2 align-top">
                            {row.member?.phone && canPay && digitsOnly(row.member.phone).length >= 8 ? (
                              <input
                                type="checkbox"
                                checked={selectedWhatsAppIds.includes(row.id)}
                                onChange={() => toggleWhatsAppSelection(row.id)}
                                className="h-4 w-4 rounded border-slate-300"
                                aria-label={`Seleccionar ${row.member.full_name} para WhatsApp`}
                              />
                            ) : null}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Button
                              type="button"
                              size="sm"
                              variant="neutral"
                              onClick={() => toggleExpand(row.id)}
                              aria-expanded={expanded}
                            >
                              {expanded ? "Ocultar" : "Ver pagos"}
                            </Button>
                          </td>
                          <td className="px-3 py-2">
                            {row.member ? (
                              <>
                                <Link
                                  href={routes.adminPath(`socios/${row.member.id}`)}
                                  className="font-medium text-slate-900 underline-offset-2 hover:underline"
                                >
                                  {row.member.full_name}
                                </Link>
                                <p className="text-xs text-slate-500">
                                  DNI {row.member.dni} - {row.member.status === "active" ? "Activo" : row.member.status === "inactive" ? "Baja" : "Pendiente"}
                                </p>
                              </>
                            ) : (
                              <>
                                <span className="font-medium text-slate-900">
                                  {row.external_name || "Comprador externo"}
                                </span>
                                <p className="text-xs">
                                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                    Externo
                                  </span>
                                </p>
                              </>
                            )}
                          </td>
                          {!isMembershipCharge ? (
                            <td className="px-3 py-2 text-sm text-slate-700">
                              {row.description?.trim() || <span className="text-slate-400">-</span>}
                            </td>
                          ) : null}
                          <td className="px-3 py-2 tabular-nums text-slate-700">{row.quantity}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-900">
                            {formatMoney(row.amount)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-slate-700">
                            {formatMoney(row.paid_amount)}
                            {rowExtra > 0 ? (
                              <p className="mt-0.5 text-xs font-semibold text-success">+{formatMoney(rowExtra)} extra</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={`tabular-nums font-semibold ${
                                rem <= 0.001 ? "text-slate-500" : "text-danger"
                              }`}
                            >
                              {formatMoney(rem)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${lineStatusPillClass(
                                row.status
                              )}`}
                            >
                              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
                              {memberChargeStatusLabel(row.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <label
                              className={`relative inline-flex h-7 min-w-[8.5rem] max-w-[10.5rem] cursor-pointer items-center rounded-full border pl-2.5 pr-7 text-[11px] font-semibold shadow-none transition-colors ${
                                trackingUpdatingId === row.id ? "opacity-60" : ""
                              } ${trackingPillClass(row.tracking_status)}`}
                              title={trackingLabel(row.tracking_status)}
                            >
                              <span className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                              <span className="truncate">{trackingLabel(row.tracking_status)}</span>
                              <select
                                value={row.tracking_status}
                                disabled={trackingUpdatingId === row.id}
                                onChange={(event) =>
                                  void handleTrackingChange(
                                    row,
                                    event.target.value as MemberChargeTrackingStatus
                                  )
                                }
                                className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full border-0 bg-transparent opacity-0 outline-none disabled:cursor-not-allowed"
                                aria-label={`Seguimiento de ${chargeLineDisplayName(row)}`}
                              >
                                {MEMBER_CHARGE_TRACKING_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                className="pointer-events-none absolute right-2 h-3 w-3 text-current opacity-70"
                                strokeWidth={2}
                                aria-hidden
                              />
                            </label>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex min-w-max items-center gap-1.5">
                              <div className="flex flex-nowrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openPayModal(row)}
                                  disabled={!canPay}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-success/25 bg-success/10 text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                  title="Registrar pago"
                                  aria-label="Registrar pago"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openContributionModal(row)}
                                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-success/20 bg-white px-2 text-xs font-bold text-success transition-colors hover:bg-success/10"
                                  title="Registrar aporte extra"
                                  aria-label="Registrar aporte extra"
                                >
                                  +$
                                </button>
                                {waUrl ? (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() =>
                                      void handleTrackingChange(row, "message_sent", { silent: true })
                                    }
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
                                    title="Abrir WhatsApp"
                                    aria-label="Abrir WhatsApp"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                ) : canPay && row.member ? (
                                  <span
                                    className="max-w-[6.5rem] text-[10px] leading-tight text-slate-400"
                                    title="El socio no tiene telefono configurado"
                                  >
                                    Sin tel.
                                  </span>
                                ) : null}
                              </div>
                              {!isMembershipCharge ? (
                                <div className="flex flex-nowrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditLine(row)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                    title="Editar"
                                    aria-label="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteLine(row)}
                                    disabled={deletingLineId === row.id}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-danger/20 bg-danger/10 text-danger transition-colors hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50"
                                    title={deletingLineId === row.id ? "Eliminando..." : "Eliminar"}
                                    aria-label={deletingLineId === row.id ? "Eliminando..." : "Eliminar"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                  {!row.member ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssigningExternalLineId(
                                          assigningExternalLineId === row.id ? null : row.id
                                        );
                                        setExternalAssignMemberId("");
                                      }}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                      title={assigningExternalLineId === row.id ? "Cancelar asignacion" : "Asignar a socio"}
                                      aria-label={assigningExternalLineId === row.id ? "Cancelar asignacion" : "Asignar a socio"}
                                    >
                                      <UserPlus className="h-4 w-4" />
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                              {assigningExternalLineId === row.id ? (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <Select
                                    value={externalAssignMemberId}
                                    onChange={(e) => setExternalAssignMemberId(e.target.value)}
                                    className="rounded-md border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 shadow-none focus:shadow-none"
                                  >
                                    <option value="">Elegi un socio...</option>
                                    {allMembers.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.full_name} - {m.dni}
                                      </option>
                                    ))}
                                  </Select>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => void handleAssignExternalLine(row.id)}
                                    disabled={!externalAssignMemberId}
                                  >
                                    Confirmar
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>

                        {expanded ? (
                          <tr className="bg-slate-50/90">
                            <td colSpan={tableColSpan} className="px-3 py-3 text-sm text-slate-700">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Historial de pagos
                              </p>
                              {historyLoadingId === row.id ? (
                                <p className="text-slate-600">Cargando...</p>
                              ) : history && history.length > 0 ? (
                                <ul className="space-y-1.5 border-l-2 border-slate-200 pl-3">
                                  {history.map((p) => (
                                    <li key={p.id} className="flex flex-wrap gap-x-3 gap-y-0.5">
                                      <span className="font-semibold tabular-nums text-slate-900">
                                        {formatMoney(p.amount)}
                                      </span>
                                      <span className="text-slate-600">
                                        {formatPaidAt(p.paid_at)}
                                      </span>
                                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                                        {paymentMethodLabel(p.payment_method)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-slate-600">Todavia no hay pagos registrados para este cargo.</p>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </TableContainer>
            </div>
          )}
        </section>

        <section className="space-y-4">
          {charge.category === "membership" ? (
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Asignacion del periodo</h2>
              <p className="mt-1 text-sm text-slate-600">
                La cuota mensual se genera como una foto del periodo. Solo incluye a los socios activos al momento de
                la generacion automatica.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Si un socio se activa despues, empieza a deber desde el proximo mes y no se agrega retroactivamente a
                esta cuota.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Miembros sin este cargo</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {missingMembers.length === 0
                      ? "No hay miembros faltantes."
                      : charge.group
                        ? `${missingMembers.length} miembro(s) activos del grupo no tienen este cargo.`
                        : `${missingMembers.length} socio(s) activo(s) aun no tienen este cargo asignado.`}
                  </p>
                </div>
                <Button
                  type="button"
                  size="md"
                  variant="neutral"
                  onClick={() => void assignMissing()}
                  disabled={assigningMissing || missingMembers.length === 0}
                >
                  {assigningMissing ? "Asignando..." : "Asignar a todos"}
                </Button>
              </div>

              {missingMembers.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {missingMembers.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{m.full_name}</p>
                        <p className="text-xs text-slate-500">
                          DNI {m.dni} - {m.status === "active" ? "Activo" : m.status === "inactive" ? "Baja" : "Pendiente"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="neutral"
                          onClick={() => void assignOne(m.id)}
                          disabled={assigningMemberId === m.id || assigningMissing}
                        >
                          {assigningMemberId === m.id ? "Asignando..." : "Asignar"}
                        </Button>
                        <Link
                          href={routes.adminPath(`socios/${m.id}`)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                        >
                          Ver socio
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </section>
      </section>

      <ChargePaymentModal
        open={payModalRow !== null}
        onClose={closePayModal}
        title="Registrar pago"
        subtitle={payModalRow ? chargeLineDisplayName(payModalRow) : null}
        pendingAmount={payModalRow ? remainingAmount(payModalRow) : 0}
        onConfirm={submitPayment}
      />

      <AdminModal open={whatsAppBatchOpen} onClose={closeWhatsAppBatch}>
        <h2 className="text-lg font-semibold text-slate-900">WhatsApp por lote</h2>
        <p className="mt-1 text-sm text-slate-600">
          Contacto {selectedWhatsAppRows.length === 0 ? 0 : whatsAppBatchIndex + 1} de{" "}
          {selectedWhatsAppRows.length}. El envio sigue siendo manual.
        </p>

        {currentWhatsAppBatchRow && currentWhatsAppBatchRow.member ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-sm font-semibold text-slate-950">
                {currentWhatsAppBatchRow.member.full_name}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                DNI {currentWhatsAppBatchRow.member.dni} - Pendiente{" "}
                {formatMoney(remainingAmount(currentWhatsAppBatchRow))}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mensaje preparado
              </label>
              <textarea
                readOnly
                value={buildWhatsAppBatchMessage(currentWhatsAppBatchRow)}
                rows={7}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
              />
              {copyMessage ? <p className="mt-2 text-xs text-slate-600">{copyMessage}</p> : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="neutral" onClick={() => void copyCurrentWhatsAppMessage()}>
                  Copiar mensaje
                </Button>
                <Button type="button" size="sm" onClick={() => void openCurrentWhatsApp()}>
                  Abrir WhatsApp
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="neutral"
                  onClick={() => void markCurrentWhatsAppSent({ next: true })}
                >
                  Marcar enviado y seguir
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="neutral"
                  onClick={() => {
                    setCopyMessage(null);
                    setWhatsAppBatchIndex((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={whatsAppBatchIndex === 0}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="neutral"
                  onClick={goToNextWhatsApp}
                  disabled={whatsAppBatchIndex >= selectedWhatsAppRows.length - 1}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            No hay contactos seleccionados para preparar.
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <Button type="button" size="md" variant="neutral" onClick={closeWhatsAppBatch}>
            Cerrar
          </Button>
        </div>
      </AdminModal>

      <AdminModal open={editOpen} onClose={() => !editSaving && setEditOpen(false)}>
        <h2 className="text-lg font-semibold text-slate-900">{isMembershipCharge ? "Editar cuota" : "Editar lista"}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {isMembershipCharge
            ? "Editas la cuota base. Las lineas ya asignadas a socios no se modifican."
            : "Editas los datos base de la lista. Las personas ya cargadas no se modifican."}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="edit-charge-name" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre <span className="text-danger">*</span>
            </label>
            <Input
              id="edit-charge-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-charge-desc" className="mb-1 block text-sm font-medium text-slate-700">
              Descripcion
            </label>
            <Textarea
              id="edit-charge-desc"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="rounded-lg border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-none focus:border-slate-500 focus:shadow-none"
            />
          </div>
          <div>
            <label htmlFor="edit-charge-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Monto <span className="text-danger">*</span>
            </label>
            <Input
              id="edit-charge-amount"
              type="text"
              inputMode="decimal"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="text-sm"
            />
            {(() => {
              if (!charge || rows.length === 0) {
                return null;
              }
              const raw = editAmount.replace(",", ".").trim();
              const parsed = Number(raw);
              const changed =
                raw !== "" && !Number.isNaN(parsed) && Math.abs(parsed - charge.amount) > 0.001;
              if (!changed) {
                return null;
              }
              return (
                <p className="mt-1 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                  Esta {isMembershipCharge ? "cuota" : "lista"} ya tiene {rows.length} persona(s) asignada(s). Cambiar el monto NO actualiza
                  las lineas existentes.
                </p>
              );
            })()}
          </div>
          <div>
            <label htmlFor="edit-charge-due" className="mb-1 block text-sm font-medium text-slate-700">
              Fecha objetivo
            </label>
            <Input
              id="edit-charge-due"
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Opcional. Sirve como referencia interna, no como vencimiento estricto.
            </p>
          </div>
          {isOrderList ? (
            <div>
              <label htmlFor="edit-charge-supplier" className="mb-1 block text-sm font-medium text-slate-700">
                Proveedor
              </label>
              <Input
                id="edit-charge-supplier"
                value={editSupplierName}
                onChange={(e) => setEditSupplierName(e.target.value)}
                placeholder="Ej. proveedor de camperas"
                className="text-sm"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={() => setEditOpen(false)} disabled={editSaving}>
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void saveEdit()} disabled={editSaving}>
            {editSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </AdminModal>

      <AdminModal open={lineModalOpen} onClose={closeLineModal}>
        <h2 className="text-lg font-semibold text-slate-900">
          {lineEditingId ? "Editar persona / pedido" : "Agregar persona / pedido"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {lineEditingId
            ? "Modifica los datos de esta persona o pedido. Los pagos asociados, si los hay, no se tocan."
            : "Suma una persona o pedido a esta lista. Si no es socio del club, usa el modo Externo y reasignalo despues."}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Tipo de comprador</p>
            <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setLineMode("member")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  lineMode === "member" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Socio del club
              </button>
              <button
                type="button"
                onClick={() => setLineMode("external")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  lineMode === "external" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Externo
              </button>
            </div>
          </div>

          {lineMode === "member" ? (
            <div>
              <label htmlFor="line-member" className="mb-1 block text-sm font-medium text-slate-700">
                Socio <span className="text-danger">*</span>
              </label>
              <Select
                id="line-member"
                value={lineMemberId}
                onChange={(e) => setLineMemberId(e.target.value)}
                className="rounded-lg border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-none focus:border-slate-500 focus:shadow-none"
              >
                <option value="">Elegi un socio...</option>
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} - DNI {m.dni}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <label htmlFor="line-external" className="mb-1 block text-sm font-medium text-slate-700">
                {isOrderList ? "Nombre del comprador" : "Nombre"} <span className="text-danger">*</span>
              </label>
              <Input
                id="line-external"
                value={lineExternalName}
                onChange={(e) => setLineExternalName(e.target.value)}
                placeholder='Ej. "Hueso", "Diame x Lucho"'
                className="text-sm"
              />
            </div>
          )}

          <div>
            <label htmlFor="line-description" className="mb-1 block text-sm font-medium text-slate-700">
              {isOrderList ? "Talle / detalle" : "Detalle"}
            </label>
            <Input
              id="line-description"
              value={lineDescription}
              onChange={(e) => setLineDescription(e.target.value)}
              placeholder={isOrderList ? "Ej. XXL, M, Talle unico" : "Ej. Inscripcion, seguro, nota"}
              className="text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="line-quantity" className="mb-1 block text-sm font-medium text-slate-700">
                Cantidad <span className="text-danger">*</span>
              </label>
              <Input
                id="line-quantity"
                type="number"
                min="1"
                value={lineQuantity}
                onChange={(e) => setLineQuantity(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label htmlFor="line-amount" className="mb-1 block text-sm font-medium text-slate-700">
                Total a pagar <span className="text-danger">*</span>
              </label>
              <Input
                id="line-amount"
                type="text"
                inputMode="decimal"
                value={lineAmount}
                onChange={(e) => setLineAmount(e.target.value)}
                placeholder="Ej. 60000"
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {lineFormError ? (
          <Alert variant="danger" className="mt-3">
            {lineFormError}
          </Alert>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={closeLineModal} disabled={lineSaving}>
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void handleSaveLine()} disabled={lineSaving}>
            {lineSaving ? "Guardando..." : lineEditingId ? "Guardar cambios" : "Agregar persona"}
          </Button>
        </div>
      </AdminModal>

      <AdminModal open={contributionModalOpen} onClose={closeContributionModal}>
        <h2 className="text-lg font-semibold text-slate-900">Registrar aporte extra</h2>
        <p className="mt-1 text-sm text-slate-600">
          Sirve para dinero que entra a la lista por encima del saldo de una persona o como cobertura del club.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Origen del aporte</p>
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setContributionSource("line")}
                disabled={!contributionRow}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  contributionSource === "line" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Persona de la lista
              </button>
              <button
                type="button"
                onClick={() => setContributionSource("member")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  contributionSource === "member" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Socio
              </button>
              <button
                type="button"
                onClick={() => setContributionSource("club")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  contributionSource === "club" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Club
              </button>
              <button
                type="button"
                onClick={() => setContributionSource("external")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  contributionSource === "external" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Externo
              </button>
            </div>
          </div>

          {contributionSource === "line" ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
              {contributionRow ? chargeLineDisplayName(contributionRow) : "Elegido desde una fila de la lista"}
            </p>
          ) : contributionSource === "member" ? (
            <div>
              <label htmlFor="extra-member" className="mb-1 block text-sm font-medium text-slate-700">
                Socio
              </label>
              <Select
                id="extra-member"
                value={contributionMemberId}
                onChange={(e) => setContributionMemberId(e.target.value)}
                className="rounded-lg border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-none focus:border-slate-500 focus:shadow-none"
              >
                <option value="">Elegi un socio...</option>
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} - DNI {m.dni}
                  </option>
                ))}
              </Select>
            </div>
          ) : contributionSource === "external" ? (
            <div>
              <label htmlFor="extra-external" className="mb-1 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <Input
                id="extra-external"
                value={contributionExternalName}
                onChange={(e) => setContributionExternalName(e.target.value)}
                placeholder="Ej. Sponsor, familiar, colaborador"
                className="text-sm"
              />
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">Club</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="extra-amount" className="mb-1 block text-sm font-medium text-slate-700">
                Monto <span className="text-danger">*</span>
              </label>
              <Input
                id="extra-amount"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                inputMode="decimal"
                placeholder="Ej. 8000"
                className="text-sm"
              />
            </div>
            <div>
              <label htmlFor="extra-method" className="mb-1 block text-sm font-medium text-slate-700">
                Metodo
              </label>
              <Select
                id="extra-method"
                value={contributionMethod}
                onChange={(e) => setContributionMethod(e.target.value as "transfer" | "cash" | "mercadopago")}
                className="rounded-lg border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-none focus:border-slate-500 focus:shadow-none"
              >
                <option value="transfer">Transferencia</option>
                <option value="cash">Efectivo</option>
                <option value="mercadopago">MercadoPago</option>
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="extra-date" className="mb-1 block text-sm font-medium text-slate-700">
              Fecha y hora
            </label>
            <Input
              id="extra-date"
              type="datetime-local"
              value={contributionDate}
              onChange={(e) => setContributionDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label htmlFor="extra-note" className="mb-1 block text-sm font-medium text-slate-700">
              Nota
            </label>
            <Textarea
              id="extra-note"
              value={contributionNote}
              onChange={(e) => setContributionNote(e.target.value)}
              rows={2}
              className="rounded-lg border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-none focus:border-slate-500 focus:shadow-none"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={closeContributionModal} disabled={contributionSaving}>
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void submitContribution()} disabled={contributionSaving}>
            {contributionSaving ? "Guardando..." : "Registrar aporte"}
          </Button>
        </div>
      </AdminModal>

      <AdminModal open={expenseModalOpen} onClose={closeExpenseModal}>
        <h2 className="text-lg font-semibold text-slate-900">
          {editingExpense ? "Editar egreso" : "Registrar egreso"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Este egreso quedara asociado al cargo <span className="font-semibold text-slate-900">{charge.name}</span>.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="charge-exp-desc" className="mb-1 block text-sm font-medium text-slate-700">
              Descripcion <span className="text-danger">*</span>
            </label>
            <Input
              id="charge-exp-desc"
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              placeholder="Ej. Pago seguro"
              className="text-sm"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="charge-exp-cat" className="mb-1 block text-sm font-medium text-slate-700">
              Categoria
            </label>
            <Input
              id="charge-exp-cat"
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              placeholder="Opcional"
              className="text-sm"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="charge-exp-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Monto <span className="text-danger">*</span>
            </label>
            <Input
              id="charge-exp-amount"
              type="text"
              inputMode="decimal"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="0"
              className="text-sm"
            />
          </div>

          <div>
            <label htmlFor="charge-exp-origin" className="mb-1 block text-sm font-medium text-slate-700">
              Origen del egreso
            </label>
            <Input
              id="charge-exp-origin"
              value={expenseOrigin}
              onChange={(e) => setExpenseOrigin(e.target.value)}
              placeholder="Ej. Club / caja, proveedor, socio"
              className="text-sm"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="charge-exp-method" className="mb-1 block text-sm font-medium text-slate-700">
              Metodo de pago
            </label>
            <Select
              id="charge-exp-method"
              value={expenseMethod}
              onChange={(e) => setExpenseMethod(e.target.value as ClubPaymentMethod)}
              className="text-sm"
            >
              {CLUB_PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="charge-exp-date" className="mb-1 block text-sm font-medium text-slate-700">
              Fecha
            </label>
            <Input
              id="charge-exp-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={closeExpenseModal} disabled={expenseSaving}>
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void saveExpense()} disabled={expenseSaving}>
            {expenseSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </AdminModal>
    </>
  );
}
