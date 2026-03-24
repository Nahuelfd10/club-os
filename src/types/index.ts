export type Member = {
  id: string;
  full_name: string;
  email?: string | null;
  dni: string;
  address: string;
  phone?: string;
  status: "pending" | "active";
  created_at: string;
};
