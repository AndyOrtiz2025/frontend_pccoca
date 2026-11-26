import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Tus ventas de hoy, accesos rápidos y los trámites o servicios listos para entregar."
      referencia="Pantalla 4"
    />
  );
}
