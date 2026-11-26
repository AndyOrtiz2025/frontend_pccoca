import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Inventario" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Inventario de Tecnología: stock, mínimos, valor del inventario y mermas del mes."
      referencia="Pantalla 28"
    />
  );
}
