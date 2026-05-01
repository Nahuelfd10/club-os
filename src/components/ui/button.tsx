import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "accent" | "neutral" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "xl";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "border border-primary bg-primary text-white shadow-[0_18px_38px_-22px_color-mix(in_srgb,var(--club-primary)_75%,black)] hover:-translate-y-0.5 hover:shadow-[0_24px_42px_-22px_color-mix(in_srgb,var(--club-primary)_80%,black)]",
  accent:
    "border border-accent bg-accent text-white shadow-[0_18px_38px_-22px_color-mix(in_srgb,var(--club-accent)_75%,black)] hover:-translate-y-0.5 hover:shadow-[0_24px_42px_-22px_color-mix(in_srgb,var(--club-accent)_80%,black)]",
  danger:
    "border border-red-600 bg-red-600 text-white shadow-[0_18px_38px_-22px_rgba(220,38,38,0.55)] hover:-translate-y-0.5 hover:bg-red-700 hover:border-red-700 hover:shadow-[0_24px_42px_-22px_rgba(185,28,28,0.6)]",
  neutral:
    "border border-slate-200/80 bg-white/85 text-slate-700 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900",
  outline:
    "border border-slate-300/80 bg-white/35 text-slate-800 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white/85",
  ghost: "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100/85 hover:text-slate-900",
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "px-3 py-1.75 text-sm",
  md: "px-3.5 py-2 text-sm",
  lg: "px-4.5 py-2.5 text-sm",
  xl: "px-6 py-3 text-sm",
};

type ButtonClassNameOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

export function buttonClassNames({
  variant = "primary",
  size = "lg",
  fullWidth = false,
  className = "",
}: ButtonClassNameOptions = {}) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold",
    "transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
    "disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:translate-y-0",
    sizeClassMap[size],
    variantClassMap[variant],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

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
      className={buttonClassNames({ variant, size, fullWidth, className })}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}
