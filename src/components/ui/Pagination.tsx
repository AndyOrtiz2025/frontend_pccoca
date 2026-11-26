"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  pageSize?: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Paginación (sección 7.4): cuadros de 24px, página activa en oro. 10 filas por defecto. */
export function Pagination({ page, pageSize = 10, total, onChange, className }: PaginationProps) {
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);
  const cuadro =
    "flex size-6 items-center justify-center rounded-xs text-small tabular transition-colors disabled:opacity-45";

  return (
    <nav
      aria-label="Paginación"
      className={cn("flex items-center justify-between gap-3 px-4 py-3", className)}
    >
      <span className="text-small text-ink-muted tabular">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={cn(cuadro, "text-ink-muted hover:bg-gray-100")}
        >
          <ChevronLeft className="size-4" />
        </button>
        {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-current={n === page ? "page" : undefined}
            onClick={() => onChange(n)}
            className={cn(
              cuadro,
              n === page ? "bg-gold-500 font-semibold text-navy-900" : "text-ink hover:bg-gray-100",
            )}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          aria-label="Página siguiente"
          disabled={page >= paginas}
          onClick={() => onChange(page + 1)}
          className={cn(cuadro, "text-ink-muted hover:bg-gray-100")}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <span className="w-20" aria-hidden />
    </nav>
  );
}
