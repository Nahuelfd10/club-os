"use client";

type SegmentTone = "default" | "accent" | "success";

type SegmentOption<T extends string> = {
  value: T;
  label: string;
  tone?: SegmentTone;
};

type SegmentedControlProps<T extends string> = {
  label?: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
};

function activeClassForTone(tone: SegmentTone = "default") {
  if (tone === "accent") {
    return "bg-accent text-white";
  }
  if (tone === "success") {
    return "bg-success text-white";
  }
  return "bg-slate-950 text-white";
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white shadow-[0_8px_24px_-22px_rgba(15,23,42,0.45)] ${className}`.trim()}
      role="group"
      aria-label={ariaLabel ?? label}
    >
      {label ? (
        <span className="border-r border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-1 p-1">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? activeClassForTone(option.tone) : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
