/**
 * Formatea una fecha ISO (p. ej. `2026-04-01` o completa) como "abril 2026".
 */
export function formatMonthFromDate(date: string): string {
  const trimmed = date.trim();
  if (!trimmed) {
    return "—";
  }
  try {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T12:00:00` : trimmed;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) {
      return trimmed;
    }
    return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  } catch {
    return trimmed;
  }
}

export function formatDueDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR");
  } catch {
    return iso;
  }
}

export function formatPaidAt(iso: string): string {
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

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(localValue: string): string {
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

