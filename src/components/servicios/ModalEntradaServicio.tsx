"use client";

import { useState, type FormEvent } from "react";
import { Info, LoaderCircle } from "lucide-react";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  Select,
  TelefonoInput,
  Textarea,
  useToast,
} from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { postApi } from "@/lib/http";
import { cn } from "@/lib/cn";
import { formatQ } from "@/lib/format";
import { cobroDeServicio } from "@/lib/reglas/procesos";
import { entradaServicioSchema } from "@/schemas/entrada.schema";
import { TIPOS_EQUIPO, type ServicioTecnico, type TipoEquipo } from "@/types/servicio";

/** Accesorios más comunes; lo demás se escribe en "Otros accesorios". */
const ACCESORIOS_COMUNES = ["Cargador", "Estuche", "Mouse", "Cable USB", "Memoria / SD", "Caja"];

const CAMPOS = ["nombre", "telefono", "equipo", "falla", "opcionId"] as const;
type Errores = Partial<Record<(typeof CAMPOS)[number], string>>;

/** Variante de la pantalla 9: el Empleado registra un equipo que dejó un cliente. Se notifica a Oscar. */
export function ModalEntradaServicio({
  servicios,
  servicioInicialId,
  onClose,
}: {
  servicios: ServicioTecnico[];
  servicioInicialId?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const manejarError = useErrorApi();
  const [servicioId, setServicioId] = useState(servicioInicialId ?? "");
  const [opcionId, setOpcionId] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [equipo, setEquipo] = useState<TipoEquipo | "">("");
  const [marcaModelo, setMarcaModelo] = useState("");
  const inicial = servicios.find((x) => x.id === servicioInicialId);
  const [falla, setFalla] = useState(inicial ? `${inicial.nombre}. ` : "");
  const [accesorios, setAccesorios] = useState<Set<string>>(new Set());
  const [otros, setOtros] = useState("");
  const [notas, setNotas] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  /** Al corregir un campo, su mensaje de error desaparece. */
  const limpiar = (campo: keyof Errores) => setErrores((e) => ({ ...e, [campo]: undefined }));

  const servicio = servicios.find((x) => x.id === servicioId);
  // Vista previa del precio; el servidor lo vuelve a calcular con el catálogo.
  let cobro: ReturnType<typeof cobroDeServicio>;
  try {
    cobro = servicio ? cobroDeServicio(servicio, opcionId || undefined) : undefined;
  } catch {
    cobro = undefined; // falta elegir la opción
  }

  function elegirServicio(id: string) {
    const anterior = servicios.find((x) => x.id === servicioId);
    const nuevo = servicios.find((x) => x.id === id);
    setServicioId(id);
    setOpcionId("");
    limpiar("opcionId");
    // Si la falla solo tenía el nombre del servicio anterior, se cambia por el nuevo.
    if (!falla.trim() || (anterior && falla.trim() === `${anterior.nombre}.`)) {
      setFalla(nuevo ? `${nuevo.nombre}. ` : "");
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (servicio?.opciones?.length && !opcionId) {
      return setErrores({ opcionId: `Elige una opción de ${servicio.nombre}` });
    }
    const datos = entradaServicioSchema.safeParse({
      servicioId: servicioId || undefined,
      opcionId: opcionId || undefined,
      cliente: { nombre, telefono },
      equipo: equipo || undefined,
      marcaModelo: marcaModelo || undefined,
      falla,
      accesorios: [
        ...accesorios,
        ...otros
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      ],
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
      await postApi("/api/entradas/servicio", datos.data);
      toast(
        `Entrada enviada a Oscar: ${datos.data.equipo} de ${datos.data.cliente.nombre}`,
        "success",
      );
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
      title="Enviar entrada de servicio técnico"
      subtitle="Se notificará a Oscar"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-entrada-servicio" disabled={enviando}>
            {enviando && <LoaderCircle className="animate-spin" />}
            Enviar a Oscar
          </Button>
        </>
      }
    >
      <form
        id="form-entrada-servicio"
        onSubmit={enviar}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Servicio que pide" className="sm:col-span-2">
          {(id) => (
            <Select id={id} value={servicioId} onChange={(e) => elegirServicio(e.target.value)}>
              <option value="">Revisar falla (Oscar dice cuánto cobrar)</option>
              {servicios.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {servicio?.opciones?.length ? (
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-small font-medium text-ink">Opción</legend>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
              {servicio.opciones.map((o) => {
                const activa = o.id === opcionId;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={activa}
                    onClick={() => {
                      setOpcionId(o.id);
                      limpiar("opcionId");
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors",
                      activa
                        ? "border-navy-900 bg-navy-900 text-white"
                        : "border-gray-300 bg-white text-ink-strong hover:border-navy-900",
                    )}
                  >
                    <span className="text-body font-medium">{o.nombre}</span>
                    <span className="text-body font-semibold tabular">{formatQ(o.precio)}</span>
                  </button>
                );
              })}
            </div>
            {errores.opcionId && (
              <p role="alert" className="mt-1 text-small text-stock-out">
                {errores.opcionId}
              </p>
            )}
          </fieldset>
        ) : null}
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-small sm:col-span-2",
            cobro ? "bg-stock-ok-bg text-stock-ok-text" : "bg-gray-100 text-ink-muted",
          )}
        >
          <Info className="size-4 shrink-0" />
          {cobro ? (
            <span>
              Precio: <strong className="tabular">{formatQ(cobro.total)}</strong>
              {servicio?.opciones?.length ? ` (${cobro.detalle})` : ""}
            </span>
          ) : servicio?.opciones?.length ? (
            <span>Elige una opción para ver el precio.</span>
          ) : (
            <span>Sin precio fijo: Oscar dirá cuánto cobrar después de revisar el equipo.</span>
          )}
        </div>
        <Field label="Cliente" error={errores.nombre}>
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
        <Field label="Tipo de equipo" error={errores.equipo}>
          {(id, desc) => (
            <Select
              id={id}
              value={equipo}
              onChange={(e) => {
                setEquipo(e.target.value as TipoEquipo);
                limpiar("equipo");
              }}
              invalid={!!errores.equipo}
              aria-describedby={desc}
            >
              <option value="" disabled>
                Elige el equipo…
              </option>
              {TIPOS_EQUIPO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Marca y modelo (opcional)">
          {(id) => (
            <Input
              id={id}
              maxLength={80}
              placeholder="Ej. HP 240 G8"
              value={marcaModelo}
              onChange={(e) => setMarcaModelo(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Falla reportada o servicio que pide"
          error={errores.falla}
          className="sm:col-span-2"
        >
          {(id, desc) => (
            <Textarea
              id={id}
              maxLength={500}
              placeholder="Ej. No enciende, se calienta, instalar aplicaciones…"
              value={falla}
              onChange={(e) => {
                setFalla(e.target.value);
                limpiar("falla");
              }}
              invalid={!!errores.falla}
              aria-describedby={desc}
            />
          )}
        </Field>
        <fieldset className="rounded-md border border-gray-200 p-3 sm:col-span-2">
          <legend className="px-1 text-small font-medium text-ink">Accesorios que dejó</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACCESORIOS_COMUNES.map((a) => (
              <Checkbox
                key={a}
                label={a}
                checked={accesorios.has(a)}
                onChange={(v) =>
                  setAccesorios((prev) => {
                    const s = new Set(prev);
                    if (v) s.add(a);
                    else s.delete(a);
                    return s;
                  })
                }
              />
            ))}
          </div>
          <Input
            aria-label="Otros accesorios"
            placeholder="Otros accesorios, separados por coma"
            maxLength={200}
            value={otros}
            onChange={(e) => setOtros(e.target.value)}
            className="mt-3"
          />
        </fieldset>
        <Field label="Notas (opcional)" className="sm:col-span-2">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              maxLength={500}
              placeholder="Ej. Tiene contraseña: la dejó anotada en el sobre"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
