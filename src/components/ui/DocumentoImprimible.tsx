"use client";

import { useEffect, type ReactNode } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "./Button";
import { CapaImpresion } from "./CapaImpresion";

interface DocumentoImprimibleProps {
  /** Ej. "Estado de cuenta" o "Comprobante de pago". */
  titulo: string;
  /** Línea pequeña bajo el título (fecha, a quién atendió…). */
  subtitulo?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  /** Botones extra (ej. "Nueva venta"). */
  acciones?: ReactNode;
}

/**
 * Documento para imprimir o guardar en PDF (en la ventana de impresión: "Guardar como PDF").
 * Solo se imprime lo que está dentro de .zona-impresion (ver globals.css).
 */
export function DocumentoImprimible({
  titulo,
  subtitulo,
  children,
  onClose,
  acciones,
}: DocumentoImprimibleProps) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <CapaImpresion>
      <div aria-hidden className="no-imprimir absolute inset-0 bg-navy-950/55" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="zona-impresion relative flex max-h-[calc(100vh-2rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-lg bg-white shadow-lg"
      >
        <div className="flex items-start justify-between gap-4 bg-grad-hero px-6 py-5 text-white print:border-b-2 print:border-navy-900 print:bg-none print:px-0 print:text-navy-900">
          <div>
            <p className="text-[17px] font-semibold">
              PC Coca<span className="text-gold-500">.</span>
            </p>
            <p className="text-small text-navy-300 print:text-ink-muted">San Pedro Necta</p>
          </div>
          <div className="text-right">
            <p className="text-body font-semibold">{titulo}</p>
            {subtitulo && (
              <div className="text-small text-navy-300 print:text-ink-muted">{subtitulo}</div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 print:px-0">{children}</div>
        <div className="no-imprimir flex flex-wrap justify-end gap-2 border-t border-gray-200 px-6 py-3.5">
          <Button variant="secondary" onClick={onClose}>
            <X /> Cerrar
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir o guardar PDF
          </Button>
          {acciones}
        </div>
      </div>
    </CapaImpresion>
  );
}
