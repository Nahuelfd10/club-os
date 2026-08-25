import { normalizePaymentMethod, type ClubPaymentMethod } from "@/config/payment-method";
import { getSupabaseClient } from "@/lib/supabase";

function normalizeAmount(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function isMissingTableError(error: unknown) {
  const err = error as { code?: string; message?: string } | null;
  const msg = err?.message?.toLowerCase() ?? "";
  return err?.code === "42P01" || msg.includes("charge_extra_contributions") || msg.includes("schema cache");
}

export type ChargeExtraContributionRow = {
  id: string;
  charge_id: string;
  member_charge_id: string | null;
  member_id: string | null;
  contributor_name: string | null;
  amount: number;
  contributed_at: string;
  payment_method: ClubPaymentMethod;
  note: string | null;
  created_at: string;
};

type RawChargeExtraContributionRow = Omit<ChargeExtraContributionRow, "amount" | "payment_method"> & {
  amount: unknown;
  payment_method?: string | null;
};

function mapContribution(row: RawChargeExtraContributionRow): ChargeExtraContributionRow {
  return {
    ...row,
    amount: normalizeAmount(row.amount),
    payment_method: normalizePaymentMethod(row.payment_method),
  };
}

export async function listChargeExtraContributions(
  chargeId: string
): Promise<ChargeExtraContributionRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("charge_extra_contributions")
    .select("id, charge_id, member_charge_id, member_id, contributor_name, amount, contributed_at, payment_method, note, created_at")
    .eq("charge_id", chargeId)
    .order("contributed_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return ((data ?? []) as unknown as RawChargeExtraContributionRow[]).map(mapContribution);
}

export async function createChargeExtraContribution(payload: {
  charge_id: string;
  member_charge_id?: string | null;
  member_id?: string | null;
  contributor_name?: string | null;
  amount: number;
  contributed_at: string;
  payment_method: ClubPaymentMethod;
  note?: string | null;
}) {
  const amount = roundMoney(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("charge_extra_contributions").insert({
    charge_id: payload.charge_id,
    member_charge_id: payload.member_charge_id ?? null,
    member_id: payload.member_id ?? null,
    contributor_name: payload.contributor_name?.trim() || null,
    amount,
    contributed_at: payload.contributed_at,
    payment_method: payload.payment_method,
    note: payload.note?.trim() || null,
  });

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("Falta aplicar la migracion de aportes extra en Supabase.");
    }
    throw error;
  }
}
