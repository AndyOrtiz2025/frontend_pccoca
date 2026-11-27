"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Button,
  Field,
  Input,
  Modal,
  SegmentedControl,
  TelefonoInput,
  Textarea,
  useToast,
} from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { pedirApi, postApi } from "@/lib/http";
import { cuentaSchema } from "@/schemas/pendiente.schema";
import type { CuentaPendiente, GrupoPendiente } from "@/types/pendiente";

const CAMPOS = ["nombre", "grupo", "telefono", "notas"] as const;
type Errores = Partial<Record<(typeof CAMPOS)[number], string>>;

interface ModalCuentaProps {
  /** Si viene, se edita esa cuenta; si no, se crea una nueva. */
  cuenta?: CuentaPendiente;
  grupoInicial?: GrupoPendiente;
  onClose: () => void;
}

/** Nuevo cliente u organización, o editar sus datos. */
export function ModalCuenta({ cuenta, grupoInicial = "individual", onClose }: ModalCuentaProps) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [grupo, setGrupo] = useState<GrupoPendiente>(cuenta?.grupo ?? grupoInicial);
  const [nombre, setNombre] = useState(cuenta?.nombre ?? "");
  const [telefono, setTelefono] = useState(cuenta?.telefono ?? "");
  const [notas, setNotas] = useState(cuenta?.notas ?? "");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const esOrg = grupo === "organizacion";

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const datos = cuentaSchema.safeParse({ nombre, grupo, telefono, notas: notas || undefined });
    if (!datos.success) {
      const err: Errores = {};
      for (const i of datos.error.issues) {
        const c = i.path.at(-1);
        if (typeof c === "string" && CAMPOS.includes(c as keyof Errores))
          err[c as keyof Errores] ??= i.message;
        else toast(i.message, "danger");
      }
      return setErrores(err);
    }
    setEnviando(true);
    try {
      if (cuenta) {
        await pedirApi("PATCH", `/api/cuentas/${encodeURIComponent(cuenta.id)}`, datos.data);
        toast("Datos actualizados", "success");
        onClose();
        router.refresh();
      } else {
        const r = await postApi<{ cuenta: CuentaPendiente }>("/api/cuentas", datos.data);
        toast(`${r.cuenta.nombre} agregado`, "success");
        onClose();
        router.push(`/empleado/pendientes/${r.cuenta.id}`);
      }
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
      title={cuenta ? "Editar datos" : "Nuevo cliente"}
      subtitle={cuenta ? undefined : "Luego le agregas lo que se lleva fiado"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-cuenta" disabled={enviando}>
            {enviando && <LoaderCircle className="animate-spin" />}
            {cuenta ? "Guardar" : "Agregar"}
          </Button>
        </>
      }
    >
      <form id="form-cuenta" onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <SegmentedControl
          ariaLabel="Tipo de cliente"
          value={grupo}
          onChange={setGrupo}
          options={[
            { value: "individual", label: "Cliente individual" },
            { value: "organizacion", label: "Organización" },
          ]}
          className="w-full"
        />
        <Field
          label={esOrg ? "Nombre de la organización" : "Nombre del cliente"}
          error={errores.nombre}
        >
          {(id, desc) => (
            <Input
              id={id}
              autoFocus
              maxLength={100}
              placeholder={esOrg ? "Ej. Centro Estudiantil" : "Ej. Rosa Méndez"}
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setErrores((x) => ({ ...x, nombre: undefined }));
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
                setErrores((x) => ({ ...x, telefono: undefined }));
              }}
              invalid={!!errores.telefono}
              aria-describedby={desc}
            />
          )}
        </Field>
        <Field label="Notas de la cuenta (opcional)" error={errores.notas}>
          {(id, desc) => (
            <Textarea
              id={id}
              maxLength={500}
              placeholder={
                esOrg
                  ? "Ej. Solo los directivos pueden llevar al crédito"
                  : "Ej. Paga cada fin de mes"
              }
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              aria-describedby={desc}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
