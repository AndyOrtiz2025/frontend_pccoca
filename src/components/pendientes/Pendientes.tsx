"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { HandCoins, Plus, Wallet } from "lucide-react";
import {
  Button,
  Card,
  Confirmar,
  Pagination,
  SearchInput,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  useToast,
} from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { formatFecha } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { postApi } from "@/lib/http";
import { normalizar } from "@/lib/reglas/busqueda";
import { centavos } from "@/lib/reglas/dinero";
import type { GrupoPendiente, Pendiente } from "@/types/pendiente";
import { ModalNuevoPendiente } from "./ModalNuevoPendiente";

const POR_PAGINA = 10;
const total = (p: Pendiente) => centavos(p.cantidad * p.precioUnitario);

interface PendientesProps {
  pendientes: Pendiente[];
  /** Paola lo ve en tiempo real pero sin poder registrar ni marcar pagado (sección 9.4). */
  soloLectura?: boolean;
}

/** Pantalla 11: fiados y préstamos, con las mismas columnas del Excel actual. */
export function Pendientes({ pendientes, soloLectura }: PendientesProps) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [grupo, setGrupo] = useState<GrupoPendiente>("individual");
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [nuevo, setNuevo] = useState(false);
  const [aPagar, setAPagar] = useState<Pendiente | null>(null);

  const visibles = useMemo(() => {
    const q = normalizar(consulta);
    return pendientes.filter((p) => p.grupo === grupo && (!q || normalizar(p.cliente).includes(q)));
  }, [pendientes, grupo, consulta]);

  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas);
  const enPagina = visibles.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const totalPendiente = centavos(visibles.reduce((s, p) => s + total(p), 0));

  const clientes = useMemo(() => {
    const vistos = new Map<string, GrupoPendiente>();
    for (const p of pendientes) vistos.set(p.cliente, p.grupo);
    return [...vistos].map(([nombre, g]) => ({ nombre, grupo: g }));
  }, [pendientes]);

  async function pagar(p: Pendiente) {
    try {
      await postApi(`/api/pendientes/${encodeURIComponent(p.id)}/pagar`);
      toast(`${p.cliente} pagó ${formatQ(total(p))}`, "success");
      setAPagar(null);
      router.refresh();
    } catch (e) {
      manejarError(e);
    }
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
            {
              value: "organizacion",
              label: "Organizaciones",
              count: pendientes.filter((p) => p.grupo === "organizacion").length,
            },
            {
              value: "individual",
              label: "Clientes individuales",
              count: pendientes.filter((p) => p.grupo === "individual").length,
            },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <SearchInput
          aria-label="Buscar cliente"
          placeholder="Buscar cliente"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setPagina(1);
          }}
          className="w-64"
        />
        {!soloLectura && (
          <Button onClick={() => setNuevo(true)}>
            <Plus /> Nuevo pendiente
          </Button>
        )}
      </div>

      {visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Wallet className="size-8 text-gray-300" strokeWidth={1.5} />
          <p className="text-body text-ink-muted">
            {consulta ? "No hay pendientes de ese cliente." : "No hay pendientes en esta pestaña."}
          </p>
        </div>
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                <Th>Descripción del producto</Th>
                <Th numeric>Cantidad</Th>
                <Th numeric>Precio unitario</Th>
                <Th numeric>Total</Th>
                {!soloLectura && (
                  <Th className="w-32">
                    <span className="sr-only">Acciones</span>
                  </Th>
                )}
              </tr>
            </THead>
            <TBody>
              {enPagina.map((p) => (
                <Tr key={p.id}>
                  <Td className="whitespace-nowrap text-ink-muted tabular">
                    {formatFecha(p.fecha)}
                  </Td>
                  <Td className="font-semibold text-ink-strong">{p.cliente}</Td>
                  <Td>{p.descripcion}</Td>
                  <Td numeric>{p.cantidad}</Td>
                  <Td numeric>{formatQ(p.precioUnitario)}</Td>
                  <Td numeric className="font-semibold text-ink-strong">
                    {formatQ(total(p))}
                  </Td>
                  {!soloLectura && (
                    <Td>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`${p.cliente} pagó ${p.descripcion}`}
                        className="border-stock-ok/40 text-stock-ok-text hover:bg-stock-ok-bg"
                        onClick={() => setAPagar(p)}
                      >
                        <HandCoins /> Pagado
                      </Button>
                    </Td>
                  )}
                </Tr>
              ))}
            </TBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
            {!soloLectura && (
              <p className="text-small text-ink-muted">
                Al marcar como Pagado, el registro se elimina.
              </p>
            )}
            <p className="ml-auto text-body text-ink">
              Total pendiente{consulta && " de la búsqueda"}:{" "}
              <span className="text-price font-semibold text-ink-strong tabular">
                {formatQ(totalPendiente)}
              </span>
            </p>
          </div>
          {paginas > 1 && (
            <Pagination
              page={paginaActual}
              pageSize={POR_PAGINA}
              total={visibles.length}
              onChange={setPagina}
              className="border-t border-gray-200"
            />
          )}
        </>
      )}

      {nuevo && (
        <ModalNuevoPendiente
          grupoInicial={grupo}
          clientes={clientes}
          onClose={() => setNuevo(false)}
        />
      )}
      {aPagar && (
        <Confirmar
          titulo="¿El cliente pagó?"
          textoConfirmar={`Sí, pagó ${formatQ(total(aPagar))}`}
          onCancelar={() => setAPagar(null)}
          onConfirmar={() => pagar(aPagar)}
        >
          <p>
            <strong>{aPagar.cliente}</strong> · {aPagar.descripcion} × {aPagar.cantidad}
          </p>
          <p className="mt-2 text-ink-muted">
            El registro se eliminará. Esto no se puede deshacer.
          </p>
        </Confirmar>
      )}
    </Card>
  );
}
