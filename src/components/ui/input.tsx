"use client";

import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...rest }: InputProps) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-0 transition-colors focus:border-slate-500 ${className}`.trim()}
      {...rest}
    />
  );
}
