"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/cn";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Casilla de 16px: marcada en azul medianoche con palomita blanca (sección 7.5). */
export function Checkbox({ checked, onChange, label, disabled, className }: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-2.5 text-body text-ink",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      <span className="relative mt-0.5 flex size-4 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer size-4 cursor-pointer appearance-none rounded-xs border border-gray-300 bg-white transition-colors checked:border-navy-900 checked:bg-navy-900 focus-visible:shadow-focus disabled:cursor-not-allowed"
        />
        <Check
          aria-hidden
          strokeWidth={3}
          className="pointer-events-none absolute inset-0.5 size-3 text-white opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span>{label}</span>
    </label>
  );
}
