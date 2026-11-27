import type { Metadata } from "next";
import { BandejaEntradas } from "@/components/entradas/BandejaEntradas";
import { obtenerEntradas } from "@/lib/api";

export const metadata: Metadata = { title: "Entradas de trámite" };

/** Pantalla 22: lo que el mostrador mandó a Paola (datos del cliente y archivos incluidos). */
export default async function Page() {
  const entradas = await obtenerEntradas("paola");
  return <BandejaEntradas entradas={entradas} enProcesoHref="/paola/tramites/en-proceso" />;
}
