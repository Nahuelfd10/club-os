import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Member } from "@/types";

export type Database = {
  public: {
    Tables: {
      members: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          dni: string;
          address: string;
          phone: string | null;
          status: "pending" | "active";
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email?: string | null;
          dni: string;
          address: string;
          phone?: string | null;
          status?: "pending" | "active";
          created_at?: string;
        };
        Update: {
          full_name?: string;
          email?: string | null;
          dni?: string;
          address?: string;
          phone?: string | null;
          status?: "pending" | "active";
        };
        Relationships: [];
      };
      charge_definitions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          amount: number;
          type: string;
          recurrence: string | null;
          start_date: string;
          end_date: string | null;
          scope_type: string;
          scope_id: string | null;
          is_active: boolean | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          amount: number;
          type: string;
          recurrence?: string | null;
          start_date: string;
          end_date?: string | null;
          scope_type: string;
          scope_id?: string | null;
          is_active?: boolean | null;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          amount?: number;
          type?: string;
          recurrence?: string | null;
          start_date?: string;
          end_date?: string | null;
          scope_type?: string;
          scope_id?: string | null;
          is_active?: boolean | null;
          category?: string | null;
        };
        Relationships: [];
      };
      club_settings: {
        Row: {
          id: string;
          name: string;
          monthly_fee: number;
          primary_color: string;
          accent_color: string;
          send_payment_confirmation_email: boolean;
          logo_url: string | null;
          payment_alias: string | null;
          monthly_due_day: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          monthly_fee: number;
          primary_color: string;
          accent_color: string;
          send_payment_confirmation_email?: boolean;
          logo_url?: string | null;
          payment_alias?: string | null;
          monthly_due_day?: number | null;
        };
        Update: {
          name?: string;
          monthly_fee?: number;
          primary_color?: string;
          accent_color?: string;
          send_payment_confirmation_email?: boolean;
          logo_url?: string | null;
          payment_alias?: string | null;
          monthly_due_day?: number | null;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      member_groups: {
        Row: {
          id: string;
          member_id: string;
          group_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          group_id: string;
          created_at?: string;
        };
        Update: {
          member_id?: string;
          group_id?: string;
        };
        Relationships: [];
      };
      charges: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          amount: number;
          type: "per_member" | "total";
          /** Null = cargo a nivel club (todos los socios activos), no ligado a un grupo deportivo. */
          group_id: string | null;
          charge_definition_id: string | null;
          due_date: string | null;
          billing_period: string | null;
          generated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          amount: number;
          type?: "per_member" | "total";
          group_id?: string | null;
          charge_definition_id?: string | null;
          due_date?: string | null;
          billing_period?: string | null;
          generated_at?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          amount?: number;
          type?: "per_member" | "total";
          group_id?: string | null;
          charge_definition_id?: string | null;
          due_date?: string | null;
          billing_period?: string | null;
          generated_at?: string | null;
        };
        Relationships: [];
      };
      member_charges: {
        Row: {
          id: string;
          member_id: string;
          charge_id: string;
          amount: number;
          paid_amount: number;
          status: "pending" | "partial" | "paid";
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          charge_id: string;
          amount: number;
          paid_amount?: number;
          status?: "pending" | "partial" | "paid";
          created_at?: string;
        };
        Update: {
          amount?: number;
          paid_amount?: number;
          status?: "pending" | "partial" | "paid";
        };
        Relationships: [];
      };
      charge_payments: {
        Row: {
          id: string;
          member_charge_id: string;
          amount: number;
          paid_at: string;
          payment_method: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_charge_id: string;
          amount: number;
          paid_at: string;
          payment_method?: string;
          created_at?: string;
        };
        Update: {
          amount?: number;
          paid_at?: string;
          payment_method?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          amount: number;
          description: string;
          category: string | null;
          date: string;
          charge_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          amount: number;
          description: string;
          category?: string | null;
          date?: string;
          charge_id?: string | null;
          created_at?: string;
        };
        Update: {
          amount?: number;
          description?: string;
          category?: string | null;
          date?: string;
          charge_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      member_payment_summary: {
        Row: {
          created_at: string | null;
          payments_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      generate_monthly_charges: {
        Args: Record<string, never>;
        Returns: void;
      };
      assign_charges_to_members: {
        Args: Record<string, never>;
        Returns: void;
      };
      register_charge_payment: {
        Args: {
          p_member_charge_id: string;
          p_amount: number;
          p_paid_at: string;
          p_payment_method: string;
        };
        Returns: void;
      };
      charge_has_payments: {
        Args: {
          p_charge_id: string;
        };
        Returns: boolean;
      };
      assign_charge_to_missing_members: {
        Args: {
          p_charge_id: string;
        };
        Returns: void;
      };
      get_charge_financials: {
        Args: {
          p_charge_id: string;
        };
        Returns: {
          total_expected: number;
          total_collected: number;
          total_expenses: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type NewMemberInput = {
  full_name: string;
  email?: string;
  dni: string;
  address: string;
  phone?: string;
  status: "pending";
};

type UpdateMemberInput = {
  full_name: string;
  email?: string;
  address: string;
  phone?: string;
};

export type ClubSettings = Database["public"]["Tables"]["club_settings"]["Row"];

type UpdateClubSettingsInput = Omit<ClubSettings, "id">;

export type ClubSettingsUpdate = Database["public"]["Tables"]["club_settings"]["Update"];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}

export async function insertMember(member: NewMemberInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("members").insert(member);

  if (error) {
    throw error;
  }
}

export async function listMembers() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, email, dni, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Pick<Member, "id" | "full_name" | "dni" | "status" | "created_at">[];
}

export async function updateMemberStatus(memberId: string, status: Member["status"]) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("members").update({ status }).eq("id", memberId);

  if (error) {
    throw error;
  }
}

export async function getMemberById(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, email, dni, address, phone, status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Member | null;
}

export async function updateMember(id: string, data: UpdateMemberInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("members").update(data).eq("id", id);

  if (error) {
    throw error;
  }
}

export async function getClubSettings() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("club_settings").select("*").single();

  if (error) {
    // No rows should fallback to local config without romper la app
    if ((error as { code?: string }).code === "PGRST116") {
      return null;
    }
    console.error(error);
    throw error;
  }

  return data as ClubSettings;
}

export async function saveClubSettings(payload: UpdateClubSettingsInput) {
  const supabase = getSupabaseClient();
  const existing = await getClubSettings();

  if (!existing) {
    const { error } = await supabase.from("club_settings").insert(payload);
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from("club_settings").update(payload).eq("id", existing.id);
  if (error) {
    throw error;
  }
}

export async function updateClubSettingsById(id: string, payload: ClubSettingsUpdate) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("club_settings").update(payload).eq("id", id);

  if (error) {
    console.error(error);
    throw error;
  }
}
