"use client";

import { ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "danger" | "neutral";

type AlertProps = {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
};

const variantClassMap: Record<AlertVariant, string> = {
  info: "border border-info/20 bg-info/10 text-info",
  success: "border border-success/20 bg-success/10 text-success",
  warning: "border border-warning/20 bg-warning/10 text-warning",
  danger: "border border-danger/20 bg-danger/10 text-danger",
  neutral: "border border-white/10 bg-white/[0.05] text-slate-300",
};

export function Alert({ children, variant = "neutral", className = "" }: AlertProps) {
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${variantClassMap[variant]} ${className}`.trim()}>
      {children}
    </p>
  );
}

