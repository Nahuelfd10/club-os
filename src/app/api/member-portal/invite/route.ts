import { NextResponse } from "next/server";

import { fallbackClubConfig } from "@/config/active-club";
import { sendPasswordResetEmail } from "@/lib/email";
import { memberAuthEmailFromDni } from "@/lib/member-auth";
import { clubPath } from "@/lib/routes";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getServerSupabase } from "@/lib/supabase/server";

function resetPasswordUrl(origin: string, slug: string, tokenHash: string) {
  const url = new URL(clubPath("reset-password", slug), origin);
  url.searchParams.set("access", "socios");
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "recovery");
  return url.toString();
}

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, status")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (profileError || !profile || !["club_admin", "secretary", "treasurer"].includes(profile.role)) {
    return NextResponse.json({ error: "No tenes permisos para invitar socios." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { member_id?: string; email?: string; slug?: string } | null;
  const memberId = body?.member_id?.trim();
  const slug = body?.slug?.trim() || "ventarron";

  if (!memberId) {
    return NextResponse.json({ error: "Falta socio." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: member, error: memberError } = await admin
    .from("members")
    .select("id, full_name, dni, email")
    .eq("id", memberId)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json({ error: memberError?.message || "Socio no encontrado." }, { status: 404 });
  }

  if (!member.email) {
    return NextResponse.json({ error: "Carga un email real para enviar el acceso." }, { status: 400 });
  }

  const authEmail = memberAuthEmailFromDni(member.dni, slug);
  const temporaryPassword = crypto.randomUUID();
  let authUserId: string | null = null;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: authEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      club_slug: slug,
      dni: member.dni,
      real_email: member.email,
      full_name: member.full_name,
    },
  });

  if (created.user) {
    authUserId = created.user.id;
  } else if (createError?.message?.toLowerCase().includes("already")) {
    const { data: users } = await admin.auth.admin.listUsers();
    authUserId = users.users.find((item) => item.email?.toLowerCase() === authEmail)?.id ?? null;
  } else if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  if (!authUserId) {
    return NextResponse.json({ error: "No se pudo encontrar o crear el usuario Auth del socio." }, { status: 500 });
  }

  const { error: upsertError } = await admin.from("user_profiles").upsert(
    {
      auth_user_id: authUserId,
      role: "member",
      member_id: memberId,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "auth_user_id" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: authEmail,
    options: {
      redirectTo: `${origin}${clubPath("reset-password", slug)}?access=socios`,
    },
  });

  if (linkError || !linkData.properties?.hashed_token) {
    return NextResponse.json({ error: linkError?.message || "No se pudo generar el enlace de acceso." }, { status: 400 });
  }

  await sendPasswordResetEmail({
    to: member.email,
    name: member.full_name,
    resetUrl: resetPasswordUrl(origin, slug, linkData.properties.hashed_token),
    clubName: fallbackClubConfig.name,
  });

  return NextResponse.json({ ok: true });
}
