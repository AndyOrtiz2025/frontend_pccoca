"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AlertTone } from "./Alert";

interface ToastItem {
  id: number;
  message: string;
  tone: AlertTone;
}

const barra: Record<AlertTone, string> = {
  info: "before:bg-gold-500",
  success: "before:bg-stock-ok",
  warning: "before:bg-stock-low",
  danger: "before:bg-stock-out",
};

const ToastContext = createContext<((message: string, tone?: AlertTone) => void) | null>(null);

/** Toast (sección 7.7): abajo a la derecha, fondo azul medianoche, se cierra a los 4 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const cerrar = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (message: string, tone: AlertTone = "info") => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => cerrar(id), 4000);
    },
    [cerrar],
  );

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div aria-live="polite" className="fixed right-6 bottom-6 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "relative flex min-w-[280px] items-center gap-3 overflow-hidden rounded-md bg-navy-900 py-3 pr-2 pl-4 text-body text-white shadow-lg",
              "before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
              barra[t.tone],
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => cerrar(t.id)}
              aria-label="Cerrar"
              className="flex size-7 items-center justify-center rounded-xs text-navy-300 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
