import { clubConfig } from "@/config/club";
import { getSupabaseClient } from "@/lib/supabase";

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  monthlyFee: number;
  monthlyIncome: number;
  totalDebt: number;
  nextMonthProjectedIncome: number;
  membersWithDebt: number;
  incomeChange: number;
  incomeChangePercent: number;
  lastMonthIncome: number;
  recentMonthlyIncome: Array<{
    month: string;
    income: number;
  }>;
  topDebtMembers: Array<{
    memberId: string;
    fullName: string;
    debtAmount: number;
    debtMonths: number;
  }>;
};

const formatMonth = (date: Date) => date.toISOString().slice(0, 7);
const getRecentMonths = (now: Date, total: number) =>
  Array.from({ length: total }, (_, idx) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (total - 1 - idx), 1);
    return formatMonth(date);
  });

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
  const recentMonths = getRecentMonths(now, 6);

  const [
    { data: membersRows, error: membersError },
    { data: allPaymentsRows, error: allPaymentsError },
    { data: clubSettings, error: clubSettingsError },
  ] = await Promise.all([
    supabase.from("members").select("id, full_name, status, created_at"),
    supabase.from("payments").select("member_id, month, amount"),
    supabase.from("club_settings").select("monthly_fee").single(),
  ]);

  if (membersError) {
    throw membersError;
  }
  if (allPaymentsError) {
    throw allPaymentsError;
  }
  if (clubSettingsError && (clubSettingsError as { code?: string }).code !== "PGRST116") {
    throw clubSettingsError;
  }

  const monthlyFee =
    typeof clubSettings?.monthly_fee === "number" ? clubSettings.monthly_fee : clubConfig.monthlyFee;

  const members = (membersRows ?? []) as Array<{
    id: string;
    full_name: string;
    status: "pending" | "active";
    created_at: string;
  }>;
  const monthlyIncomeMap = new Map<string, number>(recentMonths.map((month) => [month, 0]));
  monthlyIncomeMap.set(currentMonth, monthlyIncomeMap.get(currentMonth) ?? 0);
  monthlyIncomeMap.set(previousMonth, monthlyIncomeMap.get(previousMonth) ?? 0);
  const paymentsByMemberId = new Map<string, number>();

  for (const row of allPaymentsRows ?? []) {
    if (row.member_id) {
      paymentsByMemberId.set(row.member_id, (paymentsByMemberId.get(row.member_id) ?? 0) + 1);
    }

    const amount = typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0);
    if (Number.isNaN(amount)) {
      continue;
    }

    monthlyIncomeMap.set(row.month, (monthlyIncomeMap.get(row.month) ?? 0) + amount);
  }

  const monthlyIncome = monthlyIncomeMap.get(currentMonth) ?? 0;
  const lastMonthIncome = monthlyIncomeMap.get(previousMonth) ?? 0;
  const recentMonthlyIncome = recentMonths.map((month) => ({
    month,
    income: monthlyIncomeMap.get(month) ?? 0,
  }));

  const activeMembersRows = members.filter((member) => member.status === "active");
  const pendingMembers = members.filter((member) => member.status === "pending").length;

  let membersWithDebt = 0;
  const debtRows: Array<{
    memberId: string;
    fullName: string;
    debtAmount: number;
    debtMonths: number;
  }> = [];
  const totalDebt = activeMembersRows.reduce((sum, member) => {
    const createdAt = member.created_at;
    if (!createdAt) {
      return sum;
    }

    const monthsExpected = countMonthsFromCreationToNow(createdAt, now);
    const paymentsCount = paymentsByMemberId.get(member.id) ?? 0;
    const debtMonths = Math.max(0, monthsExpected - (Number.isNaN(paymentsCount) ? 0 : paymentsCount));
    if (debtMonths > 0) {
      membersWithDebt += 1;
      debtRows.push({
        memberId: member.id,
        fullName: member.full_name,
        debtAmount: debtMonths * monthlyFee,
        debtMonths,
      });
    }

    return sum + debtMonths * monthlyFee;
  }, 0);
  const topDebtMembers = debtRows.sort((a, b) => b.debtAmount - a.debtAmount).slice(0, 4);

  const activeMembers = activeMembersRows.length;
  const nextMonthProjectedIncome = activeMembers * monthlyFee;
  const incomeChange = monthlyIncome - lastMonthIncome;
  const incomeChangePercent =
    lastMonthIncome > 0 ? (incomeChange / lastMonthIncome) * 100 : monthlyIncome > 0 ? 100 : 0;

  return {
    totalMembers: members.length,
    activeMembers,
    pendingMembers,
    monthlyFee,
    monthlyIncome,
    totalDebt,
    nextMonthProjectedIncome,
    membersWithDebt,
    incomeChange,
    incomeChangePercent,
    lastMonthIncome,
    recentMonthlyIncome,
    topDebtMembers,
  };
}
