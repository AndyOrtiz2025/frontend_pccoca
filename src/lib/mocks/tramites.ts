import type { ModuloTramite, Tramite } from "@/types/tramite";

/** Catálogo de trámites tal como está en la documentación (sección 12). */
export const MODULOS_TRAMITE_DEMO: ModuloTramite[] = [
  { id: "sat", nombre: "SAT", orden: 1 },
  { id: "cgc", nombre: "CGC", orden: 2 },
  { id: "renap", nombre: "RENAP", orden: 3 },
  { id: "otros", nombre: "Otros", orden: 4 },
];

const DPI = "DPI escaneado (ambos lados)";
const LUZ = "Recibo de luz (NIS)";

export const TRAMITES_DEMO: Tramite[] = [
  // SAT
  {
    id: "sat-nit",
    moduloId: "sat",
    nombre: "NIT por primera vez",
    requisitos: [DPI, LUZ, "Correo electrónico", "Número de teléfono"],
    precio: { monto: 80 },
  },
  {
    id: "sat-act-nit",
    moduloId: "sat",
    nombre: "Actualización de NIT",
    requisitos: ["Usuario y contraseña de agencia virtual", DPI, LUZ, "Número de teléfono"],
    precio: { monto: 50, nota: "Q 35.00 si es solo ratificación" },
  },
  {
    id: "sat-agencia",
    moduloId: "sat",
    nombre: "Recuperación de agencia virtual",
    requisitos: [DPI, LUZ, "Correo electrónico", "Número de teléfono", "Video de recuperación"],
    precio: { monto: 80, nota: "Q 100.00 con actualización de NIT" },
  },
  {
    id: "sat-traspaso",
    moduloId: "sat",
    nombre: "Traspaso de vehículos",
    requisitos: [
      "Agencia virtual de ambas partes",
      "Vehículos pagados en el año actual",
      "NITs actualizados",
      "Placa del vehículo",
    ],
    precio: { monto: 1300, montoMax: 1400, nota: "Según vehículo" },
  },
  {
    id: "sat-baja",
    moduloId: "sat",
    nombre: "Baja de vehículos",
    requisitos: [
      "Usuario y contraseña de agencia virtual",
      "NIT actualizado",
      "Pago de vehículo al día",
      "DPI físico",
      "Número de teléfono",
    ],
    precio: { monto: 700, montoMax: 1000, nota: "Según vehículo · trámite de 1 a 15 días" },
  },
  {
    id: "sat-peq-contrib",
    moduloId: "sat",
    nombre: "Registro de pequeño contribuyente",
    requisitos: [],
    precio: { monto: null },
  },
  {
    id: "sat-declaraciones",
    moduloId: "sat",
    nombre: "Declaraciones mensuales",
    requisitos: ["Número de NIT", "Mes a cancelar", "Monto", "Fecha de nacimiento"],
    precio: { monto: 3 },
  },
  {
    id: "sat-pago-veh",
    moduloId: "sat",
    nombre: "Pago de vehículos",
    requisitos: ["Usuario y contraseña de agencia virtual", "Placa de vehículo"],
    precio: {
      monto: 5,
      nota: "Tarjeta de circulación Q 5.00, calcomanía Q 5.00, emplasticado Q 15.00 c/u",
    },
  },
  {
    id: "sat-titulos",
    moduloId: "sat",
    nombre: "Registro de títulos ante la SAT",
    requisitos: ["NIT", "Contraseña", "Correo y contraseña", "Teléfono"],
    precio: { monto: null },
  },
  {
    id: "sat-solvencia",
    moduloId: "sat",
    nombre: "Solvencia fiscal",
    requisitos: ["Formulario SAT-8421", "Número de NIT", "Correo electrónico"],
    precio: { monto: 15 },
  },
  // CGC
  {
    id: "cgc-cuenta",
    moduloId: "cgc",
    nombre: "Creación de cuenta",
    requisitos: ["Número de NIT", "Correo y contraseña", "DPI físico", "Toma de foto"],
    precio: { monto: 80 },
  },
  {
    id: "cgc-act",
    moduloId: "cgc",
    nombre: "Actualización",
    requisitos: ["Usuario y contraseña", "Fotografía"],
    precio: { monto: 25 },
  },
  {
    id: "cgc-finiquito",
    moduloId: "cgc",
    nombre: "Finiquito",
    requisitos: ["Correo y contraseña", "NIT", "Contraseña", "Número de teléfono"],
    precio: { monto: 130 },
  },
  // RENAP
  {
    id: "renap-nac",
    moduloId: "renap",
    nombre: "Certificado de nacimiento",
    requisitos: [],
    precio: { monto: 30 },
  },
  {
    id: "renap-def",
    moduloId: "renap",
    nombre: "Certificado de defunción",
    requisitos: [],
    precio: { monto: 30 },
  },
  {
    id: "renap-mat",
    moduloId: "renap",
    nombre: "Certificado de matrimonio",
    requisitos: [],
    precio: { monto: 30 },
  },
  // Otros
  {
    id: "otros-consulta",
    moduloId: "otros",
    nombre: "Consulta general del empleado",
    requisitos: ["Número de DPI", "Cuenta bancaria", "Contraseña"],
    precio: {
      monto: null,
      nota: "Hoja de servicio, tiempo de servicio, váucher, catalogación, cédula docente",
    },
  },
  {
    id: "otros-cedula-act",
    moduloId: "otros",
    nombre: "Actualización de cédula docente",
    requisitos: ["DPI", "Cuenta bancaria", "Contraseña"],
    precio: { monto: 30 },
  },
  {
    id: "otros-cedula-div",
    moduloId: "otros",
    nombre: "Cédula docente diversificado",
    requisitos: ["Correo y contraseña", DPI, "Título escaneado (ambos lados)", "Teléfono"],
    precio: { monto: 100 },
  },
  {
    id: "otros-cedula-uni",
    moduloId: "otros",
    nombre: "Cédula docente universidad",
    requisitos: ["Correo y contraseña", DPI, "Título escaneado (ambos lados)", "Teléfono"],
    precio: { monto: 200 },
  },
  {
    id: "otros-penales",
    moduloId: "otros",
    nombre: "Antecedentes penales",
    requisitos: ["Boleta de pago", "DPI"],
    precio: { monto: 15 },
  },
  {
    id: "otros-policiacos",
    moduloId: "otros",
    nombre: "Antecedentes policiacos",
    requisitos: ["Usuario y contraseña de cuenta policial", "Boleta de pago"],
    precio: { monto: 15, nota: "Creación de cuenta Q 10.00" },
  },
  {
    id: "otros-renas",
    moduloId: "otros",
    nombre: "RENAS",
    requisitos: ["Escaneo de DPI", "Profesión", "Correo electrónico", "Número de teléfono"],
    precio: { monto: 10 },
  },
  {
    id: "otros-sublimado",
    moduloId: "otros",
    nombre: "Sublimado de playeras y vasos",
    requisitos: [],
    precio: { monto: null },
  },
  {
    id: "otros-emplasticado",
    moduloId: "otros",
    nombre: "Emplasticado de documentos",
    requisitos: [],
    precio: { monto: null },
  },
];
