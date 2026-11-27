"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileImage, FileText, Upload, X } from "lucide-react";
import { EXTENSIONES_ACEPTADAS, MAX_ARCHIVOS, validarArchivoCliente } from "@/lib/archivos";
import { cn } from "@/lib/cn";

function tamano(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface SubirArchivosProps {
  archivos: File[];
  onChange: (archivos: File[]) => void;
  className?: string;
}

/** Zona para arrastrar o elegir archivos (PDF, JPG, PNG, WEBP; hasta 5 de 5 MB). */
export function SubirArchivos({ archivos, onChange, className }: SubirArchivosProps) {
  const input = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function agregar(lista: FileList | null) {
    if (!lista) return;
    const nuevos = [...lista];
    const invalido = nuevos.map(validarArchivoCliente).find(Boolean);
    if (invalido) return setError(invalido);
    // Evita repetir el mismo archivo si lo eligen dos veces.
    const unicos = nuevos.filter(
      (n) => !archivos.some((a) => a.name === n.name && a.size === n.size),
    );
    if (archivos.length + unicos.length > MAX_ARCHIVOS)
      return setError(`Máximo ${MAX_ARCHIVOS} archivos`);
    setError(null);
    onChange([...archivos, ...unicos]);
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setEncima(false);
    agregar(e.dataTransfer.files);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={soltar}
        disabled={archivos.length >= MAX_ARCHIVOS}
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-md border border-dashed px-4 py-5 text-center transition-colors disabled:opacity-45",
          encima
            ? "border-gold-500 bg-gold-50"
            : "border-gray-300 hover:border-navy-300 hover:bg-gray-100",
        )}
      >
        <Upload className="size-5 text-navy-900" />
        <span className="text-body text-ink">
          Arrastra archivos aquí o{" "}
          <span className="font-semibold text-navy-900 underline">elige desde tu equipo</span>
        </span>
        <span className="text-small text-ink-muted">
          PDF, JPG, PNG o WEBP · hasta {MAX_ARCHIVOS} archivos de 5 MB
        </span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={EXTENSIONES_ACEPTADAS}
        className="hidden"
        onChange={(e) => {
          agregar(e.target.files);
          e.target.value = ""; // permite volver a elegir el mismo archivo después de quitarlo
        }}
      />
      {error && <p className="text-small text-stock-out">{error}</p>}
      {archivos.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {archivos.map((a, i) => {
            const Icono = a.name.toLowerCase().endsWith(".pdf") ? FileText : FileImage;
            return (
              <li
                key={`${a.name}-${a.size}`}
                className="flex items-center gap-2.5 rounded-sm border border-gray-200 px-3 py-2"
              >
                <Icono className="size-4 shrink-0 text-navy-900" />
                <span className="min-w-0 flex-1 truncate text-body text-ink">{a.name}</span>
                <span className="text-small text-ink-muted tabular">{tamano(a.size)}</span>
                <button
                  type="button"
                  aria-label={`Quitar ${a.name}`}
                  onClick={() => onChange(archivos.filter((_, j) => j !== i))}
                  className="flex size-6 items-center justify-center rounded-xs text-ink-muted hover:bg-stock-out-bg hover:text-stock-out"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
