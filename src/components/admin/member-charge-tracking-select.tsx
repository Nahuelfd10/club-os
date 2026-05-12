"use client";

import {
  MEMBER_CHARGE_TRACKING_OPTIONS,
  type MemberChargeTrackingStatus,
} from "@/lib/charges";

type Props = {
  value: MemberChargeTrackingStatus;
  disabled?: boolean;
  onChange: (value: MemberChargeTrackingStatus) => void;
};

export function MemberChargeTrackingSelect({ value, disabled, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as MemberChargeTrackingStatus)}
      disabled={disabled}
      className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      aria-label="Estado de seguimiento"
    >
      {MEMBER_CHARGE_TRACKING_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
