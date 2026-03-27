import { getSupabaseClient, updateClubSettingsById } from "@/lib/supabase";

export const CLUB_ASSETS_BUCKET = "club-assets";
export const CLUB_LOGO_STORAGE_PATH = "logos/main-logo.png";
export const MAX_CLUB_LOGO_BYTES = 2 * 1024 * 1024;

export function validateClubLogoFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "El archivo debe ser una imagen (PNG, JPG, WebP, etc.).";
  }
  if (file.size > MAX_CLUB_LOGO_BYTES) {
    return "La imagen no puede superar 2 MB.";
  }
  return null;
}

export async function uploadClubLogoAndPersist(settingsId: string, file: File): Promise<string> {
  const validationError = validateClubLogoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = getSupabaseClient();
  const { error: uploadError } = await supabase.storage
    .from(CLUB_ASSETS_BUCKET)
    .upload(CLUB_LOGO_STORAGE_PATH, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(CLUB_ASSETS_BUCKET).getPublicUrl(CLUB_LOGO_STORAGE_PATH);
  const publicUrl = data.publicUrl;

  await updateClubSettingsById(settingsId, { logo_url: publicUrl });

  return publicUrl;
}
