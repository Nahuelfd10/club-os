import { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Wrapper visual del <select> alineado con <Input> y el resto de la UI library.
 * Mantiene la API nativa de HTMLSelectElement: el caller pasa <option> como
 * children y los handlers/value como en cualquier select.
 */
export function Select({ className = "", children, ...rest }: SelectProps) {
  return (
    <select
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.35)] outline-none ring-0 transition-all focus:border-primary/45 focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--club-primary)_12%,transparent)] ${className}`.trim()}
      {...rest}
    >
      {children}
    </select>
  );
}
