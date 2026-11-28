import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FichaCliente } from "@/components/clientes/FichaCliente";
import { obtenerFichaCliente } from "@/lib/api-clientes";

export const metadata: Metadata = { title: "Cliente frecuente" };

/** Ficha del cliente: datos, contraseñas (tapadas), archivos y notas. */
export default async function Page({ params }: PageProps<"/paola/clientes/[id]">) {
  await connection();
  const { id } = await params;
  const ficha = await obtenerFichaCliente("paola", id);
  if (!ficha) notFound();
  return <FichaCliente {...ficha} base="/paola/clientes" />;
}
