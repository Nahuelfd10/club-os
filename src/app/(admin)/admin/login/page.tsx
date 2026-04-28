"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ClubLogo } from "@/components/club-logo";
import { Button, Card, FormField, Input } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const { config, isConfigLoading } = useActiveClubConfig();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Mensajes específicos para no exponer detalles internos pero ayudar al usuario.
        const friendly =
          error.status === 400 || error.message.toLowerCase().includes("invalid login")
            ? "Email o contraseña incorrectos."
            : error.message;
        setErrorMessage(friendly);
        return;
      }

      // El middleware ya tendrá la cookie en la próxima request.
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setIsLoading(false);
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
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Login admin</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField htmlFor="email" label="Email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isLoading}
            />
          </FormField>

          <FormField htmlFor="password" label="Contraseña">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isLoading}
            />
          </FormField>

          <Button
            type="submit"
            disabled={isLoading}
            fullWidth
            variant="primary"
            size="lg"
          >
            {isLoading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>

        {errorMessage ? (
          <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p>
        ) : null}
      </Card>
    </main>
  );
}
