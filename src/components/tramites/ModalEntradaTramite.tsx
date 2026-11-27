"use client";

import { useMemo, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  SegmentedControl,
  Select,
  SubirArchivos,
  TelefonoInput,
  Textarea,
  useToast,
} from "@/components/ui";
import { formatPrecio, formatQ } from "@/lib/format";
import { useErrorApi } from "@/hooks/useErrorApi";
import { postApi } from "@/lib/http";
import { entradaTramiteSchema } from "@/schemas/entrada.schema";
import { ETIQUETA_PAGO, type EstadoPago } from "@/types/entrada";
import type { ModuloTramite, Tramite } from "@/types/tramite";

interface ModalEntradaTramiteProps {
  modulos: ModuloTramite[];
  tramites: Tramite[];
  /** Trámite ya elegido si se abrió desde una tarjeta. */
  tramiteInicial?: string;
  onClose: () => void;
}

const CAMPOS = ["nombre", "telefono", "tramiteId", "estado", "anticipo"] as const;
type Errores = Partial<Record<(typeof CAMPOS)[number], string>>;

/** Pantalla 9: el Empleado registra el trámite que dejó un cliente. Se notifica a Paola. */
export function ModalEntradaTramite({
  modulos,
  tramites,
  tramiteInicial,
  onClose,
}: ModalEntradaTramiteProps) {
  const toast = useToast();
  const manejarError = useErrorApi();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tramiteId, setTramiteId] = useState(tramiteInicial ?? "");
  const [entregados, setEntregados] = useState<Set<string>>(new Set());
  const [notas, setNotas] = useState("");
  const [datosCliente, setDatosCliente] = useState("");
  const [estadoPago, setEstadoPago] = useState<EstadoPago | "">("");
  const [anticipo, setAnticipo] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  /** Al corregir un campo, su mensaje de error desaparece. */
  const limpiar = (campo: keyof Errores) => setErrores((e) => ({ ...e, [campo]: undefined }));

  const tramite = useMemo(() => tramites.find((t) => t.id === tramiteId), [tramites, tramiteId]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const datos = entradaTramiteSchema.safeParse({
      cliente: { nombre, telefono },
      tramiteId,
      documentos: (tramite?.requisitos ?? []).map((r) => ({
        nombre: r,
        entregado: entregados.has(r),
      })),
      pago: {
        estado: estadoPago || undefined,
        anticipo: estadoPago === "anticipo" && anticipo ? Number(anticipo) : undefined,
      },
      datosCliente: datosCliente || undefined,
      notas: notas || undefined,
    });
    if (!datos.success) {
      const err: Errores = {};
      for (const i of datos.error.issues) {
        const campo = i.path.at(-1);
        if (typeof campo === "string" && CAMPOS.includes(campo as keyof Errores)) {
          err[campo as keyof Errores] ??= i.message;
        } else {
          toast(i.message, "danger"); // nunca dejar un error sin mostrar
        }
      }
      return setErrores(err);
    }
    setErrores({});
    setEnviando(true);
    try {
      // multipart: los datos van como JSON y los archivos aparte.
      const form = new FormData();
      form.append("datos", JSON.stringify(datos.data));
      for (const a of archivos) form.append("archivos", a);
      await postApi("/api/entradas/tramite", form);
      toast(`Entrada enviada a Paola: ${tramite?.nombre}`, "success");
      onClose();
    } catch (err) {
      manejarError(err);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Enviar entrada de trámite"
      subtitle="Se notificará a Paola"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-entrada-tramite" disabled={enviando}>
            {enviando && <LoaderCircle className="animate-spin" />}
            Enviar a Paola
          </Button>
        </>
      }
    >
      <form id="form-entrada-tramite" onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del cliente" error={errores.nombre}>
            {(id, desc) => (
              <Input
                id={id}
                autoFocus
                maxLength={100}
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  limpiar("nombre");
                }}
                invalid={!!errores.nombre}
                aria-describedby={desc}
              />
            )}
          </Field>
          <Field label="Teléfono (opcional)" error={errores.telefono}>
            {(id, desc) => (
              <TelefonoInput
                id={id}
                value={telefono}
                onChange={(v) => {
                  setTelefono(v);
                  limpiar("telefono");
                }}
                invalid={!!errores.telefono}
                aria-describedby={desc}
              />
            )}
          </Field>
        </div>

        <Field label="Tipo de trámite" error={errores.tramiteId}>
          {(id, desc) => (
            <Select
              id={id}
              value={tramiteId}
              onChange={(e) => {
                setTramiteId(e.target.value);
                setEntregados(new Set());
                limpiar("tramiteId");
              }}
              invalid={!!errores.tramiteId}
              aria-describedby={desc}
            >
              <option value="" disabled>
                Elige un trámite…
              </option>
              {modulos.map((m) => (
                <optgroup key={m.id} label={m.nombre}>
                  {tramites
                    .filter((t) => t.moduloId === m.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {m.nombre} · {t.nombre}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          )}
        </Field>

        {tramite && tramite.requisitos.length > 0 && (
          <fieldset className="rounded-md border border-gray-200 p-3">
            <legend className="px-1 text-small font-medium text-ink">
              Documentos o requisitos que dejó
            </legend>
            <div className="flex flex-col gap-2">
              {tramite.requisitos.map((r) => (
                <Checkbox
                  key={r}
                  label={r}
                  checked={entregados.has(r)}
                  onChange={(v) =>
                    setEntregados((prev) => {
                      const s = new Set(prev);
                      if (v) s.add(r);
                      else s.delete(r);
                      return s;
                    })
                  }
                />
              ))}
            </div>
          </fieldset>
        )}

        {tramite && (
          <p className="-mt-2 text-small text-ink-muted">
            Precio del trámite:{" "}
            <span className="font-semibold text-ink-strong">{formatPrecio(tramite.precio)}</span>
            {tramite.precio.nota && ` · ${tramite.precio.nota}`}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <span id="pago-label" className="text-small font-medium text-ink">
            Pago
          </span>
          <SegmentedControl
            ariaLabel="Pago"
            value={estadoPago}
            onChange={(v) => {
              setEstadoPago(v);
              limpiar("estado");
              limpiar("anticipo");
            }}
            options={(["cancelado", "pendiente", "anticipo"] as const).map((e) => ({
              value: e,
              label: ETIQUETA_PAGO[e],
            }))}
            className="w-full"
          />
          {errores.estado && <p className="text-small text-stock-out">{errores.estado}</p>}
        </div>

        {estadoPago === "anticipo" && (
          <div className="flex flex-wrap items-start gap-4">
            <Field label="¿Cuánto dejó de anticipo?" error={errores.anticipo} className="w-48">
              {(id, desc) => (
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body text-ink-muted">
                    Q
                  </span>
                  <Input
                    id={id}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={anticipo}
                    onChange={(e) => {
                      // Solo números con hasta 2 decimales.
                      const v = e.target.value.replace(",", ".");
                      if (/^\d{0,6}(\.\d{0,2})?$/.test(v)) setAnticipo(v);
                      limpiar("anticipo");
                    }}
                    invalid={!!errores.anticipo}
                    aria-describedby={desc}
                    className="pl-7 tabular"
                  />
                </div>
              )}
            </Field>
            {tramite?.precio.monto != null &&
              tramite.precio.montoMax === undefined &&
              Number(anticipo) > 0 && (
                <p className="mt-7 text-small text-ink-muted">
                  Saldo pendiente:{" "}
                  <span className="font-semibold text-ink-strong tabular">
                    {formatQ(Math.max(0, tramite.precio.monto - Number(anticipo)))}
                  </span>
                </p>
              )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-ink">Archivos (opcional)</span>
          <SubirArchivos archivos={archivos} onChange={setArchivos} />
        </div>

        <Field label="Datos del cliente (opcional)" hint="Solo Paola puede ver estos datos.">
          {(id, desc) => (
            <Textarea
              id={id}
              maxLength={1000}
              aria-describedby={desc}
              placeholder={
                "Ej. Correo: ana@gmail.com\nNIT: 1234567-8\nUsuario y contraseña de agencia virtual"
              }
              value={datosCliente}
              onChange={(e) => setDatosCliente(e.target.value)}
            />
          )}
        </Field>

        <Field label="Notas (opcional)">
          {(id) => (
            <Textarea
              id={id}
              maxLength={500}
              placeholder="Ej. Viene a recoger el viernes"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
