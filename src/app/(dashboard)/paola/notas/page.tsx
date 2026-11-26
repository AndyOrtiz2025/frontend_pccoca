import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Block de notas" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Notas libres en tarjetas, con buscador por título."
      referencia="Pantalla 25"
    />
  );
}
