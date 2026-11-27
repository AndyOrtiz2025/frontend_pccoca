import "server-only";
import type { Rol } from "@/lib/auth/roles";
import { PROCESOS_DEMO } from "@/lib/mocks/procesos";
import { PENDIENTES_DEMO } from "@/lib/mocks/pendientes";
import { SERVICIOS_DEMO } from "@/lib/mocks/servicios";
import { MODULOS_TRAMITE_DEMO, TRAMITES_DEMO } from "@/lib/mocks/tramites";
import { detectarTipo, MAX_ARCHIVOS, MAX_BYTES_ARCHIVO, nombreSeguro } from "@/lib/archivos";
import { almacen } from "@/lib/mocks/store";
import { EMPLEADOS_DEMO } from "@/lib/mocks/usuarios";
import { calcularCarrito, generarComprobante, validarLinea } from "@/lib/reglas/carrito";
import { abrirPaquete, aVistaEmpleado, descontarStock } from "@/lib/reglas/inventario";
import type { ArchivoAdjunto, Entrada, EntradaServicio, EntradaTramite } from "@/types/entrada";
import type { EntradaServicioInput, EntradaTramiteInput } from "@/schemas/entrada.schema";
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
  return almacen()
    .entradas.filter((e) => e.tipo === tipo)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
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

function limpiarCliente(c: { nombre: string; telefono?: string }) {
  return { nombre: c.nombre.trim(), ...(c.telefono?.trim() && { telefono: c.telefono.trim() }) };
}

/**
 * "Enviar entrada de trámite" (sección 8.9): reemplaza el WhatsApp a Paola.
 * El nombre del trámite se toma del catálogo del servidor, no del navegador.
 */
export interface ArchivoEntrante {
  nombre: string;
  datos: Uint8Array;
}

export async function crearEntradaTramite(
  datos: EntradaTramiteInput,
  enviadaPor: string,
  archivosEntrantes: ArchivoEntrante[] = [],
  ahora = new Date(),
): Promise<EntradaTramite> {
  const tramite = TRAMITES_DEMO.find((t) => t.id === datos.tramiteId);
  if (!tramite) throw new ReglaNegocioError("Ese trámite ya no existe en el catálogo");

  // El anticipo no puede cubrir todo el precio: en ese caso es "Cancelado".
  const precioMax = tramite.precio.montoMax ?? tramite.precio.monto;
  if (datos.pago.estado === "anticipo" && precioMax !== null && datos.pago.anticipo! >= precioMax) {
    throw new ReglaNegocioError("El anticipo cubre todo el precio: marca el pago como Cancelado");
  }

  if (archivosEntrantes.length > MAX_ARCHIVOS) {
    throw new ReglaNegocioError(`Máximo ${MAX_ARCHIVOS} archivos por entrada`);
  }
  const archivos: { meta: ArchivoAdjunto; datos: Uint8Array }[] = archivosEntrantes.map((a, i) => {
    const nombre = nombreSeguro(a.nombre);
    if (a.datos.byteLength > MAX_BYTES_ARCHIVO)
      throw new ReglaNegocioError(`${nombre}: pesa más de 5 MB`);
    const tipo = detectarTipo(a.datos);
    if (!tipo) throw new ReglaNegocioError(`${nombre}: solo se aceptan PDF, JPG, PNG o WEBP`);
    return {
      meta: { id: `AR-${ahora.getTime()}-${i}`, nombre, tipo, tamano: a.datos.byteLength },
      datos: a.datos,
    };
  });
  const modulo = MODULOS_TRAMITE_DEMO.find((m) => m.id === tramite.moduloId);
  // Solo se aceptan requisitos que el trámite realmente pide.
  const documentos = tramite.requisitos.map((nombre) => ({
    nombre,
    entregado: datos.documentos.some((d) => d.nombre === nombre && d.entregado),
  }));
  const entrada: EntradaTramite = {
    id: `ET-${ahora.getTime()}`,
    tipo: "tramite",
    tramiteId: tramite.id,
    tramiteNombre: `${modulo?.nombre ?? "Otros"} · ${tramite.nombre}`,
    cliente: limpiarCliente(datos.cliente),
    documentos,
    pago: datos.pago,
    archivos: archivos.map((a) => a.meta),
    datosCliente: datos.datosCliente?.trim() || undefined,
    notas: datos.notas?.trim() || undefined,
    enviadaPor,
    fecha: ahora.toISOString(),
    leida: false,
  };
  const a = almacen();
  for (const ar of archivos) a.archivos.set(ar.meta.id, ar);
  a.entradas.push(entrada);
  // TODO(backend): notificar a Paola (badge de "Entradas").
  return entrada;
}

/** "Enviar entrada de servicio técnico" (sección 8.10): reemplaza el WhatsApp a Oscar. */
export async function crearEntradaServicio(
  datos: EntradaServicioInput,
  enviadaPor: string,
  ahora = new Date(),
): Promise<EntradaServicio> {
  const entrada: EntradaServicio = {
    id: `ES-${ahora.getTime()}`,
    tipo: "servicio",
    equipo: datos.equipo,
    marcaModelo: datos.marcaModelo?.trim() || undefined,
    falla: datos.falla.trim(),
    accesorios: datos.accesorios.map((a) => a.trim()).filter(Boolean),
    cliente: limpiarCliente(datos.cliente),
    notas: datos.notas?.trim() || undefined,
    enviadaPor,
    fecha: ahora.toISOString(),
    leida: false,
  };
  almacen().entradas.push(entrada);
  // TODO(backend): notificar a Oscar (badge de "Entradas").
  return entrada;
}

/**
 * Descargar un archivo de una entrada de trámite. Solo Paola: son documentos personales
 * de los clientes (DPI, recibos).
 */
export async function obtenerArchivo(
  rol: Rol,
  id: string,
): Promise<{ meta: ArchivoAdjunto; datos: Uint8Array }> {
  if (rol !== "paola") throw new SinPermisoError();
  const archivo = almacen().archivos.get(id);
  if (!archivo) throw new ReglaNegocioError("El archivo no existe");
  return archivo;
}
