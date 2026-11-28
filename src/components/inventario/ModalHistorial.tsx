"use client";

import { useEffect, useState } from "react";
import { History, LoaderCircle } from "lucide-react";
import { Button, Chip, Modal } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { formatFechaHora } from "@/lib/fechas";
import { ErrorApi } from "@/lib/http";
import { cantidadCon } from "@/lib/presentacion";
import {
  ETIQUETA_EVENTO,
  type EventoHistorial,
  type TipoEventoHistorial,
} from "@/lib/reglas/compras";
import { describirStock } from "@/lib/reglas/productos";
import type { Producto } from "@/types/producto";

const TONO: Record<TipoEventoHistorial, string> = {
  venta: "bg-navy-900 text-white",
  fiado: "bg-st-recibido-bg text-navy-900",
  compra: "bg-stock-ok-bg text-stock-ok-text",
  reposicion: "bg-stock-ok-bg text-stock-ok-text",
  devolucion: "bg-stock-ok-bg text-stock-ok-text",
  cambio: "bg-gray-100 text-ink",
  merma: "bg-stock-out-bg text-stock-out-text",
  consumo_interno: "bg-gold-100 text-gold-text",
  abrir_paquete: "bg-gray-100 text-ink",
};

/** Historial del producto (kardex): cada movimiento, quién lo hizo y cómo quedó el stock. */
export function ModalHistorial({
  producto: p,
  onClose,
}: {
  producto: Producto;
  onClose: () => void;
}) {
  const manejarError = useErrorApi();
  const [eventos, setEventos] = useState<EventoHistorial[] | null>(null);

  useEffect(() => {
    let vigente = true;
    fetch(`/api/productos/${encodeURIComponent(p.id)}/historial`)
      .then(async (r) => {
        const datos = (await r.json().catch(() => ({}))) as {
          eventos?: EventoHistorial[];
          error?: string;
        };
        if (!r.ok) throw new ErrorApi(datos.error ?? "No se pudo cargar el historial", r.status);
        if (vigente) setEventos(datos.eventos ?? []);
      })
      .catch((e) => {
        if (vigente) {
          setEventos([]);
          manejarError(e);
        }
      });
    return () => {
      vigente = false;
    };
  }, [p.id, manejarError]);

  /** "−3 unidades", "+20 cajas", "−1 caja · +12 sueltas". */
  function cambio(e: EventoHistorial) {
    const partes: string[] = [];
    if (e.cambio.paquetes) {
      partes.push(
        `${e.cambio.paquetes > 0 ? "+" : "−"}${cantidadCon(p, "paquete", Math.abs(e.cambio.paquetes))}`,
      );
    }
    if (e.cambio.unidades) {
      const n = Math.abs(e.cambio.unidades);
      const texto = p.fraccionable
        ? `${n} ${n === 1 ? "suelta" : "sueltas"}`
        : cantidadCon(p, "unidad", n);
      partes.push(`${e.cambio.unidades > 0 ? "+" : "−"}${texto}`);
    }
    return partes.join(" · ");
  }

  /** Stock después del movimiento, con el mismo formato que el inventario. */
  function quedo(e: EventoHistorial) {
    const stock =
      p.stock.tipo === "simple"
        ? { ...p.stock, disponible: e.despues.unidades }
        : { ...p.stock, paquetes: e.despues.paquetes, sueltas: e.despues.unidades };
    return describirStock({ ...p, stock });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Historial del producto"
      subtitle={`${p.nombre} · ${p.codigo} · Hay ${describirStock(p)}`}
      size="lg"
      variante="destacado"
      footer={<Button onClick={onClose}>Cerrar</Button>}
    >
      {eventos === null ? (
        <p className="flex items-center justify-center gap-2 py-10 text-body text-ink-muted">
          <LoaderCircle className="size-4 animate-spin" /> Cargando historial…
        </p>
      ) : eventos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <History className="size-8 text-gray-300" strokeWidth={1.5} />
          <p className="text-body text-ink-muted">Todavía no hay movimientos de este producto.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-body">
            <thead>
              <tr className="bg-gray-50 text-left text-small text-ink-muted">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Movimiento</th>
                <th className="px-3 py-2 text-right font-semibold">Cambio</th>
                <th className="px-3 py-2 font-semibold">Quién</th>
                <th className="px-3 py-2 font-semibold">Quedó</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e, i) => {
                const entra =
                  e.cambio.paquetes > 0 || (e.cambio.paquetes === 0 && e.cambio.unidades > 0);
                return (
                  <tr key={`${e.fecha}-${i}`} className="border-t border-gray-200 align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-ink-muted tabular">
                      {formatFechaHora(e.fecha)}
                    </td>
                    <td className="px-3 py-2">
                      <Chip tono={TONO[e.tipo]}>
                        {e.tipo === "abrir_paquete"
                          ? `Se abrió 1 ${(p.fraccionable?.nombrePaquete ?? "paquete").toLowerCase()}`
                          : ETIQUETA_EVENTO[e.tipo]}
                      </Chip>
                      {e.detalle && <p className="mt-0.5 text-small text-ink-muted">{e.detalle}</p>}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-semibold whitespace-nowrap tabular",
                        e.tipo === "abrir_paquete"
                          ? "text-ink"
                          : entra
                            ? "text-stock-ok-text"
                            : "text-ink-strong",
                      )}
                    >
                      {cambio(e)}
                    </td>
                    <td className="px-3 py-2 text-ink">{e.registradoPor}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink-muted">{quedo(e)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
