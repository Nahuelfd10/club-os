import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

/**
 * Middleware raíz: refresca la sesión Supabase y protege server-side
 * todas las rutas bajo `/admin` excepto `/admin/login`.
 *
 * Si un usuario sin sesión intenta acceder al panel, lo redirigimos al
 * login. Si un usuario ya autenticado entra al login, lo mandamos al
 * dashboard. Esto evita que la verificación quede sólo en el cliente
 * (riesgo histórico: localStorage).
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminArea && !isLoginRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && user) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";
    return NextResponse.redirect(adminUrl);
  }

  return response;
}

export const config = {
  // Aplicamos a todo salvo assets estáticos y rutas internas de Next.
  // El matcher excluye /_next/, archivos con extensión y la API de imagen.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)"],
};
