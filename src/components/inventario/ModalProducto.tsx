"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, Info, LoaderCircle, Save, Trash2, TrendingUp } from "lucide-react";
import {
  Button,
  Combobox,
  Field,
  Input,
  Modal,
  SegmentedControl,
  Select,
  Switch,
  Textarea,
  useToast,
} from "@/components/ui";
import { ImagenProducto } from "@/components/venta/ImagenProducto";
import { useErrorApi } from "@/hooks/useErrorApi";
import { cn } from "@/lib/cn";
import { formatQ } from "@/lib/format";
import { ErrorApi, pedirApi } from "@/lib/http";
import { NOMBRES_PAQUETE, pluralPaquete } from "@/lib/presentacion";
import { centavos } from "@/lib/reglas/dinero";
import { calcularMargen } from "@/lib/reglas/precios";
import { describirStock } from "@/lib/reglas/productos";
import { productoSchema } from "@/schemas/producto.schema";
import { ETIQUETA_CATEGORIA, type Categoria, type Producto } from "@/types/producto";
import type { Proveedor } from "@/types/proveedor";

const MAX_FOTO = 2 * 1024 * 1024;
const OTRO = "__otro__";

type Errores = Record<string, string | undefined>;
type ComoSeCompra = "unidad" | "paquete";

/** "12.50" → 12.5 ; "" → undefined. */
function num(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
/** Deja solo dígitos y un punto decimal. */
const soloDinero = (v: string) => v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
const soloEntero = (v: string) => v.replace(/\D/g, "");
const txt = (n?: number) => (n === undefined ? "" : String(n));
/** El lector termina con Enter: en los campos de código no debe enviar el formulario. */
const sinEnter = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") e.preventDefault();
};

/**
 * Pantalla 16: Nuevo / Editar producto.
 * 1. ¿Cómo lo compras? Por unidad, o en caja/bolsa/resma… con su costo.
 * 2. ¿A cuánto lo vendes? Por caja (con mayoreo por caja) y por unidad (con mayoreo por unidad).
 * El costo por unidad de los productos por caja lo calcula el sistema (caja de 12 a Q 18 → Q 1.50).
 * El stock de un producto existente no se edita aquí: se mueve con compras y mermas.
 */
