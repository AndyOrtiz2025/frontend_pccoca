"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Alert, Button, Card, Chip } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatQ } from "@/lib/format";
import { etiquetaPresentacion } from "@/lib/presentacion";
import { ETIQUETA_MOVIMIENTO } from "@/types/movimiento";
import { ModalRevisarVenta } from "./ModalRevisarVenta";
import { useVenta } from "./VentaContext";

/** Carrito (pantalla 5, columna derecha; y página Carrito a lo ancho). */
export function PanelCarrito({ className }: { className?: string }) {
  const { calculado, cambiar, vaciar, confirmar, confirmando } = useVenta();
  const { lineas, total, avisosMayoreo, cantidadVentas } = calculado;
  const vacio = lineas.length === 0;
  // Primer clic: se revisa todo en pantalla. La venta se guarda solo al confirmar en la revisión.
  const [revisando, setRevisando] = useState(false);

  async function confirmarDefinitivo() {
    if (await confirmar()) setRevisando(false);
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 className="flex items-center gap-2 text-body font-semibold text-ink-strong">
          <ShoppingBag className="size-4" /> Carrito
        </h2>
        {!vacio && <span className="text-small text-ink-muted">{lineas.length} productos</span>}
      </div>

      {vacio ? (
        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
          <ShoppingBag className="size-8 text-gray-300" strokeWidth={1.5} />
          <p className="text-body text-ink-muted">El carrito está vacío</p>
          <p className="text-small text-ink-muted">
            Agrega productos o escanea un código de barras.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-gray-200 overflow-y-auto px-5">
            {lineas.map((l, i) => (
              <li
                key={`${l.productoId}-${l.tipo}-${l.presentacion}`}
                className="flex flex-col gap-2 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-body font-medium text-ink-strong">{l.producto.nombre}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {l.tipo !== "venta" && <Chip>{ETIQUETA_MOVIMIENTO[l.tipo]}</Chip>}
                      {l.producto.fraccionable && (
                        <Chip>{etiquetaPresentacion(l.producto, l.presentacion)}</Chip>
                      )}
                      {l.mayoreo && l.tipo === "venta" && (
                        <Chip tono="bg-gold-100 text-gold-text">Mayoreo</Chip>
                      )}
                    </div>
                    {l.motivo && (
                      <p className="mt-1 text-small text-ink-muted">Motivo: {l.motivo}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => cambiar(i, 0)}
                    aria-label={`Quitar ${l.producto.nombre}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-xs text-ink-muted hover:bg-stock-out-bg hover:text-stock-out"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="icon"
                      aria-label="Menos"
                      onClick={() => cambiar(i, l.cantidad - 1)}
                    >
                      <Minus />
                    </Button>
                    <span className="w-8 text-center text-body tabular">{l.cantidad}</span>
                    <Button
                      size="sm"
                      variant="icon"
                      aria-label="Más"
                      onClick={() => cambiar(i, l.cantidad + 1)}
                    >
                      <Plus />
                    </Button>
                    <span className="ml-1 text-small text-ink-muted tabular">
                      × {formatQ(l.precioUnitario)}
                    </span>
                  </div>
                  <span className="text-body font-semibold text-ink-strong tabular">
                    {l.tipo === "venta" ? formatQ(l.subtotal) : "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4">
            {avisosMayoreo.map((a) => (
              <Alert key={a.nombre} tone="info">
                {a.nombre} cambió de {formatQ(a.de)} a {formatQ(a.a)} por compra al por mayor.
              </Alert>
            ))}
            <div className="flex items-baseline justify-between">
              <span className="text-body font-semibold text-ink-strong">Total</span>
              <span className="text-kpi font-semibold text-ink-strong tabular">
                {formatQ(total)}
              </span>
            </div>
            <Button
              onClick={() => setRevisando(true)}
              disabled={confirmando}
              className="h-9 w-full"
            >
              {cantidadVentas > 0 ? "Confirmar venta" : "Registrar movimientos"}
            </Button>
            <Button variant="secondary" onClick={vaciar} disabled={confirmando} className="w-full">
              Vaciar carrito
            </Button>
          </div>
        </>
      )}
      {revisando && !vacio && (
        <ModalRevisarVenta
          calculado={calculado}
          confirmando={confirmando}
          onConfirmar={confirmarDefinitivo}
          onClose={() => setRevisando(false)}
        />
      )}
    </Card>
  );
}
