export type MemberStatus = "pending" | "active" | "inactive";

export type MemberChargeTrackingStatus =
  | "not_contacted"
  | "message_sent"
  | "responded"
  | "promised"
  | "partial_payment"
  | "closed";

export type Member = {
  id: string;
  full_name: string;
  email?: string | null;
  dni: string;
  address: string;
  phone?: string;
  status: MemberStatus;
  created_at: string;
};
