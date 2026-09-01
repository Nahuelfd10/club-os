import { NextResponse } from "next/server";

import { getActiveProfileByAuthUser, profileIsInternal } from "@/lib/authz";
import { isEmailIdentifier, memberAuthEmailFromDni } from "@/lib/member-auth";
import { adminPath, commissionLoginPath, defaultClubSlug, memberLoginPath } from "@/lib/routes";
import { getServerSupabase } from "@/lib/supabase/server";

type LoginMode = "comision" | "socios";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function loginPathForMode(mode: LoginMode, slug: string) {
  return mode === "comision" ? commissionLoginPath(slug) : memberLoginPath(slug);
}

function loginWithError(request: Request, slug: string, mode: LoginMode, message: string) {
  const url = new URL(loginPathForMode(mode, slug), request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const identifier = String(formData.get("identifier") ?? formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const slug = String(formData.get("slug") ?? defaultClubSlug).trim() || defaultClubSlug;
  const rawMode = String(formData.get("mode") ?? "comision");
  const mode: LoginMode = rawMode === "socios" ? "socios" : "comision";

  if (!identifier || !password) {
    return loginWithError(request, slug, mode, "Completa las credenciales.");
  }

  if (mode === "comision" && !isEmailIdentifier(identifier)) {
    return loginWithError(request, slug, mode, "Para el panel del club ingresa con el email de tu cuenta.");
  }

  if (mode === "socios" && isEmailIdentifier(identifier)) {
    return loginWithError(request, slug, mode, "Para el portal de socio ingresa con tu DNI.");
  }

  const supabase = await getServerSupabase();
  const authEmail = mode === "comision" ? identifier.toLowerCase() : memberAuthEmailFromDni(identifier, slug);
  const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password });

  if (error || !data.user) {
    return loginWithError(request, slug, mode, "Credenciales incorrectas.");
  }

  const profile = await getActiveProfileByAuthUser(supabase, data.user.id).catch(() => null);

  if (!profile) {
    await supabase.auth.signOut();
    return loginWithError(request, slug, mode, "Tu usuario no tiene un perfil activo en este club.");
  }

  if (mode === "comision") {
    if (profileIsInternal(profile)) {
      return redirectTo(request, adminPath("", slug));
    }

    await supabase.auth.signOut();
    return loginWithError(request, slug, mode, "Tu usuario no tiene acceso al panel del club.");
  }

  if (profile.member_id) {
    return redirectTo(request, `/${slug}/socio`);
  }

  await supabase.auth.signOut();
  return loginWithError(request, slug, mode, "Tu usuario no tiene acceso al portal de socio.");
}