export function ModalProducto({
  producto,
  categoria,
  proveedores,
  subcategorias,
  codigoSugerido,
  onClose,
}: {
  producto: Producto | null;
  categoria: Categoria;
  proveedores: Proveedor[];
  subcategorias: string[];
  codigoSugerido: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const p = producto;
  const f = p?.fraccionable;
  const permiteConsumo = categoria === "libreria";
  const permiteMayoreo = categoria !== "tecnologia";

  // ─── Datos generales ───
  const [nombre, setNombre] = useState(p?.nombre ?? "");
  const [codigo, setCodigo] = useState(p?.codigo ?? codigoSugerido);
  const [codigoBarras, setCodigoBarras] = useState(
    p && p.codigoBarras !== p.codigo ? p.codigoBarras : "",
  );
  const [subcategoria, setSubcategoria] = useState(p?.subcategoria ?? "");
  const [descripcion, setDescripcion] = useState(p?.descripcion ?? "");
  const [proveedorId, setProveedorId] = useState(p?.proveedorId ?? "");

  // ─── ¿Cómo lo compras? ───
  const [comoSeCompra, setComoSeCompra] = useState<ComoSeCompra>(f ? "paquete" : "unidad");
  // Nuevo: se sugiere "Caja". Existente sin nombre guardado: "Paquete", como se muestra en todo
  // el sistema (si no, al guardar se cambiaría a "Caja" sin que Paola lo pidiera).
  const nombreInicial = f ? f.nombrePaquete || "Paquete" : "Caja";
  const esConocido = NOMBRES_PAQUETE.some((n) => n.singular === nombreInicial);
  const [nombreSel, setNombreSel] = useState(esConocido ? nombreInicial : OTRO);
  const [nombreOtro, setNombreOtro] = useState(esConocido ? "" : nombreInicial);
  const [unidadesPaquete, setUnidadesPaquete] = useState(txt(f?.unidadesPorPaquete));
  const [costoPaquete, setCostoPaquete] = useState(txt(f?.costoPaquete));
  const [costo, setCosto] = useState(txt(p?.costo));
  const [barrasCaja, setBarrasCaja] = useState(f?.codigoBarrasPaquete ?? "");

  // ─── ¿A cuánto lo vendes? ───
  const [precioPaquete, setPrecioPaquete] = useState(txt(f?.precioPaquete));
  const [conMayoreoPaquete, setConMayoreoPaquete] = useState(!!f?.mayoreoPaquete);
  const [mayPaqPrecio, setMayPaqPrecio] = useState(txt(f?.mayoreoPaquete?.precio));
  const [mayPaqDesde, setMayPaqDesde] = useState(txt(f?.mayoreoPaquete?.desde));
  const [precio, setPrecio] = useState(txt(p?.precio));
  const [conMayoreo, setConMayoreo] = useState(!!p?.mayoreo);
  const [mayoreoPrecio, setMayoreoPrecio] = useState(txt(p?.mayoreo?.precio));
  const [mayoreoDesde, setMayoreoDesde] = useState(txt(p?.mayoreo?.desde));
  const [consumoInterno, setConsumoInterno] = useState(p?.aplicaConsumoInterno ?? false);

  // ─── Stock ───
  const [stockInicial, setStockInicial] = useState("");
  const [sueltas, setSueltas] = useState("");
  const [referencia, setReferencia] = useState(
    p ? txt(p.stock.tipo === "simple" ? p.stock.referencia : p.stock.referenciaPaquetes) : "",
  );

  // ─── Foto ───
  const [foto, setFoto] = useState<File | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);
  const urlFoto = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(
    () => () => {
      if (urlFoto) URL.revokeObjectURL(urlFoto);
    },
    [urlFoto],
  );
  const vistaPrevia = urlFoto ?? (quitarFoto ? undefined : p?.imagenUrl);

  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const limpiar = (campo: string) => setErrores((e) => ({ ...e, [campo]: undefined }));
  const error = (k: string) => errores[k];

  // ─── Cálculos al momento ───
  const porPaquete = comoSeCompra === "paquete";
  const nombrePaq = (nombreSel === OTRO ? nombreOtro.trim() : nombreSel) || "Paquete";
  const paq = nombrePaq.toLowerCase();
  const paqs = pluralPaquete(nombrePaq).toLowerCase();
  const unidades = num(unidadesPaquete);
  const costoUnidad =
    porPaquete && unidades && unidades > 0 && num(costoPaquete) !== undefined
      ? centavos((num(costoPaquete) ?? 0) / unidades)
      : num(costo);
  const margenPaquete = porPaquete
    ? calcularMargen(num(precioPaquete) ?? 0, num(costoPaquete))
    : null;
  const margenMayPaq =
    porPaquete && conMayoreoPaquete
      ? calcularMargen(num(mayPaqPrecio) ?? 0, num(costoPaquete))
      : null;
  const margenUnidad = calcularMargen(num(precio) ?? 0, costoUnidad);
  const margenMayUnidad = conMayoreo ? calcularMargen(num(mayoreoPrecio) ?? 0, costoUnidad) : null;
  // Si sueltas salen más baratas que la caja, nadie compraría la caja.
  const sueltasMasBaratas =
    porPaquete &&
    unidades &&
    num(precio) &&
    num(precioPaquete) &&
    (num(precio) ?? 0) * unidades < (num(precioPaquete) ?? 0)
      ? centavos((num(precio) ?? 0) * unidades)
      : null;
  // Corregir unidades por paquete solo si todo está en paquetes cerrados.
  const puedeCambiarUnidades = !p || (p.stock.tipo === "fraccionable" && p.stock.sueltas === 0);

  function elegirFoto(archivo?: File) {
    if (!archivo) return;
    if (archivo.size > MAX_FOTO) {
      return setErrores((e) => ({ ...e, foto: "La foto pesa más de 2 MB" }));
    }
    if (!/\.(jpe?g|png|webp)$/i.test(archivo.name)) {
      return setErrores((e) => ({ ...e, foto: "Solo JPG, PNG o WebP" }));
    }
    limpiar("foto");
    setFoto(archivo);
    setQuitarFoto(false);
  }

  function quitar() {
    setFoto(null);
    setQuitarFoto(true);
    if (inputFoto.current) inputFoto.current.value = "";
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const datos = {
      nombre,
      codigo,
      codigoBarras: codigoBarras.trim() || undefined,
      categoria,
      subcategoria: subcategoria.trim() || undefined,
      descripcion: descripcion.trim() || undefined,
      precio: num(precio) ?? NaN,
      // En productos por paquete el servidor calcula el costo por unidad desde el paquete.
      costo: porPaquete ? undefined : num(costo),
      mayoreo:
        permiteMayoreo && conMayoreo
          ? { desde: num(mayoreoDesde) ?? NaN, precio: num(mayoreoPrecio) ?? NaN }
          : undefined,
      aplicaConsumoInterno: permiteConsumo && consumoInterno,
      fraccionable: porPaquete
        ? {
            unidadesPorPaquete: num(unidadesPaquete) ?? NaN,
            nombrePaquete: nombreSel === OTRO ? nombreOtro.trim() : nombreSel,
            precioPaquete: num(precioPaquete) ?? NaN,
            costoPaquete: num(costoPaquete),
            codigoBarrasPaquete: barrasCaja.trim() || undefined,
            mayoreoPaquete:
              permiteMayoreo && conMayoreoPaquete
                ? { desde: num(mayPaqDesde) ?? NaN, precio: num(mayPaqPrecio) ?? NaN }
                : undefined,
          }
        : undefined,
      stockInicial: p ? 0 : (num(stockInicial) ?? 0),
      sueltasIniciales: !p && porPaquete ? num(sueltas) : undefined,
      stockReferencia: num(referencia),
      proveedorId: proveedorId || undefined,
    };
    const r = productoSchema.safeParse(datos);
    if (!r.success) {
      const nuevos: Errores = {};
      for (const issue of r.error.issues) nuevos[issue.path.join(".")] ??= issue.message;
      setErrores(nuevos);
      return;
    }
    const form = new FormData();
    form.set("datos", JSON.stringify(r.data));
    if (foto) form.set("foto", foto);
    else if (quitarFoto && p) form.set("quitarFoto", "1");

    setGuardando(true);
    try {
      if (p) await pedirApi("PATCH", `/api/productos/${encodeURIComponent(p.id)}`, form);
      else await pedirApi("POST", "/api/productos", form);
      toast(
        p ? "Cambios guardados" : `${r.data.nombre} agregado a ${ETIQUETA_CATEGORIA[categoria]}`,
        "success",
      );
      onClose();
      router.refresh();
    } catch (err) {
      if (err instanceof ErrorApi && [400, 409, 413].includes(err.status)) {
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
      title={p ? "Editar producto" : "Nuevo producto"}
      subtitle={p ? `${p.nombre} · ${p.codigo}` : ETIQUETA_CATEGORIA[categoria]}
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
          <Button type="submit" form="form-producto" disabled={guardando}>
            {guardando ? <LoaderCircle className="animate-spin" /> : <Save />}
            {p ? "Guardar cambios" : "Agregar producto"}
          </Button>
        </>
      }
    >
      <form
        id="form-producto"
        onSubmit={guardar}
        noValidate
        className="grid gap-x-6 gap-y-4 md:grid-cols-2"
      >
        {/* ─── Columna izquierda: foto y datos ─── */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-small font-medium text-ink">Foto (opcional)</p>
            <div className="flex items-center gap-4">
              <ImagenProducto
                categoria={categoria}
                nombre={nombre || "Producto"}
                imagenUrl={vistaPrevia}
                className="size-24 shrink-0 rounded-md border border-gray-200"
              />
              <div className="flex flex-col items-start gap-1.5">
                <input
                  ref={inputFoto}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  aria-label="Subir foto del producto"
                  onChange={(e) => elegirFoto(e.target.files?.[0])}
                />
                <Button type="button" variant="outline" onClick={() => inputFoto.current?.click()}>
                  <Camera /> {vistaPrevia ? "Cambiar foto" : "Subir foto"}
                </Button>
                {vistaPrevia && (
                  <button
                    type="button"
                    onClick={quitar}
                    className="inline-flex items-center gap-1 text-small font-semibold text-stock-out hover:underline"
                  >
                    <Trash2 className="size-3.5" /> Quitar foto
                  </button>
                )}
                <p className="text-badge text-ink-muted">JPG, PNG o WebP · máx. 2 MB</p>
              </div>
            </div>
            {error("foto") && (
              <p role="alert" className="mt-1 text-small text-stock-out">
                {error("foto")}
              </p>
            )}
          </div>

          <Field label="Nombre del producto" error={error("nombre")}>
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                autoFocus={!p}
                maxLength={120}
                placeholder="Ej. Lápiz Mongol No. 2"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  limpiar("nombre");
                }}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Código"
              error={error("codigo")}
              hint={p ? undefined : "Sugerido automáticamente"}
            >
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  className="font-mono uppercase"
                  maxLength={8}
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value.toUpperCase());
                    limpiar("codigo");
                  }}
                />
              )}
            </Field>
            <Field
              label="Código de barras"
              error={error("codigoBarras")}
              hint="Vacío: se usa el código. Puedes escanearlo aquí."
            >
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  className="font-mono"
                  maxLength={32}
                  placeholder={codigo}
                  value={codigoBarras}
                  onChange={(e) => {
                    setCodigoBarras(e.target.value.replace(/[^A-Za-z0-9-]/g, ""));
                    limpiar("codigoBarras");
                  }}
                  onKeyDown={sinEnter}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Subcategoría" error={error("subcategoria")}>
              {(id, d) => (
                <Combobox
                  id={id}
                  aria-describedby={d}
                  maxLength={60}
                  placeholder="Ej. Escritura"
                  opciones={subcategorias}
                  value={subcategoria}
                  onChange={setSubcategoria}
                />
              )}
            </Field>
            <Field label="Proveedor">
              {(id) => (
                <Select
                  id={id}
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                >
                  <option value="">Sin proveedor</option>
                  {proveedores.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.nombre}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field label="Descripción (opcional)" error={error("descripcion")}>
            {(id, d) => (
              <Textarea
                id={id}
                aria-describedby={d}
                rows={2}
                maxLength={500}
                placeholder="Detalles que ayuden a reconocerlo"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            )}
          </Field>

          {permiteConsumo && (
            <Bloque
              titulo="Uso interno del negocio"
              accion={
                <Switch
                  checked={consumoInterno}
                  onChange={setConsumoInterno}
                  label={consumoInterno ? "Sí" : "No"}
                />
              }
            >
              <p className="text-small text-ink-muted">
                Permite registrarlo como Consumo interno (ej. hojas para la impresora).
              </p>
            </Bloque>
          )}
        </div>

        {/* ─── Columna derecha: compra, venta y stock ─── */}
        <div className="flex flex-col gap-4">
          <Bloque titulo="1 · ¿Cómo lo compras?">
            {p ? (
              <p className="mb-3 text-small text-ink-muted">
                {porPaquete ? `Se compra por ${paq}.` : "Se compra por unidad."} Esto no se cambia
                después de crearlo.
              </p>
            ) : (
              <SegmentedControl
                ariaLabel="Cómo se compra"
                options={[
                  { value: "unidad", label: "Por unidad" },
                  { value: "paquete", label: "En caja o paquete" },
                ]}
                value={comoSeCompra}
                onChange={setComoSeCompra}
                className="mb-3 w-full"
              />
            )}

            {porPaquete ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="¿Cómo se llama?" error={error("fraccionable.nombrePaquete")}>
                    {(id, d) => (
                      <Select
                        id={id}
                        aria-describedby={d}
                        value={nombreSel}
                        onChange={(e) => {
                          setNombreSel(e.target.value);
                          limpiar("fraccionable.nombrePaquete");
                        }}
                      >
                        {NOMBRES_PAQUETE.map((n) => (
                          <option key={n.singular} value={n.singular}>
                            {n.singular}
                          </option>
                        ))}
                        <option value={OTRO}>Otro…</option>
                      </Select>
                    )}
                  </Field>
                  <Field
                    label={`Unidades por ${paq}`}
                    error={error("fraccionable.unidadesPorPaquete")}
                  >
                    {(id, d) => (
                      <Input
                        id={id}
                        aria-describedby={d}
                        inputMode="numeric"
                        disabled={!puedeCambiarUnidades}
                        placeholder="Ej. 12"
                        value={unidadesPaquete}
                        onChange={(e) => {
                          setUnidadesPaquete(soloEntero(e.target.value));
                          limpiar("fraccionable.unidadesPorPaquete");
                        }}
                      />
                    )}
                  </Field>
                </div>
                {nombreSel === OTRO && (
                  <Field label="Nombre del paquete" error={error("fraccionable.nombrePaquete")}>
                    {(id, d) => (
                      <Input
                        id={id}
                        aria-describedby={d}
                        maxLength={20}
                        placeholder="Ej. Cubeta, Cartón, Tira"
                        value={nombreOtro}
                        onChange={(e) => {
                          setNombreOtro(e.target.value.replace(/[^\p{L} ]/gu, ""));
                          limpiar("fraccionable.nombrePaquete");
                        }}
                      />
                    )}
                  </Field>
                )}
                {p && !puedeCambiarUnidades && (
                  <p className="text-small text-ink-muted">
                    Hay unidades sueltas: las unidades por {paq} solo se corrigen cuando no queda
                    ninguna suelta.
                  </p>
                )}
                <div className="grid grid-cols-2 items-end gap-3">
                  <CampoDinero
                    label={`Costo por ${paq}`}
                    valor={costoPaquete}
                    error={error("fraccionable.costoPaquete")}
                    onChange={setCostoPaquete}
                  />
                  <div className="bg-gray-50 rounded-md px-3 py-2 text-small">
                    <p className="text-ink-muted">Costo por unidad</p>
                    <p className="font-semibold text-ink-strong tabular">
                      {costoUnidad === undefined || Number.isNaN(costoUnidad)
                        ? "—"
                        : formatQ(costoUnidad)}{" "}
                      <span className="font-normal text-ink-muted">calculado</span>
                    </p>
                  </div>
                </div>
                <Field
                  label={`Código de barras por ${paq} (opcional)`}
                  error={error("fraccionable.codigoBarrasPaquete")}
                  hint={`Al escanearlo se vende 1 ${paq}. Puedes escanear el del fabricante.`}
                >
                  {(id, d) => (
                    <div className="flex gap-2">
                      <Input
                        id={id}
                        aria-describedby={d}
                        className="font-mono"
                        maxLength={32}
                        placeholder="Sin código"
                        value={barrasCaja}
                        onChange={(e) => {
                          setBarrasCaja(e.target.value.replace(/[^A-Za-z0-9-]/g, ""));
                          limpiar("fraccionable.codigoBarrasPaquete");
                        }}
                        onKeyDown={sinEnter}
                      />
                      {!barrasCaja && (
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => setBarrasCaja(`${codigo}-P`)}
                        >
                          Usar {codigo}-P
                        </Button>
                      )}
                    </div>
                  )}
                </Field>
              </div>
            ) : (
              <CampoDinero
                label="Costo de compra por unidad"
                valor={costo}
                error={error("costo")}
                onChange={(v) => {
                  setCosto(v);
                  limpiar("costo");
                }}
              />
            )}
          </Bloque>

          <Bloque titulo="2 · ¿A cuánto lo vendes?">
            <div className="flex flex-col gap-4">
              {porPaquete && (
                <div className="flex flex-col gap-2.5">
                  <CampoDinero
                    label={`Precio por ${paq}`}
                    valor={precioPaquete}
                    error={error("fraccionable.precioPaquete")}
                    onChange={(v) => {
                      setPrecioPaquete(v);
                      limpiar("fraccionable.precioPaquete");
                    }}
                  />
                  <Margen margen={margenPaquete} etiqueta={`Por ${paq}`} />
                  {permiteMayoreo && (
                    <Mayoreo
                      titulo={`Mayoreo por ${paq}`}
                      activo={conMayoreoPaquete}
                      onActivo={setConMayoreoPaquete}
                      precio={mayPaqPrecio}
                      onPrecio={(v) => {
                        setMayPaqPrecio(v);
                        limpiar("fraccionable.mayoreoPaquete.precio");
                      }}
                      desde={mayPaqDesde}
                      onDesde={(v) => {
                        setMayPaqDesde(v);
                        limpiar("fraccionable.mayoreoPaquete.desde");
                      }}
                      unidad={paqs}
                      errorPrecio={error("fraccionable.mayoreoPaquete.precio")}
                      errorDesde={error("fraccionable.mayoreoPaquete.desde")}
                      margen={margenMayPaq}
                    />
                  )}
                </div>
              )}

              <div
                className={cn(
                  "flex flex-col gap-2.5",
                  porPaquete && "border-t border-gray-200 pt-4",
                )}
              >
                <CampoDinero
                  label={porPaquete ? "Precio por unidad suelta" : "Precio de venta"}
                  valor={precio}
                  error={error("precio")}
                  onChange={(v) => {
                    setPrecio(v);
                    limpiar("precio");
                  }}
                />
                <Margen margen={margenUnidad} etiqueta="Por unidad" />
                {sueltasMasBaratas !== null && (
                  <p className="flex items-start gap-1.5 text-small text-stock-low-text">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    {unidades} sueltas suman {formatQ(sueltasMasBaratas)}: sale más barato que
                    comprar por {paq}.
                  </p>
                )}
                {permiteMayoreo && (
                  <Mayoreo
                    titulo="Mayoreo por unidad"
                    activo={conMayoreo}
                    onActivo={setConMayoreo}
                    precio={mayoreoPrecio}
                    onPrecio={(v) => {
                      setMayoreoPrecio(v);
                      limpiar("mayoreo.precio");
                    }}
                    desde={mayoreoDesde}
                    onDesde={(v) => {
                      setMayoreoDesde(v);
                      limpiar("mayoreo.desde");
                    }}
                    unidad="unidades"
                    errorPrecio={error("mayoreo.precio")}
                    errorDesde={error("mayoreo.desde")}
                    margen={margenMayUnidad}
                  />
                )}
              </div>
            </div>
          </Bloque>

          <Bloque titulo="3 · Stock">
            {p ? (
              <div className="flex flex-col gap-3">
                <p className="bg-gray-50 flex items-start gap-2 rounded-md px-3 py-2 text-small text-ink-muted">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Hay <strong className="text-ink-strong">{describirStock(p)}</strong>. El stock
                    se mueve con compras y mermas, no desde aquí.
                  </span>
                </p>
                <CampoEntero
                  label={
                    porPaquete
                      ? `${pluralPaquete(nombrePaq)} con semáforo lleno`
                      : "Unidades con semáforo lleno"
                  }
                  valor={referencia}
                  error={error("stockReferencia")}
                  onChange={setReferencia}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <CampoEntero
                  label={porPaquete ? `${pluralPaquete(nombrePaq)} sin abrir` : "Stock inicial"}
                  valor={stockInicial}
                  error={error("stockInicial")}
                  onChange={setStockInicial}
                />
                {porPaquete ? (
                  <CampoEntero
                    label="Unidades sueltas"
                    valor={sueltas}
                    error={error("sueltasIniciales")}
                    onChange={setSueltas}
                  />
                ) : (
                  <CampoEntero
                    label="Semáforo lleno"
                    valor={referencia}
                    error={error("stockReferencia")}
                    onChange={setReferencia}
                    placeholder={stockInicial || "Igual al inicial"}
                  />
                )}
              </div>
            )}
          </Bloque>
        </div>
      </form>
    </Modal>
  );
}

