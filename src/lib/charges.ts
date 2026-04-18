import { getSupabaseClient } from "@/lib/supabase";

export type ChargeRow = {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  type: "per_member" | "total";
  /** `null` = cargo del club completo (socios activos), no asociado a un grupo deportivo. */
  group_id: string | null;
  due_date: string | null;
  billing_period: string | null;
  created_at: string;
};

export type ChargeWithGroup = ChargeRow & {
  group: { id: string; name: string } | null;
  /** Desde `charge_definitions.category` en el join. */
  category: string | null;
};

export type ChargeProgressSummary = {
  totalMembers: number;
  paidMembers: number;
  partialMembers: number;
};

export type ChargeDetail = ChargeWithGroup;

export type ChargeOption = { id: string; name: string };

export type MemberChargeStatus = "pending" | "partial" | "paid";

/** Valores habituales en BD: `membership` | `activity` | `fee`. */
export type ChargeDefinitionCategory = "membership" | "activity" | "fee" | string;

export type MemberChargeWithDetails = {
  id: string;
  member_id: string;
  charge_id: string;
  amount: number;
  paid_amount: number;
  status: MemberChargeStatus;
  created_at: string;
  /** Nombre del concepto: `charge_definitions.name` si existe, si no `charges.name`. */
  conceptName: string;
  /** Categoría desde `charge_definitions.category`; `null` si no hay definición o legacy. */
  category: string | null;
  /** Mes facturado de la cuota (`charges.billing_period`, YYYY-MM-DD); `membership` lo usa como período. */
  billing_period: string | null;
  /** Fecha de vencimiento (YYYY-MM-DD) o cadena vacía. */
  dueDate: string;
  charge: {
    id: string;
    name: string;
    due_date: string | null;
    /** `null` si el cargo no tiene grupo (p. ej. cuota club) o el embed falló. */
    group: { id: string; name: string } | null;
  };
};

/** Vista plana para listados / exports. */
export type MemberChargeFlat = {
  conceptName: string;
  category: string | null;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
};

export function toMemberChargeFlat(mc: MemberChargeWithDetails): MemberChargeFlat {
  return {
    conceptName: mc.conceptName,
    category: mc.category,
    dueDate: mc.dueDate,
    amount: mc.amount,
    paidAmount: mc.paid_amount,
    status: mc.status,
  };
}

export function isMembershipCategory(category: string | null | undefined): boolean {
  return category === "membership";
}

