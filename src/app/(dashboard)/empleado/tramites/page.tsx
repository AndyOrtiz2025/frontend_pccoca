import type { Metadata } from "next";
import { CatalogoTramites } from "@/components/tramites/CatalogoTramites";
import { obtenerModulosTramite, obtenerTramites } from "@/lib/api";

export const metadata: Metadata = { title: "Trámites" };

export default async function Page() {
  const [modulos, tramites] = await Promise.all([obtenerModulosTramite(), obtenerTramites()]);
  return <CatalogoTramites modulos={modulos} tramites={tramites} />;
}
