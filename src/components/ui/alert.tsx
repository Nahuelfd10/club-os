"use client";

import { ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "danger" | "neutral";

type AlertProps = {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
};

const variantClassMap: Record<AlertVariant, string> = {
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-muted text-foreground/70",
};

export function Alert({ children, variant = "neutral", className = "" }: AlertProps) {
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${variantClassMap[variant]} ${className}`.trim()}>
      {children}
    </p>
  );
}

