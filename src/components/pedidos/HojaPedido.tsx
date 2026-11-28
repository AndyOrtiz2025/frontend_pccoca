"use client";

import { DocumentoImprimible } from "@/components/ui";
import { formatFecha } from "@/lib/fechas";
import type { DetallePedido } from "@/lib/api";
import { cantidadPedida } from "./comun";

/**
 * Hoja del pedido para dársela al vendedor o leérsela por teléfono al proveedor.
 * Sin costos ni precios. Si ya llegó una parte, solo sale lo que falta.
 */
export function HojaPedido({ pedido, onClose }: { pedido: DetallePedido; onClose: () => void }) {
  const algoLlego = pedido.lineas.some((l) => l.recibidas > 0);
  const lineas = pedido.lineas.filter((l) => l.faltan > 0);
  const tel = pedido.proveedor.telefono;
  return (
    <DocumentoImprimible
      titulo={`Pedido ${pedido.numero}`}
      subtitulo={formatFecha(pedido.fecha)}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 text-body text-ink">
        <div>
          <p className="text-small text-ink-muted">Para</p>
          <p className="font-semibold text-ink-strong">{pedido.proveedor.nombre}</p>
          {(pedido.proveedor.contacto || tel) && (
            <p className="text-small text-ink-muted">
              {[pedido.proveedor.contacto, tel && `Tel. ${tel}`].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {algoLlego && (
          <p className="rounded-sm bg-gold-50 px-3 py-1.5 text-small text-gold-text print:border print:border-gray-300 print:bg-transparent">
            Ya llegó una parte: aquí solo está lo que falta.
          </p>
        )}
        <table className="w-full text-body">
          <thead>
            <tr className="border-b-2 border-navy-900 text-left text-small text-ink-muted">
              <th className="w-8 py-1.5 font-semibold">#</th>
              <th className="py-1.5 font-semibold">Producto</th>
              <th className="py-1.5 text-right font-semibold">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={l.id} className="border-b border-gray-200">
                <td className="py-2 text-ink-muted tabular">{i + 1}</td>
                <td className="py-2">
                  <span className="font-medium text-ink-strong">{l.nombre}</span>
                  {l.codigo && (
                    <span className="ml-1.5 font-mono text-small text-ink-muted">{l.codigo}</span>
                  )}
                </td>
                <td className="py-2 text-right font-semibold whitespace-nowrap tabular">
                  {cantidadPedida(l, l.faltan)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lineas.length === 0 && (
          <p className="text-center text-ink-muted">Ya no se espera nada de este pedido.</p>
        )}
        {pedido.notas && (
          <div>
            <p className="text-small text-ink-muted">Notas</p>
            <p className="whitespace-pre-line">{pedido.notas}</p>
          </div>
        )}
        <p className="border-t border-gray-200 pt-2 text-small text-ink-muted">
          {lineas.length} {lineas.length === 1 ? "producto" : "productos"} · Pidió{" "}
          {pedido.creadoPor}
        </p>
      </div>
    </DocumentoImprimible>
  );
}
