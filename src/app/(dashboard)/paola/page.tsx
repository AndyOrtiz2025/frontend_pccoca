import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Ventas de hoy, pendientes, entradas sin leer, stock bajo y el resumen del día."
      referencia="Pantalla 14"
    />
  );
}
