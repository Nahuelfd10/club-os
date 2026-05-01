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
      className={`w-full rounded-2xl border border-slate-200/90 bg-white/88 px-4 py-3 text-slate-900 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)] outline-none ring-0 transition-all focus:border-primary/30 focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--club-primary)_12%,transparent),0_18px_32px_-24px_rgba(15,23,42,0.4)] ${className}`.trim()}
      {...rest}
    >
      {children}
    </select>
  );
}
