import { jsPDF } from "jspdf";

import { formatMoney } from "@/lib/formatters";

export type ReceiptMember = {
  full_name: string;
  dni: string;
};

export type ReceiptPayment = {
  amount: number;
  month: string;
  paid_at: string | null;
};

function formatDateTimeArg(paidAt: string | null): string {
  if (!paidAt) {
    return "-";
  }

  const date = new Date(paidAt);
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sanitizeFileSegment(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.slice(0, 48) || "socio";
}

/**
 * Genera y descarga un PDF de comprobante de pago (recibo simple).
 */
export function generateReceipt(payment: ReceiptPayment, member: ReceiptMember): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  let y = 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Comprobante de pago", margin, y);

  y += 14;
  doc.setFontSize(11);

  const line = (label: string, value: string) => {
    const labelWithColon = `${label}:`;
    doc.setFont("helvetica", "bold");
    const labelWidth = doc.getTextWidth(labelWithColon);
    doc.text(labelWithColon, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + labelWidth + 4, y);
    y += 7;
  };

  line("Nombre del socio", member.full_name);
  line("DNI", member.dni);
  line("Concepto", `Cuota mensual ${payment.month}`);
  line("Monto", formatMoney(payment.amount));
  line("Mes correspondiente", payment.month);
  line("Fecha y hora de pago", formatDateTimeArg(payment.paid_at));

  y += 4;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Documento generado electronicamente.", margin, y);

  const fileName = `comprobante-${sanitizeFileSegment(member.full_name)}-${payment.month}.pdf`;
  doc.save(fileName);
}
