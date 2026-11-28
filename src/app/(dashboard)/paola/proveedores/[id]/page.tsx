import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DetalleProveedorVista } from "@/components/proveedores/DetalleProveedorVista";
import { obtenerDetalleProveedor, obtenerProductosAdmin } from "@/lib/api";

export const metadata: Metadata = { title: "Proveedor" };

/** Pantalla 18: detalle del proveedor, su historial de compras y reclamos. */
export default async function Page({ params }: PageProps<"/paola/proveedores/[id]">) {
  // Usa la hora actual (compras del mes, quién pasa hoy): se arma en cada visita.
  await connection();
  const { id } = await params;
  const [detalle, libreria, varios] = await Promise.all([
    obtenerDetalleProveedor("paola", id),
    obtenerProductosAdmin("paola", "libreria"),
    obtenerProductosAdmin("paola", "varios"),
  ]);
  if (!detalle) notFound();
  return (
    <DetalleProveedorVista
      detalle={detalle}
      productos={[...libreria, ...varios]}
      base="/paola/proveedores"
      categorias={["libreria", "varios"]}
      basePedidos="/paola/pedidos"
    />
  );
}
