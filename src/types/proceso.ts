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

interface ProcesoBase {
  id: string;
  cliente: Cliente;
  fechaIngreso: string;
  estado: EstadoProceso;
  notas: NotaProceso[];
  /** Entrada de la que salió, si se convirtió desde una (secciones 9.3.1 y 10.5). */
  entradaId?: string;
  /**
   * Cuándo y quién lo entregó. Al entregarse deja de mostrarse en todas las listas,
   * pero se conserva para los reportes y por si el cliente reclama.
   */
  entrega?: { fecha: string; entregadoPor: string };
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
