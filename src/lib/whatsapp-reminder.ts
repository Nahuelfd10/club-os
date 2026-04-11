import { formatMoney } from "@/lib/formatters";

/** Solo dígitos, para wa.me (código de país sin +). */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

function firstNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return "Socio";
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1);
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

/** Lista legible en español: "enero de 2026", "enero y febrero de 2026", "a, b y c". */
export function formatDebtMonthsList(debtMonths: string[]): string {
  const sorted = [...debtMonths].sort();
  const labels = sorted.map(formatMonthLabel);
  if (labels.length === 0) {
    return "";
  }
  if (labels.length === 1) {
    return labels[0];
  }
  if (labels.length === 2) {
    return `${labels[0]} y ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}

/**
 * Opciones de pago del club en recordatorios: transferencia (si hay alias), efectivo y Mercado Pago.
 * Sin datos vacíos: si no hay alias, no se incluye el bloque de transferencia.
 */
export function buildReminderPaymentOptionsSuffix(paymentAlias: string | null | undefined): string {
  const alias = paymentAlias?.trim() ?? "";
  const lines: string[] = [];

  if (alias) {
    lines.push(`Podés transferir al alias:\n${alias}`);
  }

  lines.push("Podés abonar en efectivo en el club");
  lines.push("Podés pagar con Mercado Pago (consultá el link con la directiva).");

  return `\n\n${lines.join("\n\n")}\n\nGracias!`;
}

export function buildDebtReminderMessage(params: {
  fullName: string;
  debtMonths: string[];
  clubName: string;
  totalDebtAmount: number;
  paymentAlias?: string | null;
}): string {
  const name = firstNameFromFullName(params.fullName);
  const months = formatDebtMonthsList(params.debtMonths);
  const clubTail = params.clubName.trim()
    ? ` del club ${params.clubName.trim()}`
    : " del club";
  const saldoLine = `Por un saldo total de: ${formatMoney(params.totalDebtAmount)}`;
  const optionsBlock = buildReminderPaymentOptionsSuffix(params.paymentAlias);

  return `Hola ${name}!

Tenés pendiente la cuota de ${months}${clubTail}.

${saldoLine}

Por favor ponete al día cuando puedas.${optionsBlock}`;
}

export type WhatsAppReminderMember = {
  full_name: string;
  phone?: string | null;
};

export type BuildWhatsAppLinkParams = {
  member: WhatsAppReminderMember;
  debtMonths: string[];
  clubName: string;
  totalDebtAmount: number;
  paymentAlias?: string | null;
};

/**
 * Genera `https://wa.me/{telefono}?text={mensaje}` o `null` si no hay teléfono válido o sin meses adeudados.
 * El texto se codifica con `encodeURIComponent` para WhatsApp Web / app.
 */
/**
 * Mensaje corto por cargo/grupo pendiente (member_charges), para cobros extraordinarios.
 */
export function buildChargeDebtWhatsAppMessage(params: {
  fullName: string;
  chargeName: string;
  groupName: string;
  remainingFormatted: string;
}): string {
  const name = firstNameFromFullName(params.fullName);
  const group = params.groupName.trim() || "el grupo";
  const charge = params.chargeName.trim() || "un cargo";
  return `Hola ${name}!

Tenés pendiente ${charge} (${params.remainingFormatted}) del equipo ${group}.

Cuando puedas, acercate a regularizar. ¡Gracias!`;
}

export function buildChargeDebtWhatsAppLink(params: {
  fullName: string;
  phone?: string | null;
  chargeName: string;
  groupName: string;
  remainingFormatted: string;
}): string | null {
  const digits = digitsOnly(params.phone ?? "");
  if (digits.length < 8) {
    return null;
  }
  const message = buildChargeDebtWhatsAppMessage({
    fullName: params.fullName,
    chargeName: params.chargeName,
    groupName: params.groupName,
    remainingFormatted: params.remainingFormatted,
  });
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppLink(params: BuildWhatsAppLinkParams): string | null {
  const { member, debtMonths, clubName, totalDebtAmount, paymentAlias } = params;
  const digits = digitsOnly(member.phone ?? "");
  if (digits.length < 8) {
    return null;
  }
  if (debtMonths.length === 0) {
    return null;
  }

  const message = buildDebtReminderMessage({
    fullName: member.full_name,
    debtMonths,
    clubName,
    totalDebtAmount,
    paymentAlias,
  });

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Recordatorio por saldo total de cargos (member_charges), sin eje por meses. */
export function buildTotalChargesDebtReminderMessage(params: {
  fullName: string;
  clubName: string;
  totalDebtFormatted: string;
  paymentAlias?: string | null;
}): string {
  const name = firstNameFromFullName(params.fullName);
  const clubTail = params.clubName.trim()
    ? ` del club ${params.clubName.trim()}`
    : " del club";
  const optionsBlock = buildReminderPaymentOptionsSuffix(params.paymentAlias);
  return `Hola ${name}!

Tenés cargos pendientes por un total de ${params.totalDebtFormatted}${clubTail}.

Por favor ponete al día cuando puedas.${optionsBlock}`;
}

export function buildTotalChargesDebtWhatsAppLink(params: {
  member: WhatsAppReminderMember;
  clubName: string;
  totalDebtFormatted: string;
  paymentAlias?: string | null;
}): string | null {
  const digits = digitsOnly(params.member.phone ?? "");
  if (digits.length < 8) {
    return null;
  }
  const message = buildTotalChargesDebtReminderMessage({
    fullName: params.member.full_name,
    clubName: params.clubName,
    totalDebtFormatted: params.totalDebtFormatted,
    paymentAlias: params.paymentAlias,
  });
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
