"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Image as ImagenIcono,
  Inbox,
  LoaderCircle,
  Lock,
  MessageCircle,
  Paperclip,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { Button, Card, Chip, Confirmar, SearchInput, Tabs, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { formatFechaHora, haceCuanto } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { postApi } from "@/lib/http";
import { normalizar } from "@/lib/reglas/busqueda";
import { porCobrar } from "@/lib/reglas/procesos";
import { ETIQUETA_PAGO, type Entrada, type PagoEntrada } from "@/types/entrada";

type Pestana = "todas" | "no_leidas";

/** "SAT · Actualización de NIT" o "Celular Samsung A14". */
function queEs(e: Entrada) {
  return e.tipo === "tramite"
    ? e.tramiteNombre
    : `${e.equipo}${e.marcaModelo ? ` ${e.marcaModelo}` : ""}`;
}

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter((p) => !/^(don|doña|la|el|de)$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const TONO_PAGO: Record<PagoEntrada["estado"], string> = {
  cancelado: "bg-stock-ok-bg text-stock-ok-text",
  anticipo: "bg-gold-100 text-gold-text",
  pendiente: "bg-gray-100 text-ink-muted",
};

function ChipPago({ pago }: { pago: PagoEntrada }) {
  return (
    <Chip tono={TONO_PAGO[pago.estado]}>
      {ETIQUETA_PAGO[pago.estado]}
      {pago.estado === "anticipo" && pago.anticipo ? ` ${formatQ(pago.anticipo)}` : ""}
    </Chip>
  );
}

/**
 * Bandeja de entradas (pantalla 22 para Paola; Oscar la usará para servicios).
 * Lo que el mostrador mandó y falta atender: se revisa, se pasa a En proceso o se descarta.
 */
export function BandejaEntradas({
  entradas,
  enProcesoHref,
}: {
  entradas: Entrada[];
  /** A dónde ir después de pasar una entrada a En proceso. */
  enProcesoHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [pestana, setPestana] = useState<Pestana>("todas");
  const [consulta, setConsulta] = useState("");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  // Se marcan leídas al instante; el servidor lo guarda y el contador del menú se actualiza.
  const [leidas, setLeidas] = useState<Set<string>>(new Set());
  const [ocupado, setOcupado] = useState<"convertir" | "descartar" | null>(null);
  const [aDescartar, setADescartar] = useState<Entrada | null>(null);

  const esLeida = (e: Entrada) => e.leida || leidas.has(e.id);
  const noLeidas = entradas.filter((e) => !esLeida(e)).length;

  const visibles = useMemo(() => {
    const q = normalizar(consulta);
    return entradas.filter((e) => {
      if (pestana === "no_leidas" && (e.leida || leidas.has(e.id))) return false;
      return !q || normalizar(`${e.cliente.nombre} ${queEs(e)} ${e.enviadaPor}`).includes(q);
    });
  }, [entradas, pestana, consulta, leidas]);

  const seleccionada = entradas.find((e) => e.id === seleccionadaId) ?? null;

  async function abrir(e: Entrada) {
    setSeleccionadaId(e.id);
    if (esLeida(e)) return;
    setLeidas((s) => new Set(s).add(e.id));
    try {
      await postApi(`/api/entradas/${encodeURIComponent(e.id)}/leida`);
      router.refresh(); // baja el número del menú
    } catch (err) {
      manejarError(err);
    }
  }

  /** Después de atender una, se abre la siguiente de la lista para seguir trabajando. */
  function siguienteDe(id: string) {
    const i = visibles.findIndex((e) => e.id === id);
    return visibles[i + 1] ?? visibles[i - 1] ?? null;
  }

  async function convertir(e: Entrada) {
    setOcupado("convertir");
    try {
      await postApi(`/api/entradas/${encodeURIComponent(e.id)}/convertir`);
      toast(`${e.cliente.nombre} pasó a En proceso`, "success");
      setSeleccionadaId(siguienteDe(e.id)?.id ?? null);
      router.refresh();
    } catch (err) {
      manejarError(err);
    } finally {
      setOcupado(null);
    }
  }

  async function descartar(e: Entrada) {
    setOcupado("descartar");
    try {
      await postApi(`/api/entradas/${encodeURIComponent(e.id)}/descartar`);
      toast("Entrada descartada", "success");
      setADescartar(null);
      setSeleccionadaId(siguienteDe(e.id)?.id ?? null);
      router.refresh();
    } catch (err) {
      manejarError(err);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className={cn("grid gap-4", seleccionada && "xl:grid-cols-[minmax(0,1fr)_420px]")}>
      <Card className="min-w-0 self-start">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
          <Tabs
            ariaLabel="Entradas"
            value={pestana}
            onChange={setPestana}
            items={[
              { value: "todas", label: "Todas", count: entradas.length },
              { value: "no_leidas", label: "No leídas", count: noLeidas },
            ]}
          />
          <Link
            href={enProcesoHref}
            className="inline-flex items-center gap-1 text-button font-semibold text-navy-900 hover:underline"
          >
            Ver En proceso <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="px-4 py-3">
          <SearchInput
            aria-label="Buscar entrada"
            placeholder="Buscar cliente, trámite o quién la recibió"
            value={consulta}
            onChange={(ev) => setConsulta(ev.target.value)}
            className="w-full max-w-sm"
          />
        </div>

        {visibles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <Inbox className="size-8 text-gray-300" strokeWidth={1.5} />
            <p className="text-body text-ink-muted">
              {entradas.length === 0
                ? "No hay entradas por atender. Todo al día."
                : "No hay entradas en esta vista."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 border-t border-gray-200">
            {visibles.map((e) => {
              const nueva = !esLeida(e);
              const activa = e.id === seleccionadaId;
              const archivos = e.tipo === "tramite" ? e.archivos.length : 0;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => abrir(e)}
                    aria-current={activa || undefined}
                    className={cn(
                      "hover:bg-gray-50 relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                      activa && "bg-gold-100/60 hover:bg-gold-100/60",
                    )}
                  >
                    {activa && (
                      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gold-500" />
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full text-small font-semibold",
                        nueva ? "bg-navy-900 text-white" : "bg-gray-100 text-ink-muted",
                      )}
                    >
                      {iniciales(e.cliente.nombre)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span
                          className={cn(
                            "truncate text-body text-ink-strong",
                            nueva ? "font-bold" : "font-medium",
                          )}
                        >
                          {e.cliente.nombre}
                        </span>
                        <span className="shrink-0 text-small text-ink-muted">
                          {haceCuanto(e.fecha)}
                        </span>
                      </span>
                      <span className="block truncate text-body text-ink">{queEs(e)}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {nueva && <Chip tono="bg-navy-900 text-white">Nueva</Chip>}
                        {e.tipo === "tramite" && <ChipPago pago={e.pago} />}
                        {archivos > 0 && (
                          <Chip>
                            <Paperclip className="size-3" /> {archivos}
                          </Chip>
                        )}
                        <span className="text-small text-ink-muted">Recibió {e.enviadaPor}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {seleccionada && (
        <DetalleEntrada
          entrada={seleccionada}
          ocupado={ocupado}
          onCerrar={() => setSeleccionadaId(null)}
          onConvertir={() => convertir(seleccionada)}
          onDescartar={() => setADescartar(seleccionada)}
        />
      )}

      {aDescartar && (
        <Confirmar
          titulo="¿Descartar esta entrada?"
          textoConfirmar="Sí, descartar"
          peligro
          onCancelar={() => setADescartar(null)}
          onConfirmar={() => descartar(aDescartar)}
        >
          <p>
            <strong>{aDescartar.cliente.nombre}</strong> · {queEs(aDescartar)}
          </p>
          <p className="mt-2 text-ink-muted">
            Úsalo si llegó repetida o el cliente ya no quiso. Sale de la bandeja y no pasa a En
            proceso.
          </p>
        </Confirmar>
      )}
    </div>
  );
}

function DetalleEntrada({
  entrada: e,
  ocupado,
  onCerrar,
  onConvertir,
  onDescartar,
}: {
  entrada: Entrada;
  ocupado: "convertir" | "descartar" | null;
  onCerrar: () => void;
  onConvertir: () => void;
  onDescartar: () => void;
}) {
  const tel = e.cliente.telefono?.replace(/\D/g, "");
  return (
    <Card className="flex flex-col self-start overflow-hidden xl:sticky xl:top-[calc(var(--spacing-topbar)+1.5rem)]">
      <div className="bg-grad-hero px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-overline font-semibold tracking-wider text-gold-500 uppercase">
              {e.tipo === "tramite" ? "Entrada de trámite" : "Entrada de servicio"}
            </p>
            <h2 className="mt-0.5 text-h2 font-semibold">{e.cliente.nombre}</h2>
            <p className="text-small text-navy-300">{queEs(e)}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar detalle"
            onClick={onCerrar}
            className="flex size-7 shrink-0 items-center justify-center rounded-xs text-navy-300 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-3 text-small text-navy-300">
          {formatFechaHora(e.fecha)} · Recibió {e.enviadaPor}
        </p>
      </div>

      <div className="flex flex-col divide-y divide-gray-200">
        {tel && (
          <Seccion titulo="Contacto">
            <div className="flex flex-wrap gap-2">
              <a
                href={`tel:${tel}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-gray-300 px-3 text-button font-semibold text-navy-900 hover:bg-gray-100"
              >
                <Phone className="size-4" /> {e.cliente.telefono}
              </a>
              <a
                href={`https://wa.me/502${tel}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-stock-ok/40 px-3 text-button font-semibold text-stock-ok-text hover:bg-stock-ok-bg"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </div>
          </Seccion>
        )}

        {e.tipo === "tramite" ? (
          <>
            <Seccion titulo="Pago en mostrador">
              <div className="flex items-center justify-between gap-3">
                <ChipPago pago={e.pago} />
                {e.pago.estado === "anticipo" && (
                  <span className="text-small text-ink-muted">Falta cobrar el resto</span>
                )}
                {e.pago.estado === "pendiente" && (
                  <span className="text-small text-ink-muted">Se cobra todo al entregar</span>
                )}
              </div>
            </Seccion>

            {e.documentos.length > 0 && (
              <Seccion titulo="Requisitos">
                <ul className="flex flex-col gap-1.5">
                  {e.documentos.map((d) => (
                    <li key={d.nombre} className="flex items-start gap-2 text-body">
                      {d.entregado ? (
                        <Check className="mt-0.5 size-4 shrink-0 text-stock-ok" />
                      ) : (
                        <X className="mt-0.5 size-4 shrink-0 text-stock-out" />
                      )}
                      <span className={d.entregado ? "text-ink" : "text-ink-muted"}>
                        {d.nombre}
                        {!d.entregado && " (no lo dejó)"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Seccion>
            )}

            {e.archivos.length > 0 && (
              <Seccion titulo={`Archivos (${e.archivos.length})`}>
                <ul className="flex flex-col gap-1.5">
                  {e.archivos.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`/api/archivos/${encodeURIComponent(a.id)}`}
                        className="hover:bg-gray-50 flex items-center gap-2.5 rounded-sm border border-gray-200 px-3 py-2 hover:border-navy-900"
                      >
                        {a.tipo === "application/pdf" ? (
                          <FileText className="size-4 shrink-0 text-stock-out" />
                        ) : (
                          <ImagenIcono className="size-4 shrink-0 text-navy-700" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-body text-ink-strong">
                          {a.nombre}
                        </span>
                        <span className="text-small text-ink-muted tabular">
                          {(a.tamano / 1024).toFixed(a.tamano < 10240 ? 1 : 0)} KB
                        </span>
                        <Download className="size-4 shrink-0 text-ink-muted" />
                      </a>
                    </li>
                  ))}
                </ul>
              </Seccion>
            )}

            {e.datosCliente && <DatosCliente texto={e.datosCliente} />}
          </>
        ) : (
          <>
            <Seccion titulo="Equipo">
              <p className="text-body text-ink-strong">{queEs(e)}</p>
              <p className="mt-1 text-body">{e.falla}</p>
              {e.accesorios.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {e.accesorios.map((a) => (
                    <Chip key={a}>{a}</Chip>
                  ))}
                </div>
              )}
            </Seccion>
            <Seccion titulo="Precio">
              {e.cobro ? (
                <p className="text-body">
                  {e.cobro.detalle} ·{" "}
                  <strong className="tabular">{formatQ(porCobrar(e.cobro))}</strong>
                </p>
              ) : (
                <p className="text-body text-ink-muted">Se define al revisar el equipo.</p>
              )}
            </Seccion>
          </>
        )}

        {e.notas && (
          <Seccion titulo="Notas del mostrador">
            <p className="rounded-md border border-gold-200 bg-gold-100 px-3 py-2 text-body whitespace-pre-line text-gold-text">
              {e.notas}
            </p>
          </Seccion>
        )}
      </div>

      <div className="bg-gray-50 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-5 py-3.5">
        <Button variant="outline" onClick={onDescartar} disabled={!!ocupado}>
          <Trash2 /> Descartar
        </Button>
        <Button onClick={onConvertir} disabled={!!ocupado}>
          {ocupado === "convertir" ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
          Pasar a En proceso
        </Button>
      </div>
    </Card>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-4">
      <h3 className="mb-2 text-small font-semibold text-ink-muted">{titulo}</h3>
      {children}
    </section>
  );
}

/** Correo, NIT, usuario de agencia virtual…: dato sensible que solo ve Paola. */
function DatosCliente({ texto }: { texto: string }) {
  const toast = useToast();
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      toast("Datos copiados", "success");
    } catch {
      toast("No se pudo copiar. Selecciona el texto y cópialo.", "warning");
    }
  }
  return (
    <section className="px-5 py-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-small font-semibold text-ink-muted">
          <Lock className="size-3.5" /> Datos del cliente
        </h3>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-small font-semibold text-navy-900 hover:bg-gray-100"
        >
          <Copy className="size-3.5" /> Copiar
        </button>
      </div>
      <p className="rounded-md border border-navy-900/15 bg-navy-900/[0.04] px-3 py-2 font-mono text-small whitespace-pre-line text-ink-strong">
        {texto}
      </p>
      <p className="mt-1.5 text-badge text-ink-muted">
        Solo tú ves estos datos; no aparecen en Seguimiento.
      </p>
    </section>
  );
}
