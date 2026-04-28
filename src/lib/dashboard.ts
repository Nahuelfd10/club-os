import { clubConfig } from "@/config/club";
import { getSupabaseClient } from "@/lib/supabase";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Estadísticas mínimas pensadas para la página pública del club.
 * Usa una RPC `public_member_stats` (SECURITY DEFINER) para evitar
 * exponer la tabla `members` al rol anónimo.
 */
export type PublicClubStats = {
  activeMembers: number;
};

export async function getPublicClubStats(): Promise<PublicClubStats> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("public_member_stats");
    if (error) {
      console.warn("public_member_stats RPC falló:", error);
      return { activeMembers: 0 };
    }
    const row = Array.isArray(data) ? data[0] : data;
    const active =
      typeof row?.active_members === "number"
        ? row.active_members
        : Number(row?.active_members ?? 0);
    return { activeMembers: Number.isFinite(active) ? active : 0 };
  } catch (e) {
    console.warn("getPublicClubStats fallback:", e);
    return { activeMembers: 0 };
  }
}

export type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  monthlyFee: number;
  /** sum(member_charges.amount) */
  totalExpected: number;
  /** sum(member_charges.paid_amount) */
  totalCollected: number;
  /** sum(amount - paid_amount) en member_charges */
  totalDebt: number;
  /** Suma de saldos pendientes con charge_definitions.category = membership */
  membershipDebtTotal: number;
  /** Resto de deuda (activity, fee, sin categoría, etc.) */
  otherDebtTotal: number;
  /** Ingresos por cobros registrados en el mes calendario actual (charge_payments) */
  monthlyCashIn: number;
  monthlyExpenses: number;
  /** Cobros del mes menos egresos del mes */
  monthlyBalance: number;
  nextMonthProjectedIncome: number;
  membersWithDebt: number;
  incomeChange: number;
  incomeChangePercent: number;
  lastMonthCashIn: number;
  recentMonthlyIncome: Array<{
    month: string;
    income: number;
  }>;
  topDebtMembers: Array<{
    memberId: string;
    fullName: string;
    debtAmount: number;
  }>;
};

const formatMonth = (date: Date) => date.toISOString().slice(0, 7);

const normalizeAmount = (value: unknown): number => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const getRecentMonths = (now: Date, total: number) =>
  Array.from({ length: total }, (_, idx) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (total - 1 - idx), 1);
    return formatMonth(date);
  });

