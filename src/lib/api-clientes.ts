import "server-only";
import type { Rol } from "@/lib/auth/roles";
import { ReglaNegocioError, SinPermisoError, type ArchivoEntrante } from "@/lib/api";
import { detectarTipo, MAX_BYTES_ARCHIVO, nombreSeguro } from "@/lib/archivos";
import { almacen } from "@/lib/mocks/store";
import {
  coincideCliente,
  DATOS_SUGERIDOS,
  MAX_ARCHIVOS_CLIENTE,
  SERVICIOS_SUGERIDOS,
  sugerencias,
} from "@/lib/reglas/clientes";
import type {
  ClienteInput,
  ContrasenaClienteInput,
  DatoClienteInput,
  EditarContrasenaInput,
} from "@/schemas/cliente.schema";
import type {
  ArchivoCliente,
  ClienteFrecuente,
  ClienteVista,
  ResumenCliente,
} from "@/types/cliente";

// ─── Clientes frecuentes de trámites (solo Paola) ─────────────

/** Son datos personales y contraseñas de los clientes: nadie más que Paola los ve. */
function exigirPaola(rol: Rol) {
  if (rol !== "paola") throw new SinPermisoError();
}

function buscarCliente(id: string): ClienteFrecuente {
  const c = almacen().clientes.find((x) => x.id === id);
  if (!c) throw new ReglaNegocioError("Ese cliente no existe");
  return c;
}

/** Para editar: un cliente desactivado se puede ver, pero no cambiar hasta reactivarlo. */
function clienteEditable(id: string): ClienteFrecuente {
  const c = buscarCliente(id);
  if (!c.activo) throw new ReglaNegocioError("Reactiva el cliente para hacerle cambios");
  return c;
}

function tocar(c: ClienteFrecuente, ahora: Date) {
  c.actualizado = ahora.toISOString();
}

const nuevoId = (prefijo: string) => `${prefijo}-${crypto.randomUUID()}`;

/** Ficha sin las contraseñas: esas solo se piden una por una con "Mostrar". */
function aVista(c: ClienteFrecuente): ClienteVista {
  return {
    ...structuredClone({ ...c, contrasenas: [] }),
    contrasenas: c.contrasenas.map((p) => ({
      id: p.id,
      servicio: p.servicio,
      usuario: p.usuario,
      nota: p.nota,
      actualizada: p.actualizada,
    })),
  };
}

export async function obtenerClientes(rol: Rol, consulta = ""): Promise<ResumenCliente[]> {
  exigirPaola(rol);
  return almacen()
    .clientes.filter((c) => coincideCliente(c, consulta))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      datos: structuredClone(c.datos),
      contrasenas: c.contrasenas.length,
      archivos: c.archivos.length,
      activo: c.activo,
      actualizado: c.actualizado,
    }));
}

export interface FichaCliente {
  cliente: ClienteVista;
  /** Nombres de datos y de contraseñas para sugerir (los de siempre y los que ya usó). */
  sugerenciasDatos: string[];
  sugerenciasServicios: string[];
}

export async function obtenerFichaCliente(rol: Rol, id: string): Promise<FichaCliente | null> {
  exigirPaola(rol);
  const todos = almacen().clientes;
  const c = todos.find((x) => x.id === id);
  if (!c) return null;
  return {
    cliente: aVista(c),
    sugerenciasDatos: sugerencias(
      DATOS_SUGERIDOS,
      todos.flatMap((x) => x.datos.map((d) => d.nombre)),
    ),
    sugerenciasServicios: sugerencias(
      SERVICIOS_SUGERIDOS,
      todos.flatMap((x) => x.contrasenas.map((p) => p.servicio)),
    ),
  };
}

export async function crearCliente(
  rol: Rol,
  datos: ClienteInput,
  ahora = new Date(),
): Promise<ClienteFrecuente> {
  exigirPaola(rol);
  const a = almacen();
  const repetido = a.clientes.find(
    (c) => c.nombre.toLocaleLowerCase("es") === datos.nombre.toLocaleLowerCase("es"),
  );
  if (repetido) throw new ReglaNegocioError(`Ya existe un cliente llamado ${repetido.nombre}`);
  const cliente: ClienteFrecuente = {
    id: nuevoId("CF"),
    nombre: datos.nombre,
    datos: [],
    contrasenas: [],
    archivos: [],
    notas: [],
    activo: true,
    creado: ahora.toISOString(),
    actualizado: ahora.toISOString(),
  };
  a.clientes.push(cliente);
  return cliente;
}

export async function renombrarCliente(
  rol: Rol,
  id: string,
  datos: ClienteInput,
  ahora = new Date(),
) {
  exigirPaola(rol);
  const c = clienteEditable(id);
  const repetido = almacen().clientes.find(
    (x) => x.id !== id && x.nombre.toLocaleLowerCase("es") === datos.nombre.toLocaleLowerCase("es"),
  );
  if (repetido) throw new ReglaNegocioError(`Ya existe un cliente llamado ${repetido.nombre}`);
  c.nombre = datos.nombre;
  tocar(c, ahora);
}

/** Desactivar o reactivar (nunca se borra). */
export async function cambiarActivoCliente(
  rol: Rol,
  id: string,
  activo: boolean,
  ahora = new Date(),
) {
  exigirPaola(rol);
  const c = buscarCliente(id);
  c.activo = activo;
  tocar(c, ahora);
}

// ── Datos ──

export async function agregarDato(
  rol: Rol,
  id: string,
  datos: DatoClienteInput,
  ahora = new Date(),
) {
  exigirPaola(rol);
  const c = clienteEditable(id);
  if (c.datos.length >= 30) throw new ReglaNegocioError("Máximo 30 datos por cliente");
  c.datos.push({ id: nuevoId("DC"), ...datos });
  tocar(c, ahora);
}

