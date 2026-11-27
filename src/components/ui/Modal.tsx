"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** 480px por defecto; 720px para formularios grandes (producto, proveedor, compra). */
  size?: "sm" | "md" | "lg";
}

const anchos = { sm: "max-w-[420px]", md: "max-w-[480px]", lg: "max-w-[720px]" };

/** Modal (sección 7.8): blanco, radio 10px, capa rgba(11,20,38,0.55). Cierra con Esc. */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const tituloId = useId();
  const panel = useRef<HTMLDivElement>(null);
  // onClose se guarda en una ref: si el padre pasa una función nueva en cada render,
  // el efecto NO se vuelve a ejecutar (antes eso le quitaba el foco al campo en cada letra).
  const cerrar = useRef(onClose);
  useEffect(() => {
    cerrar.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement as HTMLElement | null;
    // Solo enfoca el panel si el contenido no puso el foco en un campo (autoFocus).
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && cerrar.current();
    document.addEventListener("keydown", alPresionar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden className="absolute inset-0 bg-navy-950/55" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-lg bg-white shadow-lg focus:shadow-lg",
          anchos[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div>
            <h2 id={tituloId} className="text-h2 font-semibold text-ink-strong">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-small text-ink-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 flex size-7 items-center justify-center rounded-xs text-ink-muted hover:bg-gray-100 hover:text-navy-900"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
