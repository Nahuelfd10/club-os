"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--club-primary)" }}>
          Login Admin
        </h1>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1">
            <label htmlFor="username" className="text-sm font-medium text-slate-700">
              Usuario
            </label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: "var(--club-primary)" }}
          >
            {isLoading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}
      </div>
    </main>
  );
}
