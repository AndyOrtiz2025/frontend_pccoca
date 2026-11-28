import "server-only";
import type { Rol } from "@/lib/auth/roles";
import { SERVICIOS_DEMO } from "@/lib/mocks/servicios";
import { MODULOS_TRAMITE_DEMO, TRAMITES_DEMO } from "@/lib/mocks/tramites";
import { detectarTipo, MAX_ARCHIVOS, MAX_BYTES_ARCHIVO, nombreSeguro } from "@/lib/archivos";
import { formatQ } from "@/lib/format";
import { almacen } from "@/lib/mocks/store";
import { centavos } from "@/lib/reglas/dinero";
import { EMPLEADOS_DEMO } from "@/lib/mocks/usuarios";
import { calcularCarrito, generarComprobante, validarLinea } from "@/lib/reglas/carrito";
import { calcularPrecio } from "@/lib/reglas/precios";
import {
  cobroConPago,
  cobroDeServicio,
  precioFijo,
  puedeCambiarEstado,
} from "@/lib/reglas/procesos";
import { resumenVentasDelDia, type ResumenVentas } from "@/lib/reglas/resumen";
import { abrirPaquete, aVistaEmpleado, descontarStock } from "@/lib/reglas/inventario";
import { aplicarEdicion, crearDesdeFormulario, siguienteCodigo } from "@/lib/reglas/productos";
import type { MermaInput, ProductoInput } from "@/schemas/producto.schema";
import type { SubcategoriaInput } from "@/schemas/subcategoria.schema";
import type { Compra, EstadoReclamo, Proveedor, Reclamo } from "@/types/proveedor";
import type { CompraInput, ProveedorInput, ResolverReclamoInput } from "@/schemas/proveedor.schema";
import {
  aplicarCompra,
  construirHistorial,
  sumarAlStock,
  type AvisoCosto,
  type EventoHistorial,
} from "@/lib/reglas/compras";
import { numeroComprobante } from "@/lib/comprobante";
import { diaDeGuatemala } from "@/lib/fechas";
import type { ArchivoAdjunto, Entrada, EntradaServicio, EntradaTramite } from "@/types/entrada";
import type { EntradaServicioInput, EntradaTramiteInput } from "@/schemas/entrada.schema";
import type { CargoInput, CuentaInput } from "@/schemas/pendiente.schema";
import { calcularSaldo, cargosPendientes, montoPagoCargos } from "@/lib/reglas/cuentas";
import { normalizar } from "@/lib/reglas/busqueda";
import type { Contadores } from "@/types/contadores";
import type { Comprobante, LineaCarrito } from "@/types/movimiento";
import type {
  Cargo,
  CuentaPendiente,
  DetalleCuenta,
  PagoCuenta,
  ResumenCuenta,
} from "@/types/pendiente";
import type { EstadoProceso } from "@/types/estados";
import type { EnProceso, ServicioEnProceso, TramiteEnProceso } from "@/types/proceso";
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

// ─── Administración de productos (Paola: Librería y Varios, Oscar: Tecnología) ───

/** Máximo para la foto de un producto. */
export const MAX_BYTES_FOTO = 2 * 1024 * 1024;

export async function obtenerProveedores(): Promise<Proveedor[]> {
  return almacen().proveedores.filter((p) => p.activo);
}

/** Código sugerido para un producto nuevo de esa categoría. */
export async function sugerirCodigo(rol: Rol, categoria: Categoria): Promise<string> {
  exigirCategoria(rol, categoria);
  return siguienteCodigo(almacen().productos, categoria);
}

function exigirCategoria(rol: Rol, categoria: Categoria) {
  if (rol === "empleado" || !CATEGORIAS_ADMIN[rol].includes(categoria)) throw new SinPermisoError();
}

function productoAdministrado(rol: Rol, id: string): Producto {
  const producto = almacen().productos.find((p) => p.id === id);
  if (!producto) throw new ReglaNegocioError("Ese producto ya no existe");
  exigirCategoria(rol, producto.categoria);
  return producto;
}

/**
 * El código interno y los códigos de barras (unidad y caja) no se repiten en todo el
 * catálogo: el escáner los usa para saber qué producto y qué presentación vender.
 */
function validarCodigosUnicos(datos: ProductoInput, excluirId?: string) {
  const barras = (datos.codigoBarras || datos.codigo).toUpperCase();
  const barrasCaja = datos.fraccionable?.codigoBarrasPaquete?.toUpperCase();
  for (const p of almacen().productos) {
    if (p.id === excluirId) continue;
    if (p.codigo === datos.codigo) {
      throw new ReglaNegocioError(`El código ${datos.codigo} ya es de "${p.nombre}"`);
    }
    const ocupados = [p.codigo, p.codigoBarras.toUpperCase()];
    if (p.fraccionable?.codigoBarrasPaquete) {
      ocupados.push(p.fraccionable.codigoBarrasPaquete.toUpperCase());
    }
    if (ocupados.includes(barras)) {
      throw new ReglaNegocioError(`Ese código de barras ya es de "${p.nombre}"`);
    }
    if (barrasCaja && ocupados.includes(barrasCaja)) {
      throw new ReglaNegocioError(`El código de la caja ya es de "${p.nombre}"`);
    }
  }
}

/** Guarda la foto (ya leída) revisando que de verdad sea JPG, PNG o WebP. Devuelve su URL. */
function guardarFoto(foto: Uint8Array): string {
  if (foto.byteLength > MAX_BYTES_FOTO) throw new ReglaNegocioError("La foto pesa más de 2 MB");
  const tipo = detectarTipo(foto);
  if (tipo !== "image/jpeg" && tipo !== "image/png" && tipo !== "image/webp") {
    throw new ReglaNegocioError("La foto debe ser JPG, PNG o WebP");
  }
  const id = `IMG-${crypto.randomUUID()}`;
  almacen().imagenes.set(id, { tipo, datos: foto });
  return `/api/imagenes/${id}`;
}

function borrarFoto(url?: string) {
  const id = url?.match(/^\/api\/imagenes\/(IMG-[\w-]+)$/)?.[1];
  if (id) almacen().imagenes.delete(id);
}

