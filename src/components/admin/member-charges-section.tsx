"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import { Badge, Button, Input } from "@/components/ui";
import {
  getChargePaymentsByMemberChargeId,
  getMemberChargesForMember,
  registerChargePayment,
  type ChargePaymentRow,
  type MemberChargeStatus,
  type MemberChargeWithDetails,
} from "@/lib/charges";
import { formatMoney } from "@/lib/formatters";
import { buildChargeDebtWhatsAppLink } from "@/lib/whatsapp-reminder";

function formatDueDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR");
  } catch {
    return iso;
  }
}

function formatPaidAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString("es-AR");
  } catch {
    return iso;
  }
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(localValue: string): string {
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function statusLabel(status: MemberChargeStatus): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "partial":
      return "Parcial";
    case "paid":
      return "Pagado";
    default:
      return status;
  }
}

function statusBadgeVariant(status: MemberChargeStatus): "danger" | "warning" | "success" {
  switch (status) {
    case "paid":
      return "success";
    case "partial":
      return "warning";
    default:
      return "danger";
  }
}

function remainingAmount(row: MemberChargeWithDetails): number {
  return Math.max(0, Math.round((row.amount - row.paid_amount) * 100) / 100);
}

function formatAmountInput(rem: number): string {
  if (rem % 1 === 0) {
    return String(rem);
  }
  return rem.toFixed(2);
}

type Props = {
  memberId: string;
  memberFullName: string;
  memberPhone?: string | null;
};

