"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";

import { ChargePaymentModal } from "@/components/admin/charge-payment-modal";
import { Badge } from "@/components/ui";
import {
  getChargePaymentsByMemberChargeId,
  getMemberChargesForMember,
  registerChargePayment,
  type ChargePaymentRow,
  type MemberChargeWithDetails,
} from "@/lib/charges";
import {
  memberChargeStatusBadgeVariant,
  memberChargeStatusLabel,
  remainingAmount,
} from "@/lib/charges-ui";
import { formatDueDate, formatPaidAt } from "@/lib/datetime";
import { formatMoney } from "@/lib/formatters";
import { buildChargeDebtWhatsAppLink } from "@/lib/whatsapp-reminder";

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
  };

  const closePayModal = () => {
    setPayModalRow(null);
  };

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
        <p className="text-sm text-danger">{errorMessage}</p>
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
                              Registrar pago
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

      <ChargePaymentModal
        open={payModalRow !== null}
        onClose={closePayModal}
        title="Registrar pago"
        subtitle={payModalRow?.charge.name ?? null}
        pendingAmount={payModalRow ? remainingAmount(payModalRow) : 0}
        onConfirm={async ({ amount, paid_at }) => {
          if (!payModalRow) {
            return;
          }
          const memberChargeId = payModalRow.id;
          await registerChargePayment({ member_charge_id: memberChargeId, amount, paid_at });
          await load();
          if (expandedId === memberChargeId) {
            await loadHistory(memberChargeId);
          }
        }}
      />
    </>
  );
}