export async function crearProducto(
  rol: Rol,
  datos: ProductoInput,
  foto?: Uint8Array,
): Promise<Producto> {
  exigirCategoria(rol, datos.categoria);
  validarCodigosUnicos(datos);
  if (datos.proveedorId && !almacen().proveedores.some((p) => p.id === datos.proveedorId)) {
    throw new ReglaNegocioError("Ese proveedor no existe");
  }
  const producto = crearDesdeFormulario(`p-${crypto.randomUUID()}`, datos);
  if (foto) producto.imagenUrl = guardarFoto(foto);
  almacen().productos.push(producto);
  return producto;
}

/**
 * Editar datos y precios. `foto`: nueva foto; `null`: quitar la foto; `undefined`: dejarla.
 * La categoría no cambia (Paola no puede pasar un producto a Tecnología).
 */
export async function editarProducto(
  rol: Rol,
  id: string,
  datos: ProductoInput,
  foto?: Uint8Array | null,
): Promise<Producto> {
  const producto = productoAdministrado(rol, id);
  if (datos.categoria !== producto.categoria) {
    throw new ReglaNegocioError("La categoría de un producto no se cambia");
  }
  validarCodigosUnicos(datos, id);
  if (datos.proveedorId && !almacen().proveedores.some((p) => p.id === datos.proveedorId)) {
    throw new ReglaNegocioError("Ese proveedor no existe");
  }
  let editado: Producto;
  try {
    editado = aplicarEdicion(producto, datos);
  } catch (e) {
    throw new ReglaNegocioError((e as Error).message);
  }
  if (foto) {
    editado.imagenUrl = guardarFoto(foto);
    borrarFoto(producto.imagenUrl);
  } else if (foto === null) {
    borrarFoto(producto.imagenUrl);
    editado.imagenUrl = undefined;
  }
  Object.assign(producto, editado);
  return producto;
}

/** Desactivar (deja de venderse, conserva historial) o reactivar. Nunca se borra. */
export async function cambiarActivoProducto(
  rol: Rol,
  id: string,
  activo: boolean,
): Promise<Producto> {
  const producto = productoAdministrado(rol, id);
  producto.activo = activo;
  return producto;
}

/** Merma registrada por Paola/Oscar desde inventario (dañado, vencido…): descuenta stock. */
export async function registrarMermaAdmin(
  rol: Rol,
  datos: MermaInput,
  usuario: string,
  ahora = new Date(),
): Promise<Producto> {
  const producto = productoAdministrado(rol, datos.productoId);
  if (datos.presentacion === "paquete" && !producto.fraccionable) {
    throw new ReglaNegocioError("Este producto no se maneja por paquete");
  }
  try {
    producto.stock = descontarStock(producto.stock, datos.presentacion, datos.cantidad);
  } catch (e) {
    throw new ReglaNegocioError((e as Error).message);
  }
  almacen().movimientos.push({
    id: `M-${crypto.randomUUID()}`,
    tipo: "merma",
    productoId: producto.id,
    presentacion: datos.presentacion,
    cantidad: datos.cantidad,
    motivo: datos.motivo.trim(),
    fecha: ahora.toISOString(),
    registradoPor: usuario,
  });
  return producto;
}

// ─── Proveedores, compras y reclamos (Paola: Librería y Varios, Oscar: Tecnología) ───

/** Paola y Oscar administran proveedores; el Empleado no. */
function exigirAdmin(rol: Rol) {
  if (rol !== "paola" && rol !== "oscar") throw new SinPermisoError();
}

function proveedorExistente(id: string): Proveedor {
  const p = almacen().proveedores.find((x) => x.id === id);
  if (!p) throw new ReglaNegocioError("Ese proveedor ya no existe");
  return p;
}

/** "2026-11" del mes en curso, en hora de Guatemala. */
const mesDe = (fecha: string | Date) => diaDeGuatemala(fecha).slice(0, 7);

export interface ResumenProveedor extends Proveedor {
  ultimaCompra?: string;
  /** Total comprado en el mes en curso y cuántas compras. */
  totalMes: number;
  comprasMes: number;
  reclamosPendientes: number;
}

export async function obtenerProveedoresAdmin(
  rol: Rol,
  ahora = new Date(),
): Promise<ResumenProveedor[]> {
  exigirAdmin(rol);
  const a = almacen();
  const mes = mesDe(ahora);
  return a.proveedores
    .map((p) => {
      const compras = a.compras.filter((c) => c.proveedorId === p.id);
      const delMes = compras.filter((c) => mesDe(c.fecha) === mes);
      return {
        ...p,
        ultimaCompra: compras
          .map((c) => c.fecha)
          .sort()
          .at(-1),
        totalMes: centavos(delMes.reduce((t, c) => t + c.total, 0)),
        comprasMes: delMes.length,
        reclamosPendientes: a.reclamos.filter(
          (r) => r.proveedorId === p.id && r.estado === "pendiente",
        ).length,
      };
    })
    .sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
}

export interface CompraDetallada extends Compra {
  lineas: (Compra["lineas"][number] & { nombre: string; codigo: string; nombrePaquete?: string })[];
}

export interface ReclamoDetallado extends Reclamo {
  nombre: string;
  nombrePaquete?: string;
  factura?: string;
}

export interface DetalleProveedor {
  proveedor: ResumenProveedor;
  compras: CompraDetallada[];
  reclamos: ReclamoDetallado[];
  /** Compras registradas en el año en curso. */
  comprasAnio: number;
  /** Productos que tienen a este proveedor o que se le han comprado. */
  productosQueSurte: number;
}

