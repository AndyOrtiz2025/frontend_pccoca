import "server-only";
import type { Rol } from "@/lib/auth/roles";
import { ENTRADAS_DEMO, PROCESOS_DEMO } from "@/lib/mocks/procesos";
import { PENDIENTES_DEMO } from "@/lib/mocks/pendientes";
import { SERVICIOS_DEMO } from "@/lib/mocks/servicios";
import { MODULOS_TRAMITE_DEMO, TRAMITES_DEMO } from "@/lib/mocks/tramites";
import { almacen } from "@/lib/mocks/store";
import { EMPLEADOS_DEMO } from "@/lib/mocks/usuarios";
import { calcularCarrito, generarComprobante, validarLinea } from "@/lib/reglas/carrito";
import { abrirPaquete, aVistaEmpleado, descontarStock } from "@/lib/reglas/inventario";
import type { Entrada } from "@/types/entrada";
import type { Comprobante, LineaCarrito } from "@/types/movimiento";
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
  return almacen()
    .productos.filter((p) => p.activo && p.categoria === categoria)
    .map(aVistaEmpleado);
}

/** Todos los productos que se pueden vender, para el buscador y el lector de código de barras. */
export async function obtenerTodosParaVenta(): Promise<ProductoVenta[]> {
  return almacen()
    .productos.filter((p) => p.activo)
    .map(aVistaEmpleado);
}

/** Productos completos (con costo y stock exacto) solo para quien administra esa categoría. */
export async function obtenerProductosAdmin(rol: Rol, categoria: Categoria): Promise<Producto[]> {
  if (rol === "empleado" || !CATEGORIAS_ADMIN[rol].includes(categoria)) throw new SinPermisoError();
  return almacen().productos.filter((p) => p.categoria === categoria);
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

// ─── Mutaciones ───────────────────────────────────────────────

/** Error de una regla de negocio: se muestra tal cual al usuario (HTTP 409). */
export class ReglaNegocioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReglaNegocioError";
  }
}

export interface ResultadoVenta {
  /** null si el carrito solo tenía consumo interno o merma (no generan comprobante). */
  comprobante: Comprobante | null;
  consumos: number;
  mermas: number;
  /** Productos afectados, ya con el semáforo actualizado (vista Empleado). */
  productos: ProductoVenta[];
}

/**
 * Confirma el carrito (sección 8.7). Todo o nada: si una línea falla, no se descuenta nada.
 * Los precios se calculan AQUÍ con los datos del servidor; el navegador solo manda qué y cuánto.
 */
export async function registrarVenta(
  lineas: LineaCarrito[],
  atendio: string,
  ahora = new Date(),
): Promise<ResultadoVenta> {
  const a = almacen();
  if (lineas.length === 0) throw new ReglaNegocioError("El carrito está vacío");

  const porId = new Map(a.productos.map((p) => [p.id, p]));
  const nuevosStocks = new Map<string, Producto["stock"]>();

  for (const linea of lineas) {
    const producto = porId.get(linea.productoId);
    if (!producto || !producto.activo)
      throw new ReglaNegocioError("Un producto del carrito ya no existe");
    const error = validarLinea(linea, aVistaEmpleado(producto));
    if (error) throw new ReglaNegocioError(`${producto.nombre}: ${error}`);
    const actual = nuevosStocks.get(producto.id) ?? producto.stock;
    try {
      nuevosStocks.set(producto.id, descontarStock(actual, linea.presentacion, linea.cantidad));
    } catch (e) {
      throw new ReglaNegocioError(`${producto.nombre}: ${(e as Error).message}`);
    }
  }

  const fecha = ahora.toISOString();
  const calculado = calcularCarrito(
    lineas,
    new Map([...porId].map(([id, p]) => [id, aVistaEmpleado(p)])),
  );
  const comprobante = generarComprobante(calculado, { id: `V-${ahora.getTime()}`, fecha, atendio });

  // Todo validado: ahora sí se aplica.
  for (const [id, stock] of nuevosStocks) porId.get(id)!.stock = stock;
  if (comprobante) a.comprobantes.push(comprobante);
  lineas
    .filter((l) => l.tipo !== "venta")
    .forEach((l, i) =>
      a.movimientos.push({
        id: `M-${ahora.getTime()}-${i}`,
        tipo: l.tipo as "consumo_interno" | "merma",
        productoId: l.productoId,
        presentacion: l.presentacion,
        cantidad: l.cantidad,
        motivo: l.motivo?.trim() || undefined,
        fecha,
        registradoPor: atendio,
      }),
    );

  return {
    comprobante,
    consumos: calculado.cantidadConsumos,
    mermas: calculado.cantidadMermas,
    productos: [...nuevosStocks.keys()].map((id) => aVistaEmpleado(porId.get(id)!)),
  };
}

/** "Abrir nuevo paquete" (sección 11.5). Cualquier rol con acceso a ventas. */
export async function abrirPaqueteProducto(
  productoId: string,
  usuario: string,
): Promise<ProductoVenta> {
  const a = almacen();
  const producto = a.productos.find((p) => p.id === productoId);
  if (!producto?.fraccionable) throw new ReglaNegocioError("Este producto no se vende por paquete");
  try {
    producto.stock = abrirPaquete(producto.stock, producto.fraccionable.unidadesPorPaquete);
  } catch (e) {
    throw new ReglaNegocioError((e as Error).message);
  }
  a.conversiones.push({ productoId, fecha: new Date().toISOString(), registradoPor: usuario });
  return aVistaEmpleado(producto);
}
