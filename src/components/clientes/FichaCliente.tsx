"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button, Card, Chip, Confirmar, SubirArchivos, Textarea, useToast } from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { ErrorApi, pedirApi, postApi } from "@/lib/http";
import { LIMITES_CLIENTE } from "@/lib/reglas/clientes";
import { notaClienteSchema } from "@/schemas/cliente.schema";
import type { ClienteVista, ContrasenaVista, DatoCliente } from "@/types/cliente";
import { iniciales } from "./ListaClientes";
import { ModalContrasena } from "./ModalContrasena";
import { ModalDato } from "./ModalDato";
import { ModalNombreCliente } from "./ModalNombreCliente";

/** La contraseña mostrada se vuelve a tapar sola después de este tiempo. */
const TAPAR_EN_MS = 30_000;

type Quitar =
  | { tipo: "dato"; id: string; nombre: string }
  | { tipo: "contrasena"; id: string; nombre: string }
  | { tipo: "archivo"; id: string; nombre: string }
  | { tipo: "nota"; id: string; nombre: string };

const RUTA_QUITAR = {
  dato: "datos",
  contrasena: "contrasenas",
  archivo: "archivos",
  nota: "notas",
};
const TEXTO_QUITAR = {
  dato: "el dato",
  contrasena: "la contraseña de",
  archivo: "el archivo",
  nota: "la nota",
};

