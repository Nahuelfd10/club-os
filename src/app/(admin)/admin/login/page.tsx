"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ClubLogo } from "@/components/club-logo";
import { Button, Card, FormField, Input } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { adminPath, clubPath } from "@/lib/routes";
import { authEmailFromIdentifier, isEmailIdentifier } from "@/lib/member-auth";
import { getCurrentUserProfile, isInternalClubRole } from "@/lib/supabase";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useClubRoutes } from "@/lib/use-club-routes";

type LoginMode = "admin" | "member" | "club";

const loginCopy: Record<
  LoginMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    identifierLabel: string;
    identifierPlaceholder: string;
    resetLabel: string;
    resetPlaceholder: string;
    recoveryMessage: string;
    submitLabel: string;
  }
> = {
  admin: {
    eyebrow: "Acceso comision",
    title: "Ingresar al panel del club",
    description: "Tesoreria, secretaria y administracion ingresan con el email de su cuenta.",
    identifierLabel: "Email",
    identifierPlaceholder: "admin@club.com",
    resetLabel: "Email",
    resetPlaceholder: "admin@club.com",
    recoveryMessage: "Si existe una cuenta con ese email, enviamos un enlace para cambiar la contrasena.",
    submitLabel: "Ingresar al admin",
  },
  member: {
    eyebrow: "Acceso socios",
    title: "Ingresar a mi perfil",
    description: "Los socios ingresan con DNI. Si sos parte de la comision y tenes ficha de socio, tambien podes usar tu email.",
    identifierLabel: "DNI",
    identifierPlaceholder: "DNI del socio",
    resetLabel: "DNI",
    resetPlaceholder: "DNI del socio",
    recoveryMessage: "Si existe una cuenta con ese DNI, enviamos un enlace para cambiar la contrasena.",
    submitLabel: "Ingresar a mi perfil",
  },
  club: {
    eyebrow: "Acceso al club",
    title: "Ingresar a Club OS",
    description: "Socios ingresan con DNI. Comision y tesoreria ingresan con email.",
    identifierLabel: "DNI o email",
    identifierPlaceholder: "DNI del socio o email del club",
    resetLabel: "DNI o email",
    resetPlaceholder: "DNI del socio o email del club",
    recoveryMessage: "Si existe una cuenta con ese DNI o email, enviamos un enlace para cambiar la contrasena.",
    submitLabel: "Ingresar",
  },
};