export async function obtenerDetalleProveedor(
  rol: Rol,
  id: string,
  ahora = new Date(),
): Promise<DetalleProveedor | null> {
  exigirAdmin(rol);
  const a = almacen();
  const proveedor = (await obtenerProveedoresAdmin(rol, ahora)).find((p) => p.id === id);
  if (!proveedor) return null;
  const producto = (pid: string) => a.productos.find((p) => p.id === pid);
  const compras = a.compras
    .filter((c) => c.proveedorId === id)
    .sort((x, y) => y.fecha.localeCompare(x.fecha))
    .map((c) => ({
      ...c,
      lineas: c.lineas.map((l) => {
        const p = producto(l.productoId);
        return {
          ...l,
          nombre: p?.nombre ?? "Producto eliminado",
          codigo: p?.codigo ?? "",
          nombrePaquete: p?.fraccionable?.nombrePaquete,
        };
      }),
    }));
  const surte = new Set([
    ...a.productos.filter((p) => p.proveedorId === id).map((p) => p.id),
    ...compras.flatMap((c) => c.lineas.map((l) => l.productoId)),
  ]);
  const anio = diaDeGuatemala(ahora).slice(0, 4);
  return {
    proveedor,
    compras,
    reclamos: a.reclamos
      .filter((r) => r.proveedorId === id)
      .sort(
        (x, y) =>
          Number(x.estado !== "pendiente") - Number(y.estado !== "pendiente") ||
          y.fecha.localeCompare(x.fecha),
      )
      .map((r) => ({
        ...r,
        nombre: producto(r.productoId)?.nombre ?? "Producto eliminado",
        nombrePaquete: producto(r.productoId)?.fraccionable?.nombrePaquete,
        factura: a.compras.find((c) => c.id === r.compraId)?.factura,
      })),
    comprasAnio: compras.filter((c) => diaDeGuatemala(c.fecha).startsWith(anio)).length,
    productosQueSurte: surte.size,
  };
}

export async function crearProveedor(rol: Rol, datos: ProveedorInput): Promise<Proveedor> {
  exigirAdmin(rol);
  const repetido = almacen().proveedores.find(
    (p) => normalizar(p.nombre) === normalizar(datos.nombre),
  );
  if (repetido) throw new ReglaNegocioError(`Ya existe "${repetido.nombre}"`);
  const proveedor: Proveedor = { id: `prov-${crypto.randomUUID()}`, ...datos, activo: true };
  almacen().proveedores.push(proveedor);
  return proveedor;
}

export async function editarProveedor(
  rol: Rol,
  id: string,
  datos: ProveedorInput,
): Promise<Proveedor> {
  exigirAdmin(rol);
  const proveedor = proveedorExistente(id);
  const repetido = almacen().proveedores.find(
    (p) => p.id !== id && normalizar(p.nombre) === normalizar(datos.nombre),
  );
  if (repetido) throw new ReglaNegocioError(`Ya existe "${repetido.nombre}"`);
  // Los campos opcionales que se dejan vacíos se borran.
  Object.assign(proveedor, {
    nombre: datos.nombre,
    surte: datos.surte,
    nit: datos.nit,
    contacto: datos.contacto,
    telefono: datos.telefono,
    correo: datos.correo,
    direccion: datos.direccion,
    diasVisita: datos.diasVisita,
    notas: datos.notas,
  });
  return proveedor;
}

/** Inactivar (deja de salir al registrar compras y en el producto) o reactivar. Nunca se borra. */
export async function cambiarActivoProveedor(rol: Rol, id: string, activo: boolean) {
  exigirAdmin(rol);
  proveedorExistente(id).activo = activo;
}

export interface ResultadoCompra {
  compra: Compra;
  /** Productos cuyo costo cambió, con la ganancia que queda con el precio actual. */
  avisos: AvisoCosto[];
  reclamos: number;
}

/**
 * Registrar compra (pantalla 19), todo o nada:
 * - Suma al stock lo que llegó bueno; el costo pasa a ser el de esta compra (último costo).
 * - Lo dañado no entra al stock: queda como reclamo pendiente con el proveedor.
 * Paola solo compra productos de Librería y Varios; Oscar, de Tecnología.
 */
export async function registrarCompra(
  rol: Rol,
  datos: CompraInput,
  usuario: string,
  ahora = new Date(),
): Promise<ResultadoCompra> {
  exigirAdmin(rol);
  const a = almacen();
  const proveedor = proveedorExistente(datos.proveedorId);
  if (!proveedor.activo) throw new ReglaNegocioError("Ese proveedor está inactivo");
  if (diaDeGuatemala(`${datos.fecha}T12:00:00-06:00`) > diaDeGuatemala(ahora)) {
    throw new ReglaNegocioError("La fecha de recepción no puede ser futura");
  }
  const ids = datos.lineas.map((l) => `${l.productoId}|${l.presentacion}`);
  if (new Set(ids).size !== ids.length) {
    throw new ReglaNegocioError("Un producto está repetido en la lista: suma las cantidades");
  }

  // Primero se calcula todo sobre copias; si algo falla, no se guarda nada.
  // Si un producto llega por caja y por unidad, las dos líneas se aplican una tras otra.
  const copias = new Map<string, { original: Producto; nuevo: Producto }>();
  const avisos: AvisoCosto[] = [];
  for (const l of datos.lineas) {
    const original = a.productos.find((p) => p.id === l.productoId);
    if (!original) throw new ReglaNegocioError("Uno de los productos ya no existe");
    exigirCategoria(rol, original.categoria);
    if (l.presentacion === "paquete" && !original.fraccionable) {
      throw new ReglaNegocioError(`${original.nombre} no se maneja por caja`);
    }
    const base = copias.get(original.id)?.nuevo ?? original;
    const r = aplicarCompra(base, l);
    copias.set(original.id, { original, nuevo: r.producto });
    if (r.aviso) avisos.push(r.aviso);
  }

  // Hora: si es de hoy, la hora actual; si es de otro día, mediodía de ese día.
  const hoy = diaDeGuatemala(ahora) === datos.fecha;
  const fecha = hoy ? ahora.toISOString() : new Date(`${datos.fecha}T12:00:00-06:00`).toISOString();
  const lineas = datos.lineas.map((l) => ({
    productoId: l.productoId,
    presentacion: l.presentacion,
    cantidad: l.cantidad,
    danadas: l.danadas,
    costoUnitario: centavos(l.costoUnitario),
    subtotal: centavos((l.cantidad + l.danadas) * l.costoUnitario),
  }));
  const compra: Compra = {
    id: `C-${crypto.randomUUID()}`,
    proveedorId: proveedor.id,
    fecha,
    factura: datos.factura,
    lineas,
    total: centavos(lineas.reduce((t, l) => t + l.subtotal, 0)),
    registradoPor: usuario,
  };

  for (const { original, nuevo } of copias.values()) {
    Object.assign(original, nuevo);
    // Si el producto no tenía proveedor, queda con este.
    original.proveedorId ??= proveedor.id;
  }
  a.compras.push(compra);
  let reclamos = 0;
  for (const l of datos.lineas.filter((x) => x.danadas > 0)) {
    a.reclamos.push({
      id: `R-${crypto.randomUUID()}`,
      proveedorId: proveedor.id,
      compraId: compra.id,
      productoId: l.productoId,
      presentacion: l.presentacion,
      cantidad: l.danadas,
      costoUnitario: centavos(l.costoUnitario),
      motivo: l.motivoDano,
      fecha,
      estado: "pendiente",
    });
    reclamos++;
  }
  return { compra, avisos, reclamos };
}

