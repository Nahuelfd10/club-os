import { HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "muted" | "hero";
type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
  padding?: CardPadding;
};

const variantClassMap: Record<CardVariant, string> = {
  default:
    "border border-slate-200 bg-white shadow-[0_16px_38px_-28px_rgba(15,23,42,0.28)]",
  muted:
    "border border-slate-200 bg-slate-50 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.18)]",
  hero:
    "border border-slate-200 bg-white shadow-[0_22px_52px_-34px_rgba(15,23,42,0.34)]",
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
  ...rest
}: CardProps) {
  return <div className={cardClassNames({ variant, padding, className })} {...rest}>{children}</div>;
}
