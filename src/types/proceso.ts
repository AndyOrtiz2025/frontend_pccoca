import type { PagoEntrada } from "./entrada";
import type { EstadoProceso } from "./estados";
import type { TipoEquipo } from "./servicio";

export interface Cliente {
  nombre: string;
  telefono?: string;
}

/** Nota agregada a un trámite o servicio (ej. "dejó cargador y estuche"). */
export interface NotaProceso {
  autor: string;
  fecha: string;
  texto: string;
}

/**
 * Cuánto se le cobra al cliente al entregar. Sale del catálogo (precio fijo u opción elegida)
 * o lo define Oscar/Paola después de revisar.
 */
export interface Cobro {
  total: number;
  /** Lo que el cliente ya dejó al registrar la entrada. */
  anticipo?: number;
  /** Ej. "Activación de Office · 1 año". */
  detalle?: string;
}

interface ProcesoBase {
  id: string;
  cliente: Cliente;
  fechaIngreso: string;
  estado: EstadoProceso;
  notas: NotaProceso[];
  /** Entrada de la que salió, si se convirtió desde una (secciones 9.3.1 y 10.5). */
  entradaId?: string;
  /** Sin `cobro`: el responsable todavía no dice cuánto cobrar. */
  cobro?: Cobro;
  /**
   * Lo que se acordó en mostrador al recibirlo (cancelado, no cancelado o anticipo). Sirve para
   * calcular lo que falta cobrar cuando Paola u Oscar definen el precio después.
   */
  pagoEntrada?: PagoEntrada;
  /**
   * Cuándo y quién lo entregó. Al entregarse deja de mostrarse en todas las listas,
   * pero se conserva para los reportes y por si el cliente reclama.
   */
  entrega?: { fecha: string; entregadoPor: string };
  /** Paola u Oscar lo quitaron de su historial ("Vaciar historial"). Sigue contando en reportes. */
  archivado?: string;
}

/** Trámite en proceso que gestiona Paola (sección 9.3). */
export interface TramiteEnProceso extends ProcesoBase {
  tipo: "tramite";
  responsable: "paola";
  tramiteId: string;
  tramiteNombre: string;
}

/** Servicio técnico en proceso que gestiona Oscar (sección 10.4). */
export interface ServicioEnProceso extends ProcesoBase {
  tipo: "servicio";
  responsable: "oscar";
  equipo: TipoEquipo;
  marcaModelo?: string;
  falla: string;
  accesorios: string[];
}

export type EnProceso = TramiteEnProceso | ServicioEnProceso;
