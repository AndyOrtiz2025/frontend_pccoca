import type { ClienteFrecuente } from "@/types/cliente";

/** Clientes de trámites de ejemplo (datos inventados). */
export const CLIENTES_DEMO: ClienteFrecuente[] = [
  {
    id: "cf-1",
    nombre: "Ana Ramírez",
    datos: [
      { id: "dc-1", nombre: "DPI", valor: "1588 25684 1306" },
      { id: "dc-2", nombre: "NIT", valor: "4492019-2" },
      { id: "dc-3", nombre: "Teléfono", valor: "5412-8890" },
    ],
    contrasenas: [
      {
        id: "pc-1",
        servicio: "Agencia Virtual SAT",
        usuario: "4492019-2",
        contrasena: "Sat#Ana2026",
        actualizada: "2026-10-02T15:30:00.000Z",
      },
      {
        id: "pc-2",
        servicio: "Correo Gmail",
        usuario: "ana.ramirez@gmail.com",
        contrasena: "AnaR.1990",
        nota: "La recuperación llega a su teléfono",
        actualizada: "2026-08-14T17:00:00.000Z",
      },
    ],
    archivos: [],
    notas: [
      {
        id: "nc-1",
        texto: "Presenta IVA cada mes, viene los primeros días.",
        fecha: "2026-09-05T16:00:00.000Z",
      },
    ],
    activo: true,
    creado: "2026-06-10T15:00:00.000Z",
    actualizado: "2026-10-02T15:30:00.000Z",
  },
  {
    id: "cf-2",
    nombre: "Pedro Gómez",
    datos: [
      { id: "dc-4", nombre: "Teléfono", valor: "4021-7733" },
      { id: "dc-5", nombre: "Contador", valor: "Lic. Mario Pérez" },
    ],
    contrasenas: [
      {
        id: "pc-3",
        servicio: "RENAP",
        usuario: "pgomez",
        contrasena: "Renap2025",
        actualizada: "2026-05-20T14:00:00.000Z",
      },
    ],
    archivos: [],
    notas: [],
    activo: true,
    creado: "2026-05-20T14:00:00.000Z",
    actualizado: "2026-05-20T14:00:00.000Z",
  },
  {
    id: "cf-3",
    nombre: "Comité de Feria",
    datos: [{ id: "dc-6", nombre: "NIT", valor: "8812345-K" }],
    contrasenas: [],
    archivos: [],
    notas: [],
    activo: false,
    creado: "2026-01-15T15:00:00.000Z",
    actualizado: "2026-03-01T15:00:00.000Z",
  },
];
