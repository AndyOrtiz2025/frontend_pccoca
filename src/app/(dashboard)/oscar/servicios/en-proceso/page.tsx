import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Servicios en proceso" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Equipos en reparación con estados Recibido, En proceso y Listo para entregar."
      referencia="Pantalla 29"
    />
  );
}
