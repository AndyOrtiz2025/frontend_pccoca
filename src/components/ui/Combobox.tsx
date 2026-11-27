"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { normalizar } from "@/lib/reglas/busqueda";
import { Input } from "./Input";

/**
 * Campo de texto con sugerencias en una lista blanca propia (el <datalist> de Chrome sale negro
 * y no se puede cambiar). Se puede elegir una opción o escribir una nueva.
 */
export function Combobox({
  id,
  value,
  onChange,
  opciones,
  placeholder,
  maxLength,
  "aria-describedby": describedBy,
}: {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  opciones: string[];
  placeholder?: string;
  maxLength?: number;
  "aria-describedby"?: string;
}) {
  const listaId = useId();
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(-1);
  const input = useRef<HTMLInputElement>(null);

  const filtradas = useMemo(() => {
    const q = normalizar(value);
    // Si lo escrito ya es una opción exacta, se muestran todas para poder cambiar.
    if (!q || opciones.some((o) => normalizar(o) === q)) return opciones;
    return opciones.filter((o) => normalizar(o).includes(q));
  }, [opciones, value]);

  const visible = abierto && filtradas.length > 0;

  function elegir(o: string) {
    onChange(o);
    setAbierto(false);
    setActiva(-1);
  }

  return (
    <div className="relative">
      <Input
        ref={input}
        id={id}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={visible && activa >= 0 ? `${listaId}-${activa}` : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        className="pr-8"
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
          setActiva(-1);
        }}
        onFocus={() => setAbierto(true)}
        // Se cierra después del clic en una opción (el mousedown de la opción va primero).
        onBlur={() => setAbierto(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAbierto(true);
            setActiva((i) => Math.min(i + 1, filtradas.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiva((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && visible && activa >= 0) {
            e.preventDefault();
            elegir(filtradas[activa]!);
          } else if (e.key === "Escape" && visible) {
            // No cierra la ventana completa: solo la lista.
            e.stopPropagation();
            setAbierto(false);
          }
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Ver opciones"
        onMouseDown={(e) => {
          e.preventDefault();
          setAbierto((a) => !a);
          input.current?.focus();
        }}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-ink-muted"
      >
        <ChevronDown className="size-4" />
      </button>
      {visible && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-sm border border-gray-200 bg-white py-1 shadow-md"
        >
          {filtradas.map((o, i) => (
            <li
              key={o}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={o === value}
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(o);
              }}
              onMouseEnter={() => setActiva(i)}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-body text-ink",
                i === activa && "bg-gray-100",
                o === value && "font-semibold text-navy-900",
              )}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
