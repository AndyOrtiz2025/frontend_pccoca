import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Proveedores" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Proveedores de Tecnología y registro de compras."
      referencia="Pantallas 17, 18 y 19"
    />
  );
}
