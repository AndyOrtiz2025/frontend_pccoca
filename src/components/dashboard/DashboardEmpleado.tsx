"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BellRing,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  FileText,
  HandCoins,
  Package,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Chip,
  KpiCard,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { ConfirmarEntrega } from "@/components/seguimiento/ConfirmarEntrega";
import { ModalComprobante } from "@/components/venta/ModalComprobante";
import { formatHora } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { describirProceso, porCobrar } from "@/lib/reglas/procesos";
import type { ResumenEmpleado } from "@/lib/api";
import type { Comprobante } from "@/types/movimiento";
import type { EnProceso } from "@/types/proceso";

const BASE = "/empleado";

const ACCESOS: { href: string; titulo: string; detalle: string; icono: ReactNode }[] = [
  {
    href: `${BASE}/productos/libreria`,
    titulo: "Nueva venta",
    detalle: "Librería, tecnología y varios",
    icono: <ShoppingBag />,
  },
  {
    href: `${BASE}/carrito`,
    titulo: "Carrito",
    detalle: "Cobrar lo agregado",
    icono: <ShoppingCart />,
  },
  {
    href: `${BASE}/tramites`,
    titulo: "Entrada de trámite",
    detalle: "SAT, CGC, RENAP… a Paola",
    icono: <FileText />,
  },
  {
    href: `${BASE}/servicios`,
    titulo: "Entrada de servicio",
    detalle: "Equipos para Oscar",
    icono: <Wrench />,
  },
  {
    href: `${BASE}/pendientes`,
    titulo: "Pendientes",
    detalle: "Agregar a una cuenta o cobrar",
    icono: <HandCoins />,
  },
  {
    href: `${BASE}/seguimiento/tramites`,
    titulo: "Seguimiento",
    detalle: "Cómo van trámites y servicios",
    icono: <ClipboardList />,
  },
];

/** "2 × Cuaderno universitario, 3 × Lapicero azul". */
function resumenLineas(c: Comprobante) {
  return c.lineas.map((l) => `${l.cantidad} × ${l.nombre}`).join(", ");
}

