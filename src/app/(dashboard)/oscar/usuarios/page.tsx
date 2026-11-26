import type { Metadata } from "next";
import { EnConstruccion } from "@/components/layout/EnConstruccion";

export const metadata: Metadata = { title: "Usuarios" };

export default function Page() {
  return (
    <EnConstruccion
      descripcion="Crear empleados, asignarles usuario y contraseña, editar sus datos, cambiar contraseña y desactivarlos."
      referencia="Nueva (sin pantalla en el prototipo)"
    />
  );
}
