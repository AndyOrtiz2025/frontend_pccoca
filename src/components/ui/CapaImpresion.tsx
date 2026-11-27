"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Pone una ventana con documento imprimible directamente en <body>. Al imprimir, globals.css
 * oculta el resto de la página: sale una sola hoja, sin repetir el documento.
 */
export function CapaImpresion({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="capa-impresion fixed inset-0 z-50 flex items-center justify-center p-4">
      {children}
    </div>,
    document.body,
  );
}