/** Pantalla 4: lo primero que ve el Empleado al entrar. */
export function DashboardEmpleado({
  nombre,
  saludo,
  fecha,
  resumen,
}: {
  nombre: string;
  saludo: string;
  fecha: string;
  resumen: ResumenEmpleado;
}) {
  const router = useRouter();
  const [aEntregar, setAEntregar] = useState<EnProceso | null>(null);
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);
  const { ventas, listos, porCobrar: pendientes } = resumen;
  const tramites = listos.filter((p) => p.tipo === "tramite").length;
  const servicios = listos.length - tramites;
  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-h1 font-semibold text-ink-strong">
          {saludo}, {nombre}
        </h2>
        <p className="text-body text-ink-muted first-letter:uppercase">{fecha}</p>
      </div>

      {listos.length > 0 && (
        <Alert
          tone="info"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                router.push(`${BASE}/seguimiento/${tramites > 0 ? "tramites" : "servicios"}`)
              }
            >
              Ver seguimiento
            </Button>
          }
        >
          <span className="inline-flex items-center gap-2">
            <BellRing className="size-4" />
            {listos.length === 1
              ? "1 trámite o servicio está listo para entregar. Avisa al cliente."
              : `${listos.length} trámites y servicios están listos para entregar. Avisa a los clientes.`}
          </span>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          highlight
          label="Mis ventas de hoy"
          value={formatQ(ventas.total)}
          detail={
            ventas.cantidad === 0
              ? "Aún no has vendido hoy"
              : plural(ventas.cantidad, "venta", "ventas")
          }
          icon={<Receipt />}
        />
        <KpiCard
          label="Productos vendidos hoy"
          value={String(ventas.unidades)}
          detail="Unidades, paquetes y cajas"
          icon={<Package />}
        />
        <KpiCard
          label="Listos para entregar"
          value={String(listos.length)}
          detail={
            listos.length === 0
              ? "Nada por entregar"
              : [
                  tramites > 0 && plural(tramites, "trámite", "trámites"),
                  servicios > 0 && plural(servicios, "servicio", "servicios"),
                ]
                  .filter(Boolean)
                  .join(" · ")
          }
          icon={<CircleCheck />}
        />
        <KpiCard
          label="Por cobrar en Pendientes"
          value={formatQ(pendientes.total)}
          detail={
            pendientes.cuentas === 0
              ? "Todos al día"
              : `${plural(pendientes.cuentas, "cliente debe", "clientes deben")}`
          }
          icon={<HandCoins />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card className="self-start">
          <div className="px-5 pt-4 pb-3">
            <h2 className="text-body font-semibold text-ink-strong">Accesos rápidos</h2>
            <p className="text-small text-ink-muted">Lo que más se usa en mostrador</p>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            {ACCESOS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group bg-gray-50 flex flex-col gap-2 rounded-md border border-gray-200 p-3 transition-colors hover:border-gold-500 hover:bg-gold-100 focus-visible:shadow-focus focus-visible:outline-none"
              >
                <span className="flex size-8 items-center justify-center rounded-sm bg-white text-navy-900 shadow-sm [&_svg]:size-4">
                  {a.icono}
                </span>
                <span>
                  <span className="block text-body font-semibold text-ink-strong">{a.titulo}</span>
                  <span className="block text-small text-ink-muted">{a.detalle}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="min-w-0 self-start">
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
            <h2 className="flex items-center gap-2 text-body font-semibold text-ink-strong">
              Listos para entregar
              {listos.length > 0 && <Chip tono="bg-gold-100 text-gold-text">{listos.length}</Chip>}
            </h2>
          </div>
          {listos.length === 0 ? (
            <p className="px-5 pb-6 text-body text-ink-muted">
              No hay trámites ni servicios listos por ahora.
            </p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Cliente</Th>
                  <Th>Qué es</Th>
                  <Th numeric>A cobrar</Th>
                  <Th className="w-12">
                    <span className="sr-only">Acción</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {listos.map((p) => (
                  <Tr key={p.id}>
                    <Td className="py-2.5">
                      <span className="block font-semibold whitespace-nowrap text-ink-strong">
                        {p.cliente.nombre}
                      </span>
                      {p.cliente.telefono && (
                        <a
                          href={`tel:${p.cliente.telefono.replace(/\D/g, "")}`}
                          className="text-small text-ink-muted hover:text-navy-900 hover:underline"
                        >
                          Tel. {p.cliente.telefono}
                        </a>
                      )}
                    </Td>
                    <Td className="max-w-56">
                      <span className="block text-small text-ink-muted">
                        {p.tipo === "tramite" ? "Trámite · Paola" : "Servicio · Oscar"}
                      </span>
                      <span className="block truncate">{describirProceso(p)}</span>
                    </Td>
                    <Td numeric>
                      {p.cobro ? (
                        <span className="font-semibold text-ink-strong">
                          {formatQ(porCobrar(p.cobro))}
                        </span>
                      ) : (
                        <span className="text-small text-ink-muted">Por definir</span>
                      )}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        onClick={() => setAEntregar(p)}
                        className="whitespace-nowrap"
                      >
                        <CircleCheck /> Entregar
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 pt-4 pb-3">
          <h2 className="text-body font-semibold text-ink-strong">Mis últimas ventas de hoy</h2>
          {ventas.cantidad > ventas.ultimas.length && (
            <p className="text-small text-ink-muted">
              Mostrando {ventas.ultimas.length} de {ventas.cantidad}
            </p>
          )}
        </div>
        {ventas.ultimas.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5">
            <p className="text-body text-ink-muted">Todavía no has hecho ventas hoy.</p>
            <Link
              href={`${BASE}/productos/libreria`}
              className="inline-flex items-center gap-1 text-button font-semibold text-navy-900 hover:underline"
            >
              Ir a vender <ChevronRight className="size-4" />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {ventas.ultimas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-ink">{resumenLineas(c)}</p>
                  <p className="text-small text-ink-muted tabular">{formatHora(c.fecha)}</p>
                </div>
                <span className="text-price font-semibold text-ink-strong tabular">
                  {formatQ(c.total)}
                </span>
                <Button size="sm" variant="outline" onClick={() => setComprobante(c)}>
                  <Receipt /> Comprobante
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {aEntregar && <ConfirmarEntrega proceso={aEntregar} onCerrar={() => setAEntregar(null)} />}
      <ModalComprobante
        comprobante={comprobante}
        onClose={() => setComprobante(null)}
        textoCerrar="Cerrar"
      />
    </div>
  );
}