export function MemberChargesSection({ memberId, memberFullName, memberPhone }: Props) {
  const [rows, setRows] = useState<MemberChargeWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyByMc, setHistoryByMc] = useState<Record<string, ChargePaymentRow[]>>({});
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);

  const [payModalRow, setPayModalRow] = useState<MemberChargeWithDetails | null>(null);
  const [payIsFull, setPayIsFull] = useState(true);
  const [payAmount, setPayAmount] = useState("");
  const [payPaidAt, setPayPaidAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const load = useCallback(async () => {
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
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron cargar los cargos."
      );
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

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
    setPayIsFull(true);
    setPayPaidAt(toDatetimeLocalValue(new Date()));
    setPayError(null);
    const rem = remainingAmount(row);
    setPayAmount(formatAmountInput(rem));
  };

  const closePayModal = () => {
    if (!paySubmitting) {
      setPayModalRow(null);
      setPayIsFull(true);
      setPayError(null);
    }
  };

  const syncFullAmount = () => {
    if (!payModalRow) {
      return;
    }
    const rem = remainingAmount(payModalRow);
    setPayAmount(formatAmountInput(rem));
  };

  const handleSubmitPayment = async () => {
    if (!payModalRow) {
      return;
    }
    const raw = payAmount.replace(",", ".").trim();
    const amount = Number(raw);
    if (raw === "" || Number.isNaN(amount) || amount <= 0) {
      setPayError("Indicá un monto válido mayor a cero.");
      return;
    }

    const maxPay = remainingAmount(payModalRow);
    if (amount > maxPay + 0.001) {
      setPayError(`No podés superar el pendiente (${formatMoney(maxPay)}).`);
      return;
    }

    setPaySubmitting(true);
    setPayError(null);
    const memberChargeId = payModalRow.id;
    try {
      await registerChargePayment({
        member_charge_id: memberChargeId,
        amount,
        paid_at: datetimeLocalToIso(payPaidAt),
      });
      setPayModalRow(null);
      setPayIsFull(true);
      await load();
      if (expandedId === memberChargeId) {
        await loadHistory(memberChargeId);
      }
    } catch (error) {
      console.error(error);
      setPayError(error instanceof Error ? error.message : "No se pudo registrar el pago.");
    } finally {
      setPaySubmitting(false);
    }
  };

  const partialAmountInvalid = !payIsFull && (() => {
    const raw = payAmount.replace(",", ".").trim();
    const n = Number(raw);
    return raw === "" || Number.isNaN(n) || n <= 0;
  })();

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Cargos</h2>
        <p className="text-sm text-slate-600">Cargando...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Cargos</h2>
        <p className="text-sm text-red-700">{errorMessage}</p>
      </section>
    );
  }

  const colCount = 9;

  return (
    <>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Cargos</h2>
        <p className="mb-4 text-sm text-slate-600">
          Deudas por grupo: total, pagos registrados y saldo. Los pagos de cuota mensual no se mezclan
          aquí.
        </p>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">No tenés cargos asignados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700" aria-hidden />
                  <th className="px-3 py-2 font-semibold text-slate-700">Nombre</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Grupo</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Vencimiento</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Total</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Pagado</th>
                  <th className="px-3 py-2 font-semibold text-slate-700" title="Saldo pendiente">
                    Restante
                  </th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Estado</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row) => {
                  const rem = remainingAmount(row);
                  const canPay = rem > 0.001;
                  const expanded = expandedId === row.id;
                  const history = historyByMc[row.id];
                  const waUrl =
                    canPay && memberFullName
                      ? buildChargeDebtWhatsAppLink({
                          fullName: memberFullName,
                          phone: memberPhone,
                          chargeName: row.charge.name,
                          groupName: row.charge.group.name,
                          remainingFormatted: formatMoney(rem),
                        })
                      : null;

                  return (
                    <Fragment key={row.id}>
                      <tr className={expanded ? "bg-slate-50/60" : undefined}>
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => toggleExpand(row)}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            aria-expanded={expanded}
                          >
                            {expanded ? "Ocultar" : "Pagos"}
                          </button>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => toggleExpand(row)}
                            className="text-left font-medium text-slate-900 underline-offset-2 hover:underline"
                          >
                            {row.charge.name}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <Link
                            href={`/admin/groups/${row.charge.group.id}`}
                            className="underline-offset-2 hover:text-slate-900 hover:underline"
                          >
                            {row.charge.group.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{formatDueDate(row.charge.due_date)}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-900">{formatMoney(row.amount)}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-800">{formatMoney(row.paid_amount)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block min-w-[5.5rem] rounded-lg px-2.5 py-1 text-right text-base font-bold tabular-nums ${
                              rem <= 0.001
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80"
                            }`}
                          >
                            {formatMoney(rem)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={statusBadgeVariant(row.status)}>{statusLabel(row.status)}</Badge>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex min-w-[10.5rem] gap-1.5">
                            <button
                              type="button"
                              onClick={() => openPayModal(row)}
                              disabled={!canPay}
                              className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-center text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Registrar pago
                            </button>
                            {waUrl ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md border border-emerald-600 bg-emerald-50/80 px-2.5 py-1.5 text-center text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
                              >
                                WhatsApp
                              </a>
                            ) : canPay ? (
                              <span
                                className="text-[11px] leading-tight text-slate-500"
                                title="Configurá un teléfono en el perfil"
                              >
                                Sin teléfono para WhatsApp
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-slate-50/90">
                          <td colSpan={colCount} className="px-3 py-3 text-sm text-slate-700">
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
                                    <span className="text-slate-600">{formatPaidAt(p.paid_at)}</span>
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
          </div>
        )}
      </section>

      <AdminModal open={payModalRow !== null} onClose={closePayModal}>
        <h2 className="text-lg font-semibold text-slate-900">Registrar pago</h2>
        {payModalRow ? (
          <>
            <p className="mt-1 text-sm font-medium text-slate-800">{payModalRow.charge.name}</p>
            <p className="mt-2 text-sm text-slate-600">
              Pendiente:{" "}
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-base font-bold text-amber-950 ring-1 ring-amber-200/80">
                {formatMoney(remainingAmount(payModalRow))}
              </span>
            </p>
          </>
        ) : null}

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de pago</p>
          <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-slate-200/80 p-1" role="group">
            <button
              type="button"
              onClick={() => {
                setPayIsFull(true);
                syncFullAmount();
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                payIsFull ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pago total
            </button>
            <button
              type="button"
              onClick={() => {
                setPayIsFull(false);
                setPayAmount("");
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                !payIsFull ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pago parcial
            </button>
          </div>
          {!payIsFull ? (
            <p className="mt-2 text-xs text-slate-600">
              Ingresá un monto menor o igual al pendiente.
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-600">
              El monto se completa automáticamente con el saldo pendiente.
            </p>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="charge-pay-amount" className="mb-1 block text-sm font-medium text-slate-700">
              Monto <span className="text-red-600">*</span>
            </label>
            <Input
              id="charge-pay-amount"
              type="text"
              inputMode="decimal"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="0"
              className="text-sm"
              disabled={payIsFull}
            />
            {payIsFull ? (
              <p className="mt-1 text-xs text-slate-500">
                Desactivá “Pago total” para editar el monto.
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="charge-pay-at" className="mb-1 block text-sm font-medium text-slate-700">
              Fecha y hora del pago
            </label>
            <Input
              id="charge-pay-at"
              type="datetime-local"
              value={payPaidAt}
              onChange={(e) => setPayPaidAt(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        {payError ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{payError}</p>
        ) : null}
        {partialAmountInvalid ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Ingresá un monto mayor a 0 para confirmar el pago parcial.
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={closePayModal} disabled={paySubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="md"
            onClick={() => void handleSubmitPayment()}
            disabled={paySubmitting || partialAmountInvalid}
            style={{ backgroundColor: "#059669" }}
          >
            {paySubmitting ? "Guardando..." : "Confirmar pago"}
          </Button>
        </div>
      </AdminModal>
    </>
  );
}