function buscarDato(c: ClienteFrecuente, datoId: string) {
  const d = c.datos.find((x) => x.id === datoId);
  if (!d) throw new ReglaNegocioError("Ese dato ya no existe");
  return d;
}

export async function editarDato(
  rol: Rol,
  id: string,
  datoId: string,
  datos: DatoClienteInput,
  ahora = new Date(),
) {
  exigirPaola(rol);
  const c = clienteEditable(id);
  Object.assign(buscarDato(c, datoId), datos);
  tocar(c, ahora);
}

export async function quitarDato(rol: Rol, id: string, datoId: string, ahora = new Date()) {
  exigirPaola(rol);
  const c = clienteEditable(id);
  buscarDato(c, datoId);
  c.datos = c.datos.filter((d) => d.id !== datoId);
  tocar(c, ahora);
}

// ── Contraseñas ──

export async function agregarContrasena(
  rol: Rol,
  id: string,
  datos: ContrasenaClienteInput,
  ahora = new Date(),
) {
  exigirPaola(rol);
  const c = clienteEditable(id);
  if (c.contrasenas.length >= 30) throw new ReglaNegocioError("Máximo 30 contraseñas por cliente");
  c.contrasenas.push({ id: nuevoId("PC"), ...datos, actualizada: ahora.toISOString() });
  tocar(c, ahora);
}

function buscarContrasena(c: ClienteFrecuente, contrasenaId: string) {
  const p = c.contrasenas.find((x) => x.id === contrasenaId);
  if (!p) throw new ReglaNegocioError("Esa contraseña ya no existe");
  return p;
}

/** "Mostrar": la única forma de que una contraseña salga del servidor. */
export async function verContrasena(rol: Rol, id: string, contrasenaId: string): Promise<string> {
  exigirPaola(rol);
  return buscarContrasena(buscarCliente(id), contrasenaId).contrasena;
}

export async function editarContrasena(
  rol: Rol,
  id: string,
  contrasenaId: string,
  datos: EditarContrasenaInput,
  ahora = new Date(),
) {
  exigirPaola(rol);
  const c = clienteEditable(id);
  const p = buscarContrasena(c, contrasenaId);
  p.servicio = datos.servicio;
  p.usuario = datos.usuario;
  p.nota = datos.nota;
  if (datos.contrasena !== undefined) p.contrasena = datos.contrasena;
  p.actualizada = ahora.toISOString();
  tocar(c, ahora);
}

export async function quitarContrasena(
  rol: Rol,
  id: string,
  contrasenaId: string,
  ahora = new Date(),
) {
  exigirPaola(rol);
  const c = clienteEditable(id);
  buscarContrasena(c, contrasenaId);
  c.contrasenas = c.contrasenas.filter((p) => p.id !== contrasenaId);
  tocar(c, ahora);
}

// ── Archivos ──

export async function subirArchivosCliente(
  rol: Rol,
  id: string,
  entrantes: ArchivoEntrante[],
  ahora = new Date(),
): Promise<ArchivoCliente[]> {
  exigirPaola(rol);
  const c = clienteEditable(id);
  if (entrantes.length === 0) throw new ReglaNegocioError("Elige al menos un archivo");
  if (c.archivos.length + entrantes.length > MAX_ARCHIVOS_CLIENTE)
    throw new ReglaNegocioError(`Máximo ${MAX_ARCHIVOS_CLIENTE} archivos por cliente`);
  const nuevos = entrantes.map((e) => {
    const nombre = nombreSeguro(e.nombre);
    if (e.datos.byteLength > MAX_BYTES_ARCHIVO)
      throw new ReglaNegocioError(`${nombre}: pesa más de 5 MB`);
    const tipo = detectarTipo(e.datos);
    if (!tipo) throw new ReglaNegocioError(`${nombre}: solo se aceptan PDF, JPG, PNG o WEBP`);
    const meta: ArchivoCliente = {
      id: nuevoId("AR"),
      nombre,
      tipo,
      tamano: e.datos.byteLength,
      subido: ahora.toISOString(),
    };
    return { meta, datos: e.datos };
  });
  const a = almacen();
  for (const n of nuevos) {
    // Mismo depósito que los archivos de entradas: se descargan por /api/archivos/[id] (solo Paola).
    a.archivos.set(n.meta.id, { meta: n.meta, datos: n.datos });
    c.archivos.push(n.meta);
  }
  tocar(c, ahora);
  return nuevos.map((n) => n.meta);
}

export async function quitarArchivoCliente(
  rol: Rol,
  id: string,
  archivoId: string,
  ahora = new Date(),
) {
  exigirPaola(rol);
  const c = clienteEditable(id);
  if (!c.archivos.some((x) => x.id === archivoId))
    throw new ReglaNegocioError("Ese archivo ya no existe");
  c.archivos = c.archivos.filter((x) => x.id !== archivoId);
  almacen().archivos.delete(archivoId);
  tocar(c, ahora);
}

// ── Notas ──

export async function agregarNotaCliente(rol: Rol, id: string, texto: string, ahora = new Date()) {
  exigirPaola(rol);
  const c = clienteEditable(id);
  c.notas.unshift({ id: nuevoId("NC"), texto, fecha: ahora.toISOString() });
  tocar(c, ahora);
}

export async function quitarNotaCliente(rol: Rol, id: string, notaId: string, ahora = new Date()) {
  exigirPaola(rol);
  const c = clienteEditable(id);
  if (!c.notas.some((n) => n.id === notaId)) throw new ReglaNegocioError("Esa nota ya no existe");
  c.notas = c.notas.filter((n) => n.id !== notaId);
  tocar(c, ahora);
}
