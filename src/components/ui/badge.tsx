"use client";

import { ReactNode } from "react";

type BadgeVariant = "slate" | "success" | "warning" | "danger" | "info";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantClassMap: Record<BadgeVariant, string> = {
  slate: "bg-muted text-foreground/70",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
};

export function Badge({ children, variant = "slate", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${variantClassMap[variant]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
