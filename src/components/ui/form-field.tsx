import { ReactNode } from "react";

type FormFieldProps = {
  htmlFor: string;
  label: string;
  children: ReactNode;
  className?: string;
};

export function FormField({ htmlFor, label, children, className = "" }: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}
