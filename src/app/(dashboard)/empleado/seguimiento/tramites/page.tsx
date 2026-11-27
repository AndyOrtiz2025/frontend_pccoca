import type { Metadata } from "next";
import { Seguimiento } from "@/components/seguimiento/Seguimiento";
import { obtenerProcesos } from "@/lib/api";

export const metadata: Metadata = { title: "Seguimiento" };

export default async function Page() {
  const procesos = (await obtenerProcesos("empleado")).filter((p) => p.tipo === "tramite");
  return <Seguimiento procesos={procesos} tipo="tramite" />;
}
