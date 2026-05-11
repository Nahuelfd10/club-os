export type MemberStatus = "pending" | "active" | "inactive";

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
