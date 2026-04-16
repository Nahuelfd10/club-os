"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { ChargePaymentModal } from "@/components/admin/charge-payment-modal";
import { Badge } from "@/components/ui";
import {
  getChargePaymentsByMemberChargeId,
  getMemberChargesForMember,
  registerChargePayment,
  type ChargePaymentRow,
  type MemberChargeStatus,
  type MemberChargeWithDetails,
} from "@/lib/charges";
import {
  memberChargeStatusBadgeVariant,
  memberChargeStatusLabel,
  remainingAmount,
} from "@/lib/charges-ui";
import { formatDueDate, formatPaidAt } from "@/lib/datetime";
import { formatMoney } from "@/lib/formatters";
import {
  buildChargeDebtWhatsAppLink,
  buildTotalChargesDebtWhatsAppLink,
} from "@/lib/whatsapp-reminder";

type StatusFilter = "all" | MemberChargeStatus;

type Props = {
  memberId: string;
  memberFullName: string;
  memberPhone?: string | null;
  clubName?: string;
  paymentAlias?: string | null;
  /**
   * Si se pasa (p. ej. excluyendo cuota `membership`), no se vuelve a consultar Supabase:
   * se muestran solo estas filas.
   */
  charges?: MemberChargeWithDetails[];
  /** Tras registrar un pago cuando `charges` viene del padre. */
  onChargesRefresh?: () => void | Promise<void>;
};

