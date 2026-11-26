import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Ventas de tecnología de hoy, servicios en proceso, entradas sin leer y stock bajo."
      referencia="Pantalla 26"
    />
  );
}
