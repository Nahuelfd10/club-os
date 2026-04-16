"use client";

import { useMemo, useState } from "react";

import { ChargePaymentModal } from "@/components/admin/charge-payment-modal";
import { Badge, Button } from "@/components/ui";
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
import { formatDueDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/formatters";

type Props = {
  rows: MemberChargeWithDetails[];
  memberStatus: "pending" | "active";
  onPaid: () => void | Promise<void>;
};

export function MembershipMonthlySection({ rows, memberStatus, onPaid }: Props) {
  const [payRow, setPayRow] = useState<MemberChargeWithDetails | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

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

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-slate-950/58 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white">Cuota mensual del club</h2>
        <p className="mt-1 text-sm text-slate-300">
          Cuotas mensuales del club (cargos marcados como <span className="font-semibold">Cuota mensual</span>).
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2">
          <p className="text-sm text-slate-300">
            <span className="font-semibold">Deuda total:</span>{" "}
            {totalDebt > 0.001 ? (
              <Badge variant="danger">{formatMoney(totalDebt)}</Badge>
            ) : (
              <Badge variant="success">{formatMoney(0)}</Badge>
            )}
          </p>
        </div>

        {sorted.length === 0 ? (
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
                {sorted.map((row) => {
                  const rem = remainingAmount(row);
                  const canPay = memberStatus === "active" && rem > 0.001;
                  const due = row.charge.due_date?.trim();
                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-medium text-white">
                        <div className="capitalize">
                          {row.billing_period ? formatBillingPeriod(row.billing_period) : "—"}
                        </div>
                        {due ? (
                          <div className="mt-0.5 text-xs font-normal text-slate-400">
                            Vence el {formatDueDate(due)}
                          </div>
                        ) : null}
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
      </section>

      <ChargePaymentModal
        open={payRow !== null}
        onClose={() => setPayRow(null)}
        title="Registrar pago — cuota mensual"
        subtitle={payRow?.conceptName ?? null}
        pendingAmount={payRow ? remainingAmount(payRow) : 0}
        onConfirm={async ({ amount, paid_at }) => {
          if (!payRow) {
            return;
          }
          setPayingId(payRow.id);
          try {
            await registerChargePayment({
              member_charge_id: payRow.id,
              amount,
              paid_at,
            });
            setPayRow(null);
            await onPaid();
          } finally {
            setPayingId(null);
          }
        }}
      />
    </>
  );
}
