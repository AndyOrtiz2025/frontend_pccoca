import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Librería" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Administración de productos de Librería: precios, mayoreo, costo, margen, fraccionables y códigos de barras."
      referencia="Pantallas 15 y 16"
    />
  );
}
