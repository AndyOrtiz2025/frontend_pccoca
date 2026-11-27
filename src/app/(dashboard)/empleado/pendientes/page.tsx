import type { Metadata } from "next";
import { Pendientes } from "@/components/pendientes/Pendientes";
import { obtenerPendientes } from "@/lib/api";

export const metadata: Metadata = { title: "Pendientes" };

export default async function Page() {
  return <Pendientes pendientes={await obtenerPendientes("empleado")} />;
}
