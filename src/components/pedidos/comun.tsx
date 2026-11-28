import { Chip } from "@/components/ui";
import { cantidadCon } from "@/lib/presentacion";
import type { LineaPedidoDetallada } from "@/lib/api";
import { ETIQUETA_PEDIDO, type EstadoPedido } from "@/types/pedido";
import type { Presentacion } from "@/types/producto";

const TONO_PEDIDO: Record<EstadoPedido, string> = {
  pendiente: "bg-gold-100 text-gold-text",
  parcial: "bg-stock-low-bg text-stock-low-text",
  recibido: "bg-stock-ok-bg text-stock-ok-text",
  cancelado: "bg-gray-100 text-ink-muted",
};

export function ChipPedido({ estado, className }: { estado: EstadoPedido; className?: string }) {
  return (
    <Chip tono={TONO_PEDIDO[estado]} className={className}>
      {ETIQUETA_PEDIDO[estado]}
    </Chip>
  );
}

/** "6 cajas", "120 unidades", según cómo se pidió. */
export function cantidadPedida(
  l: { nombrePaquete?: string; presentacion: Presentacion },
  cantidad: number,
) {
  return cantidadCon(
    { fraccionable: { nombrePaquete: l.nombrePaquete } },
    l.presentacion,
    cantidad,
  );
}

/** Cómo va una línea: "Por llegar", "Llegó todo", "Pasó al P-0004"… */
export function estadoLinea(l: LineaPedidoDetallada): { texto: string; tono: string } {
  if (l.estado === "movida") {
    return { texto: `Pasó al ${l.movidaA}`, tono: "bg-gray-100 text-ink-muted" };
  }
  if (l.estado === "cancelada") {
    return {
      texto: l.recibidas > 0 ? "Ya no se espera el resto" : "Ya no se pide",
      tono: "bg-gray-100 text-ink-muted",
    };
  }
  if (l.estado === "completa") {
    return l.recibidas >= l.cantidad
      ? { texto: "Llegó todo", tono: "bg-stock-ok-bg text-stock-ok-text" }
      : {
          texto: "Llegó una parte (ya no se espera más)",
          tono: "bg-stock-ok-bg text-stock-ok-text",
        };
  }
  return l.recibidas > 0
    ? { texto: "Falta una parte", tono: "bg-stock-low-bg text-stock-low-text" }
    : { texto: "Por llegar", tono: "bg-gold-100 text-gold-text" };
}
