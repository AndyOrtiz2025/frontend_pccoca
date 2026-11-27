"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CircleCheck,
  ClipboardList,
  FolderOpen,
  Inbox,
  LoaderCircle,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  Field,
  Input,
  KpiCard,
  SearchInput,
  SegmentedControl,
  Select,
  StatusChip,
  Table,
  TBody,
  Td,
  Textarea,
  Th,
  THead,
  Tr,
  Tabs,
  useToast,
} from "@/components/ui";
import { DetalleCobro } from "@/components/seguimiento/DetalleCobro";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { formatFechaHora, haceCuanto } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { ErrorApi, postApi } from "@/lib/http";
import { normalizar } from "@/lib/reglas/busqueda";
import { describirProceso, porCobrar } from "@/lib/reglas/procesos";
import { ETIQUETA_PAGO } from "@/types/entrada";
import type { EstadoProceso } from "@/types/estados";
import type { EnProceso } from "@/types/proceso";

type Pestana = "todos" | EstadoProceso;
type EstadoEditable = "recibido" | "en_proceso" | "listo";

const OPCIONES_ESTADO: { value: EstadoEditable; label: string }[] = [
  { value: "recibido", label: "Recibido" },
  { value: "en_proceso", label: "En proceso" },
  { value: "listo", label: "Listo" },
];

/** "SAT" de "SAT · Actualización de NIT"; para servicios, el tipo de equipo. */
function grupoDe(p: EnProceso) {
  return p.tipo === "tramite" ? (p.tramiteNombre.split(" · ")[0] ?? "Otros") : p.equipo;
}

/** El nombre sin el módulo: "Actualización de NIT". */
function nombreCorto(p: EnProceso) {
  return p.tipo === "tramite"
    ? p.tramiteNombre.split(" · ").slice(1).join(" · ") || p.tramiteNombre
    : describirProceso(p);
}

/**
 * Pantalla 21 (Paola) / 25 (Oscar): expedientes activos. Cambiar estado, notas para el mostrador
 * y cuánto cobrar. Lo que se marca "Listo" le aparece al Empleado para entregar.
 */
