"use client";

import { useId, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";

import { Button, FormField } from "@/components/ui";
import { uploadClubLogoAndPersist, validateClubLogoFile } from "@/lib/club-logo";

type ClubLogoUploadProps = {
  settingsId: string | null;
  logoUrl: string | null;
  onLogoUpdated: (publicUrl: string) => void;
};

export function ClubLogoUpload({ settingsId, logoUrl, onLogoUpdated }: ClubLogoUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewBust, setPreviewBust] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const disabled = !settingsId || isUploading;

  const previewSrc =
    logoUrl != null && logoUrl.length > 0
      ? `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}v=${previewBust}`
      : null;

  const handlePickFile = () => {
    setLocalError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !settingsId) {
      return;
    }

    const validation = validateClubLogoFile(file);
    if (validation) {
      setLocalError(validation);
      console.error("[club-logo]", validation);
      return;
    }

    setIsUploading(true);
    setLocalError(null);

    try {
      const publicUrl = await uploadClubLogoAndPersist(settingsId, file);
      setPreviewBust((n) => n + 1);
      onLogoUpdated(publicUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir el logo. Intenta de nuevo.";
      setLocalError(message);
      console.error("[club-logo] upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-4 inline-flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <ImageIcon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </span>
        <h3 className="text-base font-semibold text-slate-900">Logo del club</h3>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50"
          aria-hidden={!previewSrc}
        >
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="Logo del club"
              className="max-h-full max-w-full object-contain p-2"
            />
          ) : (
            <span className="px-2 text-center text-xs text-slate-500">Sin logo</span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <FormField htmlFor={inputId} label="Imagen del logo">
            <input
              ref={fileInputRef}
              id={inputId}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void handleFileChange(e)}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="neutral"
              size="md"
              onClick={handlePickFile}
              disabled={disabled}
            >
              {isUploading ? "Subiendo..." : "Subir logo"}
            </Button>
            <p className="mt-2 text-xs text-slate-500">
              Imagen hasta 2 MB. Al subir un archivo nuevo reemplaza el logo anterior.
            </p>
          </FormField>

          {localError ? (
            <p className="text-sm text-danger" role="alert">
              {localError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
