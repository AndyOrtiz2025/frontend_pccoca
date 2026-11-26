"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Recibe el id para conectarlo al input (accesibilidad). */
  children: (id: string, describedBy?: string) => ReactNode;
}

/** Etiqueta + control + mensaje de ayuda o error (sección 7.5). */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const mensajeId = `${id}-msg`;
  const mensaje = error ?? hint;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      {children(id, mensaje ? mensajeId : undefined)}
      {mensaje && (
        <p id={mensajeId} className={cn("text-small", error ? "text-stock-out" : "text-ink-muted")}>
          {mensaje}
        </p>
      )}
    </div>
  );
}
