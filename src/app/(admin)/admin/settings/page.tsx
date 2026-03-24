"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { getActiveClubConfig } from "@/config/active-club";
import {
  getClubSettings,
  updateClubSettingsById,
  type ClubSettings,
} from "@/lib/supabase";
import { uiMessages } from "@/lib/ui-messages";

export default function AdminSettingsPage() {
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getClubSettings();
        if (settings) {
          setClubSettings(settings);
          return;
        }

        const config = await getActiveClubConfig();
        setClubSettings({
          id: "",
          name: config.name,
          monthly_fee: config.monthly_fee,
          primary_color: config.primary_color,
          accent_color: config.accent_color,
          send_payment_confirmation_email: false,
        });
      } catch (error) {
        console.error("Error al cargar configuracion:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      if (!clubSettings?.id) {
        console.error("No hay ID de configuración");
        setMessage(uiMessages.settings.noConfigId);
        return;
      }

      console.log("Updating config ID:", clubSettings.id);
      await updateClubSettingsById(clubSettings.id, {
        name: clubSettings.name,
        monthly_fee: clubSettings.monthly_fee,
        primary_color: clubSettings.primary_color,
        accent_color: clubSettings.accent_color,
        send_payment_confirmation_email: clubSettings.send_payment_confirmation_email,
      });
      setMessage(uiMessages.settings.saveSuccess);
    } catch (error) {
      console.error("Error al guardar configuracion:", error);
      setMessage(error instanceof Error ? error.message : uiMessages.settings.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-600">Cargando configuracion...</p>
        </div>
      </main>
    );
  }

  if (!clubSettings) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--club-primary)" }}>
            Configuracion del club
          </h1>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <Link
              href="/admin/socios"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Socios
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Nombre
            </label>
            <input
              id="name"
              value={clubSettings.name}
              onChange={(event) =>
                setClubSettings((prev) => (prev ? { ...prev, name: event.target.value } : prev))
              }
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="monthly_fee" className="text-sm font-medium text-slate-700">
              Cuota mensual
            </label>
            <input
              id="monthly_fee"
              type="number"
              min="0"
              value={clubSettings.monthly_fee}
              onChange={(event) =>
                setClubSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        monthly_fee: Number(event.target.value) || 0,
                      }
                    : prev
                )
              }
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="primary_color" className="text-sm font-medium text-slate-700">
              Color primario
            </label>
            <input
              id="primary_color"
              type="color"
              value={clubSettings.primary_color}
              onChange={(event) =>
                setClubSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        primary_color: event.target.value,
                      }
                    : prev
                )
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 py-1"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="accent_color" className="text-sm font-medium text-slate-700">
              Color de acento
            </label>
            <input
              id="accent_color"
              type="color"
              value={clubSettings.accent_color}
              onChange={(event) =>
                setClubSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        accent_color: event.target.value,
                      }
                    : prev
                )
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 py-1"
            />
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <input
              type="checkbox"
              checked={clubSettings.send_payment_confirmation_email}
              onChange={(event) =>
                setClubSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        send_payment_confirmation_email: event.target.checked,
                      }
                    : prev
                )
              }
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-700">Enviar email automático al registrar pagos</span>
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Guardando..." : "Guardar configuracion"}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
        ) : null}
      </div>
    </main>
  );
}
