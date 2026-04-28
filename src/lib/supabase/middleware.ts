import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase";

/**
 * Refresca la sesión de Supabase en cada request y permite a las rutas
 * protegidas decidir si redirigir al login según el estado de auth.
 *
 * Devuelve `{ response, user }`:
 *   - `response`: NextResponse mutable con cookies actualizadas (debe
 *     retornarse o servir como base para una redirección).
 *   - `user`: usuario activo o null.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Sin envs no podemos validar la sesión; devolvemos la response tal cual
    // y dejamos que el código aguas abajo decida.
    return { response, user: null };
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
