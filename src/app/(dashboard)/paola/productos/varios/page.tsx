import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Productos Varios" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Administración de Productos Varios."
      referencia="Pantallas 15 y 16"
    />
  );
}
