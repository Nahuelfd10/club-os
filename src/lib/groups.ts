import { getSupabaseClient } from "@/lib/supabase";

export type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type GroupWithMemberCount = GroupRow & {
  memberCount: number;
};

export type GroupMemberRow = {
  linkId: string;
  created_at: string;
  member: {
    id: string;
    full_name: string;
    dni: string;
    email: string | null;
    status: "pending" | "active";
  };
};

export type MemberGroupRow = {
  linkId: string;
  created_at: string;
  group: {
    id: string;
    name: string;
    description: string | null;
  };
};

function parseNestedCount(value: unknown): number {
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0] as { count?: number };
    return typeof first.count === "number" ? first.count : 0;
  }
  if (value && typeof value === "object" && "count" in value) {
    const count = (value as { count?: number }).count;
    return typeof count === "number" ? count : 0;
  }
  return 0;
}

export async function listGroupsWithMemberCount(): Promise<GroupWithMemberCount[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, description, created_at, member_groups (count)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<
    GroupRow & { member_groups: unknown }
  >;

  return rows.map((row) => {
    const { member_groups: nested, ...rest } = row;
    return {
      ...rest,
      memberCount: parseNestedCount(nested),
    };
  });
}

export async function createGroup(payload: { name: string; description?: string | null }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("groups")
    .insert({
      name: payload.name.trim(),
      description: payload.description?.trim() ? payload.description.trim() : null,
    })
    .select("id, name, description, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data as GroupRow;
}

export async function getGroupById(id: string): Promise<GroupRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, description, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as GroupRow | null;
}

export async function deleteGroup(groupId: string) {
  const supabase = getSupabaseClient();
  const { error: linksError } = await supabase.from("member_groups").delete().eq("group_id", groupId);
  if (linksError) {
    throw linksError;
  }

  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) {
    throw error;
  }
}

export async function getMembersInGroup(groupId: string): Promise<GroupMemberRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_groups")
    .select(
      `
      id,
      created_at,
      members (
        id,
        full_name,
        dni,
        email,
        status
      )
    `
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  type RawRow = {
    id: string;
    created_at: string;
    members: {
      id: string;
      full_name: string;
      dni: string;
      email: string | null;
      status: "pending" | "active";
    } | null;
  };

  const rows = (data ?? []) as unknown as RawRow[];

  return rows
    .filter((row) => row.members)
    .map((row) => ({
      linkId: row.id,
      created_at: row.created_at,
      member: row.members as GroupMemberRow["member"],
    }));
}

export async function getGroupsForMember(memberId: string): Promise<MemberGroupRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_groups")
    .select(
      `
      id,
      created_at,
      groups (
        id,
        name,
        description
      )
    `
    )
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  type RawRow = {
    id: string;
    created_at: string;
    groups: { id: string; name: string; description: string | null } | null;
  };

  const rows = (data ?? []) as unknown as RawRow[];

  return rows
    .filter((row) => row.groups)
    .map((row) => ({
      linkId: row.id,
      created_at: row.created_at,
      group: row.groups as MemberGroupRow["group"],
    }));
}

export async function addMemberToGroup(memberId: string, groupId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("member_groups").insert({ member_id: memberId, group_id: groupId });

  if (error) {
    throw error;
  }
}

export async function removeMemberFromGroup(memberId: string, groupId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("member_groups")
    .delete()
    .eq("member_id", memberId)
    .eq("group_id", groupId);

  if (error) {
    throw error;
  }
}

export async function listAllGroupsForSelect(): Promise<Pick<GroupRow, "id" | "name">[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Pick<GroupRow, "id" | "name">[];
}
