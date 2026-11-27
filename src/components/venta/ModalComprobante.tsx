"use client";

import { useState } from "react";
import { CircleCheck, Download, LoaderCircle, Printer, Send, Share2, X } from "lucide-react";
import { Button, CapaImpresion, useToast } from "@/components/ui";
import {
  fechaComprobante,
  NEGOCIO,
  nombreArchivoComprobante,
  nombreLinea,
  numeroComprobante,
  totalArticulos,
} from "@/lib/comprobante";
import { compartirArchivo, descargarArchivo } from "@/lib/compartir";
import { formatQ } from "@/lib/format";
import type { Comprobante } from "@/types/movimiento";

/**
 * Pantalla 7: comprobante de venta interno (consumidor final, sin NIT, sin correlativo de SAT).
 * Se puede descargar en PDF, compartir (WhatsApp, correo…) o imprimir en una sola hoja.
 */
export function ModalComprobante({
  comprobante,
  onClose,
  textoCerrar = "Nueva venta",
  recienVendido = textoCerrar === "Nueva venta",
}: {
  comprobante: Comprobante | null;
  onClose: () => void;
  /** Tras vender dice "Nueva venta"; al reimprimir desde el Dashboard, "Cerrar". */
  textoCerrar?: string;
  /** Muestra "Venta confirmada" arriba (no sale en la impresión ni en el PDF). */
  recienVendido?: boolean;
}) {
  const toast = useToast();
  const [generando, setGenerando] = useState<"descargar" | "compartir" | null>(null);
  if (!comprobante) return null;

  async function pdf(accion: "descargar" | "compartir") {
    if (!comprobante || generando) return;
    setGenerando(accion);
    try {
      const { crearPdfComprobante } = await import("@/lib/comprobante-pdf");
      const archivo = await crearPdfComprobante(comprobante);
      const nombre = nombreArchivoComprobante(comprobante);
      if (accion === "descargar") {
        descargarArchivo(archivo, nombre);
        toast("Comprobante descargado", "success");
      } else {
        const r = await compartirArchivo(archivo, nombre, {
          titulo: `Comprobante ${numeroComprobante(comprobante)} · PC Coca`,
          mensaje: `Comprobante de PC Coca por ${formatQ(comprobante.total)}`,
        });
        if (r === "descargado") {
          toast("Este navegador no permite compartir: se descargó el PDF para enviarlo", "info");
        }
      }
    } catch {
      toast("No se pudo crear el PDF. Intenta de nuevo.", "danger");
    } finally {
      setGenerando(null);
    }
  }

  return (
    <CapaImpresion>
      <div aria-hidden className="no-imprimir absolute inset-0 bg-navy-950/55" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comprobante de venta"
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-[440px] flex-col overflow-hidden rounded-lg bg-gray-100 shadow-lg"
      >
        <div className="no-imprimir flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3">
          {recienVendido ? (
            <p className="flex items-center gap-2 text-body font-semibold text-stock-ok-text">
              <CircleCheck className="size-5 text-stock-ok" /> Venta confirmada
            </p>
          ) : (
            <p className="text-body font-semibold text-ink-strong">Comprobante de venta</p>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-8 items-center justify-center rounded-sm text-ink-muted hover:bg-gray-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <Ticket c={comprobante} />
        </div>

        <div className="no-imprimir flex flex-col gap-2 border-t border-gray-200 bg-white px-5 py-3.5">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => pdf("descargar")} disabled={!!generando}>
              {generando === "descargar" ? <LoaderCircle className="animate-spin" /> : <Download />}
              PDF
            </Button>
            <Button variant="outline" onClick={() => pdf("compartir")} disabled={!!generando}>
              {generando === "compartir" ? <LoaderCircle className="animate-spin" /> : <Share2 />}
              Compartir
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => toast("Enviar a Paola para factura estará disponible con el backend")}
            >
              <Send /> Enviar a Paola para factura
            </Button>
            <Button onClick={onClose}>{textoCerrar}</Button>
          </div>
        </div>
      </div>
    </CapaImpresion>
  );
}

/** El ticket tal como se imprime: 72 mm de ancho en papel de 80 mm. */
function Ticket({ c }: { c: Comprobante }) {
  const linea = <div className="my-3 border-t border-dashed border-gray-300" />;
  return (
    <div className="zona-impresion ticket mx-auto w-full max-w-[340px] rounded-md bg-white px-5 py-5 text-ink shadow-sm print:shadow-none">
      <div className="text-center">
        <p className="text-[22px] leading-tight font-bold text-navy-900">
          {NEGOCIO.nombre}
          <span className="text-gold-500">.</span>
        </p>
        <p className="text-small text-ink-muted">{NEGOCIO.giro}</p>
        <p className="text-small text-ink-muted">{NEGOCIO.lugar}</p>
      </div>
      {linea}
      <p className="text-center text-overline font-semibold tracking-wider text-navy-900 uppercase">
        Comprobante de venta
      </p>
      <dl className="mt-2 flex flex-col gap-0.5 text-small">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">No.</dt>
          <dd className="font-medium text-ink-strong tabular">{numeroComprobante(c)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Fecha</dt>
          <dd className="text-ink-strong tabular">{fechaComprobante(c)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Atendió</dt>
          <dd className="text-ink-strong">{c.atendio}</dd>
        </div>
      </dl>
      {linea}
      <ul className="flex flex-col gap-2.5">
        {c.lineas.map((l) => (
          <li key={`${l.codigo}-${l.presentacion}`}>
            <p className="text-body text-ink-strong">{nombreLinea(l)}</p>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-small text-ink-muted tabular">
                {l.cantidad} × {formatQ(l.precioUnitario)}
              </span>
              <span className="text-body font-semibold whitespace-nowrap text-ink-strong tabular">
                {formatQ(l.subtotal)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {linea}
      <div className="flex justify-between text-small text-ink-muted">
        <span>Artículos</span>
        <span className="tabular">{totalArticulos(c)}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-body font-bold text-navy-900">TOTAL</span>
        <span className="text-kpi font-bold whitespace-nowrap text-navy-900 tabular">
          {formatQ(c.total)}
        </span>
      </div>
      {linea}
      <p className="text-center text-badge text-ink-muted">
        Consumidor final · Documento interno, no es factura.
      </p>
      <p className="mt-1.5 text-center text-body font-semibold text-navy-900">
        ¡Gracias por su compra!
      </p>
    </div>
  );
}
