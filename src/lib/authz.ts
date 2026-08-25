import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canManagePaymentsRole,
  isInternalClubRole,
  type Database,
  type UserProfile,
} from "@/lib/supabase";

export type AuthzProfile = Pick<UserProfile, "id" | "auth_user_id" | "role" | "member_id" | "status">;

export async function getActiveProfileByAuthUser(
  supabase: SupabaseClient<Database>,
  authUserId: string
): Promise<AuthzProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, auth_user_id, role, member_id, status")
    .eq("auth_user_id", authUserId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as AuthzProfile | null;
}

export function profileIsInternal(profile: AuthzProfile | null) {
  return isInternalClubRole(profile?.role);
}

export function profileCanManagePayments(profile: AuthzProfile | null) {
  return canManagePaymentsRole(profile?.role);
}
