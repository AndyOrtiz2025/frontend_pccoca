"use client";

import { useId, useMemo, useState } from "react";
import { SearchInput, StockChip } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatQ } from "@/lib/format";
import { buscarPorCodigo, buscarProductos } from "@/lib/reglas/busqueda";
import { useVenta } from "./VentaContext";

/**
 * Buscador de la barra superior (Empleado). Sugiere mientras escribes; con Enter abre el producto.
 * Un lector de código de barras escribe el código + Enter, así que también funciona aquí.
 */
export function BuscadorProductos({ className }: { className?: string }) {
  const { productos, abrirProducto, escanear } = useVenta();
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const listaId = useId();

  const resultados = useMemo(
    () => (consulta.trim() ? buscarProductos(productos, consulta).slice(0, 6) : []),
    [productos, consulta],
  );

  function elegir(i: number) {
    const p = resultados[i];
    if (p) abrirProducto(p);
    setConsulta("");
    setAbierto(false);
  }

  return (
    <div className={cn("relative", className)}>
      <SearchInput
        role="combobox"
        aria-label="Buscar producto o código"
        aria-expanded={abierto && resultados.length > 0}
        aria-controls={listaId}
        aria-activedescendant={resultados[activo] ? `${listaId}-${activo}` : undefined}
        placeholder="Buscar producto o código"
        value={consulta}
        onChange={(e) => {
          setConsulta(e.target.value);
          setAbierto(true);
          setActivo(0);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo((a) => Math.min(a + 1, resultados.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            // Código exacto (lector o tecleado) primero; si no, el resultado marcado.
            const porCodigo = buscarPorCodigo(productos, consulta);
            if (porCodigo) {
              escanear(consulta);
              setConsulta("");
              setAbierto(false);
            } else if (resultados.length) elegir(activo);
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
      />
      {abierto && consulta.trim() && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-40 mt-1 max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-md"
        >
          {resultados.length === 0 ? (
            <li className="px-3 py-2.5 text-small text-ink-muted">
              Sin resultados para “{consulta}”
            </li>
          ) : (
            resultados.map((p, i) => (
              <li
                key={p.id}
                id={`${listaId}-${i}`}
                role="option"
                aria-selected={i === activo}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(i);
                }}
                onMouseEnter={() => setActivo(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2",
                  i === activo && "bg-gold-50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-ink-strong">{p.nombre}</p>
                  <p className="text-badge text-ink-muted tabular">
                    {p.codigo} · {formatQ(p.precio)}
                  </p>
                </div>
                <StockChip
                  nivel={p.disponibilidad.nivel}
                  disponible={p.disponibilidad.agotado ? 0 : 1}
                />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
