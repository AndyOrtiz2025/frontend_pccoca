"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  Textarea,
  TelefonoInput,
  useToast,
} from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { ErrorApi, pedirApi } from "@/lib/http";
import { proveedorSchema } from "@/schemas/proveedor.schema";
import { ETIQUETA_CATEGORIA, type Categoria } from "@/types/producto";
import { DIAS_SEMANA, type Proveedor } from "@/types/proveedor";

type Errores = Record<string, string | undefined>;
/** Lunes a sábado primero (el domingo casi nunca pasan). */
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

/** Nuevo / Editar proveedor (pantallas 17 y 18). */
export function ModalProveedor({
  proveedor,
  categorias,
  onClose,
  onCreado,
}: {
  proveedor: Proveedor | null;
  /** Lo que puede surtir según quién lo crea (Paola: Librería y Varios). */
  categorias: Categoria[];
  onClose: () => void;
  onCreado?: (id: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const p = proveedor;
  const [nombre, setNombre] = useState(p?.nombre ?? "");
  const [nit, setNit] = useState(p?.nit ?? "");
  const [contacto, setContacto] = useState(p?.contacto ?? "");
  const [telefono, setTelefono] = useState(p?.telefono ?? "");
  const [correo, setCorreo] = useState(p?.correo ?? "");
  const [direccion, setDireccion] = useState(p?.direccion ?? "");
  const [dias, setDias] = useState<number[]>(p?.diasVisita ?? []);
  const [surte, setSurte] = useState<Categoria[]>(p?.surte ?? [categorias[0]!]);
  const [notas, setNotas] = useState(p?.notas ?? "");
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  // Si ya surte una categoría que no es de quien edita (ej. Tecnología), se conserva.
  const opciones = [...new Set([...categorias, ...(p?.surte ?? [])])];

  const limpiar = (k: string) => setErrores((e) => ({ ...e, [k]: undefined }));
  const alternarDia = (d: number) =>
    setDias((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort()));
  const alternarSurte = (c: Categoria) =>
    setSurte((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const datos = {
      nombre,
      nit,
      contacto,
      telefono,
      correo,
      direccion,
      diasVisita: dias.length ? dias : undefined,
      surte,
      notas,
    };
    const r = proveedorSchema.safeParse(datos);
    if (!r.success) {
      const nuevos: Errores = {};
      for (const i of r.error.issues) nuevos[String(i.path[0])] ??= i.message;
      return setErrores(nuevos);
    }
    setGuardando(true);
    try {
      if (p) {
        await pedirApi("PATCH", `/api/proveedores/${encodeURIComponent(p.id)}`, datos);
        toast("Proveedor actualizado", "success");
      } else {
        const { id } = await pedirApi<{ id: string }>("POST", "/api/proveedores", datos);
        toast(`${r.data.nombre} agregado`, "success");
        onCreado?.(id);
      }
      onClose();
      router.refresh();
    } catch (err) {
      if (err instanceof ErrorApi && (err.status === 400 || err.status === 409)) {
        setErrores({ general: err.message });
      } else manejarError(err);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={p ? "Editar proveedor" : "Nuevo proveedor"}
      subtitle={p?.nombre ?? "Distribuidora o mayorista que nos vende"}
      size="lg"
      variante="destacado"
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
          <Button type="submit" form="form-proveedor" disabled={guardando}>
            {guardando ? <LoaderCircle className="animate-spin" /> : <Save />}
            {p ? "Guardar cambios" : "Agregar proveedor"}
          </Button>
        </>
      }
    >
      <form id="form-proveedor" onSubmit={guardar} noValidate className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre" error={errores.nombre} className="md:col-span-2">
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              autoFocus={!p}
              maxLength={80}
              placeholder="Ej. Distribuidora El Sol"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                limpiar("nombre");
              }}
            />
          )}
        </Field>
        <Field label="NIT (opcional)" error={errores.nit}>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              maxLength={15}
              placeholder="Ej. 4492019-2"
              value={nit}
              onChange={(e) => {
                setNit(e.target.value.toUpperCase().replace(/[^0-9K-]/g, ""));
                limpiar("nit");
              }}
            />
          )}
        </Field>
        <Field label="Persona de contacto (opcional)" error={errores.contacto}>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              maxLength={80}
              placeholder="Ej. Rigoberto Morales"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
            />
          )}
        </Field>
        <Field label="Teléfono (opcional)" error={errores.telefono}>
          {(id, d) => (
            <TelefonoInput
              id={id}
              aria-describedby={d}
              value={telefono}
              onChange={(v) => {
                setTelefono(v);
                limpiar("telefono");
              }}
            />
          )}
        </Field>
        <Field label="Correo (opcional)" error={errores.correo}>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              type="email"
              maxLength={120}
              placeholder="ventas@proveedor.com"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value.trim());
                limpiar("correo");
              }}
            />
          )}
        </Field>
        <Field label="Dirección (opcional)" error={errores.direccion} className="md:col-span-2">
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              maxLength={160}
              placeholder="Ej. 4a. calle 3-20, zona 1, Huehuetenango"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          )}
        </Field>

        <fieldset className="md:col-span-2">
          <legend className="mb-1.5 text-small font-medium text-ink">¿Qué nos surte?</legend>
          <div className="flex flex-wrap gap-4">
            {opciones.map((c) => (
              <Checkbox
                key={c}
                label={ETIQUETA_CATEGORIA[c]}
                checked={surte.includes(c)}
                onChange={() => {
                  alternarSurte(c);
                  limpiar("surte");
                }}
              />
            ))}
          </div>
          {errores.surte && (
            <p role="alert" className="mt-1 text-small text-stock-out">
              {errores.surte}
            </p>
          )}
        </fieldset>

        <fieldset className="md:col-span-2">
          <legend className="mb-1.5 text-small font-medium text-ink">
            ¿Qué días pasa? <span className="font-normal text-ink-muted">(opcional)</span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {ORDEN_DIAS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dias.includes(d)}
                onClick={() => alternarDia(d)}
                className={cn(
                  "rounded-full border px-3 py-1 text-small transition-colors",
                  dias.includes(d)
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-gray-300 text-ink hover:border-navy-900",
                )}
              >
                {DIAS_SEMANA[d]}
              </button>
            ))}
          </div>
        </fieldset>

        <Field label="Notas (opcional)" error={errores.notas} className="md:col-span-2">
          {(id, d) => (
            <Textarea
              id={id}
              aria-describedby={d}
              rows={2}
              maxLength={300}
              placeholder="Ej. Pedidos por WhatsApp antes del lunes"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
