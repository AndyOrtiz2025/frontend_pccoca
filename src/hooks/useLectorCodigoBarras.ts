"use client";

import { useEffect, useRef } from "react";

/**
 * Lector de código de barras USB (funciona como un teclado muy rápido que termina con Enter).
 * Si NO hay ningún campo de texto con el foco, junta las teclas que llegan seguidas
 * (menos de 50 ms entre una y otra) y, al recibir Enter, entrega el código.
 * Si el foco está en un campo (ej. el buscador), el campo lo recibe normalmente.
 */
export function useLectorCodigoBarras(alLeer: (codigo: string) => void, activo = true) {
  const buffer = useRef("");
  const ultima = useRef(0);
  const callback = useRef(alLeer);

  useEffect(() => {
    callback.current = alLeer;
  }, [alLeer]);

  useEffect(() => {
    if (!activo) return;
    function alPresionar(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const ahora = performance.now();
      if (ahora - ultima.current > 50) buffer.current = "";
      ultima.current = ahora;

      if (e.key === "Enter") {
        if (buffer.current.length >= 4) {
          e.preventDefault();
          callback.current(buffer.current);
        }
        buffer.current = "";
      } else if (e.key.length === 1) {
        buffer.current += e.key;
      }
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [activo]);
}
