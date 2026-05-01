import { CLUB_ASSETS_BUCKET } from "@/lib/club-logo";
import { getSupabaseClient } from "@/lib/supabase";

export const SPONSOR_LOGO_PREFIX = "sponsors/";
export const MAX_SPONSOR_LOGO_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

export type SponsorRow = {
  id: string;
  name: string;
  logo_url: string;
  logo_path: string;
  url: string | null;
  created_at: string;
  updated_at: string;
};

/** Vista compacta para landing pública (sin logo_path ni timestamps). */
export type PublicSponsor = {
  id: string;
  name: string;
  logo_url: string;
  url: string | null;
};

export function validateSponsorLogoFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "El archivo debe ser una imagen (PNG, JPG, SVG, WebP).";
  }
  if (file.size > MAX_SPONSOR_LOGO_BYTES) {
    return "La imagen no puede superar 1.5 MB.";
  }
  return null;
}

function inferExtension(file: File): string {
  // file.name puede no tener extensión confiable (ej. iOS share). Caemos al MIME.
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 6) {
    return fromName;
  }
  const fromMime = file.type?.split("/").pop()?.toLowerCase();
  if (fromMime === "svg+xml") return "svg";
  if (fromMime && /^[a-z0-9]+$/.test(fromMime)) return fromMime;
  return "png";
}

/** Lista admin: trae todas las filas (incluye logo_path para poder borrar). */
export async function listAdminSponsors(): Promise<SponsorRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("club_sponsors")
    .select("id, name, logo_url, logo_path, url, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }
  return (data ?? []) as SponsorRow[];
}

/** Lista pública: vía RPC SECURITY DEFINER, no requiere sesión. */
export async function listPublicSponsors(): Promise<PublicSponsor[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("public_active_sponsors");
  if (error) {
    console.warn("public_active_sponsors RPC falló:", error);
    return [];
  }
  return ((data ?? []) as unknown as PublicSponsor[]).map((row) => ({
    id: row.id,
    name: row.name,
    logo_url: row.logo_url,
    url: row.url ?? null,
  }));
}

/**
 * Crea un sponsor:
 *   1) Genera un id propio (lo usamos también como nombre del archivo).
 *   2) Sube el logo al bucket → obtiene URL pública.
 *   3) INSERT en club_sponsors con logo_url + logo_path.
 *
 * Si el INSERT falla, intenta borrar el archivo subido para no dejar huérfano.
 */
export async function createSponsor(input: {
  name: string;
  url: string | null;
  file: File;
}): Promise<SponsorRow> {
  const validationError = validateSponsorLogoFile(input.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = getSupabaseClient();
  const newId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const ext = inferExtension(input.file);
  const path = `${SPONSOR_LOGO_PREFIX}${newId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(CLUB_ASSETS_BUCKET)
    .upload(path, input.file, {
      upsert: false,
      contentType: input.file.type || "application/octet-stream",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: pub } = supabase.storage.from(CLUB_ASSETS_BUCKET).getPublicUrl(path);

  const insertPayload = {
    id: newId,
    name: input.name.trim(),
    logo_url: pub.publicUrl,
    logo_path: path,
    url: input.url?.trim() ? input.url.trim() : null,
  };

  const { data, error: insertError } = await supabase
    .from("club_sponsors")
    .insert(insertPayload)
    .select("id, name, logo_url, logo_path, url, created_at, updated_at")
    .single();

  if (insertError || !data) {
    // Rollback del archivo para no dejar storage huérfano.
    await supabase.storage.from(CLUB_ASSETS_BUCKET).remove([path]).catch(() => {});
    throw insertError ?? new Error("No se pudo crear el sponsor.");
  }

  return data as SponsorRow;
}

/**
 * Borrado duro: primero la fila, después el archivo.
 * Si el delete del archivo falla (file no existe, permiso, etc.) sólo loguea
 * — la fila ya no está, así que no se ve más en la landing.
 */
export async function deleteSponsor(sponsor: Pick<SponsorRow, "id" | "logo_path">) {
  const supabase = getSupabaseClient();
  const { error: deleteError } = await supabase
    .from("club_sponsors")
    .delete()
    .eq("id", sponsor.id);

  if (deleteError) {
    throw deleteError;
  }

  if (sponsor.logo_path) {
    const { error: removeError } = await supabase.storage
      .from(CLUB_ASSETS_BUCKET)
      .remove([sponsor.logo_path]);
    if (removeError) {
      console.warn(`Storage cleanup falló para ${sponsor.logo_path}:`, removeError);
    }
  }
}

/** Editar sólo nombre o URL (para reemplazar la imagen, lo más prolijo es borrar y volver a crear). */
export async function updateSponsorMeta(
  sponsorId: string,
  patch: { name?: string; url?: string | null }
) {
  const supabase = getSupabaseClient();
  const payload: { name?: string; url?: string | null } = {};
  if (typeof patch.name === "string") {
    payload.name = patch.name.trim();
  }
  if (patch.url !== undefined) {
    payload.url = patch.url?.trim() ? patch.url.trim() : null;
  }

  const { error } = await supabase
    .from("club_sponsors")
    .update(payload)
    .eq("id", sponsorId);

  if (error) {
    throw error;
  }
}
