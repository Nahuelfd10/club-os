"use client";

import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, actions, className = "" }: EmptyStateProps) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.045] p-4 ${className}`.trim()}>
      <p className="text-sm font-semibold text-white">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

