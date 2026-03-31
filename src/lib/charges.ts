import { getSupabaseClient } from "@/lib/supabase";
import { getGroupsForMember } from "@/lib/groups";

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

function normalizeAmount(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
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

  const rows = (data ?? []) as RawChargeWithGroup[];
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

  const rows = (data ?? []) as RawChargeWithGroup[];
  return rows
    .map(mapRawToChargeWithGroup)
    .filter((row): row is ChargeWithGroup => row !== null)
    .sort(sortChargesByDate);
}

export async function getChargesForMember(memberId: string): Promise<ChargeWithGroup[]> {
  const memberGroups = await getGroupsForMember(memberId);
  const groupIds = [...new Set(memberGroups.map((row) => row.group.id))];
  if (groupIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("charges")
    .select(CHARGE_SELECT_WITH_GROUP)
    .in("group_id", groupIds);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawChargeWithGroup[];
  return rows
    .map(mapRawToChargeWithGroup)
    .filter((row): row is ChargeWithGroup => row !== null)
    .sort(sortChargesByDate);
}

export async function createCharge(payload: {
  name: string;
  description?: string | null;
  amount: number;
  group_id: string;
  due_date?: string | null;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
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

  return data as { id: string };
}

export async function deleteCharge(chargeId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("charges").delete().eq("id", chargeId);
  if (error) {
    throw error;
  }
}
