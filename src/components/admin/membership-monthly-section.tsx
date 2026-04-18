"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import { ChargePaymentModal } from "@/components/admin/charge-payment-modal";
import {
  CLUB_PAYMENT_METHOD_OPTIONS,
  DEFAULT_PAYMENT_METHOD,
  type ClubPaymentMethod,
} from "@/config/payment-method";
import { Badge, Button, Input } from "@/components/ui";
import {
  formatBillingPeriod,
  registerChargePayment,
  type MemberChargeWithDetails,
} from "@/lib/charges";
import {
  memberChargeStatusBadgeVariant,
  memberChargeStatusLabel,
  remainingAmount,
} from "@/lib/charges-ui";
import { datetimeLocalToIso, toDatetimeLocalValue } from "@/lib/datetime";
import { formatMoney } from "@/lib/formatters";

type Props = {
  rows: MemberChargeWithDetails[];
  memberStatus: "pending" | "active";
  onPaid: () => void | Promise<void>;
};

export function MembershipMonthlySection({ rows, memberStatus, onPaid }: Props) {
  const [payRow, setPayRow] = useState<MemberChargeWithDetails | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showFuture, setShowFuture] = useState(false);
  const [bulkMode, setBulkMode] = useState<"rest" | "select" | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [bulkPaidAt, setBulkPaidAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState<ClubPaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const pa = a.billing_period?.trim() ?? "";
      const pb = b.billing_period?.trim() ?? "";
      if (pa && pb && pa !== pb) {
        return pa.localeCompare(pb);
      }
      if (pa && !pb) {
        return -1;
      }
      if (!pa && pb) {
        return 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rows]);

  const totalDebt = useMemo(
    () =>
      Math.round(
        sorted.reduce((acc, c) => acc + (c.amount - c.paid_amount), 0) * 100
      ) / 100,
    [sorted]
  );

  const currentMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>();
    set.add(new Date().getFullYear());
    sorted.forEach((row) => {
      if (row.billing_period) {
        set.add(new Date(`${row.billing_period}T12:00:00`).getFullYear());
      }
    });
    return [...set].sort((a, b) => b - a);
  }, [sorted]);

  useEffect(() => {
    if (years.length === 0) {
      return;
    }
    if (!years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [selectedYear, years]);

  const rowsForYear = useMemo(() => {
    return sorted.filter((row) => {
      if (!row.billing_period) {
        return selectedYear === new Date().getFullYear();
      }
      return new Date(`${row.billing_period}T12:00:00`).getFullYear() === selectedYear;
    });
  }, [selectedYear, sorted]);

  const visibleRows = useMemo(() => {
    return rowsForYear.filter((row) => {
      if (!row.billing_period) {
        return true;
      }
      return new Date(`${row.billing_period}T12:00:00`) <= currentMonthStart;
    });
  }, [currentMonthStart, rowsForYear]);

  const futureRows = useMemo(() => {
    return rowsForYear.filter((row) => {
      if (!row.billing_period) {
        return false;
      }
      return new Date(`${row.billing_period}T12:00:00`) > currentMonthStart;
    });
  }, [currentMonthStart, rowsForYear]);

  const payableRowsForYear = useMemo(
    () => rowsForYear.filter((row) => memberStatus === "active" && remainingAmount(row) > 0.001),
    [memberStatus, rowsForYear]
  );

  const payableRestRows = useMemo(() => {
    const currentYear = currentMonthStart.getFullYear();
    return payableRowsForYear.filter((row) => {
      if (!row.billing_period) {
        return false;
      }
      const periodDate = new Date(`${row.billing_period}T12:00:00`);
      if (selectedYear < currentYear) {
        return false;
      }
      if (selectedYear > currentYear) {
        return true;
      }
      return periodDate >= currentMonthStart;
    });
  }, [currentMonthStart, payableRowsForYear, selectedYear]);

  const selectedBulkRows = useMemo(() => {
    const idSet = new Set(selectedBulkIds);
    return payableRowsForYear.filter((row) => idSet.has(row.id));
  }, [payableRowsForYear, selectedBulkIds]);

  const payableVisibleRows = useMemo(
    () => payableRowsForYear.filter((row) => visibleRows.some((visible) => visible.id === row.id)),
    [payableRowsForYear, visibleRows]
  );

  const payableFutureRows = useMemo(
    () => payableRowsForYear.filter((row) => futureRows.some((future) => future.id === row.id)),
    [futureRows, payableRowsForYear]
  );

  const selectedBulkTotal = useMemo(
    () => Math.round(selectedBulkRows.reduce((sum, row) => sum + remainingAmount(row), 0) * 100) / 100,
    [selectedBulkRows]
  );

  const overdueRows = useMemo(() => {
    return rowsForYear.filter((row) => {
      if (!row.billing_period) {
        return false;
      }
      return new Date(`${row.billing_period}T12:00:00`) < currentMonthStart && remainingAmount(row) > 0.001;
    });
  }, [currentMonthStart, rowsForYear]);

  const currentRows = useMemo(() => {
    return rowsForYear.filter((row) => {
      if (!row.billing_period) {
        return false;
      }
      return new Date(`${row.billing_period}T12:00:00`).getTime() === currentMonthStart.getTime();
    });
  }, [currentMonthStart, rowsForYear]);

  const openBulkModal = (mode: "rest" | "select") => {
    setBulkMode(mode);
    setBulkPaidAt(toDatetimeLocalValue(new Date()));
    setBulkPaymentMethod(DEFAULT_PAYMENT_METHOD);
    setBulkError(null);
    setSelectedBulkIds(
      mode === "rest" ? payableRestRows.map((row) => row.id) : payableRowsForYear.map((row) => row.id)
    );
  };

  const closeBulkModal = () => {
    if (bulkSubmitting) {
      return;
    }
    setBulkMode(null);
    setBulkError(null);
  };

  const toggleBulkRow = (rowId: string) => {
    setSelectedBulkIds((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]));
  };

  const applyBulkShortcut = (mode: "all" | "visible" | "future" | "clear") => {
    if (mode === "all") {
      setSelectedBulkIds(payableRowsForYear.map((row) => row.id));
      return;
    }
    if (mode === "visible") {
      setSelectedBulkIds(payableVisibleRows.map((row) => row.id));
      return;
    }
    if (mode === "future") {
      setSelectedBulkIds(payableFutureRows.map((row) => row.id));
      return;
    }
    setSelectedBulkIds([]);
  };

  const submitBulkPayment = async () => {
    if (selectedBulkRows.length === 0) {
      setBulkError("Seleccioná al menos una cuota para registrar el pago.");
      return;
    }

    setBulkSubmitting(true);
    setBulkError(null);
    try {
      const paidAtIso = datetimeLocalToIso(bulkPaidAt);
      for (const row of selectedBulkRows) {
        const rem = remainingAmount(row);
        if (rem <= 0.001) {
          continue;
        }
        await registerChargePayment({
          member_charge_id: row.id,
          amount: rem,
          paid_at: paidAtIso,
          payment_method: bulkPaymentMethod,
        });
      }
      setBulkMode(null);
      await onPaid();
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "No se pudieron registrar los pagos.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-slate-950/58 p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Cuota mensual del club</h2>
            <p className="mt-1 text-sm text-slate-300">
              Cuotas mensuales del club agrupadas por año, con los meses futuros colapsados para acortar la vista.
            </p>
          </div>
          <label className="space-y-1 text-sm text-slate-300">
            <span className="block text-xs font-semibold uppercase tracking-wide text-white/45">Año</span>
            <select
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(Number(event.target.value));
                setShowFuture(false);
              }}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3">
          <div className="space-y-2">
            <p className="text-sm text-slate-300">
              <span className="font-semibold">Saldo total del año:</span>{" "}
              {totalDebt > 0.001 ? (
                <Badge variant="danger">{formatMoney(totalDebt)}</Badge>
              ) : (
                <Badge variant="success">{formatMoney(0)}</Badge>
              )}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-danger/25 bg-danger/10 px-2.5 py-1 text-danger">
                Vencidas: {overdueRows.length}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-slate-200">
                Mes actual: {currentRows.length}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-slate-300">
                Futuras: {futureRows.length}
              </span>
            </div>
          </div>
          {memberStatus === "active" && payableRowsForYear.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openBulkModal("rest")}
                disabled={payableRestRows.length === 0}
                className="rounded-lg border border-success/25 bg-success/12 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-success/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pagar resto del año
              </button>
              <button
                type="button"
                onClick={() => openBulkModal("select")}
                className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"
              >
                Elegir meses
              </button>
            </div>
          ) : null}
        </div>
        {memberStatus === "active" && payableRowsForYear.length > 0 ? (
          <p className="mt-2 text-xs text-slate-400">
            Podés cobrar desde el mes actual hasta diciembre de {selectedYear}, o elegir meses puntuales.
          </p>
        ) : null}

        {rowsForYear.length === 0 ? (
          <p className="mt-4 text-sm text-slate-300">No hay cuotas mensuales registradas para {selectedYear}.</p>
        ) : visibleRows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-300">No hay cuotas mensuales registradas.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/[0.045]">
                <tr>
                  <th className="px-3 py-2 font-semibold text-white/45">Período</th>
                  <th className="px-3 py-2 font-semibold text-white/45">Estado</th>
                  <th className="px-3 py-2 font-semibold text-white/45">Monto</th>
                  <th className="px-3 py-2 font-semibold text-white/45">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 bg-transparent">
                {visibleRows.map((row) => {
                  const rem = remainingAmount(row);
                  const canPay = memberStatus === "active" && rem > 0.001;
                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-medium text-white">
                        <div className="capitalize">{row.billing_period ? formatBillingPeriod(row.billing_period) : "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={memberChargeStatusBadgeVariant(row.status)}>
                          {memberChargeStatusLabel(row.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-white">{formatMoney(row.amount)}</td>
                      <td className="px-3 py-2">
                        {memberStatus === "pending" ? (
                          <span className="text-xs font-semibold text-slate-400">No aplica</span>
                        ) : canPay ? (
                          <Button
                            type="button"
                            size="md"
                            className="bg-success text-white"
                            disabled={payingId === row.id}
                            onClick={() => setPayRow(row)}
                          >
                            {payingId === row.id ? "..." : "Pagar"}
                          </Button>
                        ) : (
                          <span className="text-xs font-semibold text-success">Al día</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {futureRows.length > 0 ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Cuotas futuras del {selectedYear}</p>
                <p className="mt-1 text-sm text-slate-300">
                  Hay {futureRows.length} cuota(s) ya generadas para pago adelantado.
                </p>
              </div>
              <Button type="button" variant="neutral" size="md" onClick={() => setShowFuture((prev) => !prev)}>
                {showFuture ? "Ocultar futuras" : "Ver futuras"}
              </Button>
            </div>

            {showFuture ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  <thead className="bg-white/[0.045]">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-white/45">Período</th>
                      <th className="px-3 py-2 font-semibold text-white/45">Estado</th>
                      <th className="px-3 py-2 font-semibold text-white/45">Monto</th>
                      <th className="px-3 py-2 font-semibold text-white/45">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8 bg-transparent">
                    {futureRows.map((row) => {
                      const rem = remainingAmount(row);
                      const canPay = memberStatus === "active" && rem > 0.001;
                      return (
                        <tr key={row.id}>
                          <td className="px-3 py-2 font-medium text-white">
                            <div className="capitalize">{row.billing_period ? formatBillingPeriod(row.billing_period) : "—"}</div>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={memberChargeStatusBadgeVariant(row.status)}>
                              {memberChargeStatusLabel(row.status)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 tabular-nums text-white">{formatMoney(row.amount)}</td>
                          <td className="px-3 py-2">
                            {memberStatus === "pending" ? (
                              <span className="text-xs font-semibold text-slate-400">No aplica</span>
                            ) : canPay ? (
                              <Button
                                type="button"
                                size="md"
                                className="bg-success text-white"
                                disabled={payingId === row.id}
                                onClick={() => setPayRow(row)}
                              >
                                {payingId === row.id ? "..." : "Pagar"}
                              </Button>
                            ) : (
                              <span className="text-xs font-semibold text-success">Al día</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <ChargePaymentModal
        open={payRow !== null}
        onClose={() => setPayRow(null)}
        title="Registrar pago — cuota mensual"
        subtitle={payRow?.conceptName ?? null}
        pendingAmount={payRow ? remainingAmount(payRow) : 0}
        onConfirm={async ({ amount, paid_at, payment_method }) => {
          if (!payRow) {
            return;
          }
          setPayingId(payRow.id);
          try {
            await registerChargePayment({
              member_charge_id: payRow.id,
              amount,
              paid_at,
              payment_method,
            });
            setPayRow(null);
            await onPaid();
          } finally {
            setPayingId(null);
          }
        }}
      />

      <AdminModal open={bulkMode !== null} onClose={closeBulkModal}>
        <h2 className="text-lg font-semibold text-white">
          {bulkMode === "rest" ? "Pagar resto del año" : "Seleccionar meses a pagar"}
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          {bulkMode === "rest"
            ? "Se van a cobrar completas las cuotas pendientes desde el período actual hasta el cierre del año filtrado."
            : "Marcá las cuotas que querés pagar completas en este movimiento."}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.05] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Cuotas seleccionadas</p>
            <p className="mt-1 text-2xl font-bold text-white">{selectedBulkRows.length}</p>
            <p className="mt-1 text-xs text-slate-400">
              {selectedBulkRows.length > 0
                ? `${selectedBulkRows.length} mes(es) marcado(s) para este movimiento.`
                : "Todavía no hay meses seleccionados."}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.05] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Total a registrar</p>
            <p className="mt-1 text-2xl font-bold text-white">{formatMoney(selectedBulkTotal)}</p>
            <p className="mt-1 text-xs text-slate-400">Se registra como pago completo sobre cada cuota marcada.</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-300">Fecha y hora del pago</label>
          <Input
            type="datetime-local"
            value={bulkPaidAt}
            onChange={(event) => setBulkPaidAt(event.target.value)}
            className="border-white/10 bg-white/[0.05] text-sm text-white focus:border-white/20 focus:bg-white/[0.08]"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-300">Método de pago</label>
          <select
            value={bulkPaymentMethod}
            onChange={(event) => setBulkPaymentMethod(event.target.value as ClubPaymentMethod)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-white/20 focus:bg-white/[0.08]"
          >
            {CLUB_PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-950 text-white">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyBulkShortcut("all")}
              className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
            >
              Todas ({payableRowsForYear.length})
            </button>
            <button
              type="button"
              onClick={() => applyBulkShortcut("visible")}
              className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
            >
              Exigibles ({payableVisibleRows.length})
            </button>
            <button
              type="button"
              onClick={() => applyBulkShortcut("future")}
              className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
            >
              Futuras ({payableFutureRows.length})
            </button>
            <button
              type="button"
              onClick={() => applyBulkShortcut("clear")}
              className="rounded-full border border-white/10 bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Limpiar
            </button>
          </div>

          {payableRowsForYear.length === 0 ? (
            <p className="text-sm text-slate-300">No hay cuotas pendientes para este año.</p>
          ) : (
            payableRowsForYear.map((row) => {
              const checked = selectedBulkIds.includes(row.id);
              return (
                <label
                  key={row.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold capitalize text-white">
                      {row.billing_period ? formatBillingPeriod(row.billing_period) : "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">Pendiente {formatMoney(remainingAmount(row))}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleBulkRow(row.id)}
                    className="h-4 w-4 rounded border-white/20 bg-white/[0.08]"
                  />
                </label>
              );
            })
          )}
        </div>

        {bulkError ? <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{bulkError}</p> : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={closeBulkModal} disabled={bulkSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="md"
            className="bg-success text-white"
            onClick={() => void submitBulkPayment()}
            disabled={bulkSubmitting || selectedBulkRows.length === 0}
          >
            {bulkSubmitting ? "Registrando..." : "Confirmar pagos"}
          </Button>
        </div>
      </AdminModal>
    </>
  );
}