/** Suma `amount` de charge_payments con paid_at dentro del mes calendario [start, end). */
function sumChargePaymentsForMonth(
  rows: Array<{ amount: unknown; paid_at: string }>,
  monthStart: Date,
  nextMonthStart: Date
): number {
  const startMs = monthStart.getTime();
  const endMs = nextMonthStart.getTime();
  let sum = 0;
  for (const row of rows) {
    const t = new Date(row.paid_at).getTime();
    if (t >= startMs && t < endMs) {
      const a = normalizeAmount(row.amount);
      if (!Number.isNaN(a)) {
        sum += a;
      }
    }
  }
  return roundMoney(sum);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Server-only: llamamos esto desde /admin/page.tsx (server component) y
  // necesitamos que la sesión del admin viaje en cookies para que la RLS
  // estricta lo reconozca como `authenticated`.
  const supabase = await getServerSupabase();
  const now = new Date();
  const recentMonths = getRecentMonths(now, 6);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = monthStart;

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    { data: membersRows, error: membersError },
    { data: memberChargesRows, error: memberChargesError },
    { data: memberChargesWithCategory, error: memberChargesCatError },
    { data: clubSettings, error: clubSettingsError },
    { data: allChargePaymentsForTrend, error: chargePaymentsTrendError },
    { data: expensesRows, error: expensesError },
  ] = await Promise.all([
    supabase.from("members").select("id, full_name, status, created_at"),
    supabase.from("member_charges").select("member_id, amount, paid_amount"),
    supabase.from("member_charges").select(`
      amount,
      paid_amount,
      charges (
        charge_definitions (
          category
        )
      )
    `),
    supabase.from("club_settings").select("monthly_fee").single(),
    supabase.from("charge_payments").select("amount, paid_at").gte("paid_at", sixMonthsAgo.toISOString()),
    supabase
      .from("expenses")
      .select("amount, date")
      .gte("date", monthStart.toISOString().slice(0, 10))
      .lt("date", nextMonthStart.toISOString().slice(0, 10)),
  ]);

  if (membersError) {
    throw membersError;
  }
  if (memberChargesError) {
    throw memberChargesError;
  }
  if (memberChargesCatError) {
    console.warn("No se pudo cargar categorías para el dashboard:", memberChargesCatError);
  }
  if (clubSettingsError && (clubSettingsError as { code?: string }).code !== "PGRST116") {
    throw clubSettingsError;
  }
  if (chargePaymentsTrendError) {
    throw chargePaymentsTrendError;
  }
  if (expensesError) {
    throw expensesError;
  }

  const monthlyFee =
    typeof clubSettings?.monthly_fee === "number" ? clubSettings.monthly_fee : clubConfig.monthlyFee;

  const members = (membersRows ?? []) as Array<{
    id: string;
    full_name: string;
    status: "pending" | "active";
    created_at: string;
  }>;

  let totalExpected = 0;
  let totalCollected = 0;
  const debtByMember = new Map<string, number>();

  for (const row of memberChargesRows ?? []) {
    const amount = normalizeAmount(row.amount);
    const paid = normalizeAmount(row.paid_amount);
    totalExpected += amount;
    totalCollected += paid;
    const rem = roundMoney(amount - paid);
    if (rem > 0.001) {
      const mid = row.member_id as string;
      debtByMember.set(mid, roundMoney((debtByMember.get(mid) ?? 0) + rem));
    }
  }

  const totalDebt = roundMoney(totalExpected - totalCollected);

  let membershipDebtTotal = 0;
  let otherDebtTotal = 0;

  if (!memberChargesCatError && memberChargesWithCategory) {
    type CatRow = {
      amount: unknown;
      paid_amount: unknown;
      charges: { charge_definitions: { category: string | null } | null } | null;
    };
    const categorized = memberChargesWithCategory as unknown as CatRow[];
    for (const row of categorized) {
      const amount = normalizeAmount(row.amount);
      const paid = normalizeAmount(row.paid_amount);
      const rem = roundMoney(amount - paid);
      if (rem <= 0.001) {
        continue;
      }
      const cat = row.charges?.charge_definitions?.category ?? null;
      if (cat === "membership") {
        membershipDebtTotal = roundMoney(membershipDebtTotal + rem);
      } else {
        otherDebtTotal = roundMoney(otherDebtTotal + rem);
      }
    }
  } else {
    otherDebtTotal = totalDebt;
  }

  const cpRows = (allChargePaymentsForTrend ?? []) as Array<{ amount: unknown; paid_at: string }>;

  const monthlyCashIn = sumChargePaymentsForMonth(cpRows, monthStart, nextMonthStart);
  const lastMonthCashIn = sumChargePaymentsForMonth(cpRows, prevMonthStart, prevMonthEnd);

  const recentMonthlyIncome = recentMonths.map((monthKey) => {
    const d = new Date(`${monthKey}-01T12:00:00`);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      month: monthKey,
      income: sumChargePaymentsForMonth(cpRows, start, end),
    };
  });

  const incomeChange = monthlyCashIn - lastMonthCashIn;
  const incomeChangePercent =
    lastMonthCashIn > 0 ? (incomeChange / lastMonthCashIn) * 100 : monthlyCashIn > 0 ? 100 : 0;

  const monthlyExpenses = (expensesRows ?? []).reduce((sum, row) => {
    const amount = normalizeAmount(row.amount);
    return Number.isNaN(amount) ? sum : sum + amount;
  }, 0);

  const monthlyBalance = roundMoney(monthlyCashIn - monthlyExpenses);

  const activeMembersRows = members.filter((member) => member.status === "active");

  let membersWithDebt = 0;
  const debtRows: Array<{ memberId: string; fullName: string; debtAmount: number }> = [];

  for (const member of activeMembersRows) {
    const debtAmount = debtByMember.get(member.id) ?? 0;
    if (debtAmount > 0.001) {
      membersWithDebt += 1;
      debtRows.push({
        memberId: member.id,
        fullName: member.full_name,
        debtAmount,
      });
    }
  }

  const topDebtMembers = debtRows.sort((a, b) => b.debtAmount - a.debtAmount).slice(0, 4);

  const activeMembers = activeMembersRows.length;
  const pendingMembers = members.filter((member) => member.status === "pending").length;
  const nextMonthProjectedIncome = activeMembers * monthlyFee;

  return {
    totalMembers: members.length,
    activeMembers,
    pendingMembers,
    monthlyFee,
    totalExpected: roundMoney(totalExpected),
    totalCollected: roundMoney(totalCollected),
    totalDebt,
    membershipDebtTotal,
    otherDebtTotal,
    monthlyCashIn,
    monthlyExpenses,
    monthlyBalance,
    nextMonthProjectedIncome,
    membersWithDebt,
    incomeChange,
    incomeChangePercent,
    lastMonthCashIn,
    recentMonthlyIncome,
    topDebtMembers,
  };
}
