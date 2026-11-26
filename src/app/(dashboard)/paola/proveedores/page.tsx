import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Proveedores" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Lista de proveedores, detalle con historial de compras y registro de reabastecimiento."
      referencia="Pantallas 17, 18 y 19"
    />
  );
}
