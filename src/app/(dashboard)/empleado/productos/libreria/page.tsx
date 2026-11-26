import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Librería" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Catálogo de Librería para vender, con carrito, semáforo de stock, mayoreo y lector de código de barras."
      referencia="Pantallas 5 y 6"
    />
  );
}
