import { clubConfig } from "@/config/club";
import { getClubSettings } from "@/lib/supabase";

export type ActiveClubConfig = {
  name: string;
  monthly_fee: number;
  primary_color: string;
  accent_color: string;
  secondary_color: string;
  logo: string;
  /** Alias bancario para recordatorios (WhatsApp, etc.); null si no está configurado. */
  payment_alias: string | null;
};

export const fallbackClubConfig: ActiveClubConfig = {
  name: clubConfig.name,
  monthly_fee: clubConfig.monthlyFee,
  primary_color: clubConfig.primaryColor,
  accent_color: clubConfig.accentColor,
  secondary_color: clubConfig.secondaryColor,
  logo: clubConfig.logo,
  payment_alias: null,
};

export async function getActiveClubConfig(): Promise<ActiveClubConfig> {
  try {
    const settings = await getClubSettings();
    if (!settings) {
      return fallbackClubConfig;
    }

    const logoFromDb = settings.logo_url?.trim() ?? "";
    const aliasTrimmed = settings.payment_alias?.trim() ?? "";

    return {
      ...fallbackClubConfig,
      name: settings.name || fallbackClubConfig.name,
      monthly_fee: settings.monthly_fee ?? fallbackClubConfig.monthly_fee,
      primary_color: settings.primary_color || fallbackClubConfig.primary_color,
      accent_color: settings.accent_color || fallbackClubConfig.accent_color,
      logo: logoFromDb,
      payment_alias: aliasTrimmed || null,
    };
  } catch {
    return fallbackClubConfig;
  }
}
