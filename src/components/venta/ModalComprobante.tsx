"use client";

import { CircleCheck, Printer, Send } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { formatQ } from "@/lib/format";
import type { Comprobante } from "@/types/movimiento";

const fechaHora = new Intl.DateTimeFormat("es-GT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Guatemala",
});

/** Pantalla 7: comprobante de venta interno (consumidor final, sin NIT, sin correlativo). */
export function ModalComprobante({
  comprobante,
  onClose,
}: {
  comprobante: Comprobante | null;
  onClose: () => void;
}) {
  const toast = useToast();
  if (!comprobante) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden className="no-imprimir absolute inset-0 bg-navy-950/55" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comprobante de venta"
        className="zona-impresion relative flex max-h-[calc(100vh-2rem)] w-full max-w-[420px] flex-col overflow-hidden rounded-lg bg-white shadow-lg"
      >
        <div className="bg-grad-hero px-6 py-5 text-white">
          <p className="text-[17px] font-semibold">
            PC Coca<span className="text-gold-500">.</span>
          </p>
          <p className="text-small text-navy-300">Comprobante de venta interno</p>
          <div className="mt-3 flex justify-between text-small text-navy-300">
            <span className="tabular">{fechaHora.format(new Date(comprobante.fecha))}</span>
            <span>Atendió: {comprobante.atendio}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="no-imprimir mb-4 flex items-center gap-2 text-body font-semibold text-stock-ok-text">
            <CircleCheck className="size-5 text-stock-ok" /> Venta confirmada
          </p>
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-gray-200 text-ink-muted">
                <th className="pb-2 text-left font-semibold">Producto</th>
                <th className="pb-2 text-right font-semibold">Cant.</th>
                <th className="pb-2 text-right font-semibold">Precio</th>
                <th className="pb-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {comprobante.lineas.map((l) => (
                <tr
                  key={`${l.codigo}-${l.presentacion}`}
                  className="border-b border-gray-200 last:border-0"
                >
                  <td className="py-2 pr-2 text-ink">
                    {l.nombre}
                    {l.presentacion === "paquete" && (
                      <span className="text-ink-muted"> (paquete)</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular">{l.cantidad}</td>
                  <td className="py-2 text-right tabular">{formatQ(l.precioUnitario)}</td>
                  <td className="py-2 text-right font-semibold tabular">{formatQ(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-baseline justify-between border-t border-gray-200 pt-4">
            <span className="text-body font-semibold text-ink-strong">Total</span>
            <span className="text-kpi font-semibold text-ink-strong tabular">
              {formatQ(comprobante.total)}
            </span>
          </div>
          <p className="mt-3 text-badge text-ink-muted">
            Consumidor final · Documento interno, no es factura.
          </p>
        </div>

        <div className="no-imprimir flex flex-wrap justify-end gap-2 border-t border-gray-200 px-6 py-3.5">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={() => toast("Enviar a Paola para factura estará disponible con el backend")}
          >
            <Send /> Enviar a Paola para factura
          </Button>
          <Button onClick={onClose}>Nueva venta</Button>
        </div>
      </div>
    </div>
  );
}
