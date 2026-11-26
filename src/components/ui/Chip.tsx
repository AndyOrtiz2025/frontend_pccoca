import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { etiquetaStock, type NivelStock } from "@/lib/stock";
import { ETIQUETA_ESTADO, type EstadoProceso } from "@/types/estados";

interface ChipProps {
  children: ReactNode;
  /** Clases de fondo y texto del chip. */
  tono?: string;
  /** Clase de fondo del punto. Sin punto si se omite. */
  punto?: string;
  className?: string;
}

/** Chip tipo píldora de 22px con punto de 6px (sección 7.7). */
export function Chip({
  children,
  tono = "bg-gray-100 text-ink-muted",
  punto,
  className,
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-badge font-semibold whitespace-nowrap",
        tono,
        className,
      )}
    >
      {punto && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", punto)} />}
      {children}
    </span>
  );
}

const tonoStock: Record<NivelStock, { tono: string; punto: string }> = {
  ok: { tono: "bg-stock-ok-bg text-stock-ok-text", punto: "bg-stock-ok" },
  bajo: { tono: "bg-stock-low-bg text-stock-low-text", punto: "bg-stock-low" },
  critico: { tono: "bg-stock-out-bg text-stock-out-text", punto: "bg-stock-out" },
};

interface StockChipProps {
  nivel: NivelStock;
  disponible: number;
  /** Solo para Paola y Oscar: muestra "42 de 100". El Empleado nunca lo ve. */
  detalle?: string;
  className?: string;
}

/** Semáforo de stock (sección 2.4). Siempre con texto, no solo color. */
export function StockChip({ nivel, disponible, detalle, className }: StockChipProps) {
  const t = tonoStock[nivel];
  return (
    <Chip tono={t.tono} punto={t.punto} className={className}>
      {detalle ?? etiquetaStock(nivel, disponible)}
    </Chip>
  );
}

const tonoEstado: Record<EstadoProceso, { tono: string; punto: string }> = {
  recibido: { tono: "bg-st-recibido-bg text-st-recibido", punto: "bg-st-recibido" },
  en_proceso: { tono: "bg-st-proceso-bg text-st-proceso-text", punto: "bg-st-proceso" },
  listo: { tono: "bg-st-listo-bg text-st-listo-text", punto: "bg-st-listo" },
  entregado: { tono: "bg-st-entregado-bg text-st-entregado-text", punto: "bg-st-entregado" },
};

/** Estado de trámite o servicio (sección 2.5). */
export function StatusChip({ estado, className }: { estado: EstadoProceso; className?: string }) {
  const t = tonoEstado[estado];
  return (
    <Chip tono={t.tono} punto={t.punto} className={className}>
      {ETIQUETA_ESTADO[estado]}
    </Chip>
  );
}