export function MemberChargesSection({
  memberId,
  memberFullName,
  memberPhone,
  clubName = "",
  paymentAlias,
  charges: chargesFromParent,
  onChargesRefresh,
}: Props) {
  const [rows, setRows] = useState<MemberChargeWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(() => chargesFromParent === undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyByMc, setHistoryByMc] = useState<Record<string, ChargePaymentRow[]>>({});
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);

  const [payModalRow, setPayModalRow] = useState<MemberChargeWithDetails | null>(null);

  const loadFromServer = useCallback(async () => {
    if (!memberId) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMemberChargesForMember(memberId);
      setRows(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los cargos.");
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (chargesFromParent !== undefined) {
      setRows(chargesFromParent);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }
    void loadFromServer();
  }, [memberId, chargesFromParent, loadFromServer]);

  const reload = useCallback(async () => {
    if (chargesFromParent !== undefined) {
      await onChargesRefresh?.();
      return;
    }
    await loadFromServer();
  }, [chargesFromParent, onChargesRefresh, loadFromServer]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      const d = row.dueDate || row.charge.due_date || "";
      if (dueFrom.trim() && d && d < dueFrom.trim()) {
        return false;
      }
      if (dueTo.trim() && d && d > dueTo.trim()) {
        return false;
      }
      if (dueFrom.trim() && !d) {
        return false;
      }
      if (dueTo.trim() && !d) {
        return false;
      }
      return true;
    });
  }, [rows, statusFilter, dueFrom, dueTo]);

  const totalRemaining = useMemo(
    () => roundMoneySum(rows.map((r) => remainingAmount(r))),
    [rows]
  );

  const totalWaUrl = useMemo(() => {
    if (totalRemaining <= 0.001 || !memberFullName) {
      return null;
    }
    return buildTotalChargesDebtWhatsAppLink({
      member: { full_name: memberFullName, phone: memberPhone },
      clubName,
      totalDebtFormatted: formatMoney(totalRemaining),
      paymentAlias,
    });
  }, [totalRemaining, memberFullName, memberPhone, clubName, paymentAlias]);

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

  const toggleExpand = (row: MemberChargeWithDetails) => {
    if (expandedId === row.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(row.id);
    if (!historyByMc[row.id]) {
      void loadHistory(row.id);
    }
  };

  const openPayModal = (row: MemberChargeWithDetails) => {
    setPayModalRow(row);
  };

  const closePayModal = () => {
    setPayModalRow(null);
  };

  const counts = useMemo(() => {
    const m: Record<StatusFilter, number> = { all: rows.length, pending: 0, partial: 0, paid: 0 };
    for (const r of rows) {
      m[r.status] += 1;
    }
    return m;
  }, [rows]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-950/58 p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-white">Cargos y pagos</h2>
        <p className="text-sm text-slate-300">Cargando...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-950/58 p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-white">Cargos y pagos</h2>
        <p className="text-sm text-danger">{errorMessage}</p>
      </section>
    );
  }

  const colCount = 9;

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-slate-950/58 p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Otros cargos</h2>
            <p className="text-sm text-slate-300">
              Actividades, inscripciones y cargos por grupo (no cuota mensual del club).
            </p>
          </div>
          {totalRemaining > 0.001 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-300">
                <span className="font-semibold">Saldo total:</span>{" "}
                <Badge variant="danger">{formatMoney(totalRemaining)}</Badge>
              </span>
              <span
                title={
                  totalWaUrl
                    ? undefined
                    : "Necesitás un teléfono válido en el perfil del socio."
                }
                className="inline-flex"
              >
                <button
                  type="button"
                  disabled={!totalWaUrl}
                  onClick={() => {
                    if (totalWaUrl) {
                      window.open(totalWaUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className={
                    totalWaUrl
                      ? "inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success shadow-sm transition-colors hover:bg-success/15"
                      : "inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-400 opacity-90 shadow-sm"
                  }
                >
                  Recordatorio WhatsApp
                </button>
              </span>
            </div>
          ) : (
            <p className="text-sm font-medium text-success">Sin saldo pendiente en cargos.</p>
          )}
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
          <div
            className="inline-flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1"
            role="group"
            aria-label="Filtrar por estado del cargo"
          >
            {(
              [
                ["all", "Todos", counts.all],
                ["pending", "Pendiente", counts.pending],
                ["partial", "Parcial", counts.partial],
                ["paid", "Pagado", counts.paid],
              ] as const
            ).map(([value, label, n]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === value
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {label} ({n})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2 text-slate-300">
              Venc. desde
              <input
                type="date"
                value={dueFrom}
                onChange={(e) => setDueFrom(e.target.value)}
                className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-white"
              />
            </label>
            <label className="flex items-center gap-2 text-slate-300">
              hasta
              <input
                type="date"
                value={dueTo}
                onChange={(e) => setDueTo(e.target.value)}
                className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-white"
              />
            </label>
            {(dueFrom || dueTo) && (
              <button
                type="button"
                className="text-xs font-semibold text-slate-300 underline"
                onClick={() => {
                  setDueFrom("");
                  setDueTo("");
                }}
              >
                Limpiar fechas
              </button>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-300">No tenés cargos asignados.</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-slate-300">Ningún cargo coincide con los filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/[0.045]">
                <tr>
                  <th className="px-3 py-2 font-semibold text-white/45" aria-hidden />
                  <th className="px-3 py-2 font-semibold text-white/45">Concepto</th>
                  <th className="px-3 py-2 font-semibold text-white/45">Grupo</th>
                  <th className="px-3 py-2 font-semibold text-white/45">Vencimiento</th>
                  <th className="px-3 py-2 font-semibold text-white/45">Total</th>
                  <th className="px-3 py-2 font-semibold text-white/45">Pagado</th>
                  <th className="px-3 py-2 font-semibold text-white/45" title="Saldo pendiente">
                    Restante
                  </th>
                  <th className="px-3 py-2 font-semibold text-white/45">Estado</th>
                  <th className="px-3 py-2 font-semibold text-white/45">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 bg-transparent">
                {filteredRows.map((row) => {
                  const rem = remainingAmount(row);
                  const canPay = rem > 0.001;
                  const expanded = expandedId === row.id;
                  const history = historyByMc[row.id];
                  const waUrl =
                    canPay && memberFullName
                      ? buildChargeDebtWhatsAppLink({
                          fullName: memberFullName,
                          phone: memberPhone,
                          chargeName: row.conceptName,
                          groupName: row.charge.group?.name ?? "Sin grupo",
                          remainingFormatted: formatMoney(rem),
                        })
                      : null;

                  return (
                    <Fragment key={row.id}>
                      <tr className={expanded ? "bg-white/[0.04]" : undefined}>
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => toggleExpand(row)}
                            className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs font-semibold text-white hover:bg-white/[0.12]"
                            aria-expanded={expanded}
                          >
                            {expanded ? "Ocultar" : "Pagos"}
                          </button>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => toggleExpand(row)}
                            className="text-left font-medium text-white underline-offset-2 hover:underline"
                          >
                            {row.conceptName}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {row.charge.group ? (
                            <Link
                              href={`/admin/groups/${row.charge.group.id}`}
                              className="underline-offset-2 hover:text-white hover:underline"
                            >
                              {row.charge.group.name}
                            </Link>
                          ) : (
                            <span className="text-slate-400">Sin grupo</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{formatDueDate(row.charge.due_date)}</td>
                        <td className="px-3 py-2 tabular-nums text-white">{formatMoney(row.amount)}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-200">{formatMoney(row.paid_amount)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block min-w-[5.5rem] rounded-lg px-2.5 py-1 text-right text-base font-bold tabular-nums ${
                              rem <= 0.001
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning ring-1 ring-warning/20"
                            }`}
                          >
                            {formatMoney(rem)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={memberChargeStatusBadgeVariant(row.status)}>
                            {memberChargeStatusLabel(row.status)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex min-w-[10.5rem] gap-1.5">
                            <button
                              type="button"
                              onClick={() => openPayModal(row)}
                              disabled={!canPay}
                              className="rounded-md bg-success px-2.5 py-1.5 text-center text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Pagar
                            </button>
                            {waUrl ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md border border-success bg-success/10 px-2.5 py-1.5 text-center text-xs font-semibold text-success transition-colors hover:bg-success/15"
                              >
                                WhatsApp
                              </a>
                            ) : canPay ? (
                              <span
                                className="text-[11px] leading-tight text-slate-400"
                                title="Configurá un teléfono en el perfil"
                              >
                                Sin teléfono
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-white/[0.035]">
                          <td colSpan={colCount} className="px-3 py-3 text-sm text-slate-300">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/42">
                              Historial de pagos
                            </p>
                            {historyLoadingId === row.id ? (
                              <p className="text-slate-300">Cargando...</p>
                            ) : history && history.length > 0 ? (
                              <ul className="space-y-1.5 border-l-2 border-white/10 pl-3">
                                {history.map((p) => (
                                  <li key={p.id} className="flex flex-wrap gap-x-3 gap-y-0.5">
                                    <span className="font-semibold tabular-nums text-white">
                                      {formatMoney(p.amount)}
                                    </span>
                                    <span className="text-slate-300">{formatPaidAt(p.paid_at)}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-slate-300">Todavía no hay pagos registrados para este cargo.</p>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ChargePaymentModal
        open={payModalRow !== null}
        onClose={closePayModal}
        title="Registrar pago"
        subtitle={payModalRow?.conceptName ?? null}
        pendingAmount={payModalRow ? remainingAmount(payModalRow) : 0}
        onConfirm={async ({ amount, paid_at }) => {
          if (!payModalRow) {
            return;
          }
          const memberChargeId = payModalRow.id;
          await registerChargePayment({ member_charge_id: memberChargeId, amount, paid_at });
          await reload();
          if (expandedId === memberChargeId) {
            await loadHistory(memberChargeId);
          }
        }}
      />
    </>
  );
}

function roundMoneySum(values: number[]): number {
  const s = values.reduce((a, b) => a + b, 0);
  return Math.round(s * 100) / 100;
}
