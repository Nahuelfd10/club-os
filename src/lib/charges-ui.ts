import type { MemberChargeStatus } from "@/lib/charges";

export function memberChargeStatusLabel(status: MemberChargeStatus): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "partial":
      return "Parcial";
    case "paid":
      return "Pagado";
    default:
      return status;
  }
}

export function memberChargeStatusBadgeVariant(
  status: MemberChargeStatus
): "danger" | "warning" | "success" {
  switch (status) {
    case "paid":
      return "success";
    case "partial":
      return "warning";
    default:
      return "danger";
  }
}

export function remainingAmount(input: { amount: number; paid_amount: number }): number {
  return Math.max(0, Math.round((input.amount - input.paid_amount) * 100) / 100);
}

