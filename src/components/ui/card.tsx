import { ReactNode } from "react";

type CardVariant = "default" | "muted" | "hero";
type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
  padding?: CardPadding;
};

const variantClassMap: Record<CardVariant, string> = {
  default:
    "border border-white/75 bg-white/88 shadow-[0_22px_48px_-34px_rgba(15,23,42,0.35)] backdrop-blur",
  muted:
    "border border-slate-200/80 bg-slate-50/88 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.25)]",
  hero:
    "border border-primary/10 bg-white/92 shadow-[0_40px_90px_-52px_rgba(15,23,42,0.45)] backdrop-blur",
};

const paddingClassMap: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-7",
};

type CardClassNameOptions = {
  variant?: CardVariant;
  padding?: CardPadding;
  className?: string;
};

export function cardClassNames({
  variant = "default",
  padding = "none",
  className = "",
}: CardClassNameOptions = {}) {
  return [
    "rounded-[1.75rem]",
    variantClassMap[variant],
    paddingClassMap[padding],
    className,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function Card({
  children,
  className = "",
  variant = "default",
  padding = "none",
}: CardProps) {
  return <div className={cardClassNames({ variant, padding, className })}>{children}</div>;
}
