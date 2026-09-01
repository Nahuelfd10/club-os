"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ClubLogo } from "@/components/club-logo";
import { Button, Card, FormField, Input } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { commissionLoginPath, memberLoginPath } from "@/lib/routes";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useClubRoutes } from "@/lib/use-club-routes";

function urlParam(params: URLSearchParams, hashParams: URLSearchParams, key: string) {
  return params.get(key) ?? hashParams.get(key);
}

function resetLinkErrorMessage(errorCode: string | null, description: string | null) {
  if (errorCode === "otp_expired" || description?.toLowerCase().includes("expired")) {
    return "El enlace para cambiar la contrasena vencio o ya fue usado. Pedi uno nuevo desde el login.";
  }

  return "No pudimos validar este enlace. Pedi uno nuevo desde el login.";
}

export function ResetPasswordPage() {
  const { config, isConfigLoading } = useActiveClubConfig();
  const routes = useClubRoutes();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isPreparing, setIsPreparing] = useState(true);
  const [canUpdatePassword, setCanUpdatePassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState(memberLoginPath(routes.slug));

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const code = urlParam(params, hashParams, "code");
    const tokenHash = urlParam(params, hashParams, "token_hash");
    const access = urlParam(params, hashParams, "access");
    const linkError = urlParam(params, hashParams, "error");
    const linkErrorCode = urlParam(params, hashParams, "error_code");
    const linkErrorDescription = urlParam(params, hashParams, "error_description");
    let cancelled = false;

    setReturnPath(access === "comision" ? commissionLoginPath(routes.slug) : memberLoginPath(routes.slug));

    const preparePasswordReset = async () => {
      setIsPreparing(true);
      setErrorMessage(null);

      if (linkError) {
        setCanUpdatePassword(false);
        setErrorMessage(resetLinkErrorMessage(linkErrorCode, linkErrorDescription));
        setIsPreparing(false);
        return;
      }

      const supabase = getBrowserSupabase();
      const result = tokenHash
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        : code
          ? await supabase.auth.exchangeCodeForSession(code)
          : await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      const session = "data" in result ? result.data.session : null;
      if (result.error || !session) {
        setCanUpdatePassword(false);
        setErrorMessage("No pudimos validar este enlace. Pedi uno nuevo desde el login.");
      } else {
        setCanUpdatePassword(true);
      }

      setIsPreparing(false);
    };

    void preparePasswordReset();
    return () => {
      cancelled = true;
    };
  }, [routes.slug]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (!canUpdatePassword) {
      setErrorMessage("No pudimos validar este enlace. Pedi uno nuevo desde el login.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("Las contrasenas no coinciden.");
      return;
    }

    setIsSaving(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }
      await supabase.auth.signOut();
      setMessage("Contrasena actualizada. Ya podes volver a iniciar sesion.");
      setTimeout(() => {
        router.replace(returnPath);
      }, 1200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar la contrasena.");
    } finally {
      setIsSaving(false);
    }
  };

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
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Nueva contrasena</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Elegi una contrasena nueva para acceder a Club OS.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField htmlFor="password" label="Contrasena">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              disabled={isPreparing || isSaving || !canUpdatePassword}
            />
          </FormField>

          <FormField htmlFor="password_confirm" label="Repetir contrasena">
            <Input
              id="password_confirm"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              required
              minLength={8}
              disabled={isPreparing || isSaving || !canUpdatePassword}
            />
          </FormField>

          <Button type="submit" fullWidth disabled={isPreparing || isSaving || !canUpdatePassword}>
            {isPreparing ? "Validando enlace..." : isSaving ? "Guardando..." : "Guardar contrasena"}
          </Button>
        </form>

        {message ? <p className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{message}</p> : null}
        {errorMessage ? (
          <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p>
        ) : null}

        <Link href={returnPath} className="mt-4 inline-block text-sm font-semibold text-primary">
          Volver al login
        </Link>
      </Card>
    </main>
  );
}
