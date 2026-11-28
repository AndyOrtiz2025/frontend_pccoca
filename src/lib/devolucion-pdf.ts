import { formatQ } from "@/lib/format";
import { cuadreCambio, numeroDevolucion } from "@/lib/reglas/devoluciones";
import type { Devolucion } from "@/types/devolucion";
import type { LineaComprobante } from "@/types/movimiento";
import { fechaComprobante, NEGOCIO, nombreLinea } from "./comprobante";

const ANCHO = 80;
const MARGEN = 6;
const UTIL = ANCHO - MARGEN * 2;
const NAVY: [number, number, number] = [20, 33, 61];
const GRIS: [number, number, number] = [100, 108, 122];
const DORADO: [number, number, number] = [252, 163, 17];

/** "comprobante-cambio-pc-coca-D-3F2A9C.pdf". */
export function nombreArchivoDevolucion(d: Pick<Devolucion, "id">): string {
  return `comprobante-cambio-pc-coca-${numeroDevolucion(d)}.pdf`;
}

/** Comprobante del cambio en PDF de 80 mm, con el mismo estilo que el de venta. */
export async function crearPdfDevolucion(d: Devolucion): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const medir = new jsPDF({ unit: "mm", format: [ANCHO, 200] });
  medir.setFontSize(9);
  const partir = (ls: LineaComprobante[]) =>
    ls.map((l) => medir.splitTextToSize(nombreLinea(l), UTIL) as string[]);
  const nDevuelto = partir(d.devuelto);
  const nLlevo = partir(d.llevo);
  const alto =
    110 +
    [...nDevuelto, ...nLlevo].reduce((t, n) => t + n.length * 4 + 5.5, 0) +
    (d.autorizo ? 4.2 : 0) +
    (d.numeroCompra ? 4.2 : 0);

  const doc = new jsPDF({ unit: "mm", format: [ANCHO, alto] });
  doc.setProperties({ title: `Comprobante de cambio ${numeroDevolucion(d)} · PC Coca` });
  let y = 12;
  const centro = ANCHO / 2;
  const derecha = ANCHO - MARGEN;
  const separador = () => {
    doc.setDrawColor(190);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(MARGEN, y, derecha, y);
    doc.setLineDashPattern([], 0);
    y += 5;
  };
  const dato = (etiqueta: string, valor: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(etiqueta, MARGEN, y);
    doc.setTextColor(...NAVY);
    doc.text(valor, derecha, y, { align: "right" });
    y += 4.2;
  };
  const titulo = (t: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(t, MARGEN, y);
    y += 5;
  };
  const lineas = (ls: LineaComprobante[], nombres: string[][], signo: string) => {
    ls.forEach((l, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      for (const parte of nombres[i]!) {
        doc.text(parte, MARGEN, y);
        y += 4;
      }
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.text(`${l.cantidad} × ${formatQ(l.precioUnitario)}`, MARGEN, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(`${signo}${formatQ(l.subtotal)}`, derecha, y, { align: "right" });
      y += 5.5;
    });
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  const anchoNombre = doc.getTextWidth(NEGOCIO.nombre);
  doc.text(NEGOCIO.nombre, centro - 1, y, { align: "center" });
  doc.setFillColor(...DORADO);
  doc.circle(centro - 1 + anchoNombre / 2 + 1.2, y - 0.6, 0.7, "F");
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(NEGOCIO.giro, centro, y, { align: "center" });
  y += 3.8;
  doc.text(NEGOCIO.lugar, centro, y, { align: "center" });
  y += 5;
  separador();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("COMPROBANTE DE CAMBIO", centro, y, { align: "center" });
  y += 5;
  dato("No.", numeroDevolucion(d));
  dato("Fecha", fechaComprobante(d));
  dato("Atendió", d.atendio);
  if (d.numeroCompra) dato("Compra original", d.numeroCompra);
  if (d.autorizo) dato("Autorizó", d.autorizo.por);
  y += 0.8;
  separador();

  titulo("DEVUELVE");
  lineas(d.devuelto, nDevuelto, "-");
  dato("Saldo a favor", formatQ(d.saldo));
  y += 0.8;
  separador();
  titulo("SE LLEVA");
  lineas(d.llevo, nLlevo, "");
  dato("Total que se lleva", formatQ(d.totalLlevo));
  y += 0.8;
  separador();

  const { diferencia } = cuadreCambio(d.saldo, d.totalLlevo);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(diferencia > 0 ? "PAGÓ" : "CAMBIO EXACTO", MARGEN, y);
  doc.setFontSize(15);
  doc.text(formatQ(diferencia), derecha, y, { align: "right" });
  y += 6;
  separador();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRIS);
  doc.text("Documento interno, no es factura. No se devuelve dinero.", centro, y, {
    align: "center",
  });
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("¡Gracias por su preferencia!", centro, y, { align: "center" });
  return doc.output("blob");
}
