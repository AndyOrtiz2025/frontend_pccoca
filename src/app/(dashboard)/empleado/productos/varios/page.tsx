import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Productos Varios" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Catálogo de Productos Varios: juguetes, marcos, pitas, adornos."
      referencia="Pantalla 5"
    />
  );
}
