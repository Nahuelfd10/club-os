import { clubConfig } from "@/config/club";
import { getSupabaseClient } from "@/lib/supabase";

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  monthlyIncome: number;
  totalDebt: number;
  nextMonthProjectedIncome: number;
  membersWithDebt: number;
  incomeChange: number;
  incomeChangePercent: number;
  lastMonthIncome: number;
};

const formatMonth = (date: Date) => date.toISOString().slice(0, 7);

const countMonthsFromCreationToNow = (createdAt: string, now: Date) => {
  const createdDate = new Date(createdAt);
  const yearDiff = now.getFullYear() - createdDate.getFullYear();
  const monthDiff = now.getMonth() - createdDate.getMonth();
  const total = yearDiff * 12 + monthDiff + 1;
  return total > 0 ? total : 0;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseClient();
  const now = new Date();
  const currentMonth = formatMonth(now);
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = formatMonth(previousMonthDate);

  const [
    { count: totalMembersCount, error: totalMembersError },
    { count: activeMembersCount, error: activeMembersError },
    { data: currentMonthPayments, error: currentMonthPaymentsError },
    { data: previousMonthPayments, error: previousMonthPaymentsError },
    { data: summaryRows, error: summaryError },
    { data: clubSettings, error: clubSettingsError },
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("payments").select("amount").eq("month", currentMonth),
    supabase.from("payments").select("amount").eq("month", previousMonth),
    supabase.from("member_payment_summary").select("created_at, payments_count"),
    supabase.from("club_settings").select("monthly_fee").single(),
  ]);

  if (totalMembersError) {
    throw totalMembersError;
  }
  if (activeMembersError) {
    throw activeMembersError;
  }
  if (currentMonthPaymentsError) {
    throw currentMonthPaymentsError;
  }
  if (previousMonthPaymentsError) {
    throw previousMonthPaymentsError;
  }
  if (summaryError) {
    throw summaryError;
  }
  if (clubSettingsError && (clubSettingsError as { code?: string }).code !== "PGRST116") {
    throw clubSettingsError;
  }

  const sumPaymentAmounts = (payments: Array<{ amount: number | string | null }> | null | undefined) =>
    (payments ?? []).reduce((sum, payment) => {
      const amount = typeof payment.amount === "number" ? payment.amount : Number(payment.amount ?? 0);
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);

  const monthlyIncome = sumPaymentAmounts(currentMonthPayments);
  const lastMonthIncome = sumPaymentAmounts(previousMonthPayments);

  const monthlyFee =
    typeof clubSettings?.monthly_fee === "number" ? clubSettings.monthly_fee : clubConfig.monthlyFee;

  let membersWithDebt = 0;
  const totalDebt = (summaryRows ?? []).reduce((sum, row) => {
    const createdAt = row.created_at;
    if (!createdAt) {
      return sum;
    }

    const monthsExpected = countMonthsFromCreationToNow(createdAt, now);
    const paymentsCount =
      typeof row.payments_count === "number" ? row.payments_count : Number(row.payments_count ?? 0);
    const debtMonths = Math.max(0, monthsExpected - (Number.isNaN(paymentsCount) ? 0 : paymentsCount));
    if (debtMonths > 0) {
      membersWithDebt += 1;
    }

    return sum + debtMonths * monthlyFee;
  }, 0);

  const activeMembers = activeMembersCount ?? 0;
  const nextMonthProjectedIncome = activeMembers * monthlyFee;
  const incomeChange = monthlyIncome - lastMonthIncome;
  const incomeChangePercent =
    lastMonthIncome > 0 ? (incomeChange / lastMonthIncome) * 100 : monthlyIncome > 0 ? 100 : 0;

  return {
    totalMembers: totalMembersCount ?? 0,
    activeMembers,
    monthlyIncome,
    totalDebt,
    nextMonthProjectedIncome,
    membersWithDebt,
    incomeChange,
    incomeChangePercent,
    lastMonthIncome,
  };
}
