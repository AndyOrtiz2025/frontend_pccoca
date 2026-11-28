import type { Metadata } from "next";
import { connection } from "next/server";
import { ListaClientes } from "@/components/clientes/ListaClientes";
import { obtenerClientes } from "@/lib/api-clientes";

export const metadata: Metadata = { title: "Clientes frecuentes" };

/** Pantalla 25-B: clientes frecuentes de trámites (solo Paola). */
export default async function Page() {
  // Datos que cambian a cada rato: se arman en cada visita.
  await connection();
  const clientes = await obtenerClientes("paola");
  return <ListaClientes clientes={clientes} base="/paola/clientes" />;
}
