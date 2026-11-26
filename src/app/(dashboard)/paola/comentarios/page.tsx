import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Comentarios" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Bandeja de comentarios de los empleados."
      referencia="Pantalla 24"
    />
  );
}
