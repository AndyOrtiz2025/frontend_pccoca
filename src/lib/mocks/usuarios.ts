import type { Empleado } from "@/types/usuario";

/** Empleados de prueba para la pantalla "Usuarios" de Oscar. */
export const EMPLEADOS_DEMO: Empleado[] = [
  {
    id: "u-1",
    usuario: "carlos",
    nombre: "Carlos",
    telefono: "5555-1020",
    activo: true,
    creado: "2026-11-01",
    ultimoAcceso: "2026-11-26T08:02:00-06:00",
  },
  {
    id: "u-2",
    usuario: "ana",
    nombre: "Ana",
    activo: true,
    creado: "2026-11-01",
    ultimoAcceso: "2026-11-25T17:40:00-06:00",
  },
  { id: "u-3", usuario: "luis", nombre: "Luis", activo: false, creado: "2026-06-10" },
];