export function formatBillingPeriod(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

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

/**
 * Registra un pago sobre un `member_charge` (inserta en `charge_payments` y actualiza totales vía RPC).
 * Por defecto usa la fecha/hora actual como `paid_at`.
 */
export async function createChargePayment(
  memberChargeId: string,
  amount: number,
  paidAt: string = new Date().toISOString()
) {
  return registerChargePayment({
    member_charge_id: memberChargeId,
    amount,
    paid_at: paidAt,
  });
}

export type MemberChargeBalance = {
  member_id: string;
  remaining: number;
  pendingLines: number;
};

/** Saldos por socio separando cuota club (`membership`) del resto de cargos. */
export type MemberChargeBalancesSplit = {
  member_id: string;
  membershipRemaining: number;
  membershipPendingLines: number;
  otherRemaining: number;
  otherPendingLines: number;
};

type MemberChargeSplitRow = {
  member_id: string;
  amount: unknown;
  paid_amount: unknown;
  charges: {
    charge_definitions: { category: string | null } | null;
  } | null;
};

/**
 * Agrega saldos por socio separando cuota mensual (`charge_definitions.category = membership`)
 * del resto (actividades, tasas, cargos sin categoría, etc.).
 * Misma convención que el dashboard (`getDashboardStats`).
 */
export async function listMemberChargeBalancesSplit(): Promise<MemberChargeBalancesSplit[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("member_charges").select(`
    member_id,
    amount,
    paid_amount,
    charges (
      charge_definitions (
        category
      )
    )
  `);

  if (error) {
    throw error;
  }

  const byMember = new Map<
    string,
    {
      membershipRemaining: number;
      membershipPendingLines: number;
      otherRemaining: number;
      otherPendingLines: number;
    }
  >();

  for (const raw of (data ?? []) as unknown as MemberChargeSplitRow[]) {
    const row = raw;
    const mid = row.member_id as string;
    const amount = normalizeAmount(row.amount);
    const paid = normalizeAmount(row.paid_amount);
    const rem = Math.max(0, roundMoney(amount - paid));
    const cat = row.charges?.charge_definitions?.category ?? null;
    const isMembership = isMembershipCategory(cat);

    const cur = byMember.get(mid) ?? {
      membershipRemaining: 0,
      membershipPendingLines: 0,
      otherRemaining: 0,
      otherPendingLines: 0,
    };

    if (isMembership) {
      cur.membershipRemaining = roundMoney(cur.membershipRemaining + rem);
      if (rem > 0.001) {
        cur.membershipPendingLines += 1;
      }
    } else {
      cur.otherRemaining = roundMoney(cur.otherRemaining + rem);
      if (rem > 0.001) {
        cur.otherPendingLines += 1;
      }
    }

    byMember.set(mid, cur);
  }

  return [...byMember.entries()].map(([member_id, v]) => ({
    member_id,
    membershipRemaining: v.membershipRemaining,
    membershipPendingLines: v.membershipPendingLines,
    otherRemaining: v.otherRemaining,
    otherPendingLines: v.otherPendingLines,
  }));
}

/** Agrega saldos por socio a partir de `member_charges` (total cuota + otros cargos). */
export async function listMemberChargeBalances(): Promise<MemberChargeBalance[]> {
  const split = await listMemberChargeBalancesSplit();
  return split.map((s) => ({
    member_id: s.member_id,
    remaining: roundMoney(s.membershipRemaining + s.otherRemaining),
    pendingLines: s.membershipPendingLines + s.otherPendingLines,
  }));
}

const CHARGE_SELECT_WITH_GROUP = `
  id,
  name,
  description,
  amount,
  type,
  group_id,
  due_date,
  billing_period,
  created_at,
  charge_definitions (
    id,
    category
  ),
  groups (
    id,
    name
  )
`;

type RawChargeWithGroup = Omit<ChargeRow, "amount" | "category"> & {
  amount: unknown;
  charge_definitions?: { id: string; category: string | null } | null;
  groups: { id: string; name: string } | null;
};

function mapRawToChargeWithGroup(row: RawChargeWithGroup): ChargeWithGroup {
  const { groups: group, charge_definitions: def, ...rest } = row;
  const cat = def?.category;
  const category =
    cat === undefined || cat === null || String(cat).trim() === "" ? null : String(cat).trim();
  const billing =
    rest.billing_period !== undefined && rest.billing_period !== null
      ? String(rest.billing_period).trim() || null
      : null;
  return {
    ...rest,
    group_id: rest.group_id ?? null,
    billing_period: billing,
    amount: normalizeAmount(rest.amount),
    group,
    category,
  };
}

const CHARGE_SELECT_WITH_GROUP_LEGACY = `
  id,
  name,
  description,
  amount,
  type,
  group_id,
  due_date,
  billing_period,
  created_at,
  groups (
    id,
    name
  )
`;

type RawChargeWithGroupLegacy = Omit<ChargeRow, "amount" | "category"> & {
  amount: unknown;
  groups: { id: string; name: string } | null;
};

function mapRawToChargeWithGroupLegacy(row: RawChargeWithGroupLegacy): ChargeWithGroup {
  const { groups: group, ...rest } = row;
  const billing =
    rest.billing_period !== undefined && rest.billing_period !== null
      ? String(rest.billing_period).trim() || null
      : null;
  return {
    ...rest,
    group_id: rest.group_id ?? null,
    billing_period: billing,
    amount: normalizeAmount(rest.amount),
    group,
    category: null,
  };
}

function sortChargesByDate(a: ChargeWithGroup, b: ChargeWithGroup): number {
  const memA = a.category === "membership";
  const memB = b.category === "membership";
  if (memA && memB) {
    const ba = a.billing_period?.trim() ?? "";
    const bb = b.billing_period?.trim() ?? "";
    if (ba && bb && ba !== bb) {
      return ba.localeCompare(bb);
    }
    if (ba && !bb) {
      return -1;
    }
    if (!ba && bb) {
      return 1;
    }
  }
  const dueA = a.due_date ? new Date(`${a.due_date}T12:00:00`).getTime() : Number.POSITIVE_INFINITY;
  const dueB = b.due_date ? new Date(`${b.due_date}T12:00:00`).getTime() : Number.POSITIVE_INFINITY;
  if (dueA !== dueB) {
    return dueA - dueB;
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export async function listChargesWithGroup(): Promise<ChargeWithGroup[]> {
  const supabase = getSupabaseClient();
  const first = await supabase.from("charges").select(CHARGE_SELECT_WITH_GROUP);

  if (first.error) {
    const msg = first.error.message?.toLowerCase() ?? "";
    const retry =
      (first.error as { code?: string }).code === "PGRST200" ||
      msg.includes("charge_definitions") ||
      msg.includes("schema cache");
    if (retry) {
      const second = await supabase.from("charges").select(CHARGE_SELECT_WITH_GROUP_LEGACY);
      if (!second.error) {
        const rows = (second.data ?? []) as unknown as RawChargeWithGroupLegacy[];
        return rows.map(mapRawToChargeWithGroupLegacy).sort(sortChargesByDate);
      }
      throw second.error;
    }
    throw first.error;
  }

  const rows = (first.data ?? []) as unknown as RawChargeWithGroup[];
  return rows.map(mapRawToChargeWithGroup).sort(sortChargesByDate);
}

export async function getChargeProgressByIds(
  chargeIds: string[]
): Promise<Record<string, ChargeProgressSummary>> {
  if (chargeIds.length === 0) {
    return {};
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_charges")
    .select("charge_id, status")
    .in("charge_id", chargeIds);

  if (error) {
    throw error;
  }

  const result: Record<string, ChargeProgressSummary> = {};

  for (const chargeId of chargeIds) {
    result[chargeId] = {
      totalMembers: 0,
      paidMembers: 0,
      partialMembers: 0,
    };
  }

  for (const row of data ?? []) {
    const chargeId = row.charge_id;
    if (!chargeId) {
      continue;
    }
    const summary = result[chargeId] ?? {
      totalMembers: 0,
      paidMembers: 0,
      partialMembers: 0,
    };
    summary.totalMembers += 1;
    if (row.status === "paid") {
      summary.paidMembers += 1;
    } else if (row.status === "partial") {
      summary.partialMembers += 1;
    }
    result[chargeId] = summary;
  }

  return result;
}

export async function listChargesForSelect(): Promise<ChargeOption[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("charges")
    .select("id, name")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ChargeOption[];
}

export async function getChargeFinancials(chargeId: string): Promise<{
  total_expected: number;
  total_collected: number;
  total_expenses: number;
}> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_charge_financials", { p_charge_id: chargeId });
  if (error) {
    throw error;
  }

  const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
  const total_expected = normalizeAmount(first?.total_expected ?? 0);
  const total_collected = normalizeAmount(first?.total_collected ?? 0);
  const total_expenses = normalizeAmount(first?.total_expenses ?? 0);

  return { total_expected, total_collected, total_expenses };
}

export async function getChargeById(chargeId: string): Promise<ChargeDetail | null> {
  const supabase = getSupabaseClient();
  const first = await supabase
    .from("charges")
    .select(CHARGE_SELECT_WITH_GROUP)
    .eq("id", chargeId)
    .maybeSingle();

  if (first.error) {
    const msg = first.error.message?.toLowerCase() ?? "";
    const retry =
      (first.error as { code?: string }).code === "PGRST200" ||
      msg.includes("charge_definitions") ||
      msg.includes("schema cache");
    if (retry) {
      const second = await supabase
        .from("charges")
        .select(CHARGE_SELECT_WITH_GROUP_LEGACY)
        .eq("id", chargeId)
        .maybeSingle();
      if (!second.error) {
        const raw = second.data as unknown as RawChargeWithGroupLegacy | null;
        return raw ? mapRawToChargeWithGroupLegacy(raw) : null;
      }
      throw second.error;
    }
    throw first.error;
  }

  const raw = first.data as unknown as RawChargeWithGroup | null;
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
  const first = await supabase
    .from("charges")
    .select(CHARGE_SELECT_WITH_GROUP)
    .eq("group_id", groupId);

  if (first.error) {
    const msg = first.error.message?.toLowerCase() ?? "";
    const retry =
      (first.error as { code?: string }).code === "PGRST200" ||
      msg.includes("charge_definitions") ||
      msg.includes("schema cache");
    if (retry) {
      const second = await supabase
        .from("charges")
        .select(CHARGE_SELECT_WITH_GROUP_LEGACY)
        .eq("group_id", groupId);
      if (!second.error) {
        const rows = (second.data ?? []) as unknown as RawChargeWithGroupLegacy[];
        return rows.map(mapRawToChargeWithGroupLegacy).sort(sortChargesByDate);
      }
      throw second.error;
    }
    throw first.error;
  }

  const rows = (first.data ?? []) as unknown as RawChargeWithGroup[];
  return rows.map(mapRawToChargeWithGroup).sort(sortChargesByDate);
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
  /** `null` = cargo del club completo (comparar con socios activos). */
  groupId: string | null;
}): Promise<Array<{ id: string; full_name: string; dni: string; status: "pending" | "active" }>> {
  const supabase = getSupabaseClient();

  const { data: existingMc, error: mcErr } = await supabase
    .from("member_charges")
    .select("member_id")
    .eq("charge_id", params.chargeId);

  if (mcErr) {
    throw mcErr;
  }

  const alreadyHas = new Set((existingMc ?? []).map((r) => r.member_id));

  if (params.groupId) {
    const { data: groupLinks, error: groupErr } = await supabase
      .from("member_groups")
      .select("member_id")
      .eq("group_id", params.groupId);

    if (groupErr) {
      throw groupErr;
    }

    const groupMemberIds = new Set((groupLinks ?? []).map((r) => r.member_id));
    const missingIds = [...groupMemberIds].filter((id) => !alreadyHas.has(id));
    if (missingIds.length === 0) {
      return [];
    }

    const { data: members, error: memErr } = await supabase
      .from("members")
      .select("id, full_name, dni, status")
      .in("id", missingIds)
      .eq("status", "active")
      .order("full_name", { ascending: true });

    if (memErr) {
      throw memErr;
    }

    return (members ?? []) as Array<{
      id: string;
      full_name: string;
      dni: string;
      status: "pending" | "active";
    }>;
  }

  const { data: activeList, error: actErr } = await supabase
    .from("members")
    .select("id, full_name, dni, status")
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (actErr) {
    throw actErr;
  }

  return (activeList ?? []).filter((m) => !alreadyHas.has(m.id)) as Array<{
    id: string;
    full_name: string;
    dni: string;
    status: "pending" | "active";
  }>;
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

/** Incluye `charge_definitions` si en Supabase existe la FK `charges.charge_definition_id`. */
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
    billing_period,
    charge_definitions (
      id,
      name,
      category
    ),
    groups (
      id,
      name
    )
  )
`;

/** Misma forma sin definiciones (compatibilidad si la tabla/relación aún no existe). */
const MEMBER_CHARGE_SELECT_LEGACY = `
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
    billing_period,
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
    billing_period?: string | null;
    charge_definitions?: { id: string; name: string; category?: string | null } | null;
    groups: { id: string; name: string } | null;
  } | null;
};

