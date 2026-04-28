import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient, type Database } from "@/lib/supabase";

/**
 * Alias explícito para uso desde código que sólo corre en el browser
 * (login, sign-out, formularios admin). Internamente llama a
 * `getSupabaseClient()`, que en browser instancia un `createBrowserClient`
 * con cookies SSR. Lo dejamos como helper separado para que la intención
 * "este código necesita la sesión del usuario" quede explícita en el sitio
 * de uso.
 */
export function getBrowserSupabase(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error(
      "getBrowserSupabase() sólo puede invocarse en el browser. Para server components usá getServerSupabase()."
    );
  }
  return getSupabaseClient();
}
