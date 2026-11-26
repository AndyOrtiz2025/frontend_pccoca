import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Reportes mensuales" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Ganancia, ventas por línea, gastos editables, más y menos vendidos, mermas y compras."
      referencia="Pantalla 23"
    />
  );
}
