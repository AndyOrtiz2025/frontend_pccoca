"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Info, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  Confirmar,
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
import { diaDeGuatemala, formatFechaHora, haceCuanto } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { postApi } from "@/lib/http";
import { describirProceso } from "@/lib/reglas/procesos";
import type { Historial } from "@/lib/api";
import type { Entrada } from "@/types/entrada";

type Pestana = "entregados" | "descartadas";

function queEsEntrada(e: Entrada) {
  return e.tipo === "tramite" ? e.tramiteNombre : `${e.equipo} ${e.marcaModelo ?? ""}`.trim();
}

/** Del día 25 en adelante se sugiere vaciar (cierre de mes). */
function esFinDeMes(ahora = new Date()) {
  return Number(diaDeGuatemala(ahora).slice(8, 10)) >= 25;
}

/**
 * Historial de lo ya terminado: entregados al cliente y entradas descartadas.
 * Se queda aquí hasta que Paola (u Oscar) lo vacíe; lo recomendado es a fin de mes.
 */
export function HistorialProcesos({ historial }: { historial: Historial }) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [pestana, setPestana] = useState<Pestana>("entregados");
  const [confirmando, setConfirmando] = useState(false);
  const { entregados, descartadas, ultimoVaciado } = historial;
  const total = entregados.length + descartadas.length;

  async function vaciar() {
    try {
      const { quitados } = await postApi<{ quitados: number }>("/api/historial/vaciar");
      toast(`Historial vaciado: se quitaron ${quitados} registros`, "success");
      setConfirmando(false);
      router.refresh();
    } catch (e) {
      manejarError(e);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div>
          <h2 className="flex items-center gap-2 text-body font-semibold text-ink-strong">
            <Archive className="size-4 text-ink-muted" /> Historial
          </h2>
          <p className="text-small text-ink-muted">
            Lo entregado y descartado se guarda aquí hasta que lo vacíes.{" "}
            {ultimoVaciado ? `Último vaciado: ${haceCuanto(ultimoVaciado).toLowerCase()}.` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={() => setConfirmando(true)} disabled={total === 0}>
          <Trash2 /> Vaciar historial
        </Button>
      </div>

      {total > 0 && esFinDeMes() && (
        <p className="mx-5 mt-3 flex items-center gap-2 rounded-md bg-gold-100 px-3 py-2 text-small text-gold-text">
          <Info className="size-4 shrink-0" /> Fin de mes: buen momento para vaciar el historial.
        </p>
      )}

      <div className="px-4 pt-3">
        <Tabs
          ariaLabel="Historial"
          value={pestana}
          onChange={setPestana}
          items={[
            { value: "entregados", label: "Entregados", count: entregados.length },
            { value: "descartadas", label: "Descartadas", count: descartadas.length },
          ]}
        />
      </div>

      {pestana === "entregados" ? (
        entregados.length === 0 ? (
          <Vacio texto="No hay entregados en el historial." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Cliente</Th>
                <Th>Qué era</Th>
                <Th>Entregado</Th>
                <Th>Entregó</Th>
                <Th numeric>Cobrado</Th>
              </tr>
            </THead>
            <TBody>
              {entregados.map((p) => (
                <Tr key={p.id}>
                  <Td className="font-semibold whitespace-nowrap text-ink-strong">
                    {p.cliente.nombre}
                  </Td>
                  <Td className="max-w-72 truncate">{describirProceso(p)}</Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {p.entrega ? formatFechaHora(p.entrega.fecha) : "—"}
                  </Td>
                  <Td>{p.entrega?.entregadoPor ?? "—"}</Td>
                  <Td numeric className="whitespace-nowrap">
                    {p.cobro ? formatQ(p.cobro.total) : <Chip>Sin precio</Chip>}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )
      ) : descartadas.length === 0 ? (
        <Vacio texto="No hay entradas descartadas." />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Cliente</Th>
              <Th>Qué era</Th>
              <Th>Recibió</Th>
              <Th>Descartada</Th>
              <Th>Por</Th>
            </tr>
          </THead>
          <TBody>
            {descartadas.map((e) => (
              <Tr key={e.id}>
                <Td className="font-semibold whitespace-nowrap text-ink-strong">
                  {e.cliente.nombre}
                </Td>
                <Td className="max-w-72 truncate">{queEsEntrada(e)}</Td>
                <Td>{e.enviadaPor}</Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {e.descartada ? formatFechaHora(e.descartada.fecha) : "—"}
                </Td>
                <Td>{e.descartada?.por}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      {confirmando && (
        <Confirmar
          titulo="¿Vaciar el historial?"
          textoConfirmar="Sí, vaciar"
          peligro
          onCancelar={() => setConfirmando(false)}
          onConfirmar={vaciar}
        >
          <p>
            Se quitarán <strong>{entregados.length}</strong> entregados y{" "}
            <strong>{descartadas.length}</strong> descartadas de esta lista.
          </p>
          <p className="mt-2 text-ink-muted">
            Lo recomendado es vaciarlo a fin de mes, pero puedes hacerlo cuando quieras. Los
            reportes mensuales no se afectan.
          </p>
        </Confirmar>
      )}
    </Card>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="px-5 pt-2 pb-6 text-body text-ink-muted">{texto}</p>;
}
