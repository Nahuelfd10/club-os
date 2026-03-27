"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type AdminModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/** Modal fijo en `document.body` para que el backdrop cubra toda la vista (incl. sidebar). */
export function AdminModal({ open, onClose, children }: AdminModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-[1px] md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Diálogo"
      onClick={onClose}
    >
      <div
        className="max-h-[min(90vh,100%)] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
