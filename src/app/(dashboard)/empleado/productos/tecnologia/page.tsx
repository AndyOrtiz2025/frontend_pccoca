import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Tecnología" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Catálogo de Tecnología para vender, con precios fijos y semáforo de stock."
      referencia="Pantalla 5"
    />
  );
}
