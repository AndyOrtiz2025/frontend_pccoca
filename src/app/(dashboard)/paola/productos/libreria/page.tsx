import type { Metadata } from "next";
import { InventarioAdmin } from "@/components/inventario/InventarioAdmin";
import {
  obtenerProductosAdmin,
  obtenerProveedores,
  obtenerSubcategorias,
  sugerirCodigo,
} from "@/lib/api";

export const metadata: Metadata = { title: "Librería" };

/** Pantalla 15: administración de productos de Librería (precios, costos y stock exacto). */
export default async function Page() {
  const [productos, proveedores, codigoSugerido, subcategorias] = await Promise.all([
    obtenerProductosAdmin("paola", "libreria"),
    obtenerProveedores(),
    sugerirCodigo("paola", "libreria"),
    obtenerSubcategorias("paola", "libreria"),
  ]);
  return (
    <InventarioAdmin
      productos={productos}
      categoria="libreria"
      proveedores={proveedores}
      codigoSugerido={codigoSugerido}
      subcategorias={subcategorias}
    />
  );
}
