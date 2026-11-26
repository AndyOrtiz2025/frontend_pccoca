import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Tabla compacta (sección 7.3). */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-body", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-gray-100", className)} {...props} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function Th({ className, numeric, ...props }: ThProps) {
  return (
    <th
      scope="col"
      className={cn(
        "h-9 px-3 text-left text-badge font-semibold whitespace-nowrap text-ink-muted",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}

interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

/** Fila de 48px. Seleccionada: fondo dorado suave y barra dorada de 3px a la izquierda. */
export function Tr({ className, selected, ...props }: TrProps) {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cn(
        "h-12 border-b border-gray-200 transition-colors last:border-b-0",
        selected ? "bg-gold-100 shadow-[inset_3px_0_0_var(--color-gold-500)]" : "hover:bg-gold-50",
        className,
      )}
      {...props}
    />
  );
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function Td({ className, numeric, ...props }: TdProps) {
  return (
    <td
      className={cn("px-3 text-ink", numeric && "text-right whitespace-nowrap tabular", className)}
      {...props}
    />
  );
}
