import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Entradas de servicio técnico" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Bandeja de equipos registrados por los empleados, con el botón para convertirlos en servicio en proceso."
      referencia="Pantalla 21 (versión servicios)"
    />
  );
}
