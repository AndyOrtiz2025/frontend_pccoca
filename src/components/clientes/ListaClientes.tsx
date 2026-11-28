"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, KeyRound, Plus } from "lucide-react";
import { Button, Card, SearchInput, Table, TBody, Td, Th, THead, Tr, Tabs } from "@/components/ui";
import { formatFecha } from "@/lib/fechas";
import { coincideCliente } from "@/lib/reglas/clientes";
import type { ResumenCliente } from "@/types/cliente";
import { ModalNombreCliente } from "./ModalNombreCliente";

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Pantalla 25-B: clientes frecuentes de trámites (solo Paola). */
export function ListaClientes({ clientes, base }: { clientes: ResumenCliente[]; base: string }) {
  const [pestana, setPestana] = useState<"activos" | "inactivos">("activos");
  const [consulta, setConsulta] = useState("");
  const [nuevo, setNuevo] = useState(false);

  const activos = clientes.filter((c) => c.activo).length;
  const visibles = clientes
    .filter((c) => (pestana === "activos" ? c.activo : !c.activo))
    .filter((c) => coincideCliente(c, consulta));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-muted">
          Datos, contraseñas, archivos y notas de los clientes de trámites. Solo tú los ves.
        </p>
        <Button onClick={() => setNuevo(true)}>
          <Plus /> Nuevo cliente
        </Button>
      </div>

      <Card className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
          <Tabs
            ariaLabel="Clientes"
            value={pestana}
            onChange={setPestana}
            items={[
              { value: "activos", label: "Activos", count: activos },
              { value: "inactivos", label: "Inactivos", count: clientes.length - activos },
            ]}
          />
        </div>
        <div className="px-4 py-3">
          <SearchInput
            aria-label="Buscar cliente"
            placeholder="Buscar por nombre, DPI, NIT, teléfono…"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            className="w-80"
          />
        </div>
        {visibles.length === 0 ? (
          <p className="px-5 pt-4 pb-10 text-center text-body text-ink-muted">
            {consulta
              ? "Ningún cliente coincide con la búsqueda."
              : "No hay clientes en esta vista."}
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Cliente</Th>
                <Th>Datos</Th>
                <Th>Guardado</Th>
                <Th>Actualizado</Th>
              </tr>
            </THead>
            <TBody>
              {visibles.map((c) => (
                <Tr key={c.id}>
                  <Td className="py-2.5">
                    <Link href={`${base}/${c.id}`} className="group flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-small font-semibold text-white">
                        {iniciales(c.nombre)}
                      </span>
                      <span className="font-semibold text-ink-strong group-hover:underline">
                        {c.nombre}
                      </span>
                    </Link>
                  </Td>
                  <Td className="text-small">
                    {c.datos.length === 0 ? (
                      <span className="text-ink-muted">Sin datos</span>
                    ) : (
                      <ul className="flex flex-col gap-0.5">
                        {c.datos.slice(0, 3).map((d) => (
                          <li key={d.id}>
                            <span className="text-ink-muted">{d.nombre}:</span>{" "}
                            <span className="text-ink tabular">{d.valor}</span>
                          </li>
                        ))}
                        {c.datos.length > 3 && (
                          <li className="text-ink-muted">y {c.datos.length - 3} más</li>
                        )}
                      </ul>
                    )}
                  </Td>
                  <Td className="text-small whitespace-nowrap text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="size-3.5" /> {c.contrasenas}{" "}
                      {c.contrasenas === 1 ? "contraseña" : "contraseñas"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-3.5" /> {c.archivos}{" "}
                      {c.archivos === 1 ? "archivo" : "archivos"}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">{formatFecha(c.actualizado)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {nuevo && <ModalNombreCliente cliente={null} base={base} onClose={() => setNuevo(false)} />}
    </div>
  );
}