function Bloque({
  titulo,
  accion,
  children,
}: {
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-gray-200 p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-overline font-semibold tracking-wider text-ink-muted uppercase">
          {titulo}
        </h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

/** Mayoreo de una presentación: "precio" a partir de "desde" unidades/cajas/bolsas. */
function Mayoreo({
  titulo,
  activo,
  onActivo,
  precio,
  onPrecio,
  desde,
  onDesde,
  unidad,
  errorPrecio,
  errorDesde,
  margen,
}: {
  titulo: string;
  activo: boolean;
  onActivo: (v: boolean) => void;
  precio: string;
  onPrecio: (v: string) => void;
  desde: string;
  onDesde: (v: string) => void;
  unidad: string;
  errorPrecio?: string;
  errorDesde?: string;
  margen: { ganancia: number; porcentaje: number } | null;
}) {
  return (
    <div className="rounded-md bg-gold-100/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-small font-semibold text-ink-strong">{titulo}</span>
        <Switch checked={activo} onChange={onActivo} label={activo ? "Sí" : "No"} />
      </div>
      {activo && (
        <div className="mt-2.5 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-3">
            <CampoDinero
              label="Precio mayoreo"
              valor={precio}
              error={errorPrecio}
              onChange={onPrecio}
            />
            <Field label={`A partir de (${unidad})`} error={errorDesde}>
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  inputMode="numeric"
                  placeholder="Ej. 5"
                  value={desde}
                  onChange={(e) => onDesde(soloEntero(e.target.value))}
                />
              )}
            </Field>
          </div>
          {margen && <Margen margen={margen} etiqueta="Mayoreo" />}
        </div>
      )}
    </div>
  );
}

