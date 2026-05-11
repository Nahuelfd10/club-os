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
    <header
      className={`flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 ${className}`.trim()}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-bold leading-none tracking-tight text-slate-950 md:text-[2.15rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
