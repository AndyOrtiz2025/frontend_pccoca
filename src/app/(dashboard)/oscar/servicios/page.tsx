import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Servicios Técnicos" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Catálogo de servicios técnicos con agregar, editar y eliminar."
      referencia="Pantalla 10"
    />
  );
}
