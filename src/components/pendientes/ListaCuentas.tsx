"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Download, Plus, Wallet } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  Pagination,
  SearchInput,
  Select,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
} from "@/components/ui";
import { descargarArchivo } from "@/lib/compartir";
import { diaDeGuatemala, formatFecha } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { normalizar } from "@/lib/reglas/busqueda";
import { centavos } from "@/lib/reglas/dinero";
import type { GrupoPendiente, ResumenCuenta } from "@/types/pendiente";
import { ModalCuenta } from "./ModalCuenta";

const POR_PAGINA = 10;

type Orden = "reciente" | "antigua" | "saldo";

/** "hoy", "hace 1 día", "hace 45 días": desde cuándo debe (solo informativo). */
export function textoDebiendo(dias: number) {
  return dias === 0 ? "hoy" : `hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

interface ListaCuentasProps {
  cuentas: ResumenCuenta[];
  /** Ruta base del detalle (Empleado o Paola). */
  base: string;
  soloLectura?: boolean;
}

/** Pantalla 11 (rediseño): una fila por cliente u organización, con su saldo. */
export function ListaCuentas({ cuentas, base, soloLectura }: ListaCuentasProps) {
  const [grupo, setGrupo] = useState<GrupoPendiente>("individual");
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [nueva, setNueva] = useState(false);

  const [orden, setOrden] = useState<Orden>("reciente");

  const q = normalizar(consulta);
  const visibles = cuentas
    .filter((c) => c.cuenta.grupo === grupo && (!q || normalizar(c.cuenta.nombre).includes(q)))
    .sort((x, y) => {
      if (orden === "saldo") return y.saldo - x.saldo;
      if (orden === "antigua") return (y.diasDebiendo ?? -1) - (x.diasDebiendo ?? -1);
      return 0; // ya vienen: con saldo primero, el movimiento más reciente arriba
    });

  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const enPagina = visibles.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);
  const totalSaldo = centavos(visibles.reduce((s, c) => s + c.saldo, 0));
  const contar = (g: GrupoPendiente) => cuentas.filter((c) => c.cuenta.grupo === g).length;

  /** CSV de las cuentas con saldo (para Paola). */
  function exportarCsv() {
    const celda = (v: string | number | undefined) => {
      const t = v === undefined ? "" : String(v);
      const s = /^[=+\-@]/.test(t) ? `'${t}` : t;
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const filas = [
      ["Cliente u organización", "Tipo", "Teléfono", "Cargos sin pagar", "Debe desde", "Saldo"],
      ...cuentas
        .filter((c) => c.saldo > 0)
        .map((c) => [
          c.cuenta.nombre,
          c.cuenta.grupo === "organizacion" ? "Organización" : "Individual",
          c.cuenta.telefono,
          c.cargosPendientes,
          c.diasDebiendo === undefined ? "" : textoDebiendo(c.diasDebiendo),
          c.saldo.toFixed(2),
        ]),
    ];
    descargarArchivo(
      new Blob(["\uFEFF" + filas.map((f) => f.map(celda).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
      `pendientes-${diaDeGuatemala(new Date())}.csv`,
    );
  }

  return (
    <Card>
      <div className="px-4 pt-3">
        <Tabs
          ariaLabel="Tipo de cliente"
          value={grupo}
          onChange={(g) => {
            setGrupo(g);
            setPagina(1);
          }}
          items={[
            { value: "organizacion", label: "Organizaciones", count: contar("organizacion") },
            { value: "individual", label: "Clientes individuales", count: contar("individual") },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <SearchInput
          aria-label="Buscar cliente"
          placeholder={
            grupo === "organizacion" ? "Buscar organización" : "Buscar cliente por nombre"
          }
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setPagina(1);
          }}
          className="w-72"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Ordenar"
            value={orden}
            onChange={(e) => {
              setOrden(e.target.value as Orden);
              setPagina(1);
            }}
            className="w-56"
          >
            <option value="reciente">Movimiento más reciente</option>
            <option value="antigua">Deuda más antigua</option>
            <option value="saldo">Saldo más alto</option>
          </Select>
          {soloLectura ? (
            <Button variant="outline" onClick={exportarCsv}>
              <Download /> Exportar CSV
            </Button>
          ) : (
            <Button onClick={() => setNueva(true)}>
              <Plus /> {grupo === "organizacion" ? "Nueva organización" : "Nuevo cliente"}
            </Button>
          )}
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Wallet className="size-8 text-gray-300" strokeWidth={1.5} />
          <p className="text-body text-ink-muted">
            {consulta ? "No se encontró ese nombre." : "Todavía no hay cuentas en esta pestaña."}
          </p>
        </div>
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <Th>{grupo === "organizacion" ? "Organización" : "Cliente"}</Th>
                <Th>Teléfono</Th>
                <Th numeric>Cargos sin pagar</Th>
                <Th>Último movimiento</Th>
                <Th>Debe desde</Th>
                <Th numeric>Saldo</Th>
                <Th className="w-10">
                  <span className="sr-only">Abrir</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {enPagina.map(
                ({ cuenta, cargosPendientes, saldo, ultimoMovimiento, diasDebiendo }) => (
                  <Tr key={cuenta.id} className="relative cursor-pointer">
                    <Td className="font-semibold text-ink-strong">
                      {/* El enlace cubre toda la fila: clic en cualquier parte abre la cuenta */}
                      <Link
                        href={`${base}/${cuenta.id}`}
                        className="after:absolute after:inset-0 focus-visible:shadow-none focus-visible:after:shadow-focus"
                      >
                        {cuenta.nombre}
                      </Link>
                    </Td>
                    <Td className="text-ink-muted tabular">{cuenta.telefono ?? "—"}</Td>
                    <Td numeric>{cargosPendientes}</Td>
                    <Td className="text-ink-muted tabular">{formatFecha(ultimoMovimiento)}</Td>
                    <Td className="text-ink-muted">
                      {diasDebiendo === undefined ? "—" : textoDebiendo(diasDebiendo)}
                    </Td>
                    <Td numeric>
                      {saldo > 0 ? (
                        <span className="text-price font-semibold text-ink-strong">
                          {formatQ(saldo)}
                        </span>
                      ) : (
                        <Chip tono="bg-stock-ok-bg text-stock-ok-text">Al día</Chip>
                      )}
                    </Td>
                    <Td>
                      <ChevronRight className="size-4 text-ink-muted" />
                    </Td>
                  </Tr>
                ),
              )}
            </TBody>
          </Table>
          <div className="flex items-center justify-end border-t border-gray-200 px-4 py-3">
            <p className="text-body text-ink">
              Total por cobrar{consulta && " de la búsqueda"}:{" "}
              <span className="text-price font-semibold text-ink-strong tabular">
                {formatQ(totalSaldo)}
              </span>
            </p>
          </div>
          {paginas > 1 && (
            <Pagination
              page={actual}
              pageSize={POR_PAGINA}
              total={visibles.length}
              onChange={setPagina}
              className="border-t border-gray-200"
            />
          )}
        </>
      )}

      {nueva && <ModalCuenta grupoInicial={grupo} onClose={() => setNueva(false)} />}
    </Card>
  );
}
