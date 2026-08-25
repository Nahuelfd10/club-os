import { DEFAULT_PAYMENT_METHOD, normalizePaymentMethod, type ClubPaymentMethod } from "@/config/payment-method";
import { getSupabaseClient } from "@/lib/supabase";

export type ExpenseRow = {
  id: string;
  amount: number;
  description: string;
  category: string | null;
  date: string;
  spent_at: string;
  payment_method: ClubPaymentMethod;
  origin_label: string | null;
  charge_id: string | null;
  created_at: string;
};

export type ExpenseWithCharge = ExpenseRow & {
  charge: { id: string; name: string } | null;
};

function normalizeAmount(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

type RawExpenseRow = Omit<ExpenseRow, "amount" | "payment_method"> & {
  amount: unknown;
  payment_method?: string | null;
};

type RawExpenseWithCharge = RawExpenseRow & {
  charges?: { id: string; name: string } | null;
};

function mapRawExpense(row: RawExpenseRow): ExpenseRow {
  return {
    ...row,
    amount: normalizeAmount(row.amount),
    spent_at: row.spent_at ?? row.created_at,
    payment_method: normalizePaymentMethod(row.payment_method),
  };
}

function mapRawExpenseWithCharge(row: RawExpenseWithCharge): ExpenseWithCharge {
  const base = mapRawExpense(row);
  return {
    ...base,
    charge: row.charges ? { id: row.charges.id, name: row.charges.name } : null,
  };
}

export async function listExpenses(): Promise<ExpenseWithCharge[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      id,
      amount,
      description,
      category,
      date,
      spent_at,
      payment_method,
      origin_label,
      charge_id,
      created_at,
      charges (
        id,
        name
      )
    `
    )
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as RawExpenseWithCharge[]).map(mapRawExpenseWithCharge);
}

export async function createExpense(payload: {
  description: string;
  amount: number;
  category?: string | null;
  date: string;
  spent_at?: string | null;
  payment_method?: ClubPaymentMethod;
  origin_label?: string | null;
  charge_id?: string | null;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("expenses").insert({
    description: payload.description.trim(),
    amount: payload.amount,
    category: payload.category?.trim() ? payload.category.trim() : null,
    date: payload.date,
    spent_at: payload.spent_at ?? new Date().toISOString(),
    payment_method: payload.payment_method ?? DEFAULT_PAYMENT_METHOD,
    origin_label: payload.origin_label?.trim() || "Club / caja",
    charge_id: payload.charge_id ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function updateExpense(
  expenseId: string,
  payload: {
    description: string;
    amount: number;
    category?: string | null;
    date: string;
    payment_method?: ClubPaymentMethod;
    origin_label?: string | null;
    charge_id?: string | null;
  }
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      description: payload.description.trim(),
      amount: payload.amount,
      category: payload.category?.trim() ? payload.category.trim() : null,
      date: payload.date,
      payment_method: payload.payment_method ?? DEFAULT_PAYMENT_METHOD,
      origin_label: payload.origin_label?.trim() || "Club / caja",
      charge_id: payload.charge_id ?? null,
    })
    .eq("id", expenseId);

  if (error) {
    throw error;
  }
}

export async function deleteExpense(expenseId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) {
    throw error;
  }
}

export async function listExpensesByChargeId(chargeId: string): Promise<ExpenseRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, amount, description, category, date, spent_at, payment_method, origin_label, charge_id, created_at")
    .eq("charge_id", chargeId)
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as RawExpenseRow[]).map(mapRawExpense);
}
