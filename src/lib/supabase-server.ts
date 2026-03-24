import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
