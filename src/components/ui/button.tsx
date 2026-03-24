"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "accent" | "neutral";
type ButtonSize = "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "text-white",
  accent: "text-white",
  neutral: "bg-slate-200 text-slate-700",
};

const sizeClassMap: Record<ButtonSize, string> = {
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2.5",
};

const getVariantStyle = (variant: ButtonVariant) => {
  if (variant === "primary") {
    return { backgroundColor: "var(--club-primary)" };
  }

  if (variant === "accent") {
    return { backgroundColor: "var(--club-accent)" };
  }

  return undefined;
};

export function Button({
  children,
  variant = "primary",
  size = "lg",
  fullWidth = false,
  className = "",
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 ${sizeClassMap[size]} ${variantClassMap[variant]} ${fullWidth ? "w-full" : ""} ${className}`.trim()}
      style={{
        ...getVariantStyle(variant),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
