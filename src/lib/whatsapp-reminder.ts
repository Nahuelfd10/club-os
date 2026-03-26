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

export function buildDebtReminderMessage(params: {
  fullName: string;
  debtMonths: string[];
  clubName: string;
}): string {
  const name = firstNameFromFullName(params.fullName);
  const months = formatDebtMonthsList(params.debtMonths);
  const clubTail = params.clubName.trim()
    ? ` del club ${params.clubName.trim()}`
    : " del club";
  return `Hola ${name}!

Tenés pendiente la cuota de ${months}${clubTail}.

Por favor ponete al día cuando puedas.`;
}

export type WhatsAppReminderMember = {
  full_name: string;
  phone?: string | null;
};

/**
 * Genera `https://wa.me/{telefono}?text={mensaje}` o `null` si no hay teléfono válido o sin meses adeudados.
 */
export function buildWhatsAppLink(
  member: WhatsAppReminderMember,
  debtMonths: string[],
  clubName: string
): string | null {
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
  });

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
