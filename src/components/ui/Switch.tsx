"use client";

import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Interruptor de 32×18px, activo en oro (sección 7.5). */
export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2.5",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[18px] w-8 shrink-0 rounded-full transition-colors",
          checked ? "bg-gold-500" : "bg-gray-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-3.5",
          )}
        />
      </button>
      <span className="text-body text-ink">{label}</span>
    </label>
  );
}
