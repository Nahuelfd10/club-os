import { NextResponse } from "next/server";

import { fallbackClubConfig } from "@/config/active-club";
import { sendPasswordResetEmail } from "@/lib/email";
import { isEmailIdentifier, memberAuthEmailFromDni, normalizeDni } from "@/lib/member-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type ResetPayload = {
  dni?: string;
  identifier?: string;
  slug?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ResetPayload | null;
  const identifier = String(payload?.identifier ?? payload?.dni ?? "").trim();
  const slug = payload?.slug?.trim() || "ventarron";

  if (!identifier) {
    return NextResponse.json({ error: "Ingresa DNI o email." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const origin = new URL(request.url).origin;
  let authEmail: string;
  let destinationEmail: string | null = null;
  let name = "usuario";

  if (isEmailIdentifier(identifier)) {
    authEmail = identifier.toLowerCase();
    destinationEmail = authEmail;
  } else {
    const dni = normalizeDni(identifier);

    if (!dni) {
      return NextResponse.json({ error: "Ingresa DNI o email." }, { status: 400 });
    }

    const { data: member } = await admin
      .from("members")
      .select("id, full_name, email, dni")
      .eq("dni", dni)
      .maybeSingle();

    if (!member?.email) {
      return NextResponse.json({ ok: true });
    }

    authEmail = memberAuthEmailFromDni(dni, slug);
    destinationEmail = member.email;
    name = member.full_name;
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: authEmail,
    options: {
      redirectTo: `${origin}/${slug}/reset-password`,
    },
  });

  if (error || !data.properties?.action_link || !destinationEmail) {
    return NextResponse.json({ ok: true });
  }

  await sendPasswordResetEmail({
    to: destinationEmail,
    name,
    resetUrl: data.properties.action_link,
    clubName: fallbackClubConfig.name,
  });

  return NextResponse.json({ ok: true });
}
