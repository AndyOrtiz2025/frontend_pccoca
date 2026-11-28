"use client";

import { useState } from "react";
import { PackageX, Receipt, ShieldAlert, Undo2 } from "lucide-react";
import { Card, Chip, KpiCard, SearchInput, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { nombreLinea } from "@/lib/comprobante";
import { diaDeGuatemala, formatFechaHora } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { normalizar } from "@/lib/reglas/busqueda";
import { centavos } from "@/lib/reglas/dinero";
import { numeroDevolucion } from "@/lib/reglas/devoluciones";
import type { Devolucion } from "@/types/devolucion";
import { ModalComprobanteDevolucion } from "./ModalComprobanteDevolucion";

/** Devoluciones de clientes: qué se devolvió, en qué estado, qué se llevaron y quién autorizó. */
export function ListaDevoluciones({ devoluciones }: { devoluciones: Devolucion[] }) {
  const [consulta, setConsulta] = useState("");
  const [abierta, setAbierta] = useState<Devolucion | null>(null);

  const mes = diaDeGuatemala(new Date()).slice(0, 7);
  const delMes = devoluciones.filter((d) => diaDeGuatemala(d.fecha).startsWith(mes));
  const valorMes = centavos(delMes.reduce((t, d) => t + d.saldo, 0));
  const defectuosos = delMes
    .flatMap((d) => d.devuelto)
    .filter((l) => l.estado === "defectuoso")
    .reduce((t, l) => t + l.cantidad, 0);
  const autorizadas = delMes.filter((d) => d.autorizo).length;

  const q = normalizar(consulta);
  const visibles = devoluciones.filter(
    (d) =>
      !q ||
      normalizar(
        `${numeroDevolucion(d)} ${d.numeroCompra ?? ""} ${d.atendio} ${[...d.devuelto, ...d.llevo]
          .map((l) => l.nombre)
          .join(" ")}`,
      ).includes(q),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-ink-muted">
        Los cambios que hicieron los empleados. Nunca se devuelve dinero: el cliente se lleva otros
        productos por el mismo valor o más.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          highlight
          label="Devoluciones del mes"
          value={String(delMes.length)}
          detail={delMes.length === 1 ? "1 cambio" : `${delMes.length} cambios`}
          icon={<Undo2 />}
        />
        <KpiCard
          label="Valor devuelto"
          value={formatQ(valorMes)}
          detail="Saldo a favor que se usó este mes"
          icon={<Receipt />}
        />
        <KpiCard
          label="Defectuosos"
          value={String(defectuosos)}
          detail="Quedaron como reclamo al proveedor"
          icon={<PackageX />}
        />
        <KpiCard
          label="Fuera de plazo"
          value={String(autorizadas)}
          detail="Con autorización de Paola u Oscar"
          icon={<ShieldAlert />}
        />
      </div>

      <Card className="min-w-0">
        <div className="px-4 py-3">
          <SearchInput
            aria-label="Buscar devolución"
            placeholder="Buscar por número, producto o empleado"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            className="w-80"
          />
        </div>
        {visibles.length === 0 ? (
          <p className="px-5 pt-4 pb-10 text-center text-body text-ink-muted">
            {devoluciones.length === 0
              ? "Todavía no hay devoluciones."
              : "No hay devoluciones con esa búsqueda."}
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Devolución</Th>
                <Th>Devolvió</Th>
                <Th>Se llevó</Th>
                <Th numeric>Pagó</Th>
                <Th>Autorizó</Th>
              </tr>
            </THead>
            <TBody>
              {visibles.map((d) => (
                <Tr key={d.id}>
                  <Td className="py-2.5 align-top">
                    <button
                      type="button"
                      onClick={() => setAbierta(d)}
                      className="group block text-left"
                    >
                      <span className="font-mono font-semibold text-ink-strong group-hover:underline">
                        {numeroDevolucion(d)}
                      </span>
                      <span className="block text-small text-ink-muted">
                        {formatFechaHora(d.fecha)} · {d.atendio}
                      </span>
                      <span className="block text-small text-ink-muted">
                        {d.numeroCompra ? `Venta ${d.numeroCompra}` : "Sin comprobante"} ·{" "}
                        {d.dias === 0
                          ? "el mismo día"
                          : `a los ${d.dias} ${d.dias === 1 ? "día" : "días"}`}
                      </span>
                    </button>
                  </Td>
                  <Td className="align-top">
                    <ul className="flex flex-col gap-1">
                      {d.devuelto.map((l, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-1.5">
                          <span>
                            {l.cantidad} × {nombreLinea(l)}
                          </span>
                          <Chip
                            tono={
                              l.estado === "defectuoso"
                                ? "bg-stock-out-bg text-stock-out-text"
                                : "bg-stock-ok-bg text-stock-ok-text"
                            }
                          >
                            {l.estado === "defectuoso" ? "Defectuoso" : "Buen estado"}
                          </Chip>
                          {l.nota && (
                            <span className="w-full text-small text-ink-muted">{l.nota}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <span className="text-small text-ink-muted">Saldo {formatQ(d.saldo)}</span>
                  </Td>
                  <Td className="align-top">
                    <ul className="flex flex-col gap-1">
                      {d.llevo.map((l, i) => (
                        <li key={i}>
                          {l.cantidad} × {nombreLinea(l)}
                        </li>
                      ))}
                    </ul>
                  </Td>
                  <Td numeric className="align-top font-semibold whitespace-nowrap">
                    {d.diferencia > 0 ? formatQ(d.diferencia) : "—"}
                  </Td>
                  <Td className="align-top">
                    {d.autorizo ? (
                      <>
                        <span className="font-medium text-ink-strong">{d.autorizo.por}</span>
                        <span className="block text-small text-ink-muted">{d.autorizo.motivo}</span>
                      </>
                    ) : (
                      <span className="text-small text-ink-muted">En plazo</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {abierta && (
        <ModalComprobanteDevolucion devolucion={abierta} onClose={() => setAbierta(null)} />
      )}
    </div>
  );
}
