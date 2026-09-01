import { NextResponse } from "next/server";

import { fallbackClubConfig } from "@/config/active-club";
import { sendPasswordResetEmail } from "@/lib/email";
import { isEmailIdentifier, memberAuthEmailFromDni, normalizeDni } from "@/lib/member-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type ResetMode = "comision" | "socios";

type ResetPayload = {
  dni?: string;
  identifier?: string;
  slug?: string;
  mode?: string;
};

function resetPasswordUrl(origin: string, slug: string, mode: ResetMode, tokenHash: string) {
  const url = new URL(`/${slug}/reset-password`, origin);
  url.searchParams.set("access", mode);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "recovery");
  return url.toString();
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ResetPayload | null;
  const identifier = String(payload?.identifier ?? payload?.dni ?? "").trim();
  const slug = payload?.slug?.trim() || "ventarron";
  const mode: ResetMode = payload?.mode === "comision" ? "comision" : "socios";

  if (!identifier) {
    return NextResponse.json({ error: mode === "comision" ? "Ingresa email." : "Ingresa DNI." }, { status: 400 });
  }

  if (mode === "comision" && !isEmailIdentifier(identifier)) {
    return NextResponse.json({ error: "Para recuperar acceso al panel, ingresa el email de tu cuenta." }, { status: 400 });
  }

  if (mode === "socios" && isEmailIdentifier(identifier)) {
    return NextResponse.json({ error: "Para recuperar acceso de socio, ingresa tu DNI." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const origin = new URL(request.url).origin;
  let authEmail: string;
  let destinationEmail: string | null = null;
  let name = "usuario";

  if (mode === "comision") {
    authEmail = identifier.toLowerCase();
    destinationEmail = authEmail;
  } else {
    const dni = normalizeDni(identifier);

    if (!dni) {
      return NextResponse.json({ error: "Ingresa DNI." }, { status: 400 });
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
      redirectTo: `${origin}/${slug}/reset-password?access=${mode}`,
    },
  });

  if (error || !data.properties?.hashed_token || !destinationEmail) {
    return NextResponse.json({ ok: true });
  }

  await sendPasswordResetEmail({
    to: destinationEmail,
    name,
    resetUrl: resetPasswordUrl(origin, slug, mode, data.properties.hashed_token),
    clubName: fallbackClubConfig.name,
  });

  return NextResponse.json({ ok: true });
}
