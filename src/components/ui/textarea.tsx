import { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Wrapper visual del <textarea> alineado con <Input>.
 * Mantiene la API nativa para poder ser drop-in replacement.
 */
export function Textarea({ className = "", rows = 3, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={`w-full rounded-2xl border border-slate-200/90 bg-white/88 px-4 py-3 text-slate-900 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)] outline-none ring-0 transition-all placeholder:text-slate-400 focus:border-primary/30 focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--club-primary)_12%,transparent),0_18px_32px_-24px_rgba(15,23,42,0.4)] ${className}`.trim()}
      {...rest}
    />
  );
}
