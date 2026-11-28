import type { Metadata } from "next";
import { connection } from "next/server";
import { ListaPedidos } from "@/components/pedidos/ListaPedidos";
import { obtenerPedidos, obtenerProveedores } from "@/lib/api";

export const metadata: Metadata = { title: "Pedidos" };

/** Pedidos a proveedores de Librería y Productos Varios. */
export default async function Page() {
  // Usa la fecha actual (recibidos del mes, quién pasa hoy): se arma en cada visita.
  await connection();
  const [pedidos, proveedores] = await Promise.all([obtenerPedidos("paola"), obtenerProveedores()]);
  return <ListaPedidos pedidos={pedidos} proveedores={proveedores} base="/paola/pedidos" />;
}
