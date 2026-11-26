import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Seguimiento" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Servicios técnicos en curso con su estado; aquí se marcan como Entregado."
      referencia="Pantalla 12"
    />
  );
}
