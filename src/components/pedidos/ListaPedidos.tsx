"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, PackageCheck, PackageSearch, Plus, Truck } from "lucide-react";
import {
  buttonClasses,
  Card,
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
import { diaDeGuatemala, diaSemanaGuatemala, formatFecha } from "@/lib/fechas";
import { normalizar } from "@/lib/reglas/busqueda";
import type { ResumenPedido } from "@/lib/api";
import type { Proveedor } from "@/types/proveedor";
import { ChipPedido } from "./comun";

type Pestana = "abiertos" | "recibidos" | "cancelados";

/** Pedidos a proveedores: lo que se pidió, lo que falta por llegar y lo ya recibido. */
export function ListaPedidos({
  pedidos,
  proveedores,
  base,
}: {
  pedidos: ResumenPedido[];
  proveedores: Proveedor[];
  base: string;
}) {
  const [pestana, setPestana] = useState<Pestana>("abiertos");
  const [consulta, setConsulta] = useState("");

  const abiertos = pedidos.filter((p) => p.estado === "pendiente" || p.estado === "parcial");
  const recibidos = pedidos.filter((p) => p.estado === "recibido");
  const cancelados = pedidos.filter((p) => p.estado === "cancelado");
  const grupo = { abiertos, recibidos, cancelados }[pestana];
  const q = normalizar(consulta);
  const visibles = grupo.filter(
    (p) => !q || normalizar(`${p.numero} ${p.proveedor} ${p.creadoPor}`).includes(q),
  );

  const porLlegar = abiertos.reduce((t, p) => t + p.porLlegar, 0);
  const mes = diaDeGuatemala(new Date()).slice(0, 7);
  const recibidosMes = recibidos.filter(
    (p) => p.ultimaRecepcion && diaDeGuatemala(p.ultimaRecepcion).startsWith(mes),
  ).length;
  const hoy = diaSemanaGuatemala();
  const conPedido = new Set(abiertos.map((p) => p.proveedorId));
  const llegaHoy = proveedores.filter((p) => conPedido.has(p.id) && p.diasVisita?.includes(hoy));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-muted">
          Arma la lista de lo que vas a pedir, imprímela y, cuando llegue, revisa el paquete.
        </p>
        <Link href={`${base}/nuevo`} className={buttonClasses()}>
          <Plus /> Nuevo pedido
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          highlight
          label="Pedidos por llegar"
          value={String(abiertos.length)}
          detail={
            abiertos.some((p) => p.estado === "parcial")
              ? `${abiertos.filter((p) => p.estado === "parcial").length} con una parte recibida`
              : "Esperando al proveedor"
          }
          icon={<ClipboardList />}
        />
        <KpiCard
          label="Productos por llegar"
          value={String(porLlegar)}
          detail="Sumando todos los pedidos abiertos"
          icon={<PackageSearch />}
        />
        <KpiCard
          label="Recibidos este mes"
          value={String(recibidosMes)}
          detail="Pedidos completos o cerrados"
          icon={<PackageCheck />}
        />
        <KpiCard
          label="Pasan hoy con pedido"
          value={String(llegaHoy.length)}
          detail={llegaHoy.length ? llegaHoy.map((p) => p.nombre).join(", ") : "Ninguno"}
          icon={<Truck />}
        />
      </div>

      <Card className="min-w-0">
        <div className="px-4 pt-3">
          <Tabs
            ariaLabel="Pedidos"
            value={pestana}
            onChange={setPestana}
            items={[
              { value: "abiertos", label: "Por llegar", count: abiertos.length },
              { value: "recibidos", label: "Recibidos", count: recibidos.length },
              { value: "cancelados", label: "Cancelados", count: cancelados.length },
            ]}
          />
        </div>
        <div className="px-4 py-3">
          <SearchInput
            aria-label="Buscar pedido"
            placeholder="Buscar por número o proveedor"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            className="w-80"
          />
        </div>
        {visibles.length === 0 ? (
          <p className="px-5 pt-4 pb-10 text-center text-body text-ink-muted">
            {pestana === "abiertos" && !q
              ? "No hay pedidos por llegar. Crea uno con “Nuevo pedido”."
              : "No hay pedidos en esta vista."}
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Pedido</Th>
                <Th>Proveedor</Th>
                <Th>Productos</Th>
                <Th>Estado</Th>
                <Th>Última revisión</Th>
              </tr>
            </THead>
            <TBody>
              {visibles.map((p) => (
                <Tr key={p.id}>
                  <Td className="py-2.5">
                    <Link href={`${base}/${p.id}`} className="group block">
                      <span className="font-mono font-semibold text-ink-strong group-hover:underline">
                        {p.numero}
                      </span>
                      <span className="block text-small text-ink-muted">
                        {formatFecha(p.fecha)} · {p.creadoPor}
                      </span>
                    </Link>
                  </Td>
                  <Td className="font-medium text-ink-strong">{p.proveedor}</Td>
                  <Td>
                    {p.productos} {p.productos === 1 ? "producto" : "productos"}
                    {p.porLlegar > 0 && p.estado === "parcial" && (
                      <span className="block text-small text-stock-low-text">
                        Faltan {p.porLlegar}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <ChipPedido estado={p.estado} />
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {p.ultimaRecepcion ? formatFecha(p.ultimaRecepcion) : "—"}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
