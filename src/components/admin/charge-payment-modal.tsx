"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import { Button, Input } from "@/components/ui";
import { datetimeLocalToIso, toDatetimeLocalValue } from "@/lib/datetime";
import { formatMoney } from "@/lib/formatters";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  pendingAmount: number;
  onConfirm: (payload: { amount: number; paid_at: string }) => Promise<void> | void;
};

function formatAmountInput(value: number): string {
  if (value % 1 === 0) {
    return String(value);
  }
  return value.toFixed(2);
}

export function ChargePaymentModal({
  open,
  onClose,
  title,
  subtitle,
  pendingAmount,
  onConfirm,
}: Props) {
  const amountId = useId();
  const paidAtId = useId();

  const [isFull, setIsFull] = useState(true);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingText = useMemo(() => formatMoney(pendingAmount), [pendingAmount]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setIsFull(true);
    setPaidAt(toDatetimeLocalValue(new Date()));
    setError(null);
    setAmount(formatAmountInput(pendingAmount));
  }, [open, pendingAmount]);

  const close = () => {
    if (!submitting) {
      onClose();
    }
  };

  const partialAmountInvalid = !isFull && (() => {
    const raw = amount.replace(",", ".").trim();
    const n = Number(raw);
    return raw === "" || Number.isNaN(n) || n <= 0;
  })();

  const submit = async () => {
    const raw = amount.replace(",", ".").trim();
    const numeric = Number(raw);
    if (raw === "" || Number.isNaN(numeric) || numeric <= 0) {
      setError("Indicá un monto válido mayor a cero.");
      return;
    }
    if (numeric > pendingAmount + 0.001) {
      setError(`No podés superar el pendiente (${pendingText}).`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({ amount: numeric, paid_at: datetimeLocalToIso(paidAt) });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el pago.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal open={open} onClose={close}>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm font-medium text-slate-800">{subtitle}</p> : null}
      <p className="mt-2 text-sm text-slate-600">
        Pendiente:{" "}
        <span className="rounded-md bg-warning/10 px-2 py-0.5 text-base font-bold text-warning ring-1 ring-warning/20">
          {pendingText}
        </span>
      </p>

      <div className="mt-4 rounded-lg border border-border bg-muted/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de pago</p>
        <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-slate-200/80 p-1" role="group">
          <button
            type="button"
            onClick={() => {
              setIsFull(true);
              setAmount(formatAmountInput(pendingAmount));
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isFull ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pago total
          </button>
          <button
            type="button"
            onClick={() => {
              setIsFull(false);
              setAmount("");
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              !isFull ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pago parcial
          </button>
        </div>
        {!isFull ? (
          <p className="mt-2 text-xs text-slate-600">Ingresá un monto menor o igual al pendiente.</p>
        ) : (
          <p className="mt-2 text-xs text-slate-600">
            El monto se completa automáticamente con el saldo pendiente.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor={amountId} className="mb-1 block text-sm font-medium text-slate-700">
            Monto <span className="text-danger">*</span>
          </label>
          <Input
            id={amountId}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={isFull ? "text-sm opacity-80" : "text-sm"}
            disabled={isFull}
          />
          {isFull ? (
            <p className="mt-1 text-xs text-slate-500">Desactivá “Pago total” para editar el monto.</p>
          ) : null}
        </div>
        <div>
          <label htmlFor={paidAtId} className="mb-1 block text-sm font-medium text-slate-700">
            Fecha y hora del pago
          </label>
          <Input
            id={paidAtId}
            type="datetime-local"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {error ? <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {partialAmountInvalid ? (
        <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
          Ingresá un monto mayor a 0 para confirmar el pago parcial.
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button type="button" variant="neutral" size="md" onClick={close} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="md"
          onClick={() => void submit()}
          disabled={submitting || partialAmountInvalid}
          className="bg-success text-white"
        >
          {submitting ? "Guardando..." : "Confirmar pago"}
        </Button>
      </div>
    </AdminModal>
  );
}

