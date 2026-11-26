"use client";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Control segmentado (sección 7.5): Venta / Consumo interno / Merma, o Unidad / Paquete.
 * La opción elegida va en azul medianoche con texto blanco.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-sm border border-gray-300 bg-white p-0.5", className)}
    >
      {options.map((op) => {
        const activo = op.value === value;
        return (
          <button
            key={op.value}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={op.disabled}
            onClick={() => onChange(op.value)}
            className={cn(
              "h-7 flex-1 rounded-xs px-3 text-button font-semibold whitespace-nowrap transition-colors disabled:opacity-45",
              activo ? "bg-navy-900 text-white" : "text-ink-muted hover:text-navy-900",
            )}
          >
            {op.label}
          </button>
        );
      })}
    </div>
  );
}
