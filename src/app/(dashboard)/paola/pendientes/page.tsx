import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Pendientes" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Vista en tiempo real (solo lectura) de los fiados que registran los empleados."
      referencia="Pantalla 11"
    />
  );
}
