import type { ArchivoAdjunto } from "./entrada";

/**
 * Dato libre del cliente: Paola decide qué guardar ("DPI", "Teléfono", "Contador"…).
 * No hay formulario fijo porque no todos los clientes tienen los mismos datos.
 */
export interface DatoCliente {
  id: string;
  nombre: string;
  valor: string;
}

/**
 * Contraseña de una cuenta del cliente (Agencia Virtual SAT, correo, banca en línea…).
 * DATO SENSIBLE: solo la ve Paola y nunca viaja a la pantalla hasta que ella toca "Mostrar".
 * TODO(backend): se guarda cifrada.
 */
export interface ContrasenaCliente {
  id: string;
  /** A qué es: "Agencia Virtual SAT", "Correo Gmail"… lo escribe Paola. */
  servicio: string;
  usuario?: string;
  contrasena: string;
  nota?: string;
  /** Última vez que se creó o cambió: para saber qué tan vieja es. */
  actualizada: string;
}

/** Lo que llega a la pantalla: todo menos la contraseña. */
export type ContrasenaVista = Omit<ContrasenaCliente, "contrasena">;

export interface ArchivoCliente extends ArchivoAdjunto {
  subido: string;
}

export interface NotaCliente {
  id: string;
  texto: string;
  fecha: string;
}

/** Cliente frecuente de trámites (solo Paola). */
export interface ClienteFrecuente {
  id: string;
  nombre: string;
  datos: DatoCliente[];
  contrasenas: ContrasenaCliente[];
  archivos: ArchivoCliente[];
  notas: NotaCliente[];
  /** Se desactiva, nunca se borra. */
  activo: boolean;
  creado: string;
  actualizado: string;
}

/** Ficha para la pantalla: igual, pero sin las contraseñas. */
export interface ClienteVista extends Omit<ClienteFrecuente, "contrasenas"> {
  contrasenas: ContrasenaVista[];
}

/** Fila de la lista de clientes. */
export interface ResumenCliente {
  id: string;
  nombre: string;
  datos: DatoCliente[];
  contrasenas: number;
  archivos: number;
  activo: boolean;
  actualizado: string;
}
