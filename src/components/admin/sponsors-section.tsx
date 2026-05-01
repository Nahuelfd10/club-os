"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";

import { AdminModal } from "@/components/admin/admin-modal";
import { Alert, Button, FormField, Input } from "@/components/ui";
import {
  createSponsor,
  deleteSponsor,
  listAdminSponsors,
  validateSponsorLogoFile,
  type SponsorRow,
} from "@/lib/sponsors";

export function SponsorsSection() {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const rows = await listAdminSponsors();
      setSponsors(rows);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron cargar los sponsors."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setFormName("");
    setFormUrl("");
    setFormFile(null);
    setFormError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const closeModal = () => {
    if (!isSaving) {
      setModalOpen(false);
      resetForm();
    }
  };

  const openCreate = () => {
    resetForm();
    setActionMessage(null);
    setModalOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setFormFile(null);
      return;
    }
    const validation = validateSponsorLogoFile(file);
    if (validation) {
      setFormError(validation);
      setFormFile(null);
      event.target.value = "";
      return;
    }
    setFormError(null);
    setFormFile(file);
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    if (!formFile) {
      setFormError("Subí el logo del sponsor.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      await createSponsor({ name, url: formUrl, file: formFile });
      setActionMessage(`Sponsor "${name}" agregado.`);
      setModalOpen(false);
      resetForm();
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo crear el sponsor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (sponsor: SponsorRow) => {
    const ok = window.confirm(
      `¿Eliminar el sponsor "${sponsor.name}"? Se borra también el logo del bucket.`
    );
    if (!ok) return;

    setDeletingId(sponsor.id);
    setActionMessage(null);
    try {
      await deleteSponsor({ id: sponsor.id, logo_path: sponsor.logo_path });
      setActionMessage(`Sponsor "${sponsor.name}" eliminado.`);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo eliminar el sponsor."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Megaphone className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-semibold text-white">Sponsors</h3>
            <p className="text-xs text-slate-300">
              Aparecen en el marquee de la landing en orden de carga.
            </p>
          </div>
        </div>
        <Button type="button" size="md" onClick={openCreate}>
          Agregar sponsor
        </Button>
      </div>

      {errorMessage ? (
        <Alert variant="danger" className="mb-3">
          {errorMessage}
        </Alert>
      ) : null}
      {actionMessage ? (
        <Alert variant="info" className="mb-3">
          {actionMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-300">Cargando sponsors...</p>
      ) : sponsors.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-3 py-6 text-center text-sm text-slate-300">
          Todavía no hay sponsors cargados. Agregá el primero para que aparezca en la landing.
        </p>
      ) : (
        <ul className="space-y-2">
          {sponsors.map((sponsor) => (
            <li
              key={sponsor.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.name}
                  className="max-h-full max-w-full object-contain p-1"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{sponsor.name}</p>
                {sponsor.url ? (
                  <a
                    href={sponsor.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-xs text-slate-300 underline-offset-2 hover:text-white hover:underline"
                  >
                    {sponsor.url}
                  </a>
                ) : (
                  <p className="text-xs text-slate-500">Sin URL pública</p>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => void handleDelete(sponsor)}
                disabled={deletingId === sponsor.id}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                {deletingId === sponsor.id ? "Eliminando..." : "Eliminar"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AdminModal open={modalOpen} onClose={closeModal}>
        <h2 className="text-lg font-semibold text-white">Nuevo sponsor</h2>
        <p className="mt-1 text-sm text-slate-300">
          Cargá el logo (PNG, JPG, SVG hasta 1.5 MB) y los datos básicos.
        </p>

        <div className="mt-4 space-y-3">
          <FormField htmlFor="sponsor-name" label="Nombre">
            <Input
              id="sponsor-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej. Coca-Cola"
              className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              autoComplete="off"
              disabled={isSaving}
            />
          </FormField>

          <FormField htmlFor="sponsor-url" label="URL (opcional)">
            <Input
              id="sponsor-url"
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://www.sponsor.com"
              className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              autoComplete="off"
              disabled={isSaving}
            />
          </FormField>

          <FormField htmlFor={fileInputId} label="Logo">
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isSaving}
                className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white file:transition-colors hover:file:bg-white/20"
              />
              {formFile ? (
                <p className="text-xs text-slate-400">
                  Listo: {formFile.name} ({Math.round(formFile.size / 1024)} KB)
                </p>
              ) : null}
            </div>
          </FormField>
        </div>

        {formError ? (
          <Alert variant="danger" className="mt-3">
            {formError}
          </Alert>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={closeModal} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Agregar sponsor"}
          </Button>
        </div>
      </AdminModal>
    </div>
  );
}