function CampoDinero({
  label,
  valor,
  error,
  onChange,
}: {
  label: string;
  valor: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={`${label} (Q)`} error={error}>
      {(id, d) => (
        <Input
          id={id}
          aria-describedby={d}
          inputMode="decimal"
          placeholder="0.00"
          value={valor}
          onChange={(e) => onChange(soloDinero(e.target.value))}
        />
      )}
    </Field>
  );
}

function CampoEntero({
  label,
  valor,
  error,
  onChange,
  placeholder = "0",
}: {
  label: string;
  valor: string;
  error?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label} error={error}>
      {(id, d) => (
        <Input
          id={id}
          aria-describedby={d}
          inputMode="numeric"
          placeholder={placeholder}
          value={valor}
          onChange={(e) => onChange(soloEntero(e.target.value))}
        />
      )}
    </Field>
  );
}

function Margen({
  margen,
  etiqueta = "Ganancia",
}: {
  margen: { ganancia: number; porcentaje: number } | null;
  etiqueta?: string;
}) {
  if (!margen) return null;
  const perdida = margen.ganancia < 0;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md px-3 py-1.5 text-small",
        perdida ? "bg-stock-out-bg text-stock-out-text" : "bg-stock-ok-bg text-stock-ok-text",
      )}
    >
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <TrendingUp className="size-4 shrink-0" />
        {etiqueta}:{" "}
        <strong className="tabular">
          {perdida ? "−" : "+"}
          {formatQ(Math.abs(margen.ganancia))}
        </strong>
      </span>
      <strong className="whitespace-nowrap tabular">
        {perdida ? "¡Bajo el costo!" : `${margen.porcentaje}% de utilidad`}
      </strong>
    </div>
  );
}
