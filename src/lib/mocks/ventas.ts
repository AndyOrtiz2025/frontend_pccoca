import type { Comprobante, LineaComprobante } from "@/types/movimiento";

const linea = (
  codigo: string,
  nombre: string,
  cantidad: number,
  precioUnitario: number,
): LineaComprobante => ({
  codigo,
  nombre,
  presentacion: "unidad",
  cantidad,
  precioUnitario,
  subtotal: cantidad * precioUnitario,
});

function venta(
  id: string,
  minutosAtras: number,
  usuario: string,
  atendio: string,
  lineas: LineaComprobante[],
  ahora: Date,
): Comprobante {
  return {
    id,
    fecha: new Date(ahora.getTime() - minutosAtras * 60_000).toISOString(),
    atendio,
    usuario,
    lineas,
    total: lineas.reduce((t, l) => t + l.subtotal, 0),
  };
}

/**
 * Ventas de prueba de las últimas horas, para que el Dashboard no salga vacío al arrancar.
 * Incluye una de Ana para comprobar que Carlos solo ve las suyas.
 */
export function ventasDemo(ahora = new Date()): Comprobante[] {
  return [
    venta(
      "V-demo-1",
      150,
      "carlos",
      "Carlos",
      [
        linea("LIB-0050", "Cuaderno universitario", 2, 15),
        linea("LIB-0061", "Lapicero azul", 3, 2),
      ],
      ahora,
    ),
    venta(
      "V-demo-2",
      75,
      "carlos",
      "Carlos",
      [linea("LIB-0021", "Hojas carta 75g (resma)", 1, 42)],
      ahora,
    ),
    venta(
      "V-demo-3",
      20,
      "carlos",
      "Carlos",
      [linea("LIB-0034", "Folder tamaño carta", 4, 2)],
      ahora,
    ),
    venta("V-demo-4", 40, "ana", "Ana", [linea("LIB-0065", "Marcadores permanentes", 2, 8)], ahora),
  ];
}
