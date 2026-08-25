import { NextResponse } from "next/server";

import { getActiveProfileByAuthUser, profileIsInternal } from "@/lib/authz";
import { authEmailFromIdentifier } from "@/lib/member-auth";
import { adminPath, clubPath, defaultClubSlug } from "@/lib/routes";
import { getServerSupabase } from "@/lib/supabase/server";

type LoginMode = "admin" | "member" | "club";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function loginPathForMode(mode: LoginMode, slug: string) {
  if (mode === "admin") return clubPath("admin/login", slug);
  if (mode === "member") return clubPath("socio/login", slug);
  return clubPath("login", slug);
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
  const rawMode = String(formData.get("mode") ?? "club");
  const mode: LoginMode = rawMode === "admin" || rawMode === "member" ? rawMode : "club";

  if (!identifier || !password) {
    return loginWithError(request, slug, mode, "Completa las credenciales.");
  }

  const supabase = await getServerSupabase();
  const authEmail = authEmailFromIdentifier(identifier, slug);
  const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password });

  if (error || !data.user) {
    return loginWithError(request, slug, mode, "Credenciales incorrectas.");
  }

  const profile = await getActiveProfileByAuthUser(supabase, data.user.id).catch(() => null);

  if (!profile) {
    await supabase.auth.signOut();
    return loginWithError(request, slug, mode, "Tu usuario no tiene un perfil activo en este club.");
  }

  if (mode === "member" && profile.member_id) {
    return redirectTo(request, clubPath("socio", slug));
  }

  if (profileIsInternal(profile)) {
    return redirectTo(request, adminPath("", slug));
  }

  if (profile.member_id) {
    return redirectTo(request, clubPath("socio", slug));
  }

  await supabase.auth.signOut();
  return loginWithError(request, slug, mode, "Tu usuario no tiene acceso al portal de socio.");
}
