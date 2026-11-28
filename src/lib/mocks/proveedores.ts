import type { Pedido } from "@/types/pedido";
import type { Compra, Proveedor, Reclamo } from "@/types/proveedor";

/** Proveedores de prueba. TODO(datos reales): levantar el listado con Paola. */
export const PROVEEDORES_DEMO: Proveedor[] = [
  {
    id: "prov-1",
    nombre: "Distribuidora Huehue",
    nit: "4492019-2",
    contacto: "Rigoberto Morales",
    telefono: "7764-2210",
    correo: "ventas@distribuidorahuehue.com",
    direccion: "4a. calle 3-20, zona 1, Huehuetenango",
    diasVisita: [2],
    surte: ["libreria"],
    activo: true,
  },
  {
    id: "prov-2",
    nombre: "Librería Progreso (mayorista)",
    nit: "778103-9",
    contacto: "Fernando Castillo",
    telefono: "7768-4455",
    direccion: "Huehuetenango centro",
    diasVisita: [2, 5],
    surte: ["libreria", "varios"],
    activo: true,
  },
  {
    id: "prov-3",
    nombre: "Importadora Xela",
    nit: "382901-K",
    contacto: "Marta de León",
    telefono: "7761-9087",
    direccion: "Quetzaltenango",
    surte: ["libreria", "tecnologia"],
    activo: true,
  },
];

/** Compras de prueba (para el historial del proveedor y del producto). */
export const COMPRAS_DEMO: Compra[] = [
  {
    id: "C-demo-1",
    proveedorId: "prov-3",
    fecha: "2026-11-18T10:30:00-06:00",
    factura: "FAC-8941",
    lineas: [
      {
        productoId: "p-lib-0045",
        presentacion: "paquete",
        cantidad: 19,
        danadas: 1,
        costoUnitario: 18,
        subtotal: 360,
      },
    ],
    total: 360,
    registradoPor: "Paola",
  },
  {
    id: "C-demo-2",
    proveedorId: "prov-1",
    fecha: "2026-11-11T09:15:00-06:00",
    factura: "FAC-8720",
    lineas: [
      {
        productoId: "p-lib-0021",
        presentacion: "unidad",
        cantidad: 10,
        danadas: 0,
        costoUnitario: 33,
        subtotal: 330,
      },
      {
        productoId: "p-lib-0050",
        presentacion: "unidad",
        cantidad: 48,
        danadas: 0,
        costoUnitario: 9.5,
        subtotal: 456,
      },
    ],
    total: 786,
    registradoPor: "Paola",
  },
];

export const RECLAMOS_DEMO: Reclamo[] = [
  {
    id: "R-demo-1",
    proveedorId: "prov-3",
    compraId: "C-demo-1",
    productoId: "p-lib-0045",
    presentacion: "paquete",
    cantidad: 1,
    costoUnitario: 18,
    motivo: "Llegó mojada",
    fecha: "2026-11-18T10:30:00-06:00",
    estado: "pendiente",
  },
];

/** Pedidos de prueba: uno al que le falta una parte y otro que todavía no llega. */
export const PEDIDOS_DEMO: Pedido[] = [
  {
    id: "ped-demo-1",
    numero: "P-0001",
    proveedorId: "prov-2",
    admin: "paola",
    fecha: "2026-11-20T15:30:00.000Z",
    creadoPor: "Paola",
    lineas: [
      {
        id: "lp-1",
        productoId: "p-lib-0035",
        nombre: "Folder tamaño oficio",
        presentacion: "paquete",
        cantidad: 6,
        recibidas: 0,
        estado: "pendiente",
      },
      {
        id: "lp-2",
        productoId: "p-lib-0040",
        nombre: "Papel de china",
        presentacion: "paquete",
        cantidad: 10,
        recibidas: 10,
        estado: "completa",
      },
    ],
    recepciones: [{ fecha: "2026-11-24T17:00:00.000Z", por: "Paola", total: 120 }],
  },
  {
    id: "ped-demo-2",
    numero: "P-0002",
    proveedorId: "prov-3",
    admin: "paola",
    fecha: "2026-11-25T16:10:00.000Z",
    creadoPor: "Paola",
    notas: "Preguntar si ya tienen crayones de 24 colores.",
    lineas: [
      {
        id: "lp-3",
        productoId: "p-lib-0061",
        nombre: "Lapicero azul",
        presentacion: "unidad",
        cantidad: 120,
        recibidas: 0,
        estado: "pendiente",
      },
      {
        id: "lp-4",
        productoId: "p-lib-0050",
        nombre: "Cuaderno universitario",
        presentacion: "unidad",
        cantidad: 24,
        recibidas: 0,
        estado: "pendiente",
      },
      {
        id: "lp-5",
        nombre: "Crayones 12 colores",
        presentacion: "unidad",
        cantidad: 10,
        recibidas: 0,
        estado: "pendiente",
      },
    ],
    recepciones: [],
  },
];
