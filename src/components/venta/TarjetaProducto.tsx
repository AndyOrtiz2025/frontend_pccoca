"use client";

import { Plus } from "lucide-react";
import { Button, Chip, StockChip } from "@/components/ui";
import { formatQ } from "@/lib/format";
import { cantidadCon, nombrePaquete } from "@/lib/presentacion";
import { admiteMayoreo } from "@/lib/reglas/precios";
import type { ProductoVenta } from "@/types/producto";
import { ImagenProducto } from "./ImagenProducto";

/** Tarjeta del catálogo de venta (pantalla 5). Nunca muestra la cantidad exacta de stock. */
export function TarjetaProducto({
  producto,
  onAgregar,
}: {
  producto: ProductoVenta;
  onAgregar: () => void;
}) {
  const d = producto.disponibilidad;
  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative">
        <ImagenProducto
          categoria={producto.categoria}
          nombre={producto.nombre}
          imagenUrl={producto.imagenUrl}
          className="aspect-[4/3] w-full"
        />
        {producto.fraccionable && (
          <Chip tono="bg-white/90 text-navy-900 shadow-sm" className="absolute top-2 left-2">
            Unidad / {nombrePaquete(producto)}
          </Chip>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-body leading-tight font-semibold text-ink-strong">{producto.nombre}</h3>
        <p className="text-badge text-ink-muted tabular">{producto.codigo}</p>
        <p className="mt-1 text-price font-semibold text-ink-strong tabular">
          {formatQ(producto.precio)}
        </p>
        {producto.mayoreo && admiteMayoreo(producto) && (
          <p className="text-small text-ink-muted tabular">
            Desde {producto.mayoreo.desde} u.: {formatQ(producto.mayoreo.precio)}
          </p>
        )}
        {producto.fraccionable && (
          <p className="text-small text-ink-muted tabular">
            {nombrePaquete(producto)} ({producto.fraccionable.unidadesPorPaquete} u.):{" "}
            {formatQ(producto.fraccionable.precioPaquete)}
          </p>
        )}
        {producto.fraccionable?.mayoreoPaquete && admiteMayoreo(producto) && (
          <p className="text-small text-ink-muted tabular">
            Desde {cantidadCon(producto, "paquete", producto.fraccionable.mayoreoPaquete.desde)}:{" "}
            {formatQ(producto.fraccionable.mayoreoPaquete.precio)} c/u
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <StockChip nivel={d.nivel} disponible={d.agotado ? 0 : 1} />
          <Button
            size="sm"
            onClick={onAgregar}
            disabled={d.agotado}
            aria-label={`Agregar ${producto.nombre}`}
          >
            <Plus /> Agregar
          </Button>
        </div>
      </div>
    </article>
  );
}