function mapRawMemberCharge(row: RawMemberChargeRow): MemberChargeWithDetails | null {
  const c = row.charges;
  if (!c) {
    return null;
  }

  const group = c.groups ?? null;

  const defName = c.charge_definitions?.name?.trim();
  const conceptName = (defName && defName.length > 0 ? defName : c.name).trim();
  const rawCat = c.charge_definitions?.category;
  const category =
    rawCat === undefined || rawCat === null || String(rawCat).trim() === ""
      ? null
      : String(rawCat).trim();
  const dueDate = c.due_date?.trim() ?? "";
  const billingRaw = c.billing_period;
  const billing_period =
    billingRaw !== undefined && billingRaw !== null ? String(billingRaw).trim() || null : null;

  return {
    id: row.id,
    member_id: row.member_id,
    charge_id: row.charge_id,
    amount: normalizeAmount(row.amount),
    paid_amount: normalizeAmount(row.paid_amount),
    status: row.status,
    created_at: row.created_at,
    conceptName: conceptName.length > 0 ? conceptName : c.name,
    category,
    billing_period,
    dueDate,
    charge: {
      id: c.id,
      name: c.name,
      due_date: c.due_date,
      group,
    },
  };
}

function sortMemberChargesByDueDate(a: MemberChargeWithDetails, b: MemberChargeWithDetails): number {
  const mA = isMembershipCategory(a.category);
  const mB = isMembershipCategory(b.category);
  if (mA && mB) {
    const pa = a.billing_period?.trim() ?? "";
    const pb = b.billing_period?.trim() ?? "";
    if (pa && pb && pa !== pb) {
      return pa.localeCompare(pb);
    }
    if (pa && !pb) {
      return -1;
    }
    if (!pa && pb) {
      return 1;
    }
  }
  const dueA = a.dueDate
    ? new Date(`${a.dueDate}T12:00:00`).getTime()
    : Number.POSITIVE_INFINITY;
  const dueB = b.dueDate
    ? new Date(`${b.dueDate}T12:00:00`).getTime()
    : Number.POSITIVE_INFINITY;
  if (dueA !== dueB) {
    return dueA - dueB;
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export async function getMemberChargesForMember(memberId: string): Promise<MemberChargeWithDetails[]> {
  const supabase = getSupabaseClient();
  const first = await supabase
    .from("member_charges")
    .select(MEMBER_CHARGE_SELECT)
    .eq("member_id", memberId);

  let data = first.data;
  let error = first.error;

  if (error) {
    const code = (error as { code?: string }).code;
    const msg = error.message?.toLowerCase() ?? "";
    const retry =
      code === "PGRST200" ||
      code === "42703" ||
      msg.includes("charge_definitions") ||
      msg.includes("schema cache") ||
      msg.includes("category") ||
      msg.includes("billing_period");
    if (retry) {
      const second = await supabase
        .from("member_charges")
        .select(MEMBER_CHARGE_SELECT_LEGACY)
        .eq("member_id", memberId);
      data = second.data;
      error = second.error;
    }
  }

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as RawMemberChargeRow[];
  return rows
    .map(mapRawMemberCharge)
    .filter((row): row is MemberChargeWithDetails => row !== null)
    .sort(sortMemberChargesByDueDate);
}

export type CreateChargeDefinitionCategory = "membership" | "activity" | "fee";

export async function createCharge(payload: {
  name: string;
  description?: string | null;
  amount: number;
  type: "per_member" | "total";
  /** `null` = todos los socios **activos** (sin filtrar por grupo deportivo). */
  group_id: string | null;
  due_date?: string | null;
  definition_category: CreateChargeDefinitionCategory;
}) {
  if (payload.definition_category === "membership") {
    throw new Error("No se puede crear cuota del club manualmente");
  }
  const supabase = getSupabaseClient();
  const groupId = payload.group_id?.trim() ? payload.group_id.trim() : null;
  const startDate = payload.due_date?.trim() || new Date().toISOString().slice(0, 10);
  const scopeType = groupId ? "group" : "all_members";

  const { data: defRow, error: defErr } = await supabase
    .from("charge_definitions")
    .insert({
      name: payload.name.trim(),
      description: payload.description?.trim() ? payload.description.trim() : null,
      amount: payload.amount,
      type: "one_time",
      recurrence: null,
      start_date: startDate,
      end_date: null,
      scope_type: scopeType,
      scope_id: groupId,
      is_active: true,
      category: payload.definition_category,
    })
    .select("id")
    .single();

  if (defErr) {
    throw defErr;
  }

  const definitionId = defRow.id as string;

  const { data: created, error } = await supabase
    .from("charges")
    .insert({
      name: payload.name.trim(),
      description: payload.description?.trim() ? payload.description.trim() : null,
      amount: payload.amount,
      type: payload.type,
      group_id: groupId,
      charge_definition_id: definitionId,
      due_date: payload.due_date?.trim() ? payload.due_date.trim() : null,
    })
    .select("id")
    .single();

  if (error) {
    await supabase.from("charge_definitions").delete().eq("id", definitionId);
    throw error;
  }

  const chargeId = created.id as string;

  let memberIds: string[] = [];

  if (groupId) {
    const { data: groupMembers, error: membersError } = await supabase
      .from("member_groups")
      .select("member_id")
      .eq("group_id", groupId);

    if (membersError) {
      await supabase.from("charges").delete().eq("id", chargeId);
      await supabase.from("charge_definitions").delete().eq("id", definitionId);
      throw membersError;
    }

    const groupMemberIds = [...new Set((groupMembers ?? []).map((row) => row.member_id))];
    if (groupMemberIds.length === 0) {
      memberIds = [];
    } else {
      const { data: activeGroupMembers, error: activeGroupError } = await supabase
        .from("members")
        .select("id")
        .in("id", groupMemberIds)
        .eq("status", "active");

      if (activeGroupError) {
        await supabase.from("charges").delete().eq("id", chargeId);
        await supabase.from("charge_definitions").delete().eq("id", definitionId);
        throw activeGroupError;
      }

      memberIds = [...new Set((activeGroupMembers ?? []).map((row) => row.id))];
    }
  } else {
    const { data: activeMembers, error: activeErr } = await supabase
      .from("members")
      .select("id")
      .eq("status", "active");

    if (activeErr) {
      await supabase.from("charges").delete().eq("id", chargeId);
      await supabase.from("charge_definitions").delete().eq("id", definitionId);
      throw activeErr;
    }

    memberIds = [...new Set((activeMembers ?? []).map((r) => r.id))];
  }

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
      await supabase.from("charge_definitions").delete().eq("id", definitionId);
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
