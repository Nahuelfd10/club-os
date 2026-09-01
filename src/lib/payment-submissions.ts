import { DEFAULT_PAYMENT_METHOD, normalizePaymentMethod, type ClubPaymentMethod } from "@/config/payment-method";
import type { ChargeCollectionAccount } from "@/lib/charges";
import { getSupabaseClient, type PaymentSubmission } from "@/lib/supabase";
import type { PaymentSubmissionStatus } from "@/types";

export const PAYMENT_PROOF_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const PAYMENT_PROOF_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

const PAYMENT_PROOF_ALLOWED_MIME_TYPES = new Set(PAYMENT_PROOF_ACCEPT.split(","));
const PAYMENT_PROOF_ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);

export type PaymentSubmissionWithContext = PaymentSubmission & {
  member: { id: string; full_name: string; dni: string } | null;
  member_charge: {
    id: string;
    amount: number;
    paid_amount: number;
    status: string;
    charge: {
      id: string;
      name: string;
      billing_period: string | null;
      collection_account: ChargeCollectionAccount | null;
      charge_definition: { category: string | null } | null;
    } | null;
  } | null;
  collection_account: ChargeCollectionAccount | null;
  counts_as_club_income: boolean;
};

type RawPaymentSubmission = PaymentSubmission & {
  collection_account_id?: string | null;
  counts_as_club_income?: boolean | null;
  collection_accounts?: unknown;
  members?: { id: string; full_name: string; dni: string } | null;
  member_charges?: {
    id: string;
    amount: unknown;
    paid_amount: unknown;
    status: string;
    charges?: {
      id: string;
      name: string;
      billing_period: string | null;
      collection_accounts?: unknown;
      charge_definitions?: { category: string | null } | null;
    } | null;
  } | null;
};

function amount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function collectionAccount(row: unknown): ChargeCollectionAccount | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const raw = row as {
    id?: unknown;
    name?: unknown;
    alias?: unknown;
    kind?: unknown;
    responsible_profile_id?: unknown;
  };
  if (typeof raw.id !== "string") {
    return null;
  }
  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Cuenta de cobro",
    alias: typeof raw.alias === "string" && raw.alias.trim() ? raw.alias.trim() : null,
    kind: raw.kind === "club" ? "club" : "external",
    responsible_profile_id:
      typeof raw.responsible_profile_id === "string" ? raw.responsible_profile_id : null,
  };
}

export function validatePaymentProofFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  const validMime = file.type ? PAYMENT_PROOF_ALLOWED_MIME_TYPES.has(file.type) : false;
  const validExtension = PAYMENT_PROOF_ALLOWED_EXTENSIONS.has(extension);

  if (!validMime && !validExtension) {
    throw new Error("El comprobante debe ser JPG, PNG, WebP o PDF.");
  }

  if (file.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
    throw new Error("El comprobante no puede superar los 10 MB.");
  }
}

function mapSubmission(row: RawPaymentSubmission): PaymentSubmissionWithContext {
  return {
    ...row,
    amount: amount(row.amount),
    payment_method: normalizePaymentMethod(row.payment_method),
    member: row.members ?? null,
    member_charge: row.member_charges
      ? {
          id: row.member_charges.id,
          amount: amount(row.member_charges.amount),
          paid_amount: amount(row.member_charges.paid_amount),
          status: row.member_charges.status,
          charge: row.member_charges.charges
            ? {
                id: row.member_charges.charges.id,
                name: row.member_charges.charges.name,
                billing_period: row.member_charges.charges.billing_period,
                collection_account: collectionAccount(row.member_charges.charges.collection_accounts),
                charge_definition: row.member_charges.charges.charge_definitions ?? null,
              }
            : null,
        }
      : null,
    collection_account:
      collectionAccount(row.collection_accounts) ??
      collectionAccount(row.member_charges?.charges?.collection_accounts),
    counts_as_club_income: row.counts_as_club_income ?? true,
  };
}

const SUBMISSION_SELECT = `
  id,
  member_id,
  member_charge_id,
  amount,
  payment_method,
  paid_at,
  proof_url,
  notes,
  status,
  reviewed_by,
  reviewed_at,
  rejection_reason,
  collection_account_id,
  counts_as_club_income,
  created_at,
  collection_accounts:collection_account_id(id, name, alias, kind, responsible_profile_id),
  members:member_id(id, full_name, dni),
  member_charges:member_charge_id(
    id,
    amount,
    paid_amount,
    status,
    charges:charge_id(
      id,
      name,
      billing_period,
      collection_accounts:collection_account_id(id, name, alias, kind, responsible_profile_id),
      charge_definitions:charge_definition_id(category)
    )
  )
`;

