import type { ServicioTecnico } from "@/types/servicio";

/** Servicios de Oscar (sección 13). Descripciones y precios pendientes de definir por el negocio. */
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
