"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";
import {
  Alert,
  Button,
  Field,
  Input,
  Modal,
  SegmentedControl,
  StockChip,
  Textarea,
  useToast,
} from "@/components/ui";
import { useVenta } from "@/components/venta/VentaContext";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { formatQ } from "@/lib/format";
import { postApi } from "@/lib/http";
import { buscarPorCodigo, buscarProductos } from "@/lib/reglas/busqueda";
import { centavos } from "@/lib/reglas/dinero";
import { calcularPrecio } from "@/lib/reglas/precios";
import { pendienteSchema } from "@/schemas/pendiente.schema";
import type { GrupoPendiente } from "@/types/pendiente";
import type { ProductoVenta } from "@/types/producto";

const CAMPOS = [
  "cliente",
  "grupo",
  "productoId",
  "descripcion",
  "cantidad",
  "precioUnitario",
] as const;
type Errores = Partial<Record<(typeof CAMPOS)[number], string>>;

interface ModalNuevoPendienteProps {
  grupoInicial: GrupoPendiente;
  /** Clientes que ya tienen pendientes, para sugerir el nombre y no escribirlo distinto. */
  clientes: { nombre: string; grupo: GrupoPendiente }[];
  onClose: () => void;
}

/** "+ Nuevo pendiente" (sección 8.8): de un producto (precio del sistema, descuenta stock) o libre. */
export function ModalNuevoPendiente({ grupoInicial, clientes, onClose }: ModalNuevoPendienteProps) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const { productos } = useVenta();
  const listaClientes = useId();

  const [grupo, setGrupo] = useState<GrupoPendiente>(grupoInicial);
  const [cliente, setCliente] = useState("");
  const [tipo, setTipo] = useState<"producto" | "libre">("producto");
  const [busqueda, setBusqueda] = useState("");
  const [producto, setProducto] = useState<ProductoVenta | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  const limpiar = (c: keyof Errores) => setErrores((e) => ({ ...e, [c]: undefined }));
  const n = parseInt(cantidad, 10) || 0;

  const sugerencias = useMemo(
    () => (busqueda.trim() && !producto ? buscarProductos(productos, busqueda).slice(0, 5) : []),
    [productos, busqueda, producto],
  );
  const precioProducto = producto && n > 0 ? calcularPrecio(producto, "unidad", n) : null;
  const total =
    tipo === "producto"
      ? precioProducto
        ? centavos(precioProducto.unitario * n)
        : 0
      : centavos((Number(precio) || 0) * n);

  function elegir(p: ProductoVenta) {
    setProducto(p);
    setBusqueda("");
    limpiar("productoId");
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const datos = pendienteSchema.safeParse(
      tipo === "producto"
        ? { tipo, cliente, grupo, productoId: producto?.id ?? "", cantidad: n || undefined }
        : {
            tipo,
            cliente,
            grupo,
            descripcion,
            precioUnitario: precio ? Number(precio) : undefined,
            cantidad: n || undefined,
          },
    );
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
      await postApi("/api/pendientes", datos.data);
      toast(`Pendiente registrado: ${datos.data.cliente}`, "success");
      onClose();
      router.refresh(); // tabla, total y contador del menú
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
      title="Nuevo pendiente"
      subtitle="Fiado o préstamo: se descuenta del stock al registrarlo"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-pendiente" disabled={enviando}>
            {enviando && <LoaderCircle className="animate-spin" />}
            Registrar pendiente
          </Button>
        </>
      }
    >
      <form id="form-pendiente" onSubmit={enviar} noValidate className="flex flex-col gap-4">
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
          label={grupo === "organizacion" ? "Organización" : "Cliente"}
          error={errores.cliente}
        >
          {(id, desc) => (
            <>
              <Input
                id={id}
                autoFocus
                list={listaClientes}
                maxLength={100}
                placeholder={
                  grupo === "organizacion" ? "Ej. Escuela El Progreso" : "Ej. Rosa Méndez"
                }
                value={cliente}
                onChange={(e) => {
                  setCliente(e.target.value);
                  limpiar("cliente");
                }}
                invalid={!!errores.cliente}
                aria-describedby={desc}
              />
              <datalist id={listaClientes}>
                {clientes
                  .filter((c) => c.grupo === grupo)
                  .map((c) => (
                    <option key={c.nombre} value={c.nombre} />
                  ))}
              </datalist>
            </>
          )}
        </Field>

        <SegmentedControl
          ariaLabel="Qué se llevó"
          value={tipo}
          onChange={(v) => {
            setTipo(v);
            setErrores({});
          }}
          options={[
            { value: "producto", label: "Producto del catálogo" },
            { value: "libre", label: "Otro (impresiones, servicios…)" },
          ]}
          className="w-full"
        />

        {tipo === "producto" ? (
          <Field label="Producto" error={errores.productoId}>
            {(id, desc) =>
              producto ? (
                <div className="flex items-center gap-3 rounded-sm border border-gray-300 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-ink-strong">
                      {producto.nombre}
                    </p>
                    <p className="text-badge text-ink-muted tabular">
                      {producto.codigo} · {formatQ(producto.precio)}
                    </p>
                  </div>
                  <StockChip
                    nivel={producto.disponibilidad.nivel}
                    disponible={producto.disponibilidad.agotado ? 0 : 1}
                  />
                  <button
                    type="button"
                    aria-label="Cambiar producto"
                    onClick={() => setProducto(null)}
                    className="flex size-7 items-center justify-center rounded-xs text-ink-muted hover:bg-gray-100"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id={id}
                    placeholder="Busca por nombre, código o escanea"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const exacto = buscarPorCodigo(productos, busqueda);
                      if (exacto) elegir(exacto);
                      else if (sugerencias[0]) elegir(sugerencias[0]);
                    }}
                    invalid={!!errores.productoId}
                    aria-describedby={desc}
                  />
                  {sugerencias.length > 0 && (
                    <ul className="absolute top-full right-0 left-0 z-10 mt-1 rounded-md border border-gray-200 bg-white p-1 shadow-md">
                      {sugerencias.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            disabled={p.disponibilidad.agotado}
                            onClick={() => elegir(p)}
                            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left hover:bg-gold-50 disabled:opacity-45"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-body text-ink-strong">
                                {p.nombre}
                              </span>
                              <span className="text-badge text-ink-muted tabular">
                                {p.codigo} · {formatQ(p.precio)}
                              </span>
                            </span>
                            <StockChip
                              nivel={p.disponibilidad.nivel}
                              disponible={p.disponibilidad.agotado ? 0 : 1}
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            }
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="Descripción" error={errores.descripcion}>
              {(id, desc) => (
                <Textarea
                  id={id}
                  rows={1}
                  maxLength={150}
                  placeholder="Ej. Impresiones a color"
                  value={descripcion}
                  onChange={(e) => {
                    setDescripcion(e.target.value);
                    limpiar("descripcion");
                  }}
                  invalid={!!errores.descripcion}
                  aria-describedby={desc}
                />
              )}
            </Field>
            <Field label="Precio unitario" error={errores.precioUnitario}>
              {(id, desc) => (
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body text-ink-muted">
                    Q
                  </span>
                  <Input
                    id={id}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={precio}
                    onChange={(e) => {
                      const v = e.target.value.replace(",", ".");
                      if (/^\d{0,6}(\.\d{0,2})?$/.test(v)) setPrecio(v);
                      limpiar("precioUnitario");
                    }}
                    invalid={!!errores.precioUnitario}
                    aria-describedby={desc}
                    className="pl-7 tabular"
                  />
                </div>
              )}
            </Field>
          </div>
        )}

        <div className="flex items-end justify-between gap-4">
          <Field label="Cantidad" error={errores.cantidad} className="w-32">
            {(id, desc) => (
              <Input
                id={id}
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => {
                  setCantidad(e.target.value.replace(/\D/g, "").slice(0, 5));
                  limpiar("cantidad");
                }}
                invalid={!!errores.cantidad}
                aria-describedby={desc}
                className="tabular"
              />
            )}
          </Field>
          <div className="text-right">
            <p className="text-small text-ink-muted">Total</p>
            <p
              className={cn(
                "text-kpi font-semibold tabular",
                total > 0 ? "text-ink-strong" : "text-ink-muted",
              )}
            >
              {formatQ(total)}
            </p>
          </div>
        </div>

        {precioProducto?.mayoreo && (
          <Alert tone="info">
            Mayoreo: el precio cambió de {formatQ(precioProducto.normal)} a{" "}
            {formatQ(precioProducto.unitario)} por unidad.
          </Alert>
        )}
      </form>
    </Modal>
  );
}
