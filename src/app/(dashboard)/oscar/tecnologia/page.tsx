import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Tecnología" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Administración de productos de Tecnología: precio fijo, costo, margen, stock y códigos de barras."
      referencia="Pantalla 27"
    />
  );
}
