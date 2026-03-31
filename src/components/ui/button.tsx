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
  primary: "bg-primary text-white",
  accent: "bg-accent text-white",
  neutral: "bg-muted text-foreground/70",
};

const sizeClassMap: Record<ButtonSize, string> = {
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2.5",
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
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}
