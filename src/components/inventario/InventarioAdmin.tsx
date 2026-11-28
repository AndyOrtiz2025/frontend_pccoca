"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  Download,
  PackageMinus,
  Printer,
  ScanBarcode,
  History,
  Pencil,
  ShoppingCart,
  Plus,
  Power,
  Tags,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Confirmar,
  KpiCard,
  Pagination,
  SearchInput,
  Select,
  StockChip,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  useToast,
} from "@/components/ui";
import { ImagenProducto } from "@/components/venta/ImagenProducto";
import { useErrorApi } from "@/hooks/useErrorApi";
import { descargarArchivo } from "@/lib/compartir";
import { diaDeGuatemala } from "@/lib/fechas";
import { formatQ } from "@/lib/format";
import { cantidadCon, nombrePaquete } from "@/lib/presentacion";
import { postApi } from "@/lib/http";
import { normalizar } from "@/lib/reglas/busqueda";
import { nivelProducto } from "@/lib/reglas/inventario";
import { calcularMargen } from "@/lib/reglas/precios";
import { describirStock, inventarioCsv, resumenInventario } from "@/lib/reglas/productos";
import { ETIQUETA_CATEGORIA, type Categoria, type Producto } from "@/types/producto";
import type { Proveedor } from "@/types/proveedor";
import type { Subcategoria } from "@/lib/api";
import { ModalMerma } from "./ModalMerma";
import { ModalCodigoBarras } from "@/components/codigos/ModalCodigoBarras";
import { ModalEtiquetas } from "@/components/codigos/ModalEtiquetas";
import { useLectorCodigoBarras } from "@/hooks/useLectorCodigoBarras";
import { buscarPorEscaneo } from "@/lib/reglas/busqueda";
import { ModalCompra } from "@/components/proveedores/ModalCompra";
import { ModalHistorial } from "./ModalHistorial";
import { ModalProducto } from "./ModalProducto";
import { ModalSubcategorias } from "./ModalSubcategorias";

type Pestana = "todos" | "bajo" | "fraccionables" | "consumo" | "inactivos";
const POR_PAGINA = 15;

/**
 * Pantalla 15: administración de productos de una categoría (Paola: Librería y Varios;
 * Oscar la reusará para Tecnología). Precios, costo, margen, stock exacto, fotos y mermas.
 */
