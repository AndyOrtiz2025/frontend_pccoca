/** Pestañas del Excel actual: organizaciones (escuelas, comités) y clientes individuales (sección 16). */
export type GrupoPendiente = "organizacion" | "individual";

/**
 * Cuenta de fiado de un cliente u organización. Agrupa todos sus cargos y pagos.
 * Con saldo Q 0.00 la cuenta se conserva (puede volver); se puede eliminar si ya no regresa.
 */
export interface CuentaPendiente {
  id: string;
  nombre: string;
  grupo: GrupoPendiente;
  telefono?: string;
  /** Notas de la cuenta (ej. "Paga cada fin de mes"). */
  notas?: string;
  creada: string;
}

/** Lo que se llevó fiado: una línea de la cuenta. */
export interface Cargo {
  id: string;
  cuentaId: string;
  fecha: string;
  productoId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  /** Organizaciones: qué persona se lo llevó (ej. "Ana Ruiz"). */
  llevadoPor?: string;
  /** Detalle opcional de lo que se llevó. */
  nota?: string;
  registradoPor: string;
  /** Si se pagó con "Pagar seleccionados": el pago que lo cerró. */
  pagoId?: string;
}

/**
 * Pago a la cuenta:
 * - "abono": un monto libre que baja el saldo ("dejo Q 50.00").
 * - "cargos": pagó cargos específicos ("vamos a pagar esto").
 */
export interface PagoCuenta {
  id: string;
  cuentaId: string;
  fecha: string;
  tipo: "abono" | "cargos";
  monto: number;
  cargoIds: string[];
  nota?: string;
  registradoPor: string;
  /** Saldo que quedó después de este pago (para el comprobante). */
  saldoDespues: number;
}

/** Fila de la lista de cuentas. */
export interface ResumenCuenta {
  cuenta: CuentaPendiente;
  cargosPendientes: number;
  saldo: number;
  ultimoMovimiento: string;
}

/** Todo lo de una cuenta, para el detalle y el estado de cuenta. */
export interface DetalleCuenta {
  cuenta: CuentaPendiente;
  cargos: Cargo[];
  pagos: PagoCuenta[];
  totalCargos: number;
  totalPagado: number;
  saldo: number;
}
