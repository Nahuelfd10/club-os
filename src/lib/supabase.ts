import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { ClubPaymentMethod } from "@/config/payment-method";
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
          payment_method: ClubPaymentMethod;
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
          payment_method?: ClubPaymentMethod;
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
          payment_method?: ClubPaymentMethod;
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
          /** Null cuando es un comprador externo (ver external_name). */
          member_id: string | null;
          charge_id: string;
          amount: number;
          paid_amount: number;
          status: "pending" | "partial" | "paid";
          /** Nombre del comprador cuando no es socio (sólo se usa si member_id es null). */
          external_name: string | null;
          /** Talle u observación libre de la línea. */
          description: string | null;
          /** Cantidad por línea (ej. "2 camperas talle M"). */
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          /** Mutuamente excluyente con external_name a nivel CHECK constraint. */
          member_id?: string | null;
          charge_id: string;
          amount: number;
          paid_amount?: number;
          status?: "pending" | "partial" | "paid";
          external_name?: string | null;
          description?: string | null;
          quantity?: number;
          created_at?: string;
        };
        Update: {
          member_id?: string | null;
          amount?: number;
          paid_amount?: number;
          status?: "pending" | "partial" | "paid";
          external_name?: string | null;
          description?: string | null;
          quantity?: number;
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
      club_sponsors: {
        Row: {
          id: string;
          name: string;
          logo_url: string;
          logo_path: string;
          url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url: string;
          logo_path: string;
          url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          logo_url?: string;
          logo_path?: string;
          url?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_monthly_charges: {
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
      ensure_membership_charge_definition: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_monthly_membership_charges: {
        Args: { p_period: string };
        Returns: void;
      };
      generate_membership_charges_range: {
        Args: { p_from: string; p_to: string };
        Returns: void;
      };
      update_future_unpaid_membership_charges: {
        Args: { p_amount: number };
        Returns: void;
      };
      sync_membership_definition_from_club_settings: {
        Args: Record<string, never>;
        Returns: void;
      };
      public_member_stats: {
        Args: Record<string, never>;
        Returns: {
          active_members: number;
        }[];
      };
      public_active_sponsors: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          logo_url: string;
          url: string | null;
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
let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Cliente Supabase universal con dispatch contextual:
 *   - En el browser devuelve un `createBrowserClient` (lee/escribe la
 *     sesión en cookies). Si el usuario está logueado, las queries
 *     viajan con el JWT y RLS lo ve como `authenticated`.
 *   - En server (SSR público, build) devuelve un `createClient` plano
 *     que actúa siempre como `anon`. Para server components que
 *     necesiten la sesión del admin, usá `getServerSupabase()` en
 *     `@/lib/supabase/server`.
 *
 * Esto permite que el código existente (lib/charges.ts, lib/expenses.ts,
 * etc.) siga llamando a `getSupabaseClient()` y automáticamente respete
 * RLS estricta sin un refactor masivo.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  if (cachedClient) {
    return cachedClient;
  }

  cachedClient =
    typeof window !== "undefined"
      ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
      : createClient<Database>(supabaseUrl, supabaseAnonKey);

  return cachedClient;
}

/**
 * Error de dominio que el front puede catchar para mostrar mensajes específicos
 * (ej. DNI duplicado en el formulario público de alta).
 */
export class DuplicateMemberDniError extends Error {
  readonly code = "MEMBER_DNI_DUPLICATE" as const;
  constructor(public readonly dni: string) {
    super(`Ya existe un socio con DNI ${dni}.`);
    this.name = "DuplicateMemberDniError";
  }
}

export async function insertMember(member: NewMemberInput) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("members").insert(member);

  if (error) {
    // Postgres unique violation (23505) o mensaje que mencione el constraint del DNI.
    const code = (error as { code?: string }).code;
    const lowered = error.message?.toLowerCase() ?? "";
    if (code === "23505" || lowered.includes("members_dni_key") || lowered.includes("dni")) {
      throw new DuplicateMemberDniError(member.dni);
    }
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
