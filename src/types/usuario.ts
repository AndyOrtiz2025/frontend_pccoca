/**
 * Empleado que Oscar administra desde "Usuarios" (funcionalidad nueva).
 * Un empleado con ventas no se borra: se desactiva para conservar quién vendió qué.
 */
export interface Empleado {
  id: string;
  usuario: string;
  nombre: string;
  telefono?: string;
  activo: boolean;
  creado: string;
  ultimoAcceso?: string;
}
