export type ClubPaymentMethod = "transfer" | "cash" | "mercadopago";

export const CLUB_PAYMENT_METHOD_OPTIONS: ReadonlyArray<{
  value: ClubPaymentMethod;
  label: string;
}> = [
  { value: "transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
  { value: "mercadopago", label: "MercadoPago" },
];

/** Valor por defecto al registrar pagos y ante valores inválidos. */
export const DEFAULT_PAYMENT_METHOD: ClubPaymentMethod = "cash";

export function normalizePaymentMethod(raw: string | null | undefined): ClubPaymentMethod {
  const v = raw?.trim();
  if (v === "cash" || v === "mercadopago" || v === "transfer") {
    return v;
  }
  return DEFAULT_PAYMENT_METHOD;
}

const PAYMENT_METHOD_LABELS: Record<ClubPaymentMethod, string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
  mercadopago: "MercadoPago",
};

export const PAYMENT_METHOD_EMOJI: Record<ClubPaymentMethod, string> = {
  transfer: "🏦",
  cash: "💵",
  mercadopago: "💳",
};

export function paymentMethodLabel(method: ClubPaymentMethod | string): string {
  const key = normalizePaymentMethod(method);
  return PAYMENT_METHOD_LABELS[key];
}

/** Texto para UI: emoji + etiqueta. */
export function paymentMethodDisplay(method: ClubPaymentMethod | string): string {
  const key = normalizePaymentMethod(method);
  return `${PAYMENT_METHOD_EMOJI[key]} ${PAYMENT_METHOD_LABELS[key]}`;
}
