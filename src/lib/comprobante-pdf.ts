import { formatQ } from "@/lib/format";
import type { Comprobante } from "@/types/movimiento";
import {
  fechaComprobante,
  NEGOCIO,
  nombreLinea,
  numeroComprobante,
  totalArticulos,
} from "./comprobante";

const ANCHO = 80; // mm, como el papel de una impresora térmica
const MARGEN = 6;
const UTIL = ANCHO - MARGEN * 2;
const NAVY: [number, number, number] = [20, 33, 61];
const GRIS: [number, number, number] = [100, 108, 122];
const DORADO: [number, number, number] = [252, 163, 17];

/**
 * Genera el comprobante como PDF de 80 mm de ancho (el alto depende de cuántos productos haya).
 * jsPDF se carga solo al pedir el PDF, para no hacer más pesada la página de ventas.
 */
export async function crearPdfComprobante(c: Comprobante): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  // Primero se mide el alto con un documento de prueba (los nombres largos ocupan varias líneas).
  const medir = new jsPDF({ unit: "mm", format: [ANCHO, 200] });
  medir.setFontSize(9);
  const nombres = c.lineas.map((l) => medir.splitTextToSize(nombreLinea(l), UTIL) as string[]);
  const altoLineas = nombres.reduce((t, n) => t + n.length * 4 + 5.5, 0);
  const alto = 92 + altoLineas;

  const doc = new jsPDF({ unit: "mm", format: [ANCHO, alto] });
  doc.setProperties({ title: `Comprobante ${numeroComprobante(c)} · PC Coca` });
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

  // Encabezado
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

  // Datos de la venta
  const dato = (etiqueta: string, valor: string) => {
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(etiqueta, MARGEN, y);
    doc.setTextColor(...NAVY);
    doc.text(valor, derecha, y, { align: "right" });
    y += 4.2;
  };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("COMPROBANTE DE VENTA", centro, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  dato("No.", numeroComprobante(c));
  dato("Fecha", fechaComprobante(c));
  dato("Atendió", c.atendio);
  y += 0.8;
  separador();

  // Productos: nombre arriba; "3 × Q 15.00" a la izquierda y el subtotal a la derecha.
  c.lineas.forEach((l, i) => {
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
    doc.text(formatQ(l.subtotal), derecha, y, { align: "right" });
    y += 5.5;
  });
  y -= 1.5;
  separador();

  // Total
  doc.setFont("helvetica", "normal");
  dato("Artículos", String(totalArticulos(c)));
  y += 1.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("TOTAL", MARGEN, y);
  doc.setFontSize(15);
  doc.text(formatQ(c.total), derecha, y, { align: "right" });
  y += 6;
  separador();

  // Pie
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRIS);
  doc.text("Consumidor final · Documento interno, no es factura.", centro, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("¡Gracias por su compra!", centro, y, { align: "center" });

  return doc.output("blob");
}
