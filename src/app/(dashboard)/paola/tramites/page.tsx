import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Trámites" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Catálogo de trámites con edición: agregar módulos y trámites."
      referencia="Pantalla 20"
    />
  );
}
