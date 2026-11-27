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
import { cobroDeServicio, puedeCambiarEstado } from "@/lib/reglas/procesos";
import { resumenVentasDelDia, type ResumenVentas } from "@/lib/reglas/resumen";
import { abrirPaquete, aVistaEmpleado, descontarStock } from "@/lib/reglas/inventario";
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
  // Los entregados ya no se muestran en ninguna lista (se conservan para reportes).
  const activos = almacen()
    .procesos.filter((p) => p.estado !== "entregado")
    .sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso));
  return rol === "empleado" ? activos : activos.filter((p) => p.responsable === rol);
}

/** Bandeja de entradas: Paola recibe las de trámite y Oscar las de servicio. */
export async function obtenerEntradas(rol: Exclude<Rol, "empleado">): Promise<Entrada[]> {
  const tipo = rol === "paola" ? "tramite" : "servicio";
  return almacen()
    .entradas.filter((e) => e.tipo === tipo)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
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