const SUBMISSION_SELECT_LEGACY = `
  id,
  member_id,
  member_charge_id,
  amount,
  payment_method,
  paid_at,
  proof_url,
  notes,
  status,
  reviewed_by,
  reviewed_at,
  rejection_reason,
  created_at,
  members:member_id(id, full_name, dni),
  member_charges:member_charge_id(
    id,
    amount,
    paid_amount,
    status,
    charges:charge_id(
      id,
      name,
      billing_period,
      charge_definitions:charge_definition_id(category)
    )
  )
`;

export async function uploadPaymentProof(memberId: string, file: File) {
  validatePaymentProofFile(file);

  const supabase = getSupabaseClient();
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${memberId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("payment-proofs").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return path;
}

export async function createPaymentSubmission(payload: {
  member_id: string;
  member_charge_id: string;
  amount: number;
  payment_method: ClubPaymentMethod;
  paid_at: string;
  proof_url: string;
  notes?: string | null;
}) {
  const supabase = getSupabaseClient();
  const roundedAmount = Math.round(payload.amount * 100) / 100;
  if (!Number.isFinite(roundedAmount) || roundedAmount <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const { error } = await supabase.from("payment_submissions").insert({
    member_id: payload.member_id,
    member_charge_id: payload.member_charge_id,
    amount: roundedAmount,
    payment_method: payload.payment_method || DEFAULT_PAYMENT_METHOD,
    paid_at: payload.paid_at,
    proof_url: payload.proof_url,
    notes: payload.notes?.trim() || null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya hay un comprobante en revision para esta cuota.");
    }
    throw error;
  }
}

export async function listPaymentSubmissionsForMember(memberId: string) {
  const supabase = getSupabaseClient();
  const first = await supabase
    .from("payment_submissions")
    .select(SUBMISSION_SELECT)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (first.error) {
    const msg = first.error.message?.toLowerCase() ?? "";
    if (msg.includes("collection_account") || msg.includes("counts_as_club_income") || msg.includes("schema cache")) {
      const second = await supabase
        .from("payment_submissions")
        .select(SUBMISSION_SELECT_LEGACY)
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });
      if (second.error) {
        throw second.error;
      }
      return ((second.data ?? []) as unknown as RawPaymentSubmission[]).map(mapSubmission);
    }
    throw first.error;
  }

  return ((first.data ?? []) as unknown as RawPaymentSubmission[]).map(mapSubmission);
}

export async function listPaymentSubmissions(status?: PaymentSubmissionStatus | "all") {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("payment_submissions")
    .select(SUBMISSION_SELECT)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const first = await query;

  if (first.error) {
    const msg = first.error.message?.toLowerCase() ?? "";
    if (msg.includes("collection_account") || msg.includes("counts_as_club_income") || msg.includes("schema cache")) {
      let legacyQuery = supabase
        .from("payment_submissions")
        .select(SUBMISSION_SELECT_LEGACY)
        .order("created_at", { ascending: false });

      if (status && status !== "all") {
        legacyQuery = legacyQuery.eq("status", status);
      }

      const second = await legacyQuery;
      if (second.error) {
        throw second.error;
      }
      return ((second.data ?? []) as unknown as RawPaymentSubmission[]).map(mapSubmission);
    }
    throw first.error;
  }

  return ((first.data ?? []) as unknown as RawPaymentSubmission[]).map(mapSubmission);
}

export async function approvePaymentSubmission(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("approve_payment_submission", { p_submission_id: id });
  if (error) {
    throw new Error(error.message || "No se pudo aprobar el comprobante.");
  }
}

export async function rejectPaymentSubmission(id: string, reason: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("reject_payment_submission", {
    p_submission_id: id,
    p_rejection_reason: reason,
  });
  if (error) {
    throw new Error(error.message || "No se pudo rechazar el comprobante.");
  }
}

export async function getPaymentProofSignedUrl(path: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 10);
  if (error) {
    throw error;
  }
  return data.signedUrl;
}
