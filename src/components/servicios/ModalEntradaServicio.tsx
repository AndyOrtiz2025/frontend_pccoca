"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
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
import { entradaServicioSchema } from "@/schemas/entrada.schema";
import { TIPOS_EQUIPO, type TipoEquipo } from "@/types/servicio";

/** Accesorios más comunes; lo demás se escribe en "Otros accesorios". */
const ACCESORIOS_COMUNES = ["Cargador", "Estuche", "Mouse", "Cable USB", "Memoria / SD", "Caja"];

const CAMPOS = ["nombre", "telefono", "equipo", "falla"] as const;
type Errores = Partial<Record<(typeof CAMPOS)[number], string>>;

/** Variante de la pantalla 9: el Empleado registra un equipo que dejó un cliente. Se notifica a Oscar. */
export function ModalEntradaServicio({
  servicioInicial,
  onClose,
}: {
  servicioInicial?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const manejarError = useErrorApi();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [equipo, setEquipo] = useState<TipoEquipo | "">("");
  const [marcaModelo, setMarcaModelo] = useState("");
  const [falla, setFalla] = useState(servicioInicial ? `${servicioInicial}. ` : "");
  const [accesorios, setAccesorios] = useState<Set<string>>(new Set());
  const [otros, setOtros] = useState("");
  const [notas, setNotas] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  /** Al corregir un campo, su mensaje de error desaparece. */
  const limpiar = (campo: keyof Errores) => setErrores((e) => ({ ...e, [campo]: undefined }));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const datos = entradaServicioSchema.safeParse({
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
