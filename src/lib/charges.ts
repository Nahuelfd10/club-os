import { getSupabaseClient } from "@/lib/supabase";

export type ChargeRow = {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  group_id: string;
  due_date: string | null;
  created_at: string;
};

export type ChargeWithGroup = ChargeRow & {
  group: { id: string; name: string };
};

export type MemberChargeStatus = "pending" | "partial" | "paid";

export type MemberChargeWithDetails = {
  id: string;
  member_id: string;
  charge_id: string;
  amount: number;
  paid_amount: number;
  status: MemberChargeStatus;
  created_at: string;
  charge: {
    id: string;
    name: string;
    due_date: string | null;
    group: { id: string; name: string };
  };
};

function normalizeAmount(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type ChargePaymentRow = {
  id: string;
  member_charge_id: string;
  amount: number;
  paid_at: string;
  created_at: string;
};

export async function getChargePaymentsByMemberChargeId(
  memberChargeId: string
): Promise<ChargePaymentRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("charge_payments")
    .select("id, member_charge_id, amount, paid_at, created_at")
    .eq("member_charge_id", memberChargeId)
    .order("paid_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...row,
    amount: normalizeAmount((row as { amount: unknown }).amount),
  })) as ChargePaymentRow[];
}

/** Registra un pago vía RPC en Supabase (transacción atómica en BD). */
export async function registerChargePayment(payload: {
  member_charge_id: string;
  amount: number;
  paid_at: string;
}) {
  const supabase = getSupabaseClient();
  const paid = roundMoney(payload.amount);
  if (!Number.isFinite(paid) || paid <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const { error } = await supabase.rpc("register_charge_payment", {
    p_member_charge_id: payload.member_charge_id,
    p_amount: paid,
    p_paid_at: payload.paid_at,
  });

  if (error) {
    const msg = error.message?.trim() || "No se pudo registrar el pago.";
    throw new Error(msg);
  }
}

const CHARGE_SELECT_WITH_GROUP = `
  id,
  name,
  description,
  amount,
  group_id,
  due_date,
  created_at,
  groups (
    id,
    name
  )
`;

type RawChargeWithGroup = Omit<ChargeRow, "amount"> & {
  amount: unknown;
  groups: { id: string; name: string } | null;
};

function mapRawToChargeWithGroup(row: RawChargeWithGroup): ChargeWithGroup | null {
  if (!row.groups) {
    return null;
  }
  const { groups: group, ...rest } = row;
  return {
    ...rest,
    amount: normalizeAmount(rest.amount),
    group,
  };
}

function sortChargesByDate(a: ChargeWithGroup, b: ChargeWithGroup): number {
  const dueA = a.due_date ? new Date(`${a.due_date}T12:00:00`).getTime() : Number.POSITIVE_INFINITY;
  const dueB = b.due_date ? new Date(`${b.due_date}T12:00:00`).getTime() : Number.POSITIVE_INFINITY;
  if (dueA !== dueB) {
    return dueA - dueB;
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export async function listChargesWithGroup(): Promise<ChargeWithGroup[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("charges").select(CHARGE_SELECT_WITH_GROUP);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as RawChargeWithGroup[];
  return rows
    .map(mapRawToChargeWithGroup)
    .filter((row): row is ChargeWithGroup => row !== null)
    .sort(sortChargesByDate);
}

export async function getChargesByGroupId(groupId: string): Promise<ChargeWithGroup[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("charges")
    .select(CHARGE_SELECT_WITH_GROUP)
    .eq("group_id", groupId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as RawChargeWithGroup[];
  return rows
    .map(mapRawToChargeWithGroup)
    .filter((row): row is ChargeWithGroup => row !== null)
    .sort(sortChargesByDate);
}

const MEMBER_CHARGE_SELECT = `
  id,
  member_id,
  charge_id,
  amount,
  paid_amount,
  status,
  created_at,
  charges (
    id,
    name,
    due_date,
    groups (
      id,
      name
    )
  )
`;

type RawMemberChargeRow = {
  id: string;
  member_id: string;
  charge_id: string;
  amount: unknown;
  paid_amount: unknown;
  status: MemberChargeStatus;
  created_at: string;
  charges: {
    id: string;
    name: string;
    due_date: string | null;
    groups: { id: string; name: string } | null;
  } | null;
};

function mapRawMemberCharge(row: RawMemberChargeRow): MemberChargeWithDetails | null {
  const c = row.charges;
  const group = c?.groups;
  if (!c || !group) {
    return null;
  }

  return {
    id: row.id,
    member_id: row.member_id,
    charge_id: row.charge_id,
    amount: normalizeAmount(row.amount),
    paid_amount: normalizeAmount(row.paid_amount),
    status: row.status,
    created_at: row.created_at,
    charge: {
      id: c.id,
      name: c.name,
      due_date: c.due_date,
      group,
    },
  };
}

function sortMemberChargesByDueDate(a: MemberChargeWithDetails, b: MemberChargeWithDetails): number {
  const dueA = a.charge.due_date
    ? new Date(`${a.charge.due_date}T12:00:00`).getTime()
    : Number.POSITIVE_INFINITY;
  const dueB = b.charge.due_date
    ? new Date(`${b.charge.due_date}T12:00:00`).getTime()
    : Number.POSITIVE_INFINITY;
  if (dueA !== dueB) {
    return dueA - dueB;
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export async function getMemberChargesForMember(memberId: string): Promise<MemberChargeWithDetails[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_charges")
    .select(MEMBER_CHARGE_SELECT)
    .eq("member_id", memberId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as RawMemberChargeRow[];
  return rows
    .map(mapRawMemberCharge)
    .filter((row): row is MemberChargeWithDetails => row !== null)
    .sort(sortMemberChargesByDueDate);
}

export async function createCharge(payload: {
  name: string;
  description?: string | null;
  amount: number;
  group_id: string;
  due_date?: string | null;
}) {
  const supabase = getSupabaseClient();
  const { data: created, error } = await supabase
    .from("charges")
    .insert({
      name: payload.name.trim(),
      description: payload.description?.trim()
        ? payload.description.trim()
        : null,
      amount: payload.amount,
      group_id: payload.group_id,
      due_date: payload.due_date?.trim() ? payload.due_date.trim() : null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const chargeId = created.id as string;
  const chargeAmount = payload.amount;

  const { data: groupMembers, error: membersError } = await supabase
    .from("member_groups")
    .select("member_id")
    .eq("group_id", payload.group_id);

  if (membersError) {
    await supabase.from("charges").delete().eq("id", chargeId);
    throw membersError;
  }

  const memberIds = [...new Set((groupMembers ?? []).map((row) => row.member_id))];

  if (memberIds.length > 0) {
    const memberChargeRows = memberIds.map((member_id) => ({
      member_id,
      charge_id: chargeId,
      amount: chargeAmount,
      paid_amount: 0,
      status: "pending" as const,
    }));

    const { error: insertMcError } = await supabase.from("member_charges").insert(memberChargeRows);

    if (insertMcError) {
      await supabase.from("charges").delete().eq("id", chargeId);
      throw insertMcError;
    }
  }

  return { id: chargeId };
}

export async function deleteCharge(chargeId: string) {
  const supabase = getSupabaseClient();
  const { data: memberChargeRows, error: mcListErr } = await supabase
    .from("member_charges")
    .select("id")
    .eq("charge_id", chargeId);

  if (mcListErr) {
    throw mcListErr;
  }

  const mcIds = (memberChargeRows ?? []).map((r) => r.id);
  if (mcIds.length > 0) {
    const { error: delCpError } = await supabase
      .from("charge_payments")
      .delete()
      .in("member_charge_id", mcIds);
    if (delCpError) {
      throw delCpError;
    }
  }

  const { error: delMcError } = await supabase.from("member_charges").delete().eq("charge_id", chargeId);
  if (delMcError) {
    throw delMcError;
  }
  const { error } = await supabase.from("charges").delete().eq("id", chargeId);
  if (error) {
    throw error;
  }
}
