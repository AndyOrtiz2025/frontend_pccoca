"use client";

import { useState } from "react";
import { CircleCheck, Download, LoaderCircle, Printer, Share2, X } from "lucide-react";
import { Button, CapaImpresion, useToast } from "@/components/ui";
import { compartirArchivo, descargarArchivo } from "@/lib/compartir";
import { fechaComprobante, NEGOCIO, nombreLinea } from "@/lib/comprobante";
import { formatQ } from "@/lib/format";
import { numeroDevolucion } from "@/lib/reglas/devoluciones";
import { ETIQUETA_ESTADO_DEVUELTO, type Devolucion } from "@/types/devolucion";
import type { LineaComprobante } from "@/types/movimiento";

/**
 * Comprobante del cambio: lo que devolvió, el saldo a favor, lo que se llevó y lo que pagó de más.
 * Se puede descargar en PDF, compartir o imprimir, igual que el de venta.
 */
export function ModalComprobanteDevolucion({
  devolucion,
  onClose,
  recienHecha = false,
  textoCerrar = "Cerrar",
}: {
  devolucion: Devolucion;
  onClose: () => void;
  recienHecha?: boolean;
  textoCerrar?: string;
}) {
  const toast = useToast();
  const [generando, setGenerando] = useState<"descargar" | "compartir" | null>(null);

  async function pdf(accion: "descargar" | "compartir") {
    if (generando) return;
    setGenerando(accion);
    try {
      const { crearPdfDevolucion, nombreArchivoDevolucion } = await import("@/lib/devolucion-pdf");
      const archivo = await crearPdfDevolucion(devolucion);
      const nombre = nombreArchivoDevolucion(devolucion);
      if (accion === "descargar") {
        descargarArchivo(archivo, nombre);
        toast("Comprobante descargado", "success");
      } else {
        const r = await compartirArchivo(archivo, nombre, {
          titulo: `Comprobante de cambio ${numeroDevolucion(devolucion)} · PC Coca`,
          mensaje: "Comprobante de cambio de PC Coca",
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
        aria-label="Comprobante de cambio"
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-[440px] flex-col overflow-hidden rounded-lg bg-gray-100 shadow-lg"
      >
        <div className="no-imprimir flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3">
          {recienHecha ? (
            <p className="flex items-center gap-2 text-body font-semibold text-stock-ok-text">
              <CircleCheck className="size-5 text-stock-ok" /> Cambio registrado
            </p>
          ) : (
            <p className="text-body font-semibold text-ink-strong">Comprobante de cambio</p>
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
          <TicketDevolucion d={devolucion} />
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
          <Button onClick={onClose} className="self-end">
            {textoCerrar}
          </Button>
        </div>
      </div>
    </CapaImpresion>
  );
}

function Lineas({ lineas, signo = "" }: { lineas: LineaComprobante[]; signo?: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {lineas.map((l, i) => (
        <li key={`${l.codigo}-${l.presentacion}-${i}`}>
          <p className="text-body text-ink-strong">{nombreLinea(l)}</p>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-small text-ink-muted tabular">
              {l.cantidad} × {formatQ(l.precioUnitario)}
              {"estado" in l && (
                <> · {ETIQUETA_ESTADO_DEVUELTO[(l as { estado: "buen_estado" }).estado]}</>
              )}
            </span>
            <span className="text-body font-semibold whitespace-nowrap text-ink-strong tabular">
              {signo}
              {formatQ(l.subtotal)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** El ticket del cambio, tal como se imprime (72 mm en papel de 80 mm). */
export function TicketDevolucion({ d }: { d: Devolucion }) {
  const linea = <div className="my-3 border-t border-dashed border-gray-300" />;
  const fila = (etiqueta: string, valor: string) => (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-muted">{etiqueta}</dt>
      <dd className="font-medium text-ink-strong tabular">{valor}</dd>
    </div>
  );
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
        Comprobante de cambio
      </p>
      <dl className="mt-2 flex flex-col gap-0.5 text-small">
        {fila("No.", numeroDevolucion(d))}
        {fila("Fecha", fechaComprobante(d))}
        {fila("Atendió", d.atendio)}
        {d.numeroCompra && fila("Compra original", d.numeroCompra)}
        {d.autorizo && fila("Autorizó", d.autorizo.por)}
      </dl>
      {linea}
      <p className="mb-2 text-overline font-semibold tracking-wider text-navy-900 uppercase">
        Devuelve
      </p>
      <Lineas lineas={d.devuelto} signo="−" />
      <div className="mt-2 flex justify-between text-small">
        <span className="text-ink-muted">Saldo a favor</span>
        <span className="font-semibold text-ink-strong tabular">{formatQ(d.saldo)}</span>
      </div>
      {linea}
      <p className="mb-2 text-overline font-semibold tracking-wider text-navy-900 uppercase">
        Se lleva
      </p>
      <Lineas lineas={d.llevo} />
      <div className="mt-2 flex justify-between text-small">
        <span className="text-ink-muted">Total que se lleva</span>
        <span className="font-semibold text-ink-strong tabular">{formatQ(d.totalLlevo)}</span>
      </div>
      {linea}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body font-bold text-navy-900">
          {d.diferencia > 0 ? "PAGÓ" : "CAMBIO EXACTO"}
        </span>
        <span className="text-kpi font-bold whitespace-nowrap text-navy-900 tabular">
          {formatQ(d.diferencia)}
        </span>
      </div>
      {linea}
      <p className="text-center text-badge text-ink-muted">
        Documento interno, no es factura. No se devuelve dinero.
      </p>
      <p className="mt-1.5 text-center text-body font-semibold text-navy-900">
        ¡Gracias por su preferencia!
      </p>
    </div>
  );
}
