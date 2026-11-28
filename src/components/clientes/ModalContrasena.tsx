"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Save } from "lucide-react";
import { Button, Combobox, Field, Input, Modal, Textarea, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { ErrorApi, pedirApi } from "@/lib/http";
import { LIMITES_CLIENTE } from "@/lib/reglas/clientes";
import { contrasenaClienteSchema, editarContrasenaSchema } from "@/schemas/cliente.schema";
import type { ContrasenaVista } from "@/types/cliente";

type Errores = Partial<Record<"servicio" | "usuario" | "contrasena" | "nota" | "general", string>>;

/** "+ Agregar contraseña" o editarla (cuando la cambian o se pierde). */
export function ModalContrasena({
  clienteId,
  contrasena: actual,
  sugerencias,
  onClose,
}: {
  clienteId: string;
  contrasena: ContrasenaVista | null;
  sugerencias: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [servicio, setServicio] = useState(actual?.servicio ?? "");
  const [usuario, setUsuario] = useState(actual?.usuario ?? "");
  const [contrasena, setContrasena] = useState("");
  const [nota, setNota] = useState(actual?.nota ?? "");
  const [visible, setVisible] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const datos = { servicio, usuario, contrasena, nota };
    const r = (actual ? editarContrasenaSchema : contrasenaClienteSchema).safeParse(datos);
    if (!r.success) {
      const nuevos: Errores = {};
      for (const i of r.error.issues) nuevos[String(i.path[0]) as keyof Errores] ??= i.message;
      return setErrores(nuevos);
    }
    setGuardando(true);
    try {
      const base = `/api/clientes/${encodeURIComponent(clienteId)}/contrasenas`;
      if (actual) await pedirApi("PATCH", `${base}/${encodeURIComponent(actual.id)}`, datos);
      else await pedirApi("POST", base, datos);
      toast(actual ? "Contraseña actualizada" : "Contraseña guardada", "success");
      onClose();
      router.refresh();
    } catch (err) {
      if (err instanceof ErrorApi && (err.status === 400 || err.status === 409))
        setErrores({ general: err.message });
      else manejarError(err);
    } finally {
      setGuardando(false);
    }
  }

  const limpiar = (k: keyof Errores) => setErrores((e) => ({ ...e, [k]: undefined }));

  return (
    <Modal
      open
      onClose={onClose}
      title={actual ? "Editar contraseña" : "Agregar contraseña"}
      subtitle={actual?.servicio ?? "De cualquier cuenta del cliente"}
      size="sm"
      footer={
        <>
          {errores.general && (
            <p role="alert" className="mr-auto text-small text-stock-out">
              {errores.general}
            </p>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-contrasena" disabled={guardando}>
            {guardando ? <LoaderCircle className="animate-spin" /> : <Save />}
            Guardar
          </Button>
        </>
      }
    >
      <form id="form-contrasena" onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <Field label="¿De qué es?" error={errores.servicio}>
          {(id, d) => (
            <Combobox
              id={id}
              aria-describedby={d}
              opciones={sugerencias}
              maxLength={LIMITES_CLIENTE.servicio}
              placeholder="Ej. Agencia Virtual SAT"
              value={servicio}
              onChange={(v) => {
                setServicio(v);
                limpiar("servicio");
              }}
            />
          )}
        </Field>
        <Field label="Usuario o correo (opcional)" error={errores.usuario}>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              autoComplete="off"
              maxLength={LIMITES_CLIENTE.usuario}
              value={usuario}
              onChange={(e) => {
                setUsuario(e.target.value);
                limpiar("usuario");
              }}
            />
          )}
        </Field>
        <Field
          label={actual ? "Nueva contraseña" : "Contraseña"}
          error={errores.contrasena}
          hint={
            actual
              ? "Déjala vacía para conservar la que tiene"
              : `Máximo ${LIMITES_CLIENTE.contrasena} caracteres`
          }
        >
          {(id, d) => (
            <div className="relative">
              <Input
                id={id}
                aria-describedby={d}
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                maxLength={LIMITES_CLIENTE.contrasena}
                className="pr-10"
                value={contrasena}
                onChange={(e) => {
                  setContrasena(e.target.value);
                  limpiar("contrasena");
                }}
              />
              <button
                type="button"
                aria-label={visible ? "Ocultar lo escrito" : "Ver lo escrito"}
                onClick={() => setVisible((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-ink-muted hover:text-navy-900"
              >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}
        </Field>
        <Field label="Nota (opcional)" error={errores.nota}>
          {(id, d) => (
            <Textarea
              id={id}
              aria-describedby={d}
              rows={2}
              maxLength={200}
              placeholder="Ej. La recuperación llega a su teléfono"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
