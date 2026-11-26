"use client";

import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/** Pestañas con contador (sección 7.2). Activa: blanca con línea dorada de 2px. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex gap-1 border-b border-gray-200", className)}
    >
      {items.map((tab) => {
        const activa = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onChange(tab.value)}
            className={cn(
              "-mb-px h-9 rounded-t-sm border-b-2 px-4 text-body whitespace-nowrap transition-colors",
              activa
                ? "border-gold-500 bg-white font-semibold text-ink-strong"
                : "border-transparent bg-gray-100 text-ink-muted hover:text-navy-900",
            )}
          >
            {tab.label}
            {tab.count !== undefined && <span className="tabular"> ({tab.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