/**
 * Resolver un reclamo: nos repusieron (entra al stock), nos devolvieron el dinero
 * o se perdió (no entra al stock; cuenta como pérdida en los reportes).
 */
export async function resolverReclamo(
  rol: Rol,
  id: string,
  datos: ResolverReclamoInput,
  usuario: string,
  ahora = new Date(),
): Promise<Reclamo> {
  exigirAdmin(rol);
  const a = almacen();
  const reclamo = a.reclamos.find((r) => r.id === id);
  if (!reclamo) throw new ReglaNegocioError("Ese reclamo ya no existe");
  if (reclamo.estado !== "pendiente") throw new ReglaNegocioError("Ese reclamo ya se resolvió");
  const producto = a.productos.find((p) => p.id === reclamo.productoId);
  if (!producto) throw new ReglaNegocioError("El producto ya no existe");
  exigirCategoria(rol, producto.categoria);
  if (datos.estado === "repuesto") {
    producto.stock = sumarAlStock(producto.stock, reclamo.presentacion, reclamo.cantidad);
  }
  const maximo = centavos(reclamo.cantidad * reclamo.costoUnitario);
  if (datos.estado === "reembolsado" && datos.monto !== undefined && datos.monto > maximo) {
    throw new ReglaNegocioError(
      `El reembolso no puede ser mayor a lo que costó (Q ${maximo.toFixed(2)})`,
    );
  }
  reclamo.estado = datos.estado as EstadoReclamo;
  reclamo.resolucion = {
    fecha: ahora.toISOString(),
    por: usuario,
    ...(datos.estado === "reembolsado" && { monto: centavos(datos.monto ?? maximo) }),
    ...(datos.nota && { nota: datos.nota }),
  };
  return reclamo;
}

/** Historial de un producto (kardex): ventas, fiados, compras, mermas, consumo, cajas abiertas. */
export async function obtenerHistorialProducto(
  rol: Rol,
  productoId: string,
): Promise<EventoHistorial[]> {
  const producto = productoAdministrado(rol, productoId);
  const a = almacen();
  const nombreProveedor = (id: string) =>
    a.proveedores.find((p) => p.id === id)?.nombre ?? "Proveedor";
  return construirHistorial(producto, {
    ventas: a.comprobantes.flatMap((c) =>
      c.lineas
        .filter((l) => (l.productoId ? l.productoId === producto.id : l.codigo === producto.codigo))
        .map((l) => ({
          fecha: c.fecha,
          presentacion: l.presentacion,
          cantidad: l.cantidad,
          comprobante: numeroComprobante(c),
          por: c.atendio,
        })),
    ),
    fiados: a.cargos
      .filter((c) => c.productoId === producto.id)
      .map((c) => ({
        fecha: c.fecha,
        cantidad: c.cantidad,
        cuenta: a.cuentas.find((x) => x.id === c.cuentaId)?.nombre ?? "cliente",
        por: c.registradoPor,
      })),
    compras: a.compras.flatMap((c) =>
      c.lineas
        .filter((l) => l.productoId === producto.id && l.cantidad > 0)
        .map((l) => ({
          fecha: c.fecha,
          presentacion: l.presentacion,
          cantidad: l.cantidad,
          proveedor: nombreProveedor(c.proveedorId),
          factura: c.factura,
          por: c.registradoPor,
        })),
    ),
    movimientos: a.movimientos
      .filter((m) => m.productoId === producto.id)
      .map((m) => ({
        fecha: m.fecha,
        tipo: m.tipo,
        presentacion: m.presentacion,
        cantidad: m.cantidad,
        motivo: m.motivo,
        por: m.registradoPor,
      })),
    aperturas: a.conversiones
      .filter((c) => c.productoId === producto.id)
      .map((c) => ({ fecha: c.fecha, por: c.registradoPor })),
    reposiciones: a.reclamos
      .filter((r) => r.productoId === producto.id && r.estado === "repuesto" && r.resolucion)
      .map((r) => ({
        fecha: r.resolucion!.fecha,
        presentacion: r.presentacion,
        cantidad: r.cantidad,
        proveedor: nombreProveedor(r.proveedorId),
        por: r.resolucion!.por,
      })),
  });
}

// ─── Subcategorías (Útiles escolares, Escritura, Folders…) ───

export interface Subcategoria {
  nombre: string;
  /** Productos de la categoría que la usan (activos e inactivos). */
  productos: number;
}

/** "Útiles  escolares" y "utiles escolares" son la misma subcategoría. */
function mismaSubcategoria(a: string, b: string) {
  return normalizar(a) === normalizar(b);
}

/** Las creadas a mano más las que ya usan los productos, con cuántos productos tiene cada una. */
export async function obtenerSubcategorias(
  rol: Rol,
  categoria: Categoria,
): Promise<Subcategoria[]> {
  exigirCategoria(rol, categoria);
  const a = almacen();
  const nombres: string[] = [];
  const agregar = (n?: string) => {
    if (n && !nombres.some((x) => mismaSubcategoria(x, n))) nombres.push(n);
  };
  a.subcategorias[categoria].forEach(agregar);
  a.productos.filter((p) => p.categoria === categoria).forEach((p) => agregar(p.subcategoria));
  return nombres
    .map((nombre) => ({
      nombre,
      productos: a.productos.filter(
        (p) =>
          p.categoria === categoria && p.subcategoria && mismaSubcategoria(p.subcategoria, nombre),
      ).length,
    }))
    .sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
}

/**
 * Crear, renombrar (o unir, si el nombre nuevo ya existe) y eliminar subcategorías.
 * Renombrar actualiza todos los productos; eliminar solo se permite sin productos.
 */
