"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";

const hasAdminSession = () => {
  return localStorage.getItem("isAdminLogged") === "true";
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === "/admin/login";
  const [authState, setAuthState] = useState<boolean | null>(null);

  useEffect(() => {
    const syncAuth = () => {
      setAuthState(hasAdminSession());
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("admin-auth-change", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("admin-auth-change", syncAuth);
    };
  }, []);

  useEffect(() => {
    if (authState === null) {
      return;
    }

    if (!isLoginRoute && !authState) {
      router.replace("/admin/login");
      return;
    }

    if (isLoginRoute && authState) {
      router.replace("/admin");
    }
  }, [authState, isLoginRoute, router]);

  const shouldBlockContent =
    authState === null || (!isLoginRoute && !authState) || (isLoginRoute && authState);

  if (shouldBlockContent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-sm text-slate-600">Verificando acceso...</p>
      </main>
    );
  }

  if (isLoginRoute) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
