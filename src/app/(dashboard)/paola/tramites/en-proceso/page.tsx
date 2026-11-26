import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Trámites en proceso" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Seguimiento de trámites con estados Recibido, En proceso y Listo para entregar."
      referencia="Pantalla 22"
    />
  );
}