function tamano(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Pantalla 25-B: ficha del cliente con sus datos, contraseñas, archivos y notas. */
export function FichaCliente({
  cliente: c,
  sugerenciasDatos,
  sugerenciasServicios,
  base,
}: {
  cliente: ClienteVista;
  sugerenciasDatos: string[];
  sugerenciasServicios: string[];
  base: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const api = `/api/clientes/${encodeURIComponent(c.id)}`;
  const editable = c.activo;

  const [renombrando, setRenombrando] = useState(false);
  const [dato, setDato] = useState<DatoCliente | "nuevo" | null>(null);
  const [contrasena, setContrasena] = useState<ContrasenaVista | "nueva" | null>(null);
  const [quitar, setQuitar] = useState<Quitar | null>(null);
  const [desactivar, setDesactivar] = useState(false);
  const [vistas, setVistas] = useState<Record<string, string>>({});
  const temporizadores = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [archivos, setArchivos] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [nota, setNota] = useState("");
  const [errorNota, setErrorNota] = useState<string>();

  async function pedirContrasena(id: string): Promise<string | null> {
    try {
      const res = await fetch(`${api}/contrasenas/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const datos = (await res.json().catch(() => ({}))) as { contrasena?: string; error?: string };
      if (!res.ok || datos.contrasena === undefined)
        throw new ErrorApi(datos.error ?? "No se pudo mostrar la contraseña", res.status);
      return datos.contrasena;
    } catch (e) {
      manejarError(e instanceof ErrorApi ? e : new ErrorApi("Sin conexión con el servidor", 0));
      return null;
    }
  }

  function tapar(id: string) {
    clearTimeout(temporizadores.current[id]);
    setVistas((v) => {
      const resto = { ...v };
      delete resto[id];
      return resto;
    });
  }

  async function alternar(id: string) {
    if (vistas[id] !== undefined) return tapar(id);
    const valor = await pedirContrasena(id);
    if (valor === null) return;
    setVistas((v) => ({ ...v, [id]: valor }));
    temporizadores.current[id] = setTimeout(() => tapar(id), TAPAR_EN_MS);
  }

  async function copiar(texto: string, que: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast(`${que} copiado`, "success");
    } catch {
      toast("No se pudo copiar", "danger");
    }
  }

  async function copiarContrasena(id: string) {
    const valor = vistas[id] ?? (await pedirContrasena(id));
    if (valor !== null) await copiar(valor, "Contraseña");
  }

  async function subir() {
    const form = new FormData();
    for (const a of archivos) form.append("archivos", a);
    setSubiendo(true);
    try {
      await postApi(`${api}/archivos`, form);
      toast(
        archivos.length === 1 ? "Archivo guardado" : `${archivos.length} archivos guardados`,
        "success",
      );
      setArchivos([]);
      router.refresh();
    } catch (e) {
      manejarError(e);
    } finally {
      setSubiendo(false);
    }
  }

  async function agregarNota() {
    const r = notaClienteSchema.safeParse({ texto: nota });
    if (!r.success) return setErrorNota(r.error.issues[0]?.message);
    try {
      await postApi(`${api}/notas`, r.data);
      setNota("");
      toast("Nota guardada", "success");
      router.refresh();
    } catch (e) {
      manejarError(e);
    }
  }

  async function confirmarQuitar() {
    if (!quitar) return;
    try {
      await pedirApi(
        "DELETE",
        `${api}/${RUTA_QUITAR[quitar.tipo]}/${encodeURIComponent(quitar.id)}`,
      );
      if (quitar.tipo === "contrasena") tapar(quitar.id);
      toast("Listo, se quitó", "success");
      setQuitar(null);
      router.refresh();
    } catch (e) {
      manejarError(e);
    }
  }

  async function cambiarActivo(activo: boolean) {
    try {
      await postApi(`${api}/activo`, { activo });
      toast(activo ? `${c.nombre} reactivado` : `${c.nombre} desactivado`, "success");
      setDesactivar(false);
      router.refresh();
    } catch (e) {
      manejarError(e);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={base}
        className="inline-flex w-fit items-center gap-1.5 rounded-xs text-small text-ink-muted hover:text-navy-900"
      >
        <ArrowLeft className="size-3.5" /> Todos los clientes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-grad-hero p-5 text-white">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-body font-semibold">
            {iniciales(c.nombre)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-h1 font-semibold">{c.nombre}</h2>
              {!c.activo && <Chip tono="bg-white/10 text-navy-300">Inactivo</Chip>}
            </div>
            <p className="text-small text-navy-300">
              Cliente desde {formatFecha(c.creado)} · Actualizado el {formatFecha(c.actualizado)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable ? (
            <>
              <Button variant="outline" onClick={() => setRenombrando(true)}>
                <Pencil /> Cambiar nombre
              </Button>
              <Button variant="danger" onClick={() => setDesactivar(true)}>
                <Ban /> Desactivar
              </Button>
            </>
          ) : (
            <Button onClick={() => cambiarActivo(true)}>
              <RotateCcw /> Reactivar
            </Button>
          )}
        </div>
      </div>

      {!editable && (
        <p className="rounded-md bg-stock-low-bg px-4 py-2.5 text-body text-stock-low-text">
          Este cliente está desactivado. Puedes ver su información; para cambiarla, reactívalo.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Datos */}
        <Card>
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
            <h3 className="text-body font-semibold text-ink-strong">Datos</h3>
            {editable && (
              <Button size="sm" variant="outline" onClick={() => setDato("nuevo")}>
                <Plus /> Agregar dato
              </Button>
            )}
          </div>
          {c.datos.length === 0 ? (
            <p className="px-5 pb-5 text-body text-ink-muted">
              Sin datos todavía. Agrega solo los que tenga (DPI, NIT, teléfono…).
            </p>
          ) : (
            <ul
              aria-label="Datos del cliente"
              className="divide-y divide-gray-200 border-t border-gray-200"
            >
              {c.datos.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-36 shrink-0 text-small text-ink-muted">{d.nombre}</span>
                  <span className="min-w-0 flex-1 text-body break-words text-ink-strong tabular">
                    {d.valor}
                  </span>
                  <Button
                    variant="icon"
                    size="sm"
                    aria-label={`Copiar ${d.nombre}`}
                    onClick={() => copiar(d.valor, d.nombre)}
                  >
                    <Copy />
                  </Button>
                  {editable && (
                    <>
                      <Button
                        variant="icon"
                        size="sm"
                        aria-label={`Editar ${d.nombre}`}
                        onClick={() => setDato(d)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="icon"
                        size="sm"
                        aria-label={`Quitar ${d.nombre}`}
                        onClick={() => setQuitar({ tipo: "dato", id: d.id, nombre: d.nombre })}
                      >
                        <X />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Contraseñas */}
        <Card>
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
            <h3 className="text-body font-semibold text-ink-strong">Contraseñas</h3>
            {editable && (
              <Button size="sm" variant="outline" onClick={() => setContrasena("nueva")}>
                <Plus /> Agregar contraseña
              </Button>
            )}
          </div>
          {c.contrasenas.length === 0 ? (
            <p className="px-5 pb-5 text-body text-ink-muted">Sin contraseñas guardadas.</p>
          ) : (
            <ul
              aria-label="Contraseñas del cliente"
              className="divide-y divide-gray-200 border-t border-gray-200"
            >
              {c.contrasenas.map((p) => {
                const vista = vistas[p.id];
                return (
                  <li key={p.id} className="flex items-start gap-3 px-5 py-3">
                    <KeyRound className="mt-0.5 size-4 shrink-0 text-navy-900" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-strong">{p.servicio}</p>
                      {p.usuario && (
                        <p className="text-small text-ink">
                          <span className="text-ink-muted">Usuario:</span> {p.usuario}
                        </p>
                      )}
                      <p className="text-small text-ink">
                        <span className="text-ink-muted">Contraseña:</span>{" "}
                        <span
                          className="font-mono tracking-wide"
                          aria-label={vista === undefined ? "Contraseña oculta" : undefined}
                        >
                          {vista ?? "••••••••"}
                        </span>
                      </p>
                      {p.nota && <p className="text-small text-ink-muted">{p.nota}</p>}
                      <p className="mt-0.5 text-small text-ink-muted">
                        Actualizada el {formatFecha(p.actualizada)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        variant="icon"
                        size="sm"
                        aria-label={`${vista === undefined ? "Mostrar" : "Ocultar"} contraseña de ${p.servicio}`}
                        onClick={() => alternar(p.id)}
                      >
                        {vista === undefined ? <Eye /> : <EyeOff />}
                      </Button>
                      <Button
                        variant="icon"
                        size="sm"
                        aria-label={`Copiar contraseña de ${p.servicio}`}
                        onClick={() => copiarContrasena(p.id)}
                      >
                        <Copy />
                      </Button>
                      {editable && (
                        <>
                          <Button
                            variant="icon"
                            size="sm"
                            aria-label={`Editar contraseña de ${p.servicio}`}
                            onClick={() => setContrasena(p)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="icon"
                            size="sm"
                            aria-label={`Quitar contraseña de ${p.servicio}`}
                            onClick={() =>
                              setQuitar({ tipo: "contrasena", id: p.id, nombre: p.servicio })
                            }
                          >
                            <X />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Archivos */}
        <Card>
          <div className="px-5 pt-4 pb-3">
            <h3 className="text-body font-semibold text-ink-strong">Archivos</h3>
          </div>
          {c.archivos.length > 0 && (
            <ul
              aria-label="Archivos del cliente"
              className="divide-y divide-gray-200 border-t border-gray-200"
            >
              {c.archivos.map((a) => {
                const Icono = a.tipo === "application/pdf" ? FileText : FileImage;
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                    <Icono className="size-4 shrink-0 text-navy-900" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body text-ink-strong">{a.nombre}</p>
                      <p className="text-small text-ink-muted">
                        {tamano(a.tamano)} · {formatFecha(a.subido)}
                      </p>
                    </div>
                    <a
                      href={`/api/archivos/${encodeURIComponent(a.id)}`}
                      aria-label={`Descargar ${a.nombre}`}
                      className="flex size-7 items-center justify-center rounded-sm border border-gray-300 bg-white text-ink-muted hover:text-navy-900"
                    >
                      <Download className="size-4" />
                    </a>
                    {editable && (
                      <Button
                        variant="icon"
                        size="sm"
                        aria-label={`Quitar ${a.nombre}`}
                        onClick={() => setQuitar({ tipo: "archivo", id: a.id, nombre: a.nombre })}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {editable ? (
            <div className="flex flex-col gap-2 px-5 pt-3 pb-5">
              <SubirArchivos archivos={archivos} onChange={setArchivos} />
              {archivos.length > 0 && (
                <Button className="self-end" onClick={subir} disabled={subiendo}>
                  {subiendo ? <LoaderCircle className="animate-spin" /> : <Upload />}
                  Guardar {archivos.length === 1 ? "archivo" : `${archivos.length} archivos`}
                </Button>
              )}
            </div>
          ) : (
            c.archivos.length === 0 && (
              <p className="px-5 pb-5 text-body text-ink-muted">Sin archivos.</p>
            )
          )}
        </Card>

        {/* Notas */}
        <Card>
          <div className="px-5 pt-4 pb-3">
            <h3 className="text-body font-semibold text-ink-strong">Notas</h3>
          </div>
          {editable && (
            <div className="flex flex-col gap-2 px-5 pb-4">
              <Textarea
                aria-label="Nueva nota"
                rows={2}
                maxLength={LIMITES_CLIENTE.nota}
                placeholder="Ej. Presenta IVA cada mes, viene los primeros días"
                value={nota}
                onChange={(e) => {
                  setNota(e.target.value);
                  setErrorNota(undefined);
                }}
              />
              {errorNota && <p className="text-small text-stock-out">{errorNota}</p>}
              <Button size="sm" variant="dark" className="self-end" onClick={agregarNota}>
                <StickyNote /> Agregar nota
              </Button>
            </div>
          )}
          {c.notas.length === 0 ? (
            <p className="px-5 pb-5 text-body text-ink-muted">Sin notas.</p>
          ) : (
            <ul
              aria-label="Notas del cliente"
              className="divide-y divide-gray-200 border-t border-gray-200"
            >
              {c.notas.map((n) => (
                <li key={n.id} className="flex items-start gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-body whitespace-pre-line text-ink">{n.texto}</p>
                    <p className="text-small text-ink-muted">{formatFechaHora(n.fecha)}</p>
                  </div>
                  {editable && (
                    <Button
                      variant="icon"
                      size="sm"
                      aria-label="Quitar nota"
                      onClick={() =>
                        setQuitar({ tipo: "nota", id: n.id, nombre: n.texto.slice(0, 40) })
                      }
                    >
                      <X />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {renombrando && (
        <ModalNombreCliente cliente={c} base={base} onClose={() => setRenombrando(false)} />
      )}
      {dato && (
        <ModalDato
          clienteId={c.id}
          dato={dato === "nuevo" ? null : dato}
          sugerencias={sugerenciasDatos}
          onClose={() => setDato(null)}
        />
      )}
      {contrasena && (
        <ModalContrasena
          clienteId={c.id}
          contrasena={contrasena === "nueva" ? null : contrasena}
          sugerencias={sugerenciasServicios}
          onClose={() => {
            // Si estaba a la vista, se tapa: pudo haber cambiado.
            if (contrasena !== "nueva") tapar(contrasena.id);
            setContrasena(null);
          }}
        />
      )}
      {quitar && (
        <Confirmar
          titulo="¿Quitar?"
          textoConfirmar="Quitar"
          peligro
          onConfirmar={confirmarQuitar}
          onCancelar={() => setQuitar(null)}
        >
          Se quitará {TEXTO_QUITAR[quitar.tipo]} <strong>{quitar.nombre}</strong> de {c.nombre}.
        </Confirmar>
      )}
      {desactivar && (
        <Confirmar
          titulo={`¿Desactivar a ${c.nombre}?`}
          textoConfirmar="Desactivar"
          peligro
          onConfirmar={() => cambiarActivo(false)}
          onCancelar={() => setDesactivar(false)}
        >
          No se borra nada: pasa a Inactivos y lo puedes reactivar cuando regrese.
        </Confirmar>
      )}
    </div>
  );
}