export function InventarioAdmin({
  productos,
  categoria,
  proveedores,
  codigoSugerido,
  subcategorias: listaSubcategorias,
}: {
  productos: Producto[];
  categoria: Categoria;
  proveedores: Proveedor[];
  codigoSugerido: string;
  /** Todas, incluidas las creadas a mano sin productos todavía. */
  subcategorias: Subcategoria[];
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const [pestana, setPestana] = useState<Pestana>("todos");
  const [consulta, setConsulta] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<Producto | "nuevo" | null>(null);
  const [mermando, setMermando] = useState<Producto | null>(null);
  const [aDesactivar, setADesactivar] = useState<Producto | null>(null);
  const [viendoCodigo, setViendoCodigo] = useState<Producto | null>(null);
  const [viendoHistorial, setViendoHistorial] = useState<Producto | null>(null);
  const [comprando, setComprando] = useState(false);
  const [etiquetas, setEtiquetas] = useState<Producto[] | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [resaltado, setResaltado] = useState<string | null>(null);

  const resumen = useMemo(() => resumenInventario(productos), [productos]);
  const subcategorias = useMemo(
    () => listaSubcategorias.map((s) => s.nombre),
    [listaSubcategorias],
  );
  const [viendoSubcategorias, setViendoSubcategorias] = useState(false);

  const filtro: Record<Pestana, (p: Producto) => boolean> = {
    todos: (p) => p.activo,
    bajo: (p) => p.activo && nivelProducto(p) !== "ok",
    fraccionables: (p) => p.activo && !!p.fraccionable,
    consumo: (p) => p.activo && p.aplicaConsumoInterno,
    inactivos: (p) => !p.activo,
  };
  const contar = (t: Pestana) => productos.filter(filtro[t]).length;

  const visibles = useMemo(() => {
    const q = normalizar(consulta);
    return productos
      .filter(filtro[pestana])
      .filter((p) => !subcategoria || p.subcategoria === subcategoria)
      .filter((p) => !q || normalizar(`${p.nombre} ${p.codigo} ${p.codigoBarras}`).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `filtro` se arma en cada render
  }, [productos, pestana, subcategoria, consulta]);

  const paginaActual = Math.min(pagina, Math.max(1, Math.ceil(visibles.length / POR_PAGINA)));
  const enPagina = visibles.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const hayVentana =
    !!editando ||
    !!mermando ||
    !!aDesactivar ||
    !!viendoCodigo ||
    !!etiquetas ||
    viendoSubcategorias;

  // Escanear con el lector en esta pantalla busca el producto (unidad o caja) y lo resalta.
  useLectorCodigoBarras((codigo) => {
    const r = buscarPorEscaneo(productos, codigo);
    if (!r) {
      toast(
        `No hay ningún producto de ${ETIQUETA_CATEGORIA[categoria]} con el código ${codigo}`,
        "warning",
      );
      return;
    }
    setPestana(r.producto.activo ? "todos" : "inactivos");
    setSubcategoria("");
    setConsulta(r.producto.codigo);
    setPagina(1);
    setResaltado(r.producto.id);
    toast(
      r.presentacion === "paquete"
        ? `${r.producto.nombre} (código por ${nombrePaquete(r.producto).toLowerCase()})`
        : r.producto.nombre,
      "info",
    );
  }, !hayVentana);

  const seleccionados = productos.filter((p) => seleccion.has(p.id));
  const todosEnPagina = enPagina.length > 0 && enPagina.every((p) => seleccion.has(p.id));
  function alternar(id: string) {
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function alternarPagina() {
    setSeleccion((s) => {
      const n = new Set(s);
      for (const p of enPagina) {
        if (todosEnPagina) n.delete(p.id);
        else n.add(p.id);
      }
      return n;
    });
  }

  function exportar() {
    const csv = inventarioCsv(productos);
    descargarArchivo(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `inventario-${categoria}-${diaDeGuatemala(new Date())}.csv`,
    );
  }

  async function cambiarActivo(p: Producto, activo: boolean) {
    try {
      await postApi(`/api/productos/${encodeURIComponent(p.id)}/activo`, { activo });
      toast(
        activo ? `${p.nombre} vuelve a venderse` : `${p.nombre} ya no aparece en la venta`,
        "success",
      );
      setADesactivar(null);
      router.refresh();
    } catch (e) {
      manejarError(e);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-muted">
          Precios, costos, márgenes y existencias de {ETIQUETA_CATEGORIA[categoria]}.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setViendoSubcategorias(true)}>
            <Tags /> Subcategorías
          </Button>
          <Button variant="outline" onClick={exportar}>
            <Download /> Exportar inventario
          </Button>
          <Button variant="outline" onClick={() => setComprando(true)}>
            <ShoppingCart /> Registrar compra
          </Button>
          <Button onClick={() => setEditando("nuevo")}>
            <Plus /> Nuevo producto
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          highlight
          label="Productos activos"
          value={String(resumen.productos)}
          detail={contar("inactivos") ? `${contar("inactivos")} inactivos` : "Todos a la venta"}
          icon={<Boxes />}
        />
        <KpiCard
          label="Valor del inventario"
          value={formatQ(resumen.valorCosto)}
          detail={`A precio de venta: ${formatQ(resumen.valorVenta)}`}
          icon={<Wallet />}
        />
        <KpiCard
          label="Bajo stock"
          value={String(resumen.bajoStock)}
          detail={resumen.bajoStock ? "Revisar para reabastecer" : "Todo con buen stock"}
          icon={<AlertTriangle />}
        />
        <KpiCard
          label="Margen promedio"
          value={resumen.margenPromedio === null ? "—" : `${resumen.margenPromedio}%`}
          detail="Ganancia sobre el precio"
          icon={<TrendingUp />}
        />
      </div>

      <Card className="min-w-0">
        <div className="px-4 pt-3">
          <Tabs
            ariaLabel="Filtrar productos"
            value={pestana}
            onChange={(t) => {
              setPestana(t);
              setPagina(1);
            }}
            items={(
              [
                ["todos", "Todos"],
                ["bajo", "Stock bajo"],
                ["fraccionables", "Fraccionables"],
                ...(categoria === "libreria" ? [["consumo", "Consumo interno"]] : []),
                ["inactivos", "Inactivos"],
              ] as [Pestana, string][]
            ).map(([value, label]) => ({ value, label, count: contar(value) }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <SearchInput
            aria-label="Buscar producto"
            placeholder="Buscar por nombre o código"
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              setPagina(1);
            }}
            className="w-80"
          />
          <Select
            aria-label="Subcategoría"
            value={subcategoria}
            onChange={(e) => {
              setSubcategoria(e.target.value);
              setPagina(1);
            }}
            className="w-52"
          >
            <option value="">Todas las subcategorías</option>
            {subcategorias.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {seleccionados.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-y border-gold-500/40 bg-gold-100/60 px-4 py-2">
            <span className="text-body font-semibold text-ink-strong">
              {seleccionados.length} {seleccionados.length === 1 ? "seleccionado" : "seleccionados"}
            </span>
            <Button size="sm" onClick={() => setEtiquetas(seleccionados)}>
              <Printer /> Imprimir etiquetas
            </Button>
            <button
              type="button"
              onClick={() => setSeleccion(new Set())}
              className="text-small font-semibold text-navy-900 hover:underline"
            >
              Quitar selección
            </button>
          </div>
        )}
        {enPagina.length === 0 ? (
          <p className="px-5 pt-4 pb-10 text-center text-body text-ink-muted">
            No hay productos en esta vista.
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th className="w-10">
                  <Checkbox
                    checked={todosEnPagina}
                    onChange={alternarPagina}
                    label="Seleccionar todos de esta página"
                    ocultarTexto
                  />
                </Th>
                <Th>Producto</Th>
                <Th numeric>Precio</Th>
                <Th numeric>Mayoreo</Th>
                <Th numeric>Costo</Th>
                <Th numeric>Margen</Th>
                <Th>Stock exacto</Th>
                <Th className="w-44">
                  <span className="sr-only">Acciones</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {enPagina.map((p) => (
                <FilaProducto
                  key={p.id}
                  p={p}
                  seleccionado={seleccion.has(p.id)}
                  resaltado={resaltado === p.id}
                  onSeleccionar={() => alternar(p.id)}
                  onCodigo={() => setViendoCodigo(p)}
                  onHistorial={() => setViendoHistorial(p)}
                  onEditar={() => setEditando(p)}
                  onMerma={() => setMermando(p)}
                  onActivo={() => (p.activo ? setADesactivar(p) : cambiarActivo(p, true))}
                />
              ))}
            </TBody>
          </Table>
        )}

        <div className="bg-gray-50 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-3">
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-muted">
            <span>
              Valor a costo:{" "}
              <strong className="text-ink-strong tabular">{formatQ(resumen.valorCosto)}</strong>
            </span>
            <span>
              Proyectado a venta:{" "}
              <strong className="text-ink-strong tabular">{formatQ(resumen.valorVenta)}</strong>
            </span>
            {resumen.margenPromedio !== null && (
              <span>
                Margen promedio:{" "}
                <strong className="text-stock-ok-text tabular">{resumen.margenPromedio}%</strong>
              </span>
            )}
          </p>
          <Pagination
            page={paginaActual}
            pageSize={POR_PAGINA}
            total={visibles.length}
            onChange={setPagina}
          />
        </div>
      </Card>

      {editando && (
        <ModalProducto
          producto={editando === "nuevo" ? null : editando}
          categoria={categoria}
          proveedores={proveedores}
          subcategorias={subcategorias}
          codigoSugerido={codigoSugerido}
          onClose={() => setEditando(null)}
        />
      )}
      {viendoSubcategorias && (
        <ModalSubcategorias
          categoria={categoria}
          subcategorias={listaSubcategorias}
          onClose={() => setViendoSubcategorias(false)}
        />
      )}
      {viendoCodigo && (
        <ModalCodigoBarras
          producto={viendoCodigo}
          onClose={() => setViendoCodigo(null)}
          onImprimir={() => {
            setEtiquetas([viendoCodigo]);
            setViendoCodigo(null);
          }}
        />
      )}
      {viendoHistorial && (
        <ModalHistorial producto={viendoHistorial} onClose={() => setViendoHistorial(null)} />
      )}
      {comprando && (
        <ModalCompra
          proveedores={proveedores}
          productos={productos}
          onClose={() => setComprando(false)}
        />
      )}
      {etiquetas && <ModalEtiquetas productos={etiquetas} onClose={() => setEtiquetas(null)} />}
      {mermando && <ModalMerma producto={mermando} onClose={() => setMermando(null)} />}
      {aDesactivar && (
        <Confirmar
          titulo="¿Desactivar este producto?"
          textoConfirmar="Sí, desactivar"
          peligro
          onCancelar={() => setADesactivar(null)}
          onConfirmar={() => cambiarActivo(aDesactivar, false)}
        >
          <p>
            <strong>{aDesactivar.nombre}</strong> ({aDesactivar.codigo})
          </p>
          <p className="mt-2 text-ink-muted">
            Deja de aparecer en la venta y en el escáner. No se borra: su historial se conserva y lo
            puedes reactivar desde la pestaña Inactivos.
          </p>
        </Confirmar>
      )}
    </div>
  );
}

function FilaProducto({
  p,
  seleccionado,
  resaltado,
  onSeleccionar,
  onCodigo,
  onHistorial,
  onEditar,
  onMerma,
  onActivo,
}: {
  p: Producto;
  seleccionado: boolean;
  resaltado: boolean;
  onSeleccionar: () => void;
  onCodigo: () => void;
  onHistorial: () => void;
  onEditar: () => void;
  onMerma: () => void;
  onActivo: () => void;
}) {
  const margen = calcularMargen(p.precio, p.costo);
  const nivel = nivelProducto(p);
  const referencia =
    p.stock.tipo === "simple"
      ? `de ${p.stock.referencia}`
      : `de ${cantidadCon(p, "paquete", p.stock.referenciaPaquetes)}`;
  const accion =
    "flex size-8 items-center justify-center rounded-sm text-ink-muted hover:bg-gray-100 hover:text-navy-900 [&_svg]:size-4";

  return (
    <Tr selected={resaltado} className={p.activo ? undefined : "opacity-60"}>
      <Td>
        <Checkbox
          checked={seleccionado}
          onChange={onSeleccionar}
          label={`Seleccionar ${p.nombre}`}
          ocultarTexto
        />
      </Td>
      <Td className="py-2.5">
        <div className="flex items-center gap-3">
          <ImagenProducto
            categoria={p.categoria}
            nombre={p.nombre}
            imagenUrl={p.imagenUrl}
            className="size-11 shrink-0 rounded-sm border border-gray-200"
          />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink-strong">
              {p.nombre}
              {!p.activo && <Chip>Inactivo</Chip>}
              {nivel === "critico" && p.activo && (
                <Chip tono="bg-stock-out-bg text-stock-out-text">Crítico</Chip>
              )}
            </p>
            <p className="text-small text-ink-muted">
              <span className="font-mono">{p.codigo}</span>
              {p.subcategoria && ` · ${p.subcategoria}`}
              {p.fraccionable && ` · ${nombrePaquete(p)} de ${p.fraccionable.unidadesPorPaquete}`}
            </p>
          </div>
        </div>
      </Td>
      <Td numeric className="whitespace-nowrap">
        <span className="font-semibold text-ink-strong">{formatQ(p.precio)}</span>
        {p.fraccionable && (
          <span className="block text-small text-ink-muted">
            {formatQ(p.fraccionable.precioPaquete)} {nombrePaquete(p).toLowerCase()}
          </span>
        )}
      </Td>
      <Td numeric className="whitespace-nowrap">
        {p.mayoreo || p.fraccionable?.mayoreoPaquete ? (
          <>
            {p.mayoreo && (
              <span className="block">
                {formatQ(p.mayoreo.precio)}
                <span className="block text-small text-ink-muted">desde {p.mayoreo.desde} u.</span>
              </span>
            )}
            {p.fraccionable?.mayoreoPaquete && (
              <span className="block">
                {formatQ(p.fraccionable.mayoreoPaquete.precio)}
                <span className="block text-small text-ink-muted">
                  desde {cantidadCon(p, "paquete", p.fraccionable.mayoreoPaquete.desde)}
                </span>
              </span>
            )}
          </>
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </Td>
      <Td numeric className="whitespace-nowrap text-ink-muted">
        {p.costo === undefined ? "—" : formatQ(p.costo)}
      </Td>
      <Td numeric className="whitespace-nowrap">
        {margen ? (
          <Chip
            tono={
              margen.ganancia < 0
                ? "bg-stock-out-bg text-stock-out-text"
                : "bg-stock-ok-bg text-stock-ok-text"
            }
          >
            {margen.ganancia < 0 ? "−" : "+"}
            {formatQ(Math.abs(margen.ganancia))} ({margen.porcentaje}%)
          </Chip>
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </Td>
      <Td className="whitespace-nowrap">
        <StockChip
          nivel={nivel}
          disponible={p.stock.tipo === "simple" ? p.stock.disponible : p.stock.paquetes}
          detalle={describirStock(p)}
        />
        <span className="mt-0.5 block text-small text-ink-muted">{referencia}</span>
      </Td>
      <Td>
        <div className="flex justify-end gap-0.5">
          <button
            type="button"
            className={accion}
            onClick={onCodigo}
            title="Código de barras"
            aria-label={`Código de barras de ${p.nombre}`}
          >
            <ScanBarcode />
          </button>
          <button
            type="button"
            className={accion}
            onClick={onHistorial}
            title="Historial"
            aria-label={`Historial de ${p.nombre}`}
          >
            <History />
          </button>
          <button
            type="button"
            className={accion}
            onClick={onEditar}
            title="Editar"
            aria-label={`Editar ${p.nombre}`}
          >
            <Pencil />
          </button>
          <button
            type="button"
            className={accion}
            onClick={onMerma}
            disabled={!p.activo}
            title="Registrar merma"
            aria-label={`Registrar merma de ${p.nombre}`}
          >
            <PackageMinus />
          </button>
          <button
            type="button"
            className={accion}
            onClick={onActivo}
            title={p.activo ? "Desactivar" : "Reactivar"}
            aria-label={`${p.activo ? "Desactivar" : "Reactivar"} ${p.nombre}`}
          >
            <Power className={p.activo ? undefined : "text-stock-ok"} />
          </button>
        </div>
      </Td>
    </Tr>
  );
}
