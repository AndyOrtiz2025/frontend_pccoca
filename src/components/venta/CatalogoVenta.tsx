"use client";

import { useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import { Card, SearchInput, Select } from "@/components/ui";
import { buscarProductos } from "@/lib/reglas/busqueda";
import type { Categoria } from "@/types/producto";
import { PanelCarrito } from "./PanelCarrito";
import { TarjetaProducto } from "./TarjetaProducto";
import { useVenta } from "./VentaContext";

type Orden = "nombre" | "precio_asc" | "precio_desc";

/** Pantalla 5: catálogo de una categoría para vender, con el carrito fijo a la derecha. */
export function CatalogoVenta({ categoria }: { categoria: Categoria }) {
  const { productos, abrirProducto, abrirPorCodigo } = useVenta();
  const [consulta, setConsulta] = useState("");
  const [sub, setSub] = useState("todas");
  const [orden, setOrden] = useState<Orden>("nombre");

  const deCategoria = useMemo(
    () => productos.filter((p) => p.categoria === categoria),
    [productos, categoria],
  );
  const subcategorias = useMemo(
    () => [...new Set(deCategoria.map((p) => p.subcategoria).filter(Boolean))].sort() as string[],
    [deCategoria],
  );

  const visibles = useMemo(() => {
    const filtrados = buscarProductos(
      deCategoria.filter((p) => sub === "todas" || p.subcategoria === sub),
      consulta,
    );
    if (consulta.trim()) return filtrados; // con búsqueda, el orden es por relevancia
    return [...filtrados].sort((a, b) =>
      orden === "nombre"
        ? a.nombre.localeCompare(b.nombre, "es")
        : orden === "precio_asc"
          ? a.precio - b.precio
          : b.precio - a.precio,
    );
  }, [deCategoria, sub, consulta, orden]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Productos" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            aria-label="Buscar en esta categoría"
            placeholder="Buscar por nombre o código"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && abrirPorCodigo(consulta)) setConsulta("");
            }}
            className="min-w-56 flex-1"
          />
          <Select
            aria-label="Subcategoría"
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            className="w-48"
          >
            <option value="todas">Todas las subcategorías</option>
            {subcategorias.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Ordenar"
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="w-44"
          >
            <option value="nombre">Nombre (A–Z)</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
          </Select>
        </div>

        {visibles.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <PackageSearch className="size-8 text-gray-300" strokeWidth={1.5} />
            <p className="text-body text-ink-muted">No se encontraron productos.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
            {visibles.map((p) => (
              <TarjetaProducto key={p.id} producto={p} onAgregar={() => abrirProducto(p)} />
            ))}
          </div>
        )}
      </section>

      <aside
        aria-label="Carrito"
        className="xl:sticky xl:top-[calc(var(--spacing-topbar)+1.5rem)] xl:self-start"
      >
        <PanelCarrito className="xl:max-h-[calc(100vh-var(--spacing-topbar)-3rem)]" />
      </aside>
    </div>
  );
}
