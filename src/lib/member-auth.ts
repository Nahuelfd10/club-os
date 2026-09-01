const MEMBER_AUTH_DOMAIN = "socios.clubos.local";

export function normalizeDni(value: string) {
  return value.replace(/\D/g, "");
}

export function isEmailIdentifier(value: string) {
  return value.includes("@");
}

export function memberAuthEmailFromDni(dni: string, slug: string) {
  const normalized = normalizeDni(dni);
  const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!normalized) {
    throw new Error("DNI invalido.");
  }
  if (!normalizedSlug) {
    throw new Error("Club invalido.");
  }
  return `${normalized}.${normalizedSlug}@${MEMBER_AUTH_DOMAIN}`;
}
