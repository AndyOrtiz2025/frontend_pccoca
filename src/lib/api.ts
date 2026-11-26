import "server-only";
import type { Rol } from "@/lib/auth/roles";
import { ENTRADAS_DEMO, PROCESOS_DEMO } from "@/lib/mocks/procesos";
import { PENDIENTES_DEMO } from "@/lib/mocks/pendientes";
import { PRODUCTOS_DEMO } from "@/lib/mocks/productos";
import { SERVICIOS_DEMO } from "@/lib/mocks/servicios";
import { MODULOS_TRAMITE_DEMO, TRAMITES_DEMO } from "@/lib/mocks/tramites";
import { EMPLEADOS_DEMO } from "@/lib/mocks/usuarios";
import { aVistaEmpleado } from "@/lib/reglas/inventario";
import type { Entrada } from "@/types/entrada";
import type { Pendiente } from "@/types/pendiente";
import type { EnProceso } from "@/types/proceso";
import type { Categoria, Producto, ProductoVenta } from "@/types/producto";
import type { ServicioTecnico } from "@/types/servicio";
import type { ModuloTramite, Tramite } from "@/types/tramite";
import type { Empleado } from "@/types/usuario";

/**
 * Capa de datos: el ÚNICO lugar donde las pantallas piden información.
 * Hoy devuelve los datos de prueba de lib/mocks. Cuando exista el backend, cada función
 * llamará a `${BACKEND_URL}/api/...` con el token de la sesión y las pantallas no cambian.
 *
 * Se ejecuta solo en el servidor ("server-only"): aquí se decide qué datos sensibles
 * (costo, margen, stock exacto) llegan al navegador según el rol.
 */

/** Qué categorías administra cada rol (sección 17). */
export const CATEGORIAS_ADMIN: Record<Exclude<Rol, "empleado">, Categoria[]> = {
  paola: ["libreria", "varios"],
  oscar: ["tecnologia"],
};

export class SinPermisoError extends Error {
  constructor() {
    super("No tienes permiso para ver esta información");
    this.name = "SinPermisoError";
  }
}

/** Catálogo para vender (vista Empleado): sin costo ni stock exacto. */
export async function obtenerCatalogoVenta(categoria: Categoria): Promise<ProductoVenta[]> {
  return PRODUCTOS_DEMO.filter((p) => p.activo && p.categoria === categoria).map(aVistaEmpleado);
}

/** Todos los productos que se pueden vender, para el buscador y el lector de código de barras. */
export async function obtenerTodosParaVenta(): Promise<ProductoVenta[]> {
  return PRODUCTOS_DEMO.filter((p) => p.activo).map(aVistaEmpleado);
}

/** Productos completos (con costo y stock exacto) solo para quien administra esa categoría. */
export async function obtenerProductosAdmin(rol: Rol, categoria: Categoria): Promise<Producto[]> {
  if (rol === "empleado" || !CATEGORIAS_ADMIN[rol].includes(categoria)) throw new SinPermisoError();
  return PRODUCTOS_DEMO.filter((p) => p.categoria === categoria);
}

export async function obtenerModulosTramite(): Promise<ModuloTramite[]> {
  return [...MODULOS_TRAMITE_DEMO].sort((a, b) => a.orden - b.orden);
}

export async function obtenerTramites(): Promise<Tramite[]> {
  return TRAMITES_DEMO;
}

/** Catálogo de servicios técnicos. Paola no tiene acceso (sección 10.3). */
export async function obtenerServicios(rol: Rol): Promise<ServicioTecnico[]> {
  if (rol === "paola") throw new SinPermisoError();
  return SERVICIOS_DEMO;
}

/**
 * Trámites y servicios en proceso.
 * Empleado: todos (para Seguimiento). Paola: solo trámites. Oscar: solo servicios.
 */
export async function obtenerProcesos(rol: Rol): Promise<EnProceso[]> {
  if (rol === "empleado") return PROCESOS_DEMO;
  return PROCESOS_DEMO.filter((p) => p.responsable === rol);
}

/** Bandeja de entradas: Paola recibe las de trámite y Oscar las de servicio. */
export async function obtenerEntradas(rol: Exclude<Rol, "empleado">): Promise<Entrada[]> {
  const tipo = rol === "paola" ? "tramite" : "servicio";
  return ENTRADAS_DEMO.filter((e) => e.tipo === tipo);
}

/** Pendientes (fiado): el Empleado registra, Paola solo lee, Oscar no tiene acceso. */
export async function obtenerPendientes(rol: Rol): Promise<Pendiente[]> {
  if (rol === "oscar") throw new SinPermisoError();
  return PENDIENTES_DEMO;
}

/** Usuarios: solo Oscar los administra. */
export async function obtenerEmpleados(rol: Rol): Promise<Empleado[]> {
  if (rol !== "oscar") throw new SinPermisoError();
  return EMPLEADOS_DEMO;
}
