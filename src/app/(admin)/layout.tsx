import { AdminShell } from "@/components/admin/admin-shell";
import { getActiveProfileByAuthUser, profileIsInternal } from "@/lib/authz";
import { clubPath, commissionLoginPath } from "@/lib/routes";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Layout server-side del panel admin.
 *
 * Trabaja en conjunto con `src/middleware.ts`:
 *   - El middleware ya bloquea rutas admin sin sesión y redirige al login
 *     a usuarios no autenticados.
 *   - Acá hacemos un segundo chequeo (defense-in-depth) y, según haya
 *     sesión o no, decidimos si envolver con `AdminShell` (panel completo)
 *     o renderizar children pelados (caso típico: /admin/login).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: el middleware ya envió aquí al usuario por la ruta de login.
  // No envolvemos con `AdminShell` para evitar referenciar contexto autenticado.
  if (!user) {
    return <>{children}</>;
  }

  const profile = await getActiveProfileByAuthUser(supabase, user.id).catch(() => null);

  if (!profile || !profileIsInternal(profile)) {
    if (profile?.member_id) {
      redirect(clubPath("socio"));
    }
    redirect(commissionLoginPath());
  }

  return <AdminShell profile={profile} userEmail={user.email ?? null}>{children}</AdminShell>;
}
