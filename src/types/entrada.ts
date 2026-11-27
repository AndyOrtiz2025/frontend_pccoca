import type { Cliente } from "./proceso";
import type { TipoEquipo } from "./servicio";

/** Requisito que el cliente dejó (✓) o no (✗) al registrar la entrada. */
export interface DocumentoEntregado {
  nombre: string;
  entregado: boolean;
}

/** Estado del pago del trámite al dejarlo (pedido de Paola). */
export type EstadoPago = "cancelado" | "pendiente" | "anticipo";

export const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  cancelado: "Cancelado",
  pendiente: "No cancelado",
  anticipo: "Anticipo",
};

export interface PagoEntrada {
  estado: EstadoPago;
  /** Solo si estado = "anticipo": cuánto dejó el cliente. */
  anticipo?: number;
}

/** Archivo que el Empleado subió con la entrada (DPI escaneado, recibo de luz…). */
export interface ArchivoAdjunto {
  id: string;
  nombre: string;
  /** Tipo detectado por el servidor a partir del contenido, no por la extensión. */
  tipo: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  tamano: number;
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
  pago: PagoEntrada;
  archivos: ArchivoAdjunto[];
  /**
   * Datos que dictó el cliente (correo, NIT, usuario y contraseña de agencia virtual…).
   * DATO SENSIBLE: solo lo ve Paola; nunca se muestra en Seguimiento. El backend lo guarda cifrado.
   */
  datosCliente?: string;
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
