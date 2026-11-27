"use client";

import { useMemo, useState } from "react";
import { BellRing, CircleCheck, ClipboardList, Phone, X } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Chip,
  SearchInput,
  StatusChip,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatFechaHora, haceCuanto } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { normalizar } from "@/lib/reglas/busqueda";
import { describirProceso, porCobrar } from "@/lib/reglas/procesos";
import type { EstadoProceso } from "@/types/estados";
import type { EnProceso } from "@/types/proceso";
import { ConfirmarEntrega } from "./ConfirmarEntrega";
import { DetalleCobro } from "./DetalleCobro";

type Pestana = "todos" | EstadoProceso;
const PESTANAS: { value: Pestana; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "recibido", label: "Recibido" },
  { value: "en_proceso", label: "En proceso" },
  { value: "listo", label: "Listos para entregar" },
];

const detalle = describirProceso;

interface SeguimientoProps {
  /** Ya filtrados por tipo: trámites (de Paola) o servicios técnicos (de Oscar). */
  procesos: EnProceso[];
  tipo: "tramite" | "servicio";
}

/**
 * Pantalla 12: lo que está en curso, para que cualquier empleado atienda al cliente.
 * Trámites → solo los de Paola. Servicios Técnicos → solo los de Oscar.
 */
export function Seguimiento({ procesos, tipo }: SeguimientoProps) {
  const [pestana, setPestana] = useState<Pestana>("todos");
  const [consulta, setConsulta] = useState("");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [aEntregar, setAEntregar] = useState<EnProceso | null>(null);

  const contar = (e: Pestana) =>
    e === "todos" ? procesos.length : procesos.filter((p) => p.estado === e).length;
  const listos = contar("listo");
  const nombreTipo = tipo === "tramite" ? "trámite" : "servicio";

  const visibles = useMemo(() => {
    const q = normalizar(consulta);
    return procesos.filter((p) => {
      if (pestana !== "todos" && p.estado !== pestana) return false;
      return !q || normalizar(`${p.cliente.nombre} ${detalle(p)}`).includes(q);
    });
  }, [procesos, pestana, consulta]);

  const seleccionado = procesos.find((p) => p.id === seleccionadoId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {listos > 0 && (
        <Alert
          tone="info"
          action={
            pestana !== "listo" && (
              <Button size="sm" variant="secondary" onClick={() => setPestana("listo")}>
                Ver listos
              </Button>
            )
          }
        >
          <span className="inline-flex items-center gap-2">
            <BellRing className="size-4" />
            {listos === 1
              ? `1 ${nombreTipo} está listo para entregar. Avisa al cliente.`
              : `${listos} ${nombreTipo}s están listos para entregar. Avisa a los clientes.`}
          </span>
        </Alert>
      )}

      <div className={cn("grid gap-4", seleccionado && "xl:grid-cols-[minmax(0,1fr)_360px]")}>
        <Card className="min-w-0">
          <div className="px-4 pt-3">
            <Tabs
              ariaLabel="Estado"
              value={pestana}
              onChange={setPestana}
              items={PESTANAS.map((t) => ({ ...t, count: contar(t.value) }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <SearchInput
              aria-label="Buscar cliente"
              placeholder={
                tipo === "tramite" ? "Buscar cliente o trámite" : "Buscar cliente o equipo"
              }
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              className="w-64"
            />
          </div>

          {visibles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <ClipboardList className="size-8 text-gray-300" strokeWidth={1.5} />
              <p className="text-body text-ink-muted">
                No hay trámites ni servicios en esta vista.
              </p>
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Cliente</Th>
                  <Th>{tipo === "tramite" ? "Trámite" : "Equipo"}</Th>
                  <Th>Ingreso</Th>
                  <Th numeric>A cobrar</Th>
                  <Th>Estado</Th>
                  <Th className={seleccionado ? "w-12" : "w-40"}>
                    <span className="sr-only">Acción</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {visibles.map((p) => (
                  <Tr
                    key={p.id}
                    selected={p.id === seleccionadoId}
                    onClick={() => setSeleccionadoId(p.id)}
                    className="cursor-pointer"
                  >
                    <Td className="font-semibold whitespace-nowrap text-ink-strong">
                      {p.cliente.nombre}
                    </Td>
                    <Td className="max-w-64 truncate">{detalle(p)}</Td>
                    <Td className="whitespace-nowrap text-ink-muted">
                      {haceCuanto(p.fechaIngreso)}
                    </Td>
                    <Td numeric className="whitespace-nowrap">
                      {p.cobro ? (
                        <span className="font-semibold text-ink-strong">
                          {formatQ(porCobrar(p.cobro))}
                        </span>
                      ) : (
                        <span className="text-small text-ink-muted">Por definir</span>
                      )}
                    </Td>
                    <Td>
                      <StatusChip estado={p.estado} />
                    </Td>
                    <Td>
                      {p.estado === "listo" && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Marcar entregado"
                          className="border-stock-ok/40 text-stock-ok-text hover:bg-stock-ok-bg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAEntregar(p);
                          }}
                        >
                          <CircleCheck />
                          {/* Con el panel abierto no cabe el texto: queda solo el ícono. */}
                          {seleccionado ? (
                            <span className="sr-only">Marcar entregado</span>
                          ) : (
                            "Marcar entregado"
                          )}
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {seleccionado && (
          <Card className="flex flex-col self-start xl:sticky xl:top-[calc(var(--spacing-topbar)+1.5rem)]">
            <div className="flex items-start justify-between gap-2 border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-h2 font-semibold text-ink-strong">
                  {seleccionado.cliente.nombre}
                </h2>
                <p className="text-small text-ink-muted">{detalle(seleccionado)}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar detalle"
                onClick={() => setSeleccionadoId(null)}
                className="flex size-7 items-center justify-center rounded-xs text-ink-muted hover:bg-gray-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <dl className="flex flex-col gap-3 px-5 py-4 text-body">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Estado</dt>
                <dd>
                  <StatusChip estado={seleccionado.estado} />
                </dd>
              </div>
              {seleccionado.cliente.telefono && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Teléfono</dt>
                  <dd>
                    <a
                      href={`tel:${seleccionado.cliente.telefono.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-navy-900 underline-offset-2 hover:underline"
                    >
                      <Phone className="size-3.5" /> {seleccionado.cliente.telefono}
                    </a>
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Ingresó</dt>
                <dd className="text-right tabular">{formatFechaHora(seleccionado.fechaIngreso)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Responsable</dt>
                <dd>{seleccionado.responsable === "paola" ? "Paola" : "Oscar"}</dd>
              </div>
              {seleccionado.tipo === "servicio" && (
                <>
                  <div>
                    <dt className="text-ink-muted">Falla reportada</dt>
                    <dd className="mt-0.5">{seleccionado.falla}</dd>
                  </div>
                  {seleccionado.accesorios.length > 0 && (
                    <div>
                      <dt className="text-ink-muted">Accesorios que dejó</dt>
                      <dd className="mt-1 flex flex-wrap gap-1">
                        {seleccionado.accesorios.map((a) => (
                          <Chip key={a}>{a}</Chip>
                        ))}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
            <DetalleCobro proceso={seleccionado} />
            {seleccionado.notas.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-gray-200 px-5 py-4">
                <h3 className="text-small font-semibold text-ink-strong">
                  Notas de {seleccionado.responsable === "paola" ? "Paola" : "Oscar"}
                </h3>
                {seleccionado.notas.map((n) => (
                  <div
                    key={n.fecha}
                    className="rounded-md border border-gold-200 bg-gold-100 px-3 py-2"
                  >
                    <p className="text-body text-gold-text">{n.texto}</p>
                    <p className="mt-0.5 text-badge text-gold-text/80">
                      {formatFechaHora(n.fecha)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {seleccionado.estado === "listo" && (
              <div className="border-t border-gray-200 px-5 py-4">
                <Button className="w-full" onClick={() => setAEntregar(seleccionado)}>
                  <CircleCheck /> Marcar entregado
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {aEntregar && (
        <ConfirmarEntrega
          proceso={aEntregar}
          onCerrar={() => setAEntregar(null)}
          onEntregado={() => {
            if (seleccionadoId === aEntregar.id) setSeleccionadoId(null);
          }}
        />
      )}
    </div>
  );
}
