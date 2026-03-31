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
    <div className={`rounded-xl border border-border bg-muted/40 p-4 ${className}`.trim()}>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

