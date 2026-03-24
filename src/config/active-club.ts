import { clubConfig } from "@/config/club";
import { getClubSettings } from "@/lib/supabase";

export type ActiveClubConfig = {
  name: string;
  monthly_fee: number;
  primary_color: string;
  accent_color: string;
  secondary_color: string;
  logo: string;
};

export const fallbackClubConfig: ActiveClubConfig = {
  name: clubConfig.name,
  monthly_fee: clubConfig.monthlyFee,
  primary_color: clubConfig.primaryColor,
  accent_color: clubConfig.accentColor,
  secondary_color: clubConfig.secondaryColor,
  logo: clubConfig.logo,
};

export async function getActiveClubConfig(): Promise<ActiveClubConfig> {
  try {
    const settings = await getClubSettings();
    if (!settings) {
      return fallbackClubConfig;
    }

    return {
      ...fallbackClubConfig,
      name: settings.name || fallbackClubConfig.name,
      monthly_fee: settings.monthly_fee ?? fallbackClubConfig.monthly_fee,
      primary_color: settings.primary_color || fallbackClubConfig.primary_color,
      accent_color: settings.accent_color || fallbackClubConfig.accent_color,
    };
  } catch {
    return fallbackClubConfig;
  }
}
