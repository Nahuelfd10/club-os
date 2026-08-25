import { NextResponse } from "next/server";

import { memberAuthEmailFromDni, normalizeDni } from "@/lib/member-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type RegisterPayload = {
  full_name?: string;
  email?: string;
  dni?: string;
  address?: string;
  city?: string;
  phone?: string;
  password?: string;
  slug?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as RegisterPayload | null;

  const fullName = payload?.full_name?.trim() ?? "";
  const realEmail = payload?.email?.trim().toLowerCase() ?? "";
  const dni = normalizeDni(payload?.dni ?? "");
  const address = payload?.address?.trim() ?? "";
  const city = payload?.city?.trim() || null;
  const phone = payload?.phone?.trim() || null;
  const password = payload?.password ?? "";
  const slug = payload?.slug?.trim() || "ventarron";

  if (!fullName || !realEmail || !dni || !address || !password) {
    return jsonError("Completa nombre, DNI, email, domicilio y contraseña.");
  }

  if (password.length < 8) {
    return jsonError("La contraseña debe tener al menos 8 caracteres.");
  }

  const admin = getSupabaseAdminClient();
  const authEmail = memberAuthEmailFromDni(dni, slug);

  const { data: existingMember, error: existingMemberError } = await admin
    .from("members")
    .select("id")
    .eq("dni", dni)
    .maybeSingle();

  if (existingMemberError) {
    return jsonError(existingMemberError.message, 500);
  }

  if (existingMember) {
    return jsonError(`Ya hay un socio registrado con el DNI ${dni}.`, 409);
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      club_slug: slug,
      dni,
      real_email: realEmail,
      full_name: fullName,
    },
  });

  if (authError || !authData.user) {
    const message = authError?.message?.toLowerCase().includes("already")
      ? "Ya existe un acceso creado para este DNI."
      : authError?.message || "No se pudo crear el acceso del socio.";
    return jsonError(message, 400);
  }

  const { data: memberData, error: memberError } = await admin
    .from("members")
    .insert({
      full_name: fullName,
      email: realEmail,
      dni,
      address,
      city,
      phone,
      status: "pending",
    })
    .select("id")
    .single();

  if (memberError || !memberData) {
    await admin.auth.admin.deleteUser(authData.user.id).catch(() => null);
    return jsonError(memberError?.message || "No se pudo crear la solicitud de socio.", 400);
  }

  const { error: profileError } = await admin.from("user_profiles").insert({
    auth_user_id: authData.user.id,
    role: "member",
    member_id: memberData.id,
    status: "active",
  });

  if (profileError) {
    await admin.from("members").delete().eq("id", memberData.id);
    await admin.auth.admin.deleteUser(authData.user.id).catch(() => null);
    return jsonError(profileError.message, 400);
  }

  return NextResponse.json({ ok: true, member_id: memberData.id });
}
