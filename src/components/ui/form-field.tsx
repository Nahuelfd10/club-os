"use client";

import { ReactNode } from "react";

type FormFieldProps = {
  htmlFor: string;
  label: string;
  children: ReactNode;
  className?: string;
};

export function FormField({ htmlFor, label, children, className = "" }: FormFieldProps) {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
