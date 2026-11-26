import type { Cliente } from "./proceso";
import type { TipoEquipo } from "./servicio";

/** Requisito que el cliente dejó (✓) o no (✗) al registrar la entrada. */
export interface DocumentoEntregado {
  nombre: string;
  entregado: boolean;
}

interface EntradaBase {
  id: string;
  cliente: Cliente;
  notas?: string;
  enviadaPor: string;
  fecha: string;
  leida: boolean;
  /** Id del proceso creado al convertirla; si existe, ya no se puede volver a convertir. */
  convertidaEn?: string;
}

/** Entrada de trámite: reemplaza el WhatsApp a Paola (sección 8.9). */
export interface EntradaTramite extends EntradaBase {
  tipo: "tramite";
  tramiteId: string;
  tramiteNombre: string;
  documentos: DocumentoEntregado[];
}

/** Entrada de servicio técnico: reemplaza el WhatsApp a Oscar (sección 8.10). */
export interface EntradaServicio extends EntradaBase {
  tipo: "servicio";
  equipo: TipoEquipo;
  marcaModelo?: string;
  falla: string;
  accesorios: string[];
}

export type Entrada = EntradaTramite | EntradaServicio;
