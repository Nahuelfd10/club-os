import { NextResponse, type NextRequest } from "next/server";

import { getActiveProfileByAuthUser, profileIsInternal } from "@/lib/authz";
import { adminPath, clubPath } from "@/lib/routes";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

/**
 * Middleware raiz: refresca la sesion Supabase, empuja las URLs canonicas
 * por club (`/{club}`) y protege server-side el panel admin.
 */
export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSupabaseSession(request);

  const { pathname } = request.nextUrl;
  const canonicalClubRoot = clubPath();
  const canonicalClubSlug = canonicalClubRoot.replace(/^\//, "");
  const canonicalLogin = clubPath("login");
  const canonicalAdminLogin = clubPath("admin/login");
  const canonicalAdmin = adminPath();
  const canonicalMemberPortal = clubPath("socio");
  const canonicalMemberLogin = clubPath("socio/login");
  const isInternalRewrite = request.headers.get("x-clubos-internal-rewrite") === "1";

  const withSessionCookies = (nextResponse: NextResponse) => {
    response.cookies.getAll().forEach((cookie) => {
      nextResponse.cookies.set(cookie);
    });
    return nextResponse;
  };

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return withSessionCookies(NextResponse.redirect(url));
  };

  const rewriteTo = (path: string, searchParams?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-clubos-internal-rewrite", "1");
    url.pathname = path;
    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return withSessionCookies(
      NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      })
    );
  };

  if (isInternalRewrite) {
    return response;
  }

  if (pathname === "/admin/login") {
    return response;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return redirectTo(`${canonicalClubRoot}${pathname}`);
  }

  // Compatibilidad con rutas viejas del MVP.
  if (pathname === "/club" || pathname.startsWith("/club/")) {
    return redirectTo(`${canonicalClubRoot}${pathname.slice("/club".length)}`);
  }

  if (pathname === "/login") {
    return redirectTo(canonicalLogin);
  }

  const isClubRoute = pathname === canonicalClubRoot || pathname.startsWith(`${canonicalClubRoot}/`);
  const isLoginRoute = pathname === canonicalLogin;
  const isAdminLoginRoute = pathname === canonicalAdminLogin;
  const isMemberLoginRoute = pathname === canonicalMemberLogin;
  const isAdminArea = pathname === canonicalAdmin || pathname.startsWith(`${canonicalAdmin}/`);
  const isMemberPortal =
    pathname === canonicalMemberPortal ||
    (pathname.startsWith(`${canonicalMemberPortal}/`) && !isMemberLoginRoute);
  const profile =
    user && supabase
      ? await getActiveProfileByAuthUser(supabase, user.id).catch(() => null)
      : null;
  const isInternalUser = profileIsInternal(profile);
  const hasMemberPortal = Boolean(profile?.member_id);

  if ((isAdminLoginRoute || isMemberLoginRoute || isLoginRoute) && user) {
    if (isAdminLoginRoute && isInternalUser) {
      return redirectTo(canonicalAdmin);
    }
    if (isMemberLoginRoute && hasMemberPortal) {
      return redirectTo(canonicalMemberPortal);
    }
    if (isMemberLoginRoute && isInternalUser) {
      return redirectTo(canonicalAdmin);
    }
    if (isLoginRoute && isInternalUser) {
      return redirectTo(canonicalAdmin);
    }
    if (hasMemberPortal) {
      return redirectTo(canonicalMemberPortal);
    }
    return response;
  }

  if (isAdminArea && !isAdminLoginRoute && !user) {
    return redirectTo(canonicalAdminLogin);
  }

  if (isAdminArea && !isAdminLoginRoute && user && !isInternalUser) {
    return redirectTo(hasMemberPortal ? canonicalMemberPortal : canonicalLogin);
  }

  if (isMemberPortal && !isMemberLoginRoute && !user) {
    return redirectTo(canonicalMemberLogin);
  }

  if (isMemberPortal && !isMemberLoginRoute && user && !hasMemberPortal) {
    return redirectTo(isInternalUser ? canonicalAdmin : canonicalLogin);
  }

  if (isClubRoute) {
    const clubSuffix = pathname.slice(canonicalClubRoot.length);

    if (isAdminLoginRoute) {
      return rewriteTo("/admin/login", { clubos_login: "admin", clubos_slug: canonicalClubSlug });
    }

    if (isMemberLoginRoute) {
      return rewriteTo("/admin/login", { clubos_login: "member", clubos_slug: canonicalClubSlug });
    }

    if (isAdminArea) {
      return rewriteTo(`/admin${pathname.slice(canonicalAdmin.length)}`);
    }

    if (isLoginRoute) {
      return rewriteTo("/admin/login", { clubos_login: "club", clubos_slug: canonicalClubSlug });
    }

    if (isMemberPortal) {
      return rewriteTo(`/socio${pathname.slice(canonicalMemberPortal.length)}`);
    }

    return rewriteTo(`/club${clubSuffix}`);
  }

  return response;
}

export const config = {
  // Aplicamos a todo salvo assets estaticos y rutas internas de Next.
  // El matcher excluye /_next/, archivos con extension y la API de imagen.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)"],
};
