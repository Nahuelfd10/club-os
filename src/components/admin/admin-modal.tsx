"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type AdminModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Ancho máximo del modal. Default "md" (448px). */
  width?: "sm" | "md" | "lg" | "xl" | "2xl";
};

const widthMap: Record<NonNullable<AdminModalProps["width"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

/** Modal fijo en `document.body` para que el backdrop cubra toda la vista (incl. sidebar). */
export function AdminModal({ open, onClose, children, width = "md" }: AdminModalProps) {
  const [mounted] = useState(() => typeof document !== "undefined");

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-[2px] md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Diálogo"
      onClick={onClose}
    >
      <div
        className={`max-h-[min(90vh,100%)] w-full ${widthMap[width]} overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-950/94 p-5 text-white shadow-[0_30px_80px_-40px_rgba(2,8,23,0.95)] backdrop-blur-xl md:rounded-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
