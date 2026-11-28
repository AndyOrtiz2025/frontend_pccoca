import type { Metadata } from "next";
import { connection } from "next/server";
import { ListaProveedores } from "@/components/proveedores/ListaProveedores";
import { obtenerProductosAdmin, obtenerProveedoresAdmin } from "@/lib/api";

export const metadata: Metadata = { title: "Proveedores" };

/** Pantalla 17: proveedores de Librería y Productos Varios. */
export default async function Page() {
  // Usa la hora actual (compras del mes, quién pasa hoy): se arma en cada visita.
  await connection();
  const [proveedores, libreria, varios] = await Promise.all([
    obtenerProveedoresAdmin("paola"),
    obtenerProductosAdmin("paola", "libreria"),
    obtenerProductosAdmin("paola", "varios"),
  ]);
  return (
    <ListaProveedores
      proveedores={proveedores}
      productos={[...libreria, ...varios]}
      base="/paola/proveedores"
      categorias={["libreria", "varios"]}
    />
  );
}
