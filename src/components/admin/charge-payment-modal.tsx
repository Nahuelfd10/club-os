"use client";

import { useEffect, useId, useMemo, useState } from "react";

import {
  CLUB_PAYMENT_METHOD_OPTIONS,
  DEFAULT_PAYMENT_METHOD,
  type ClubPaymentMethod,
} from "@/config/payment-method";
import { AdminModal } from "@/components/admin/admin-modal";
import { Button, Input, Select } from "@/components/ui";
import { PaymentExceedsPendingError } from "@/lib/charges";
import { datetimeLocalToIso, toDatetimeLocalValue } from "@/lib/datetime";
import { formatMoney } from "@/lib/formatters";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  pendingAmount: number;
  onConfirm: (payload: {
    amount: number;
    paid_at: string;
    payment_method: ClubPaymentMethod;
  }) => Promise<void> | void;
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
  const paymentMethodId = useId();

  const [isFull, setIsFull] = useState(true);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<ClubPaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingText = useMemo(() => formatMoney(pendingAmount), [pendingAmount]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setIsFull(true);
    setPaidAt(toDatetimeLocalValue(new Date()));
    setPaymentMethod(DEFAULT_PAYMENT_METHOD);
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
      await onConfirm({
        amount: numeric,
        paid_at: datetimeLocalToIso(paidAt),
        payment_method: paymentMethod,
      });
      onClose();
    } catch (e) {
      if (e instanceof PaymentExceedsPendingError) {
        setError(
          "Otro admin acaba de registrar un pago que cubre el pendiente. Cerrá este modal y recargá la pantalla para ver el estado actualizado."
        );
      } else {
        setError(e instanceof Error ? e.message : "No se pudo registrar el pago.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal open={open} onClose={close}>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm font-medium text-slate-200">{subtitle}</p> : null}
      <p className="mt-2 text-sm text-slate-300">
        Pendiente:{" "}
        <span className="rounded-md bg-warning/10 px-2 py-0.5 text-base font-bold text-warning ring-1 ring-warning/20">
          {pendingText}
        </span>
      </p>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.05] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/42">Tipo de pago</p>
        <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1" role="group">
          <button
            type="button"
            onClick={() => {
              setIsFull(true);
              setAmount(formatAmountInput(pendingAmount));
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isFull ? "bg-white/10 text-white shadow-sm" : "text-slate-300 hover:text-white"
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
              !isFull ? "bg-white/10 text-white shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            Pago parcial
          </button>
        </div>
        {!isFull ? (
          <p className="mt-2 text-xs text-slate-300">Ingresá un monto menor o igual al pendiente.</p>
        ) : (
          <p className="mt-2 text-xs text-slate-300">
            El monto se completa automáticamente con el saldo pendiente.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor={amountId} className="mb-1 block text-sm font-medium text-slate-300">
            Monto <span className="text-danger">*</span>
          </label>
          <Input
            id={amountId}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={isFull
              ? "border-white/10 bg-white/[0.05] text-sm text-white opacity-80 placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              : "border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"}
            disabled={isFull}
          />
          {isFull ? (
            <p className="mt-1 text-xs text-slate-400">Desactivá “Pago total” para editar el monto.</p>
          ) : null}
        </div>
        <div>
          <label htmlFor={paidAtId} className="mb-1 block text-sm font-medium text-slate-300">
            Fecha y hora del pago
          </label>
          <Input
            id={paidAtId}
            type="datetime-local"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="border-white/10 bg-white/[0.05] text-sm text-white focus:border-white/20 focus:bg-white/[0.08]"
          />
        </div>
        <div>
          <label htmlFor={paymentMethodId} className="mb-1 block text-sm font-medium text-slate-300">
            Método de pago
          </label>
          <Select
            id={paymentMethodId}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as ClubPaymentMethod)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white shadow-none outline-none focus:border-white/20 focus:bg-white/[0.08] focus:shadow-none"
          >
            {CLUB_PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-950 text-white">
                {option.label}
              </option>
            ))}
          </Select>
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

