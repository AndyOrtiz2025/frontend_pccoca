import type { Metadata } from "next";
import { CatalogoTramitesAdmin } from "@/components/tramites/CatalogoTramitesAdmin";
import { obtenerModulosTramite, obtenerTramitesAdmin } from "@/lib/api";

export const metadata: Metadata = { title: "Trámites" };

/** Pantalla 20: catálogo de trámites con edición (módulos, requisitos y precios). */
export default async function Page() {
  const [modulos, tramites] = await Promise.all([
    obtenerModulosTramite(),
    obtenerTramitesAdmin("paola"),
  ]);
  return <CatalogoTramitesAdmin modulos={modulos} tramites={tramites} />;
}