export async function administrarSubcategoria(
  rol: Rol,
  datos: SubcategoriaInput,
): Promise<{ productosMovidos: number }> {
  exigirCategoria(rol, datos.categoria);
  const a = almacen();
  const lista = a.subcategorias[datos.categoria];
  const existentes = await obtenerSubcategorias(rol, datos.categoria);
  const buscar = (n: string) => existentes.find((x) => mismaSubcategoria(x.nombre, n));

  if (datos.accion === "crear") {
    const ya = buscar(datos.nombre);
    if (ya) throw new ReglaNegocioError(`Ya existe "${ya.nombre}"`);
    lista.push(datos.nombre);
    return { productosMovidos: 0 };
  }

  const origen = buscar(datos.accion === "renombrar" ? datos.de : datos.nombre);
  if (!origen) throw new ReglaNegocioError("Esa subcategoría ya no existe");
  const quitarDeLista = () => {
    a.subcategorias[datos.categoria] = a.subcategorias[datos.categoria].filter(
      (n) => !mismaSubcategoria(n, origen.nombre),
    );
  };

  if (datos.accion === "eliminar") {
    if (origen.productos > 0) {
      throw new ReglaNegocioError(
        `"${origen.nombre}" tiene ${origen.productos} productos: muévelos o únela con otra primero`,
      );
    }
    quitarDeLista();
    return { productosMovidos: 0 };
  }

  // Renombrar: si el destino ya existe se unen y se usa su nombre tal como está escrito.
  const destino = buscar(datos.a);
  const nombreFinal =
    destino && !mismaSubcategoria(destino.nombre, origen.nombre) ? destino.nombre : datos.a;
  let movidos = 0;
  for (const p of a.productos) {
    if (
      p.categoria === datos.categoria &&
      p.subcategoria &&
      mismaSubcategoria(p.subcategoria, origen.nombre)
    ) {
      p.subcategoria = nombreFinal;
      movidos++;
    }
  }
  quitarDeLista();
  if (!a.subcategorias[datos.categoria].some((n) => mismaSubcategoria(n, nombreFinal))) {
    a.subcategorias[datos.categoria].push(nombreFinal);
  }
  return { productosMovidos: movidos };
}

/** Foto de un producto: la ve cualquier usuario con sesión (el empleado la usa al vender). */
export async function obtenerImagen(id: string) {
  const imagen = almacen().imagenes.get(id);
  if (!imagen) throw new ReglaNegocioError("La imagen no existe");
  return imagen;
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
  // Los entregados ya no se muestran en ninguna lista (se conservan para reportes).
  const activos = almacen()
    .procesos.filter((p) => p.estado !== "entregado")
    .sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso));
  return rol === "empleado" ? activos : activos.filter((p) => p.responsable === rol);
}

/**
 * Bandeja de entradas: Paola recibe las de trámite y Oscar las de servicio.
 * Solo las que faltan por atender: las pasadas a En proceso o descartadas ya no aparecen.
 */
