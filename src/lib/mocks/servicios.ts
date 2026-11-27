import type { ServicioTecnico } from "@/types/servicio";

/**
 * Servicios de Oscar (sección 13). Los que no tienen precio se cobran según la revisión.
 * Activación de Office es un ejemplo con opciones; Oscar los administrará desde su vista.
 */
export const SERVICIOS_DEMO: ServicioTecnico[] = [
  {
    id: "srv-camaras",
    nombre: "Instalación de cámaras de seguridad",
    descripcion: null,
    precio: { monto: null },
    icono: "cctv",
  },
  {
    id: "srv-mant",
    nombre: "Mantenimiento de computadoras",
    descripcion: null,
    precio: { monto: null },
    icono: "monitor-cog",
  },
  {
    id: "srv-apps",
    nombre: "Instalación de aplicaciones",
    descripcion: null,
    precio: { monto: null },
    icono: "app-window",
  },
  {
    id: "srv-office",
    nombre: "Activación de Microsoft Office",
    descripcion: "Licencia por tiempo según la opción que elija el cliente.",
    precio: { monto: 150, montoMax: 250 },
    opciones: [
      { id: "6m", nombre: "6 meses", precio: 150 },
      { id: "1a", nombre: "1 año", precio: 250 },
    ],
    icono: "key-round",
  },
  {
    id: "srv-windows",
    nombre: "Formateo e instalación de Windows",
    descripcion: null,
    precio: { monto: null },
    icono: "hard-drive",
  },
  {
    id: "srv-impresoras",
    nombre: "Reparación de impresoras",
    descripcion: null,
    precio: { monto: null },
    icono: "printer",
  },
  {
    id: "srv-router",
    nombre: "Configuración de router/WiFi",
    descripcion: null,
    precio: { monto: null },
    icono: "router",
  },
];
