import { getSupabaseClient } from "@/lib/supabase";

export type ChargeRow = {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  type: "per_member" | "total";
  group_id: string;
  due_date: string | null;
  created_at: string;
};

export type ChargeWithGroup = ChargeRow & {
  group: { id: string; name: string };
};

export type ChargeDetail = ChargeWithGroup;

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

export type MemberChargeForChargeRow = {
  id: string;
  member_id: string;
  charge_id: string;
  amount: number;
  paid_amount: number;
  status: MemberChargeStatus;
  created_at: string;
  member: {
    id: string;
    full_name: string;
    dni: string;
    phone: string | null;
    status: "pending" | "active";
  };
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
  type,
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

export async function getChargeById(chargeId: string): Promise<ChargeDetail | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("charges")
    .select(CHARGE_SELECT_WITH_GROUP)
    .eq("id", chargeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const raw = data as unknown as RawChargeWithGroup | null;
  if (!raw) {
    return null;
  }
  return mapRawToChargeWithGroup(raw);
}

export async function chargeHasPayments(chargeId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("charge_has_payments", { p_charge_id: chargeId });
  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function updateCharge(
  chargeId: string,
  payload: { name: string; description?: string | null; amount: number; due_date?: string | null }
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("charges")
    .update({
      name: payload.name.trim(),
      description: payload.description?.trim() ? payload.description.trim() : null,
      amount: payload.amount,
      due_date: payload.due_date?.trim() ? payload.due_date.trim() : null,
    })
    .eq("id", chargeId);

  if (error) {
    throw error;
  }
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

const MEMBER_CHARGES_FOR_CHARGE_SELECT = `
  id,
  member_id,
  charge_id,
  amount,
  paid_amount,
  status,
  created_at,
  members (
    id,
    full_name,
    dni,
    phone,
    status
  )
`;

type RawMemberChargeForChargeRow = {
  id: string;
  member_id: string;
  charge_id: string;
  amount: unknown;
  paid_amount: unknown;
  status: MemberChargeStatus;
  created_at: string;
  members: {
    id: string;
    full_name: string;
    dni: string;
    phone: string | null;
    status: "pending" | "active";
  } | null;
};

function mapRawMemberChargeForCharge(
  row: RawMemberChargeForChargeRow
): MemberChargeForChargeRow | null {
  if (!row.members) {
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
    member: row.members,
  };
}

function sortMemberChargesForCharge(a: MemberChargeForChargeRow, b: MemberChargeForChargeRow): number {
  const statusOrder: Record<MemberChargeStatus, number> = { pending: 0, partial: 1, paid: 2 };
  const aS = statusOrder[a.status] ?? 0;
  const bS = statusOrder[b.status] ?? 0;
  if (aS !== bS) {
    return aS - bS;
  }
  // Más deuda primero dentro del mismo estado
  const aRem = roundMoney(a.amount - a.paid_amount);
  const bRem = roundMoney(b.amount - b.paid_amount);
  if (aRem !== bRem) {
    return bRem - aRem;
  }
  return a.member.full_name.localeCompare(b.member.full_name, "es");
}

export async function getMemberChargesForCharge(chargeId: string): Promise<MemberChargeForChargeRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_charges")
    .select(MEMBER_CHARGES_FOR_CHARGE_SELECT)
    .eq("charge_id", chargeId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as RawMemberChargeForChargeRow[];
  return rows
    .map(mapRawMemberChargeForCharge)
    .filter((row): row is MemberChargeForChargeRow => row !== null)
    .sort(sortMemberChargesForCharge);
}

export async function getMissingMembersForCharge(params: {
  chargeId: string;
  groupId: string;
}): Promise<Array<{ id: string; full_name: string; dni: string; status: "pending" | "active" }>> {
  const supabase = getSupabaseClient();

  const [{ data: groupLinks, error: groupErr }, { data: existingMc, error: mcErr }] =
    await Promise.all([
      supabase.from("member_groups").select("member_id").eq("group_id", params.groupId),
      supabase.from("member_charges").select("member_id").eq("charge_id", params.chargeId),
    ]);

  if (groupErr) {
    throw groupErr;
  }
  if (mcErr) {
    throw mcErr;
  }

  const groupMemberIds = new Set((groupLinks ?? []).map((r) => r.member_id));
  const alreadyHas = new Set((existingMc ?? []).map((r) => r.member_id));
  const missingIds = [...groupMemberIds].filter((id) => !alreadyHas.has(id));
  if (missingIds.length === 0) {
    return [];
  }

  const { data: members, error: memErr } = await supabase
    .from("members")
    .select("id, full_name, dni, status")
    .in("id", missingIds)
    .order("full_name", { ascending: true });

  if (memErr) {
    throw memErr;
  }

  return (members ?? []) as Array<{ id: string; full_name: string; dni: string; status: "pending" | "active" }>;
}

export async function assignChargeToMissingMembers(chargeId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("assign_charge_to_missing_members", { p_charge_id: chargeId });
  if (error) {
    throw error;
  }
}

export async function assignChargeToMember(payload: {
  member_id: string;
  charge_id: string;
  amount: number;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("member_charges").insert({
    member_id: payload.member_id,
    charge_id: payload.charge_id,
    amount: payload.amount,
    paid_amount: 0,
    status: "pending",
  });

  if (error) {
    throw error;
  }
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
  type: "per_member" | "total";
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
      type: payload.type,
      group_id: payload.group_id,
      due_date: payload.due_date?.trim() ? payload.due_date.trim() : null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const chargeId = created.id as string;

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
    const perMemberAmount =
      payload.type === "total"
        ? roundMoney(payload.amount / memberIds.length)
        : payload.amount;

    const memberChargeRows = memberIds.map((member_id) => ({
      member_id,
      charge_id: chargeId,
      amount: perMemberAmount,
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
