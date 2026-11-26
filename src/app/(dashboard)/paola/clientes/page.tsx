import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Clientes frecuentes" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Datos, contraseñas cifradas, archivos y notas de los clientes de trámites."
      referencia="Pantalla 25-B"
    />
  );
}