export default function AdminLoginPage() {
  const { config, isConfigLoading } = useActiveClubConfig();
  const routes = useClubRoutes();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get("clubos_login");
  const isPlatformLogin = pathname === "/admin/login" && !requestedMode;
  const mode: LoginMode =
    requestedMode === "admin" || requestedMode === "member" || requestedMode === "club"
      ? requestedMode
      : "club";
  const activeSlug = searchParams.get("clubos_slug") || routes.slug;
  const copy = loginCopy[mode];
  const [identifier, setIdentifier] = useState("");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const routeError = searchParams.get("error");

  const alternateAccess = useMemo(() => {
    if (mode === "admin") {
      return { href: clubPath("socio/login", activeSlug), label: "Soy socio" };
    }
    if (mode === "member") {
      return { href: clubPath("admin/login", activeSlug), label: "Soy de comision" };
    }
    return null;
  }, [activeSlug, mode]);

  const redirectAfterLogin = async () => {
    const profile = await getCurrentUserProfile();

    if (!profile) {
      setErrorMessage("Tu usuario no tiene un perfil activo en este club.");
      await getBrowserSupabase().auth.signOut();
      return;
    }

    const isInternal = isInternalClubRole(profile.role);
    const hasMemberPortal = Boolean(profile.member_id);

    if (mode === "member") {
      if (hasMemberPortal) {
        router.replace(clubPath("socio", activeSlug));
        router.refresh();
        return;
      }
      if (isInternal) {
        router.replace(adminPath("", activeSlug));
        router.refresh();
        return;
      }
    }

    if (isInternal) {
      router.replace(adminPath("", activeSlug));
      router.refresh();
      return;
    }

    if (hasMemberPortal) {
      router.replace(clubPath("socio", activeSlug));
      router.refresh();
      return;
    }

    setErrorMessage("Tu usuario no tiene acceso al portal de socio.");
    await getBrowserSupabase().auth.signOut();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const trimmedIdentifier = identifier.trim();
      if (mode === "admin" && !isEmailIdentifier(trimmedIdentifier)) {
        setErrorMessage("Para el panel del club ingresa con el email de tu cuenta.");
        return;
      }

      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmailFromIdentifier(trimmedIdentifier, activeSlug),
        password,
      });

      if (error) {
        const friendly =
          error.status === 400 || error.message.toLowerCase().includes("invalid login")
            ? "Credenciales incorrectas."
            : error.message;
        setErrorMessage(friendly);
        return;
      }

      await redirectAfterLogin();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "No se pudo iniciar sesion.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetMessage(null);
    setErrorMessage(null);
    setIsResetting(true);

    try {
      const trimmedIdentifier = resetIdentifier.trim();
      if (mode === "admin" && !isEmailIdentifier(trimmedIdentifier)) {
        setErrorMessage("Para recuperar acceso al panel, ingresa el email de tu cuenta.");
        return;
      }
      if (mode === "member" && isEmailIdentifier(trimmedIdentifier)) {
        setErrorMessage("Para recuperar acceso de socio, ingresa tu DNI.");
        return;
      }

      const response = await fetch("/api/auth/member-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmedIdentifier, slug: activeSlug }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo iniciar la recuperacion.");
      }
      setResetMessage(copy.recoveryMessage);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo iniciar la recuperacion.");
    } finally {
      setIsResetting(false);
    }
  };

  if (isPlatformLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <Card className="w-full max-w-sm border-white/10 bg-white p-6 text-slate-950">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">CLUBOS</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Admin de plataforma</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Este acceso queda reservado para administrar clubes desde CLUBOS. Para operar un club, entra desde su URL.
            </p>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center">
          <ClubLogo
            src={config.logo}
            alt={isConfigLoading ? "Logo del club" : `Logo de ${config.name}`}
            className="h-12 w-auto max-h-12 max-w-[200px]"
          />
          <p className="mt-3 text-lg font-bold text-slate-900">
            {isConfigLoading ? "Cargando..." : config.name}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-primary/60">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{copy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField htmlFor="identifier" label={copy.identifierLabel}>
            <Input
              id="identifier"
              name="identifier"
              type={mode === "admin" ? "email" : "text"}
              inputMode={mode === "member" ? "numeric" : "text"}
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
              disabled={isLoading}
              placeholder={copy.identifierPlaceholder}
            />
          </FormField>

          <FormField htmlFor="password" label="Contrasena">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isLoading}
            />
          </FormField>

          <Button type="submit" disabled={isLoading} fullWidth variant="primary" size="lg">
            {isLoading ? "Ingresando..." : copy.submitLabel}
          </Button>
        </form>

        {errorMessage || routeError ? (
          <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {errorMessage || routeError}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowReset((prev) => !prev)}
            className="text-sm font-semibold text-primary hover:text-primary/80"
          >
            Olvide mi contrasena
          </button>
          {alternateAccess ? (
            <Link href={alternateAccess.href} className="text-sm font-semibold text-slate-600 hover:text-slate-950">
              {alternateAccess.label}
            </Link>
          ) : null}
        </div>

        {showReset ? (
          <form onSubmit={handleReset} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <FormField htmlFor="reset_identifier" label={copy.resetLabel}>
              <Input
                id="reset_identifier"
                type={mode === "admin" ? "email" : "text"}
                inputMode={mode === "member" ? "numeric" : "text"}
                value={resetIdentifier}
                onChange={(event) => setResetIdentifier(event.target.value)}
                required
                disabled={isResetting}
                placeholder={copy.resetPlaceholder}
              />
            </FormField>
            <Button type="submit" variant="neutral" size="md" fullWidth disabled={isResetting}>
              {isResetting ? "Enviando..." : "Enviar recuperacion"}
            </Button>
            {resetMessage ? <p className="text-xs leading-5 text-slate-600">{resetMessage}</p> : null}
          </form>
        ) : null}
      </Card>
    </main>
  );
}