export function ProcesosAdmin({ procesos }: { procesos: EnProceso[] }) {
  const router = useRouter();
  const [pestana, setPestana] = useState<Pestana>("todos");
  const [consulta, setConsulta] = useState("");
  const [grupo, setGrupo] = useState("");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  const esTramite = procesos[0]?.tipo !== "servicio";
  const grupos = useMemo(() => [...new Set(procesos.map(grupoDe))].sort(), [procesos]);
  const contar = (e: Pestana) =>
    e === "todos" ? procesos.length : procesos.filter((p) => p.estado === e).length;

  const visibles = useMemo(() => {
    const q = normalizar(consulta);
    return procesos.filter((p) => {
      if (pestana !== "todos" && p.estado !== pestana) return false;
      if (grupo && grupoDe(p) !== grupo) return false;
      return !q || normalizar(`${p.cliente.nombre} ${describirProceso(p)}`).includes(q);
    });
  }, [procesos, pestana, grupo, consulta]);

  const seleccionado = procesos.find((p) => p.id === seleccionadoId) ?? null;
  const sinPrecio = procesos.filter((p) => !p.cobro).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          highlight
          label="Total en cola"
          value={String(procesos.length)}
          detail={
            sinPrecio > 0
              ? `${sinPrecio} sin precio definido`
              : esTramite
                ? "Trámites activos, todos con precio"
                : "Servicios activos, todos con precio"
          }
          icon={<FolderOpen />}
        />
        <KpiCard
          label="Recibidos"
          value={String(contar("recibido"))}
          detail="Por empezar"
          icon={<Inbox />}
        />
        <KpiCard
          label="En proceso"
          value={String(contar("en_proceso"))}
          detail="Trabajando en ellos"
          icon={<RefreshCw />}
        />
        <KpiCard
          label="Listos para entregar"
          value={String(contar("listo"))}
          detail="Ya los ve el mostrador"
          icon={<CircleCheck />}
        />
      </div>

      <div className={cn("grid gap-4", seleccionado && "xl:grid-cols-[minmax(0,1fr)_400px]")}>
        <Card className="min-w-0 self-start">
          <div className="px-4 pt-3">
            <Tabs
              ariaLabel="Estado"
              value={pestana}
              onChange={setPestana}
              items={[
                { value: "todos", label: "Todos" },
                { value: "recibido", label: "Recibido" },
                { value: "en_proceso", label: "En proceso" },
                { value: "listo", label: "Listos para entregar" },
              ].map((t) => ({
                ...t,
                value: t.value as Pestana,
                count: contar(t.value as Pestana),
              }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <SearchInput
              aria-label="Buscar"
              placeholder={esTramite ? "Buscar cliente o trámite" : "Buscar cliente o equipo"}
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              className="w-64"
            />
            <Select
              aria-label={esTramite ? "Institución" : "Equipo"}
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              className="w-48"
            >
              <option value="">
                {esTramite ? "Todas las instituciones" : "Todos los equipos"}
              </option>
              {grupos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </div>

          {visibles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <ClipboardList className="size-8 text-gray-300" strokeWidth={1.5} />
              <p className="text-body text-ink-muted">No hay nada en esta vista.</p>
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Cliente</Th>
                  <Th>{esTramite ? "Trámite" : "Equipo"}</Th>
                  {/* Con el panel abierto no cabe todo: el ingreso se ve en el detalle. */}
                  {!seleccionado && <Th>Ingreso</Th>}
                  <Th numeric>A cobrar</Th>
                  <Th>Estado</Th>
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
                    <Td className="py-2.5">
                      <span className="block font-semibold whitespace-nowrap text-ink-strong">
                        {p.cliente.nombre}
                      </span>
                      {p.cliente.telefono && (
                        <span className="text-small text-ink-muted">{p.cliente.telefono}</span>
                      )}
                    </Td>
                    <Td className="max-w-72">
                      <span className="flex items-center gap-2">
                        <Chip tono="bg-navy-900 text-white">{grupoDe(p)}</Chip>
                        <span className="truncate">{nombreCorto(p)}</span>
                      </span>
                    </Td>
                    {!seleccionado && (
                      <Td className="whitespace-nowrap text-ink-muted">
                        {haceCuanto(p.fechaIngreso)}
                      </Td>
                    )}
                    <Td numeric className="whitespace-nowrap">
                      {p.cobro ? (
                        <span className="font-semibold text-ink-strong">
                          {formatQ(porCobrar(p.cobro))}
                        </span>
                      ) : (
                        <Chip tono="bg-stock-low-bg text-stock-low-text">Sin precio</Chip>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <StatusChip estado={p.estado} />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {seleccionado && (
          <DetalleProceso
            key={seleccionado.id}
            proceso={seleccionado}
            onCerrar={() => setSeleccionadoId(null)}
            onCambio={() => router.refresh()}
          />
        )}
      </div>
    </div>
  );
}

function DetalleProceso({
  proceso: p,
  onCerrar,
  onCambio,
}: {
  proceso: EnProceso;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const toast = useToast();
  const manejarError = useErrorApi();
  const [cambiando, setCambiando] = useState(false);
  const [editandoCobro, setEditandoCobro] = useState(!p.cobro);
  const tel = p.cliente.telefono?.replace(/\D/g, "");
  const id = encodeURIComponent(p.id);

  async function cambiarEstado(estado: EstadoEditable) {
    if (estado === p.estado || cambiando) return;
    setCambiando(true);
    try {
      await postApi(`/api/procesos/${id}/estado`, { estado });
      toast(
        estado === "listo"
          ? `Listo para entregar: el mostrador ya puede avisar a ${p.cliente.nombre}`
          : "Estado actualizado",
        "success",
      );
      onCambio();
    } catch (e) {
      manejarError(e);
    } finally {
      setCambiando(false);
    }
  }

  return (
    <Card className="flex flex-col self-start overflow-hidden xl:sticky xl:top-[calc(var(--spacing-topbar)+1.5rem)]">
      <div className="bg-grad-hero px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-overline font-semibold tracking-wider text-gold-500 uppercase">
              {grupoDe(p)}
            </p>
            <h2 className="mt-0.5 text-h2 font-semibold">{p.cliente.nombre}</h2>
            <p className="text-small text-navy-300">{nombreCorto(p)}</p>
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
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-navy-300">
          <span>Ingresó {formatFechaHora(p.fechaIngreso)}</span>
          {tel && (
            <a
              href={`tel:${tel}`}
              className="inline-flex items-center gap-1 font-semibold text-white hover:underline"
            >
              <Phone className="size-3.5" /> {p.cliente.telefono}
            </a>
          )}
        </p>
      </div>

      <section className="px-5 py-4">
        <h3 className="mb-2 text-small font-semibold text-ink-muted">Estado</h3>
        <SegmentedControl
          ariaLabel="Cambiar estado"
          options={OPCIONES_ESTADO}
          value={p.estado as EstadoEditable}
          onChange={cambiarEstado}
          className="w-full"
        />
        <p className="mt-2 flex items-center gap-1.5 text-small text-ink-muted">
          {cambiando && <LoaderCircle className="size-3.5 animate-spin" />}
          {p.estado === "listo"
            ? "El mostrador lo ve en su lista para entregar."
            : "Al marcar Listo, le aparece al mostrador para avisar al cliente."}
        </p>
      </section>

      {p.tipo === "servicio" && (
        <section className="border-t border-gray-200 px-5 py-4">
          <h3 className="mb-1 text-small font-semibold text-ink-muted">Falla reportada</h3>
          <p className="text-body">{p.falla}</p>
        </section>
      )}

      <section className="border-t border-gray-200">
        <div className="flex items-center justify-between gap-2 px-5 pt-4">
          <h3 className="text-small font-semibold text-ink-muted">Cuánto cobrar</h3>
          {p.cobro && !editandoCobro && (
            <button
              type="button"
              onClick={() => setEditandoCobro(true)}
              className="inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-small font-semibold text-navy-900 hover:bg-gray-100"
            >
              <Pencil className="size-3.5" /> Cambiar
            </button>
          )}
        </div>
        {p.pagoEntrada && (
          <p className="px-5 pt-1 text-small text-ink-muted">
            En mostrador: {ETIQUETA_PAGO[p.pagoEntrada.estado]}
            {p.pagoEntrada.estado === "anticipo" && p.pagoEntrada.anticipo
              ? ` de ${formatQ(p.pagoEntrada.anticipo)}`
              : ""}
          </p>
        )}
        {editandoCobro ? (
          <FormCobro
            proceso={p}
            onListo={() => {
              setEditandoCobro(false);
              onCambio();
            }}
            onCancelar={p.cobro ? () => setEditandoCobro(false) : undefined}
          />
        ) : (
          <div className="[&>*]:border-t-0 [&>*]:pt-2">
            <DetalleCobro proceso={p} />
          </div>
        )}
      </section>

      <Notas proceso={p} onCambio={onCambio} />
    </Card>
  );
}

function FormCobro({
  proceso: p,
  onListo,
  onCancelar,
}: {
  proceso: EnProceso;
  onListo: () => void;
  onCancelar?: () => void;
}) {
  const toast = useToast();
  const manejarError = useErrorApi();
  const [total, setTotal] = useState(p.cobro ? String(p.cobro.total) : "");
  const [detalle, setDetalle] = useState(p.cobro?.detalle ?? "");
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  // Vista previa de lo que quedará por cobrar (el servidor lo vuelve a calcular).
  const ya =
    p.pagoEntrada?.estado === "cancelado"
      ? Number(total) || 0
      : p.pagoEntrada?.estado === "anticipo"
        ? (p.pagoEntrada.anticipo ?? 0)
        : (p.cobro?.anticipo ?? 0);
  const numero = Number(total);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(numero) || numero <= 0) return setError("Escribe cuánto cobrar");
    setGuardando(true);
    try {
      await postApi(`/api/procesos/${encodeURIComponent(p.id)}/cobro`, {
        total: numero,
        detalle: detalle.trim() || undefined,
      });
      toast("Precio guardado: el mostrador ya sabe cuánto cobrar", "success");
      onListo();
    } catch (err) {
      // Errores de validación o de regla (ej. "ya dejó Q 25") van junto al campo.
      if (err instanceof ErrorApi && (err.status === 400 || err.status === 409))
        setError(err.message);
      else manejarError(err);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-3 px-5 pt-3 pb-4">
      {!p.cobro && (
        <p className="rounded-md bg-stock-low-bg px-3 py-2 text-small text-stock-low-text">
          Todavía no tiene precio: el mostrador no sabe cuánto cobrar.
        </p>
      )}
      <div className="grid grid-cols-[140px_1fr] gap-2">
        <Field label="Total (Q)" error={error}>
          {(fid, desc) => (
            <Input
              id={fid}
              aria-describedby={desc}
              inputMode="decimal"
              placeholder="0.00"
              value={total}
              onChange={(e) => {
                setTotal(e.target.value.replace(/[^\d.]/g, ""));
                setError(undefined);
              }}
            />
          )}
        </Field>
        <Field label="Detalle (opcional)">
          {(fid) => (
            <Input
              id={fid}
              maxLength={80}
              placeholder="Ej. Incluye boleta"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
            />
          )}
        </Field>
      </div>
      {numero > 0 && ya > 0 && (
        <p className="text-small text-ink-muted">
          Ya dejó {formatQ(Math.min(ya, numero))} · cobrar al entregar{" "}
          <strong className="text-ink-strong tabular">{formatQ(Math.max(0, numero - ya))}</strong>
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancelar && (
          <Button type="button" variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={guardando}>
          {guardando && <LoaderCircle className="animate-spin" />}
          Guardar precio
        </Button>
      </div>
    </form>
  );
}

function Notas({ proceso: p, onCambio }: { proceso: EnProceso; onCambio: () => void }) {
  const manejarError = useErrorApi();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    if (texto.trim().length < 2) return setError("Escribe la nota");
    setGuardando(true);
    try {
      await postApi(`/api/procesos/${encodeURIComponent(p.id)}/notas`, { texto });
      setTexto("");
      onCambio();
    } catch (err) {
      // Errores de validación o de regla (ej. "ya dejó Q 25") van junto al campo.
      if (err instanceof ErrorApi && (err.status === 400 || err.status === 409))
        setError(err.message);
      else manejarError(err);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="border-t border-gray-200 px-5 py-4">
      <h3 className="mb-2 text-small font-semibold text-ink-muted">Notas para el mostrador</h3>
      {p.notas.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {p.notas.map((n) => (
            <li
              key={`${n.fecha}-${n.texto}`}
              className="rounded-md border border-gold-200 bg-gold-100 px-3 py-2"
            >
              <p className="text-body text-gold-text">{n.texto}</p>
              <p className="mt-0.5 text-badge text-gold-text/80">
                {n.autor} · {formatFechaHora(n.fecha)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={agregar} noValidate className="flex flex-col gap-2">
        <Field label="Nueva nota" error={error}>
          {(fid, desc) => (
            <Textarea
              id={fid}
              aria-describedby={desc}
              rows={2}
              maxLength={300}
              placeholder="Ej. Falta confirmar correo de SAT"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setError(undefined);
              }}
            />
          )}
        </Field>
        <Button type="submit" variant="outline" disabled={guardando} className="self-end">
          {guardando ? <LoaderCircle className="animate-spin" /> : <Send />} Agregar nota
        </Button>
      </form>
    </section>
  );
}
