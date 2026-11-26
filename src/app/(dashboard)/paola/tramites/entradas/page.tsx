import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Entradas de trámite" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Bandeja de entradas enviadas por los empleados, con el botón para convertirlas en trámite en proceso."
      referencia="Pantalla 21"
    />
  );
}
