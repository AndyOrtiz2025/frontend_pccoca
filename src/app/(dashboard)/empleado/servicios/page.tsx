import type { Metadata } from "next";
import { CatalogoServicios } from "@/components/servicios/CatalogoServicios";
import { obtenerServicios } from "@/lib/api";

export const metadata: Metadata = { title: "Servicios Técnicos" };

export default async function Page() {
  return <CatalogoServicios servicios={await obtenerServicios("empleado")} />;
}
