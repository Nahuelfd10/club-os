export type MemberStatus = "pending" | "active" | "inactive";

export type ClubUserRole = "club_admin" | "treasurer" | "secretary" | "viewer" | "member";

export type UserProfileStatus = "invited" | "active" | "disabled";

export type PaymentSubmissionStatus = "pending" | "approved" | "rejected";

export type CollectionAccountKind = "club" | "external";

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
  city?: string | null;
  phone?: string;
  status: MemberStatus;
  created_at: string;
};
