import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface KpiCardProps {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
  /** La tarjeta destacada usa el degradado oscuro y la cifra en oro. Máximo una por fila. */
  highlight?: boolean;
  /** Para "Stock bajo" y similares: cifra en rojo. */
  danger?: boolean;
  className?: string;
}

/** Tarjeta KPI (sección 7.6): overline, cifra de 22px y línea de detalle. */
export function KpiCard({
  label,
  value,
  detail,
  icon,
  highlight,
  danger,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-[108px] flex-col justify-between p-4",
        highlight
          ? "rounded-lg bg-grad-hero text-white"
          : "rounded-md border border-gray-200 bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "text-overline font-semibold tracking-[0.06em] uppercase",
            highlight ? "text-navy-300" : "text-ink-muted",
          )}
        >
          {label}
        </span>
        {icon && (
          <span
            aria-hidden
            className={cn(
              "flex size-7 items-center justify-center rounded-sm [&_svg]:size-4",
              highlight ? "bg-white/10 text-gold-500" : "bg-gray-100 text-navy-900",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div>
        <div
          className={cn(
            "text-kpi font-semibold tabular",
            highlight ? "text-gold-500" : danger ? "text-stock-out" : "text-ink-strong",
          )}
        >
          {value}
        </div>
        {detail && (
          <div className={cn("text-small", highlight ? "text-navy-300" : "text-ink-muted")}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}
