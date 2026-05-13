"use client";

import { Check, ChevronDown, ChevronLeft, MessageCircle, Pencil, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import { ChargePaymentModal } from "@/components/admin/charge-payment-modal";
import { ImportChargeLines } from "@/components/admin/import-charge-lines";
import { paymentMethodLabel } from "@/config/payment-method";
import { Alert, Badge, Button, Input, PageHeader, Select, TableContainer, Textarea } from "@/components/ui";
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
import {
  buildChargeDebtWhatsAppLink,
  buildChargeDebtWhatsAppMessage,
  digitsOnly,
} from "@/lib/whatsapp-reminder";
import type { MemberStatus } from "@/types";

type FilterKey = "all" | "pending" | "partial" | "paid";
type TrackingFilterKey = "all" | MemberChargeTrackingStatus;

function chargeCategoryLabel(category: string | null): string {
  if (category === "membership") return "Cuota mensual";
  if (category === "activity") return "Actividad";
  if (category === "fee") return "Inscripcion / otro";
  return category ?? "Cobro";
}

function chargeScopeLabel(charge: ChargeDetail): string {
  return charge.group?.name ?? "Todo el club - activos";
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

export default function AdminChargeDetailPage() {
  const params = useParams<{ id: string }>();
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
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [trackingUpdatingId, setTrackingUpdatingId] = useState<string | null>(null);

  const [payModalRow, setPayModalRow] = useState<MemberChargeForChargeRow | null>(null);
  const [selectedWhatsAppIds, setSelectedWhatsAppIds] = useState<string[]>([]);
  const [whatsAppBatchOpen, setWhatsAppBatchOpen] = useState(false);
  const [whatsAppBatchIndex, setWhatsAppBatchIndex] = useState(0);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [assigningMissing, setAssigningMissing] = useState(false);
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);

  // Líneas (member_charges) — agregar/editar/eliminar manualmente.
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
  // Pop-up para reasignar línea externa a socio (un select por fila externa).
  const [assigningExternalLineId, setAssigningExternalLineId] = useState<string | null>(null);
  const [externalAssignMemberId, setExternalAssignMemberId] = useState("");

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseDeletingId, setExpenseDeletingId] = useState<string | null>(null);

  const formatExpenseDate = (value: string) => {
    if (!value) {
      return "—";
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

  useEffect(() => {
    const available = new Set(whatsAppEligibleRows.map((row) => row.id));
    setSelectedWhatsAppIds((prev) => prev.filter((id) => available.has(id)));
  }, [whatsAppEligibleRows]);

  /**
   * Detecta nombres externos que se repiten (ej. "Diame" en 7 líneas de
   * Camperas) para sugerir bulk-assign. Sólo agrupa cuando hay 2+ líneas
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
        ? `Reasigné ${okCount} línea(s) al socio.`
        : `Reasigné ${okCount} línea(s); ${errCount} con error.`
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
    setExpenseModalOpen(true);
  };

  const openEditExpense = (expense: ExpenseRow) => {
    setEditingExpense(expense);
    setExpenseDesc(expense.description ?? "");
    setExpenseCategory(expense.category ?? "");
    setExpenseAmount(String(expense.amount ?? ""));
    setExpenseDate(expense.date ?? new Date().toISOString().slice(0, 10));
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
      setActionMessage("La descripción del egreso es obligatoria.");
      return;
    }
    const raw = expenseAmount.replace(",", ".").trim();
    const amount = Number(raw);
    if (raw === "" || Number.isNaN(amount)) {
      setActionMessage("Indicá un monto válido para el egreso.");
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
          charge_id: charge.id,
        });
        setActionMessage("Egreso actualizado.");
      } else {
        await createExpense({
          description,
          amount,
          category: expenseCategory.trim() || null,
          date,
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
    const ok = window.confirm(`¿Eliminar el egreso "${expense.description}"?`);
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
    setEditOpen(true);
  };

  // ----- Líneas (member_charges) -----
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
      setLineFormError("Indicá un monto mayor a cero.");
      return;
    }

    if (lineMode === "member" && !lineMemberId) {
      setLineFormError("Elegí un socio o cambiá el modo a 'Externo'.");
      return;
    }
    if (lineMode === "external" && !lineExternalName.trim()) {
      setLineFormError("Indicá el nombre del comprador externo.");
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
        setActionMessage("Línea actualizada.");
      } else {
        await addChargeLine(charge.id, payload);
        setActionMessage("Línea agregada.");
      }
      setLineModalOpen(false);
      resetLineForm();
      await loadAll();
    } catch (error) {
      setLineFormError(error instanceof Error ? error.message : "No se pudo guardar la línea.");
    } finally {
      setLineSaving(false);
    }
  };

  const handleDeleteLine = async (row: MemberChargeForChargeRow) => {
    const label = chargeLineDisplayName(row);
    const hasPaid = (row.paid_amount ?? 0) > 0;
    const ok = window.confirm(
      hasPaid
        ? `La línea "${label}" tiene ${formatMoney(row.paid_amount)} cobrado. Si la borrás, también se eliminan los pagos asociados. ¿Continuar?`
        : `¿Eliminar la línea "${label}"?`
    );
    if (!ok) return;
    setDeletingLineId(row.id);
    setActionMessage(null);
    try {
      await deleteChargeLine(row.id);
      setActionMessage("Línea eliminada.");
      await loadAll();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo eliminar la línea.");
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
      setActionMessage("Línea reasignada al socio.");
      setAssigningExternalLineId(null);
      setExternalAssignMemberId("");
      await loadAll();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo reasignar la línea.");
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
      setActionMessage("Indicá un monto válido.");
      return;
    }
    setEditSaving(true);
    try {
      await updateCharge(charge.id, {
        name,
        description: editDescription.trim() || null,
        amount,
        due_date: editDueDate.trim() || null,
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
        setActionMessage("Ese socio ya tenía asignado este cargo.");
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
          <p className="text-slate-700">{errorMessage ?? "No se encontró el cargo."}</p>
          <Link
            href="/admin/charges"
            className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Volver a cargos
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-6">
        <Link
          href="/admin/charges"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          Volver a cobros
        </Link>

        <PageHeader
          eyebrow={`Cobranza${charge.category === "membership" ? " · Cuota mensual" : ""}`}
          title={charge.name}
          description={
            charge.description?.trim()
              ? charge.description
              : charge.category === "membership"
                ? "Generada automaticamente. Aplica al padron activo del club."
                : "Cobro manual del club."
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
              <Button type="button" size="md" onClick={openCreateExpense}>
                Registrar egreso
              </Button>
            </>
          }
        />

        <section className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Resumen del cargo</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                {charge.category === "membership"
                  ? `Cuota mensual del club generada automaticamente para ${rows.length} socios activos.`
                  : `${rows.length} linea(s) asociadas a este cobro.`}
                {charge.due_date ? ` Vencimiento estimado el dia ${formatDueDate(charge.due_date)}.` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  Grupo <span className="ml-1 text-slate-950">{chargeScopeLabel(charge)}</span>
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  Categoria <span className="ml-1 text-slate-950">{chargeCategoryLabel(charge.category)}</span>
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  Tipo <span className="ml-1 text-slate-950">{charge.type === "total" ? "Total a dividir" : "Por persona"}</span>
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
                ) : null}
              </div>
            </div>
            {hasPayments ? (
              <span className="rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                Ya tiene pagos - no editable
              </span>
            ) : null}
          </div>
        </section>

        <header className="hidden">
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl font-bold tracking-tight text-slate-900">
              {charge.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {charge.description?.trim() ? charge.description : "Sin descripción"}
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
                  Categoría:{" "}
                  <span className="font-mono">
                    {charge.category === "membership"
                      ? "Cuota mensual"
                      : charge.category === "activity"
                        ? "Actividad"
                        : charge.category === "fee"
                          ? "Inscripción / otro"
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
                      {charge.billing_period ? formatBillingPeriod(charge.billing_period) : "—"}
                    </span>
                  </span>
                </>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Vence: <span className="text-slate-900">{formatDueDate(charge.due_date)}</span>
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
            const totalExpected = financials?.total_expected ?? rows.reduce((sum, r) => sum + r.amount, 0);
            const totalCollected = financials?.total_collected ?? rows.reduce((sum, r) => sum + r.paid_amount, 0);
            const totalExpenses = financials?.total_expenses ?? expenses.reduce((sum, e) => sum + e.amount, 0);
            const difference = totalCollected - totalExpenses;
            const pct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

            const status =
              Math.abs(totalExpenses - totalCollected) < 0.01
                ? { label: "Cubierto", variant: "success" as const }
                : totalExpenses > totalCollected
                  ? { label: "Déficit", variant: "danger" as const }
                  : { label: "Sobrante", variant: "slate" as const };

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">Resumen financiero</h2>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Egresado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatMoney(totalExpenses)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Diferencia
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{formatMoney(difference)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Progreso de recaudación</p>
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
                    <span>{formatMoney(Math.max(0, totalExpected - totalCollected))} restantes</span>
                  </div>
                </div>
              </>
            );
          })()}
        </section>

        <section className="space-y-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Egresos asociados</h2>
              <p className="mt-1 text-sm text-slate-600">
                {expensesLoading ? "Cargando..." : `${expenses.length} egreso(s) asociado(s) a este cargo.`}
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
              No hay egresos asociados a este cargo.
            </p>
          ) : (
            <TableContainer>
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700">Descripción</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Monto</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Fecha</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {expenses.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{e.description}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-900">{formatMoney(e.amount)}</td>
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

        <section className="space-y-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Líneas del cargo</h2>
              <p className="mt-1 text-sm text-slate-600">
                {rows.length} línea(s) · Pendientes {counts.pending} · Parciales {counts.partial} ·
                Pagadas {counts.paid}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ImportChargeLines chargeId={charge.id} onImported={() => void loadAll()} />
              <Button type="button" size="sm" onClick={openAddLine}>
                + Agregar línea
              </Button>
            </div>
            <div className="flex w-full flex-wrap gap-2">
              <div
                className="inline-flex max-w-full flex-wrap gap-1"
                role="group"
                aria-label="Filtrar por estado de pago"
              >
                {(
                  [
                    ["all", `Todos (${counts.all})`],
                    ["pending", `Pendientes (${counts.pending})`],
                    ["partial", `Parciales (${counts.partial})`],
                    ["paid", `Pagados (${counts.paid})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      filter === key
                        ? "border-brand bg-brand text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                className="inline-flex max-w-full flex-wrap gap-1"
                role="group"
                aria-label="Filtrar por seguimiento"
              >
                <button
                  type="button"
                  onClick={() => setTrackingFilter("all")}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    trackingFilter === "all"
                      ? "border-brand bg-brand text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                  }`}
                >
                  Seguimiento ({trackingCounts.all})
                </button>
                {MEMBER_CHARGE_TRACKING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTrackingFilter(option.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      trackingFilter === option.value
                        ? "border-brand bg-brand text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                    }`}
                  >
                    {option.label} ({trackingCounts[option.value]})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sugerencia de bulk assign cuando hay nombres externos repetidos */}
          {externalNameGroups.length > 0 ? (
            <div className="mb-3 space-y-2">
              {externalNameGroups.map((group) => (
                <div
                  key={group.displayName}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info/20 bg-info/5 px-3 py-2 text-sm text-slate-800"
                >
                  <div className="min-w-0">
                    <p>
                      <span aria-hidden>💡</span> Hay{" "}
                      <strong>{group.rows.length} líneas con nombre &ldquo;{group.displayName}&rdquo;</strong>,
                      todas externas. ¿Asignarlas todas al mismo socio?
                    </p>
                    {bulkAssignName === group.displayName ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Select
                          value={bulkAssignMemberId}
                          onChange={(e) => setBulkAssignMemberId(e.target.value)}
                          className="rounded-md border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 shadow-none focus:shadow-none"
                        >
                          <option value="">Elegí un socio…</option>
                          {allMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.full_name} · {m.dni}
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
                Este cobro todavía no tiene líneas
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Cargá las líneas a mano (una por una) o importá una planilla con las columnas
                Cantidad, Jugador, Talle, Pago, Debe.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <ImportChargeLines chargeId={charge.id} onImported={() => void loadAll()} />
                <Button type="button" size="md" onClick={openAddLine}>
                  + Agregar línea
                </Button>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <Alert variant="info">No hay líneas que coincidan con el filtro seleccionado.</Alert>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/20 bg-success/5 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-success">WhatsApp por lote</p>
                  <p className="mt-0.5 text-xs text-slate-700">
                    {selectedWhatsAppRows.length > 0
                      ? `${selectedWhatsAppRows.length} socio(s) seleccionado(s) para contactar.`
                      : `${whatsAppEligibleRows.length} listos · ${whatsAppNoPhoneRows.length} sin telefono · ${visiblePaidRows.length} al dia.`}
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
                    <th className="px-3 py-2 font-semibold text-slate-700">Comprador</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Detalle</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Cant.</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Total</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Pagado</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Restante</th>
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
                                  href={`/admin/socios/${row.member.id}`}
                                  className="font-medium text-slate-900 underline-offset-2 hover:underline"
                                >
                                  {row.member.full_name}
                                </Link>
                                <p className="text-xs text-slate-500">
                                  DNI {row.member.dni} · {row.member.status === "active" ? "Activo" : row.member.status === "inactive" ? "Baja" : "Pendiente"}
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
                          <td className="px-3 py-2 text-sm text-slate-700">
                            {row.description?.trim() || <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-slate-700">{row.quantity}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-900">
                            {formatMoney(row.amount)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-slate-700">
                            {formatMoney(row.paid_amount)}
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
                                    title="El socio no tiene teléfono configurado"
                                  >
                                    Sin tel.
                                  </span>
                                ) : null}
                              </div>
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
                              {assigningExternalLineId === row.id ? (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <Select
                                    value={externalAssignMemberId}
                                    onChange={(e) => setExternalAssignMemberId(e.target.value)}
                                    className="rounded-md border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 shadow-none focus:shadow-none"
                                  >
                                    <option value="">Elegí un socio…</option>
                                    {allMembers.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.full_name} · {m.dni}
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
                            <td colSpan={11} className="px-3 py-3 text-sm text-slate-700">
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
                                <p className="text-slate-600">Todavía no hay pagos registrados para este cargo.</p>
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
              <h2 className="text-lg font-semibold text-slate-900">Asignación del período</h2>
              <p className="mt-1 text-sm text-slate-600">
                La cuota mensual se genera como una foto del período. Solo incluye a los socios activos al momento de
                la generación automática.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Si un socio se activa después, empieza a deber desde el próximo mes y no se agrega retroactivamente a
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
                        : `${missingMembers.length} socio(s) activo(s) aún no tienen este cargo asignado.`}
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
                          DNI {m.dni} · {m.status === "active" ? "Activo" : m.status === "inactive" ? "Baja" : "Pendiente"}
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
                          href={`/admin/socios/${m.id}`}
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
                DNI {currentWhatsAppBatchRow.member.dni} · Pendiente{" "}
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
        <h2 className="text-lg font-semibold text-slate-900">Editar cargo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Editás el cargo base. Las líneas ya asignadas a socios no se modifican.
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
              Descripción
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
                  Este cargo ya tiene {rows.length} socio(s) asignado(s). Cambiar el monto NO actualiza
                  las líneas existentes (sólo afecta a futuras asignaciones de socios faltantes).
                </p>
              );
            })()}
          </div>
          <div>
            <label htmlFor="edit-charge-due" className="mb-1 block text-sm font-medium text-slate-700">
              Fecha de vencimiento
            </label>
            <Input
              id="edit-charge-due"
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="text-sm"
            />
          </div>
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
          {lineEditingId ? "Editar línea" : "Agregar línea"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {lineEditingId
            ? "Modificá los datos de esta línea. Los pagos asociados (si los hay) no se tocan."
            : "Sumá una línea a este cargo. Si el comprador no es socio del club, usá el modo 'Externo' y reasignalo después."}
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
                <option value="">Elegí un socio…</option>
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} · DNI {m.dni}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <label htmlFor="line-external" className="mb-1 block text-sm font-medium text-slate-700">
                Nombre del comprador <span className="text-danger">*</span>
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
              Detalle / talle
            </label>
            <Input
              id="line-description"
              value={lineDescription}
              onChange={(e) => setLineDescription(e.target.value)}
              placeholder="Ej. XXL, M, Talle único"
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
                Total de la línea <span className="text-danger">*</span>
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
            {lineSaving ? "Guardando..." : lineEditingId ? "Guardar cambios" : "Agregar línea"}
          </Button>
        </div>
      </AdminModal>

      <AdminModal open={expenseModalOpen} onClose={closeExpenseModal}>
        <h2 className="text-lg font-semibold text-slate-900">
          {editingExpense ? "Editar egreso" : "Registrar egreso"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Este egreso quedará asociado al cargo <span className="font-semibold text-slate-900">{charge.name}</span>.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="charge-exp-desc" className="mb-1 block text-sm font-medium text-slate-700">
              Descripción <span className="text-danger">*</span>
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
              Categoría
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
