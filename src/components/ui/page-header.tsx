import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  eyebrow?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className = "",
  eyebrow,
}: PageHeaderProps) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 ${className}`.trim()}>
      <div className="max-w-3xl">
        {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/45">{eyebrow}</p> : null}
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-[2.15rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

