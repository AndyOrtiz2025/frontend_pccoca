import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Pendientes" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Registro de fiados y préstamos, separado por organizaciones y clientes individuales."
      referencia="Pantalla 11"
    />
  );
}
