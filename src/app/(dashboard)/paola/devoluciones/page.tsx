import type { Metadata } from "next";
import { connection } from "next/server";
import { ListaDevoluciones } from "@/components/devoluciones/ListaDevoluciones";
import { obtenerDevoluciones } from "@/lib/api";

export const metadata: Metadata = { title: "Devoluciones" };

/** Devoluciones de clientes que hicieron los empleados. */
export default async function Page() {
  // Usa la fecha actual (las del mes): se arma en cada visita.
  await connection();
  return <ListaDevoluciones devoluciones={await obtenerDevoluciones("paola")} />;
}
