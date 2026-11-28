"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Download,
  MessageCircle,
  Phone,
  Plus,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  KpiCard,
  SearchInput,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
} from "@/components/ui";
import { descargarArchivo } from "@/lib/compartir";
import { diaDeGuatemala, diaSemanaGuatemala, formatFecha } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { normalizar } from "@/lib/reglas/busqueda";
import { centavos } from "@/lib/reglas/dinero";
import type { ResumenProveedor } from "@/lib/api";
import { ETIQUETA_CATEGORIA, type Categoria, type Producto } from "@/types/producto";
import { DIAS_SEMANA } from "@/types/proveedor";
import { ModalCompra } from "./ModalCompra";
import { ModalProveedor } from "./ModalProveedor";

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** "Pasa los martes" / "Pasa martes y viernes" (lunes a viernes no cambian en plural). */
export function diasDeVisita(dias?: number[]) {
  if (!dias?.length) return null;
  const orden = [...dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const plural = (d: number) => {
    const n = DIAS_SEMANA[d]!.toLowerCase();
    return n.endsWith("o") ? `${n}s` : n;
  };
  if (orden.length === 1) return `Pasa los ${plural(orden[0]!)}`;
  const nombres = orden.map(plural);
  return `Pasa ${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/** Pantalla 17: directorio de proveedores con lo comprado en el mes. */
export function ListaProveedores({
  proveedores,
  productos,
  base,
  categorias,
}: {
  proveedores: ResumenProveedor[];
  /** Productos que puede comprar (Paola: Librería y Varios). */
  productos: Producto[];
  base: string;
  categorias: Categoria[];
}) {
  const [pestana, setPestana] = useState<"activos" | "inactivos">("activos");
  const [consulta, setConsulta] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [comprando, setComprando] = useState(false);

  const activos = proveedores.filter((p) => p.activo);
  const q = normalizar(consulta);
  const visibles = proveedores
    .filter((p) => (pestana === "activos" ? p.activo : !p.activo))
    .filter(
      (p) =>
        !q ||
        normalizar(`${p.nombre} ${p.nit ?? ""} ${p.contacto ?? ""} ${p.direccion ?? ""}`).includes(
          q,
        ),
    );

  const totalMes = centavos(proveedores.reduce((t, p) => t + p.totalMes, 0));
  const comprasMes = proveedores.reduce((t, p) => t + p.comprasMes, 0);
  const reclamos = proveedores.reduce((t, p) => t + p.reclamosPendientes, 0);
  const hoy = diaSemanaGuatemala();
  const pasanHoy = activos.filter((p) => p.diasVisita?.includes(hoy));

  function exportar() {
    const celda = (v?: string | number) => {
      const t = v === undefined ? "" : String(v);
      const s = /^[=+\-@]/.test(t) ? `'${t}` : t;
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const filas = [
      [
        "Proveedor",
        "NIT",
        "Contacto",
        "Teléfono",
        "Correo",
        "Dirección",
        "Surte",
        "Días que pasa",
        "Última compra",
        "Comprado este mes",
        "Activo",
      ],
      ...proveedores.map((p) => [
        p.nombre,
        p.nit,
        p.contacto,
        p.telefono,
        p.correo,
        p.direccion,
        p.surte.map((c) => ETIQUETA_CATEGORIA[c]).join(" / "),
        p.diasVisita?.map((d) => DIAS_SEMANA[d]).join(" / "),
        p.ultimaCompra ? formatFecha(p.ultimaCompra) : "",
        p.totalMes.toFixed(2),
        p.activo ? "Sí" : "No",
      ]),
    ];
    descargarArchivo(
      new Blob(["﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
      `proveedores-${diaDeGuatemala(new Date())}.csv`,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-muted">
          Directorio de proveedores, compras del mes y reclamos por mercadería dañada.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportar}>
            <Download /> Exportar
          </Button>
          <Button variant="outline" onClick={() => setNuevo(true)}>
            <Plus /> Nuevo proveedor
          </Button>
          <Button onClick={() => setComprando(true)} disabled={activos.length === 0}>
            <ShoppingCart /> Registrar compra
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          highlight
          label="Proveedores activos"
          value={String(activos.length)}
          detail={
            proveedores.length > activos.length
              ? `${proveedores.length - activos.length} inactivos`
              : "Todos activos"
          }
          icon={<Store />}
        />
        <KpiCard
          label="Compras del mes"
          value={formatQ(totalMes)}
          detail={`${comprasMes} ${comprasMes === 1 ? "compra recibida" : "compras recibidas"}`}
          icon={<ShoppingCart />}
        />
        <KpiCard
          label="Reclamos pendientes"
          value={String(reclamos)}
          detail={reclamos ? "Mercadería dañada por resolver" : "Sin reclamos"}
          icon={<AlertTriangle />}
        />
        <KpiCard
          label="Pasan hoy"
          value={String(pasanHoy.length)}
          detail={pasanHoy.length ? pasanHoy.map((p) => p.nombre).join(", ") : "Ningún proveedor"}
          icon={<Truck />}
        />
      </div>

      <Card className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
          <Tabs
            ariaLabel="Proveedores"
            value={pestana}
            onChange={setPestana}
            items={[
              { value: "activos", label: "Activos", count: activos.length },
              {
                value: "inactivos",
                label: "Inactivos",
                count: proveedores.length - activos.length,
              },
            ]}
          />
        </div>
        <div className="px-4 py-3">
          <SearchInput
            aria-label="Buscar proveedor"
            placeholder="Buscar por nombre, NIT o contacto"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            className="w-80"
          />
        </div>
        {visibles.length === 0 ? (
          <p className="px-5 pt-4 pb-10 text-center text-body text-ink-muted">
            No hay proveedores en esta vista.
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Proveedor</Th>
                <Th>Surte</Th>
                <Th>Contacto</Th>
                <Th>Última compra</Th>
                <Th numeric>Este mes</Th>
              </tr>
            </THead>
            <TBody>
              {visibles.map((p) => {
                const tel = p.telefono?.replace(/\D/g, "");
                return (
                  <Tr key={p.id}>
                    <Td className="py-2.5">
                      <Link href={`${base}/${p.id}`} className="group flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-small font-semibold text-white">
                          {iniciales(p.nombre)}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 font-semibold text-ink-strong group-hover:underline">
                            {p.nombre}
                            {p.reclamosPendientes > 0 && (
                              <Chip tono="bg-stock-low-bg text-stock-low-text">
                                {p.reclamosPendientes} reclamo{p.reclamosPendientes > 1 && "s"}
                              </Chip>
                            )}
                          </span>
                          <span className="block text-small text-ink-muted">
                            {[p.nit && `NIT ${p.nit}`, p.direccion].filter(Boolean).join(" · ")}
                          </span>
                          {diasDeVisita(p.diasVisita) && (
                            <span className="flex items-center gap-1 text-small text-ink-muted">
                              <Truck className="size-3.5" /> {diasDeVisita(p.diasVisita)}
                            </span>
                          )}
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {p.surte.map((c) => (
                          <Chip key={c}>{ETIQUETA_CATEGORIA[c]}</Chip>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <span className="block">{p.contacto ?? "—"}</span>
                      {tel && (
                        <span className="mt-0.5 flex items-center gap-2 text-small">
                          <a
                            href={`tel:${tel}`}
                            className="inline-flex items-center gap-1 text-navy-900 hover:underline"
                          >
                            <Phone className="size-3.5" /> {p.telefono}
                          </a>
                          <a
                            href={`https://wa.me/502${tel}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`WhatsApp de ${p.nombre}`}
                            className="text-stock-ok-text hover:underline"
                          >
                            <MessageCircle className="size-3.5" />
                          </a>
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-muted">
                      {p.ultimaCompra ? formatFecha(p.ultimaCompra) : "Sin compras"}
                    </Td>
                    <Td numeric className="whitespace-nowrap">
                      <span className="font-semibold text-ink-strong">{formatQ(p.totalMes)}</span>
                      {p.comprasMes > 0 && (
                        <span className="block text-small text-ink-muted">
                          {p.comprasMes} {p.comprasMes === 1 ? "compra" : "compras"}
                        </span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      {nuevo && (
        <ModalProveedor proveedor={null} categorias={categorias} onClose={() => setNuevo(false)} />
      )}
      {comprando && (
        <ModalCompra
          proveedores={activos}
          productos={productos}
          onClose={() => setComprando(false)}
        />
      )}
    </div>
  );
}