export async function obtenerEntradas(rol: Rol): Promise<Entrada[]> {
  const tipo = tipoDeResponsable(rol);
  return almacen()
    .entradas.filter((e) => e.tipo === tipo && !e.convertidaEn && !e.descartada)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Paola atiende trámites y Oscar servicios; el Empleado no administra ninguno. */
function tipoDeResponsable(rol: Rol): "tramite" | "servicio" {
  if (rol === "paola") return "tramite";
  if (rol === "oscar") return "servicio";
  throw new SinPermisoError();
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

/** Quién vende: el usuario para filtrar sus ventas y el nombre para el comprobante. */
export interface Vendedor {
  usuario: string;
  nombre: string;
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
  vendedor: Vendedor,
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
  const comprobante = generarComprobante(calculado, {
    id: `V-${crypto.randomUUID()}`,
    fecha,
    atendio: vendedor.nombre,
    usuario: vendedor.usuario,
  });

  // Todo validado: ahora sí se aplica.
  for (const [id, stock] of nuevosStocks) porId.get(id)!.stock = stock;
  if (comprobante) a.comprobantes.push(comprobante);
  lineas
    .filter((l) => l.tipo !== "venta")
    .forEach((l, i) =>
      a.movimientos.push({
        id: `M-${crypto.randomUUID()}`,
        tipo: l.tipo as "consumo_interno" | "merma",
        productoId: l.productoId,
        presentacion: l.presentacion,
        cantidad: l.cantidad,
        motivo: l.motivo?.trim() || undefined,
        fecha,
        registradoPor: vendedor.nombre,
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
      meta: { id: `AR-${crypto.randomUUID()}`, nombre, tipo, tamano: a.datos.byteLength },
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
    id: `ET-${crypto.randomUUID()}`,
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
  // El precio sale del catálogo en el servidor: el navegador solo manda qué servicio y opción.
  let servicio: ServicioTecnico | undefined;
  let cobro: EntradaServicio["cobro"];
  if (datos.servicioId) {
    servicio = SERVICIOS_DEMO.find((s) => s.id === datos.servicioId);
    if (!servicio) throw new ReglaNegocioError("Ese servicio ya no existe");
    try {
      cobro = cobroDeServicio(servicio, datos.opcionId);
    } catch (e) {
      throw new ReglaNegocioError((e as Error).message);
    }
  } else if (datos.opcionId) {
    throw new ReglaNegocioError("Elige primero el servicio");
  }
  const entrada: EntradaServicio = {
    id: `ES-${crypto.randomUUID()}`,
    tipo: "servicio",
    servicioId: servicio?.id,
    servicioNombre: servicio?.nombre,
    cobro,
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

/**
 * El Empleado entrega al cliente un trámite o equipo "Listo para entregar" (sección 8.11).
 * Desde ese momento desaparece de Seguimiento.
 */
export async function marcarEntregado(
  procesoId: string,
  usuario: string,
  ahora = new Date(),
): Promise<void> {
  const proceso = almacen().procesos.find((p) => p.id === procesoId);
  if (!proceso) throw new ReglaNegocioError("Ese trámite o servicio ya no está en seguimiento");
  if (!puedeCambiarEstado("empleado", proceso, "entregado")) {
    throw new ReglaNegocioError("Solo se puede entregar cuando está Listo para entregar");
  }
  proceso.estado = "entregado";
  proceso.entrega = { fecha: ahora.toISOString(), entregadoPor: usuario };
}

// ─── Bandeja de entradas y procesos (Paola: trámites, Oscar: servicios) ───

/** Busca una entrada pendiente que le toque a ese rol (si no es suya, no la ve). */
function entradaPendiente(rol: Rol, id: string): Entrada {
  const tipo = tipoDeResponsable(rol);
  const entrada = almacen().entradas.find((e) => e.id === id && e.tipo === tipo);
  if (!entrada) throw new ReglaNegocioError("Esa entrada ya no existe");
  if (entrada.convertidaEn) throw new ReglaNegocioError("Esa entrada ya está En proceso");
  if (entrada.descartada) throw new ReglaNegocioError("Esa entrada ya se descartó");
  return entrada;
}

/** Al abrirla en la bandeja deja de contar como "no leída" (badge del menú). */
export async function marcarEntradaLeida(rol: Rol, id: string): Promise<void> {
  entradaPendiente(rol, id).leida = true;
}

/** Descartar: llegó repetida o el cliente ya no quiso. No se borra, se conserva. */
export async function descartarEntrada(
  rol: Rol,
  id: string,
  usuario: string,
  ahora = new Date(),
): Promise<void> {
  const entrada = entradaPendiente(rol, id);
  entrada.leida = true;
  entrada.descartada = { fecha: ahora.toISOString(), por: usuario };
}

/**
 * "Pasar a En proceso": crea el expediente a partir de la entrada.
 * - Trámite: precio fijo del catálogo y lo que se acordó en mostrador (cancelado / anticipo).
 *   Si el precio es variable o pendiente, Paola lo define después.
 * - Servicio: el cobro que ya calculó el servidor al recibir la entrada (si tenía precio).
 */
export async function convertirEntrada(rol: Rol, id: string): Promise<EnProceso> {
  const entrada = entradaPendiente(rol, id);
  const base = {
    id: `${entrada.tipo === "tramite" ? "TP" : "SP"}-${crypto.randomUUID()}`,
    cliente: entrada.cliente,
    fechaIngreso: entrada.fecha,
    estado: "recibido" as const,
    entradaId: entrada.id,
    notas: entrada.notas
      ? [{ autor: entrada.enviadaPor, fecha: entrada.fecha, texto: entrada.notas }]
      : [],
  };
  let proceso: EnProceso;
  if (entrada.tipo === "tramite") {
    const tramite = TRAMITES_DEMO.find((t) => t.id === entrada.tramiteId);
    const precio = tramite ? precioFijo(tramite.precio) : undefined;
    proceso = {
      ...base,
      tipo: "tramite",
      responsable: "paola",
      tramiteId: entrada.tramiteId,
      tramiteNombre: entrada.tramiteNombre,
      pagoEntrada: entrada.pago,
      ...(precio !== undefined && { cobro: cobroConPago(precio, entrada.pago) }),
    } satisfies TramiteEnProceso;
  } else {
    proceso = {
      ...base,
      tipo: "servicio",
      responsable: "oscar",
      equipo: entrada.equipo,
      marcaModelo: entrada.marcaModelo,
      falla: entrada.falla,
      accesorios: entrada.accesorios,
      ...(entrada.cobro && { cobro: entrada.cobro }),
    } satisfies ServicioEnProceso;
  }
  const a = almacen();
  a.procesos.push(proceso);
  entrada.leida = true;
  entrada.convertidaEn = proceso.id;
  return proceso;
}

/** Proceso activo que le toca a ese rol (Paola: trámites, Oscar: servicios). */
function procesoPropio(rol: Rol, id: string): EnProceso {
  const proceso = almacen().procesos.find((p) => p.id === id);
  if (!proceso || proceso.responsable !== rol) {
    throw new ReglaNegocioError("Ese trámite o servicio ya no existe");
  }
  if (proceso.estado === "entregado") throw new ReglaNegocioError("Ya se entregó al cliente");
  return proceso;
}

/** Recibido → En proceso → Listo para entregar (al estar listo, lo ve el mostrador). */
export async function cambiarEstadoProceso(
  rol: Rol,
  id: string,
  nuevo: EstadoProceso,
): Promise<EnProceso> {
  const proceso = procesoPropio(rol, id);
  if (!puedeCambiarEstado(rol, proceso, nuevo)) {
    throw new ReglaNegocioError("No se puede cambiar a ese estado");
  }
  proceso.estado = nuevo;
  // TODO(backend): notificar a los empleados cuando pasa a "Listo para entregar".
  return proceso;
}

/** Nota visible para el mostrador (ej. "Falta confirmar correo de SAT"). */
export async function agregarNotaProceso(
  rol: Rol,
  id: string,
  autor: string,
  texto: string,
  ahora = new Date(),
): Promise<EnProceso> {
  const proceso = procesoPropio(rol, id);
  proceso.notas.push({ autor, fecha: ahora.toISOString(), texto: texto.trim() });
  return proceso;
}

/**
 * Paola u Oscar dicen cuánto cobrar. Se respeta lo que el cliente ya dejó en mostrador.
 * Si el proceso ya tenía cobro, se conserva el anticipo que tenía.
 */
export async function definirCobro(
  rol: Rol,
  id: string,
  total: number,
  detalle?: string,
): Promise<EnProceso> {
  const proceso = procesoPropio(rol, id);
  const pago =
    proceso.pagoEntrada ??
    (proceso.cobro?.anticipo
      ? { estado: "anticipo" as const, anticipo: proceso.cobro.anticipo }
      : undefined);
  try {
    proceso.cobro = cobroConPago(total, pago, detalle?.trim() || proceso.cobro?.detalle);
  } catch (e) {
    throw new ReglaNegocioError((e as Error).message);
  }
  return proceso;
}

// ─── Historial: entregados y descartados (solo Paola u Oscar) ───

export interface Historial {
  /** Entregados al cliente, los más recientes primero. */
  entregados: EnProceso[];
  /** Entradas descartadas en la bandeja. */
  descartadas: Entrada[];
  /** Última vez que se vació; `undefined` si nunca. */
  ultimoVaciado?: string;
}

/** Lo ya terminado de Paola (trámites) u Oscar (servicios), hasta que lo vacíen. */
export async function obtenerHistorial(rol: Rol): Promise<Historial> {
  const tipo = tipoDeResponsable(rol);
  const a = almacen();
  return {
    entregados: a.procesos
      .filter((p) => p.tipo === tipo && p.estado === "entregado" && !p.archivado)
      .sort((x, y) => (y.entrega?.fecha ?? "").localeCompare(x.entrega?.fecha ?? "")),
    descartadas: a.entradas
      .filter((e) => e.tipo === tipo && e.descartada && !e.archivado)
      .sort((x, y) => (y.descartada?.fecha ?? "").localeCompare(x.descartada?.fecha ?? "")),
    ultimoVaciado: a.historialVaciado[rol as "paola" | "oscar"],
  };
}

/**
 * "Vaciar historial": quita de la lista todo lo entregado y descartado hasta ahora.
 * No se borra: sigue contando en los reportes mensuales. Se recomienda a fin de mes.
 */
export async function vaciarHistorial(rol: Rol, ahora = new Date()): Promise<{ quitados: number }> {
  const { entregados, descartadas } = await obtenerHistorial(rol);
  const fecha = ahora.toISOString();
  for (const p of entregados) p.archivado = fecha;
  for (const e of descartadas) e.archivado = fecha;
  almacen().historialVaciado[rol as "paola" | "oscar"] = fecha;
  return { quitados: entregados.length + descartadas.length };
}

/** Contadores del menú y la campanita, calculados con los datos actuales. */
export async function obtenerContadores(rol: Rol): Promise<Contadores> {
  const a = almacen();
  const listos = a.procesos.filter((p) => p.estado === "listo").length;
  if (rol === "empleado") {
    const conSaldo = a.cuentas.filter((c) => saldoDe(c.id) > 0).length;
    return { pendientes: conSaldo, notificaciones: listos };
  }
  const tipo = rol === "paola" ? "tramite" : "servicio";
  const entradas = a.entradas.filter((e) => e.tipo === tipo && !e.leida).length;
  // TODO(backend): comentarios sin leer; por ahora se mantienen los de prueba.
  return { entradas, comentarios: rol === "paola" ? 2 : 1, notificaciones: entradas };
}

// ─── Dashboard del Empleado (pantalla 4) ─────────────────────

export interface ResumenEmpleado {
  ventas: ResumenVentas;
  /** Trámites y servicios listos para entregar, los más antiguos primero (esperan más). */
  listos: EnProceso[];
  /** Total que deben los clientes en Pendientes y cuántas cuentas tienen saldo. */
  porCobrar: { total: number; cuentas: number };
}

/**
 * Lo que ve el Empleado al entrar. Solo SUS ventas de hoy (hora de Guatemala) y sin costos
 * ni ganancias: los totales del negocio son para Paola en Reportes.
 */
export async function obtenerResumenEmpleado(
  usuario: string,
  ahora = new Date(),
): Promise<ResumenEmpleado> {
  const a = almacen();
  const listos = a.procesos
    .filter((p) => p.estado === "listo")
    .sort((x, y) => x.fechaIngreso.localeCompare(y.fechaIngreso));
  const saldos = a.cuentas.map((c) => saldoDe(c.id)).filter((s) => s > 0);
  return {
    ventas: resumenVentasDelDia(a.comprobantes, usuario, ahora),
    listos,
    porCobrar: { total: centavos(saldos.reduce((t, s) => t + s, 0)), cuentas: saldos.length },
  };
}

// ─── Cuentas de pendientes (fiado) ───────────────────────────

/** Pendientes: el Empleado registra; Paola solo lee; Oscar no tiene acceso (sección 17). */
function exigirAccesoPendientes(rol: Rol) {
  if (rol === "oscar") throw new SinPermisoError();
}

function detalleDe(cuenta: CuentaPendiente): DetalleCuenta {
  const a = almacen();
  const cargos = a.cargos
    .filter((c) => c.cuentaId === cuenta.id)
    .sort((x, y) => y.fecha.localeCompare(x.fecha));
  const pagos = a.pagos
    .filter((p) => p.cuentaId === cuenta.id)
    .sort((x, y) => y.fecha.localeCompare(x.fecha));
  return { cuenta, cargos, pagos, ...calcularSaldo(cargos, pagos) };
}

function saldoDe(cuentaId: string) {
  const a = almacen();
  return calcularSaldo(
    a.cargos.filter((c) => c.cuentaId === cuentaId),
    a.pagos.filter((p) => p.cuentaId === cuentaId),
  ).saldo;
}

function buscarCuenta(id: string): CuentaPendiente {
  const cuenta = almacen().cuentas.find((c) => c.id === id);
  if (!cuenta) throw new ReglaNegocioError("Ese cliente ya no existe");
  return cuenta;
}

/** Lista de cuentas: primero las que deben, luego por último movimiento. */
export async function obtenerCuentas(rol: Rol): Promise<ResumenCuenta[]> {
  exigirAccesoPendientes(rol);
  return almacen()
    .cuentas.map((cuenta) => {
      const d = detalleDe(cuenta);
      const fechas = [
        cuenta.creada,
        ...d.cargos.map((c) => c.fecha),
        ...d.pagos.map((p) => p.fecha),
      ];
      return {
        cuenta,
        cargosPendientes: cargosPendientes(d.cargos).length,
        saldo: d.saldo,
        ultimoMovimiento: fechas.sort().at(-1)!,
      };
    })
    .sort(
      (x, y) =>
        Number(y.saldo > 0) - Number(x.saldo > 0) ||
        y.ultimoMovimiento.localeCompare(x.ultimoMovimiento),
    );
}

export async function obtenerCuenta(rol: Rol, id: string): Promise<DetalleCuenta | null> {
  exigirAccesoPendientes(rol);
  const cuenta = almacen().cuentas.find((c) => c.id === id);
  return cuenta ? detalleDe(cuenta) : null;
}

function nombreRepetido(nombre: string, grupo: CuentaPendiente["grupo"], excepto?: string) {
  const n = normalizar(nombre);
  return almacen().cuentas.some(
    (c) => c.id !== excepto && c.grupo === grupo && normalizar(c.nombre) === n,
  );
}

/** Nuevo cliente u organización. No permite dos con el mismo nombre (evita cuentas duplicadas). */
export async function crearCuenta(
  datos: CuentaInput,
  ahora = new Date(),
): Promise<CuentaPendiente> {
  if (nombreRepetido(datos.nombre, datos.grupo)) {
    throw new ReglaNegocioError(`Ya existe "${datos.nombre.trim()}". Búscalo en la lista.`);
  }
  const cuenta: CuentaPendiente = {
    id: `CU-${crypto.randomUUID()}`,
    nombre: datos.nombre.trim(),
    grupo: datos.grupo,
    ...(datos.telefono?.trim() && { telefono: datos.telefono.trim() }),
    ...(datos.notas?.trim() && { notas: datos.notas.trim() }),
    creada: ahora.toISOString(),
  };
  almacen().cuentas.push(cuenta);
  return cuenta;
}

/** Editar nombre, teléfono o notas de la cuenta. */
export async function editarCuenta(id: string, datos: CuentaInput): Promise<CuentaPendiente> {
  const cuenta = buscarCuenta(id);
  if (nombreRepetido(datos.nombre, datos.grupo, id)) {
    throw new ReglaNegocioError(`Ya existe "${datos.nombre.trim()}".`);
  }
  cuenta.nombre = datos.nombre.trim();
  cuenta.grupo = datos.grupo;
  cuenta.telefono = datos.telefono?.trim() || undefined;
  cuenta.notas = datos.notas?.trim() || undefined;
  return cuenta;
}

/**
 * Agregar lo que se llevó fiado. De producto: precio del servidor (con mayoreo) y descuenta stock.
 */
export async function agregarCargo(
  cuentaId: string,
  datos: CargoInput,
  usuario: string,
  ahora = new Date(),
): Promise<Cargo> {
  const cuenta = buscarCuenta(cuentaId);
  const a = almacen();
  const base = {
    id: `CA-${crypto.randomUUID()}`,
    cuentaId: cuenta.id,
    fecha: ahora.toISOString(),
    cantidad: datos.cantidad,
    ...(cuenta.grupo === "organizacion" &&
      datos.llevadoPor?.trim() && { llevadoPor: datos.llevadoPor.trim() }),
    ...(datos.nota?.trim() && { nota: datos.nota.trim() }),
    registradoPor: usuario,
  };

  let cargo: Cargo;
  if (datos.tipo === "producto") {
    const producto = a.productos.find((p) => p.id === datos.productoId && p.activo);
    if (!producto) throw new ReglaNegocioError("Ese producto ya no existe");
    let stock: Producto["stock"];
    try {
      stock = descontarStock(producto.stock, "unidad", datos.cantidad);
    } catch (e) {
      throw new ReglaNegocioError(`${producto.nombre}: ${(e as Error).message}`);
    }
    producto.stock = stock;
    cargo = {
      ...base,
      productoId: producto.id,
      descripcion: producto.nombre,
      precioUnitario: calcularPrecio(producto, "unidad", datos.cantidad).unitario,
    };
  } else {
    cargo = {
      ...base,
      descripcion: datos.descripcion.trim(),
      precioUnitario: datos.precioUnitario,
    };
  }
  a.cargos.push(cargo);
  return cargo;
}

/** "Dejo un abono": baja el saldo. No puede pasar de lo que debe. */
export async function registrarAbono(
  cuentaId: string,
  monto: number,
  nota: string | undefined,
  usuario: string,
  ahora = new Date(),
): Promise<{ pago: PagoCuenta; detalle: DetalleCuenta }> {
  const cuenta = buscarCuenta(cuentaId);
  const saldo = saldoDe(cuentaId);
  if (saldo <= 0) throw new ReglaNegocioError("Esta cuenta no tiene saldo pendiente");
  if (centavos(monto) > saldo) {
    throw new ReglaNegocioError(`El abono no puede ser mayor a lo que debe (${formatQ(saldo)})`);
  }
  const pago: PagoCuenta = {
    id: `PA-${crypto.randomUUID()}`,
    cuentaId,
    fecha: ahora.toISOString(),
    tipo: "abono",
    monto: centavos(monto),
    cargoIds: [],
    ...(nota?.trim() && { nota: nota.trim() }),
    registradoPor: usuario,
    saldoDespues: centavos(saldo - monto),
  };
  almacen().pagos.push(pago);
  return { pago, detalle: detalleDe(cuenta) };
}

/** "Vamos a pagar esto": paga los cargos elegidos y los marca como pagados. */
export async function pagarCargos(
  cuentaId: string,
  cargoIds: string[],
  nota: string | undefined,
  usuario: string,
  ahora = new Date(),
): Promise<{ pago: PagoCuenta; detalle: DetalleCuenta }> {
  const cuenta = buscarCuenta(cuentaId);
  const a = almacen();
  const unicos = [...new Set(cargoIds)];
  const elegidos = unicos.map((id) => a.cargos.find((c) => c.id === id && c.cuentaId === cuentaId));
  if (elegidos.some((c) => !c))
    throw new ReglaNegocioError("Algún cargo no pertenece a esta cuenta");
  if (elegidos.some((c) => c!.pagoId)) throw new ReglaNegocioError("Algún cargo ya estaba pagado");

  const saldo = saldoDe(cuentaId);
  if (saldo <= 0) throw new ReglaNegocioError("Esta cuenta no tiene saldo pendiente");
  const monto = montoPagoCargos(elegidos as Cargo[], saldo);
  const pago: PagoCuenta = {
    id: `PA-${crypto.randomUUID()}`,
    cuentaId,
    fecha: ahora.toISOString(),
    tipo: "cargos",
    monto,
    cargoIds: unicos,
    ...(nota?.trim() && { nota: nota.trim() }),
    registradoPor: usuario,
    saldoDespues: centavos(saldo - monto),
  };
  for (const c of elegidos) c!.pagoId = pago.id;
  a.pagos.push(pago);
  return { pago, detalle: detalleDe(cuenta) };
}

/**
 * Eliminar un cliente que ya no regresa. Solo con saldo Q 0.00:
 * borrar una cuenta que todavía debe sería perder ese dinero.
 */
export async function eliminarCuenta(id: string): Promise<void> {
  buscarCuenta(id);
  if (saldoDe(id) > 0)
    throw new ReglaNegocioError("Solo se puede eliminar un cliente con saldo Q 0.00");
  const a = almacen();
  a.cuentas = a.cuentas.filter((c) => c.id !== id);
  a.cargos = a.cargos.filter((c) => c.cuentaId !== id);
  a.pagos = a.pagos.filter((p) => p.cuentaId !== id);
}
