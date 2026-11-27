import type { Metadata } from "next";
import { InventarioAdmin } from "@/components/inventario/InventarioAdmin";
import {
  obtenerProductosAdmin,
  obtenerProveedores,
  obtenerSubcategorias,
  sugerirCodigo,
} from "@/lib/api";

export const metadata: Metadata = { title: "Productos Varios" };

/** Pantalla 15: administración de productos de Productos Varios (precios, costos y stock exacto). */
export default async function Page() {
  const [productos, proveedores, codigoSugerido, subcategorias] = await Promise.all([
    obtenerProductosAdmin("paola", "varios"),
    obtenerProveedores(),
    sugerirCodigo("paola", "varios"),
    obtenerSubcategorias("paola", "varios"),
  ]);
  return (
    <InventarioAdmin
      productos={productos}
      categoria="varios"
      proveedores={proveedores}
      codigoSugerido={codigoSugerido}
      subcategorias={subcategorias}
    />
  );
}
