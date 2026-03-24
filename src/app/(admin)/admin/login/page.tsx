"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Card, FormField, Input } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const isValid = username === "admin" && password === "1234";
      if (!isValid) {
        setErrorMessage("Credenciales incorrectas.");
        return;
      }

      localStorage.setItem("isAdminLogged", "true");
      window.dispatchEvent(new Event("admin-auth-change"));
      router.replace("/admin");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--club-primary)" }}>
          Login Admin
        </h1>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FormField htmlFor="username" label="Usuario">
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              disabled={isLoading}
            />
          </FormField>

          <FormField htmlFor="password" label="Contraseña">
            <Input
              id="password"
              type="password"
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
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}
      </Card>
    </main>
  );
}
