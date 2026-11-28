"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useToast } from "@/components/ui";
import { useLectorCodigoBarras } from "@/hooks/useLectorCodigoBarras";
import { useErrorApi } from "@/hooks/useErrorApi";
import { nombrePaquete, pluralPaquete } from "@/lib/presentacion";
import { postApi } from "@/lib/http";
import {
  agregarLinea,
  calcularCarrito,
  cambiarCantidad,
  type CarritoCalculado,
} from "@/lib/reglas/carrito";
import { buscarPorEscaneo } from "@/lib/reglas/busqueda";
import type { Comprobante, LineaCarrito } from "@/types/movimiento";
import type { ProductoVenta } from "@/types/producto";
import { carritoStore } from "./carritoStore";
import { ModalAgregar } from "./ModalAgregar";
import { ModalComprobante } from "./ModalComprobante";

interface VentaValue {
  productos: ProductoVenta[];
  lineas: LineaCarrito[];
  calculado: CarritoCalculado;
  confirmando: boolean;
  abrirProducto: (producto: ProductoVenta) => void;
  /**
   * Código exacto (lector de barras o tecleado): agrega 1 unidad directo al carrito.
   * Devuelve false si el código no existe.
   */
  escanear: (codigo: string) => boolean;
  agregar: (linea: LineaCarrito) => void;
  cambiar: (indice: number, cantidad: number) => void;
  vaciar: () => void;
  /** Registra la venta en el servidor. Devuelve `true` si se guardó. */
  confirmar: () => Promise<boolean>;
  abrirPaquete: (productoId: string) => Promise<boolean>;
  /** Actualiza el semáforo de productos que cambiaron de stock (ej. tras una devolución). */
  actualizarProductos: (cambiados: ProductoVenta[]) => void;
  /**
   * Una pantalla puede recibir ella misma lo que lee el escáner (ej. Devoluciones) en lugar de
   * agregarlo al carrito. `null` lo devuelve al carrito.
   */
  usarLector: (alLeer: ((codigo: string) => void) | null) => void;
}

const VentaContext = createContext<VentaValue | null>(null);

export function useVenta(): VentaValue {
  const ctx = useContext(VentaContext);
  if (!ctx) throw new Error("useVenta debe usarse dentro de <VentaProvider>");
  return ctx;
}

/** Igual que useVenta, pero devuelve null fuera de la vista Empleado (Paola y Oscar no venden). */
export function useVentaOpcional(): VentaValue | null {
  return useContext(VentaContext);
}

interface VentaProviderProps {
  usuario: string;
  productosIniciales: ProductoVenta[];
  children: ReactNode;
}

/** Estado de venta del Empleado: catálogo, carrito, modales y confirmación. */
export function VentaProvider({ usuario, productosIniciales, children }: VentaProviderProps) {
  const toast = useToast();
  const [productos, setProductos] = useState(productosIniciales);
  const [seleccionado, setSeleccionado] = useState<ProductoVenta | null>(null);
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => carritoStore.usar(usuario), [usuario]);
  const lineas = useSyncExternalStore(
    carritoStore.subscribe,
    carritoStore.get,
    carritoStore.getServidor,
  );

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const calculado = useMemo(() => calcularCarrito(lineas, porId), [lineas, porId]);

  const actualizarProductos = useCallback((cambiados: ProductoVenta[]) => {
    const nuevos = new Map(cambiados.map((p) => [p.id, p]));
    setProductos((prev) => prev.map((p) => nuevos.get(p.id) ?? p));
    setSeleccionado((s) => (s && nuevos.get(s.id)) ?? s);
  }, []);

  const escanear = useCallback(
    (codigo: string) => {
      const encontrado = buscarPorEscaneo(productos, codigo);
      if (!encontrado) {
        toast(`No hay ningún producto con el código ${codigo}`, "warning");
        return false;
      }
      const { producto: p, presentacion } = encontrado;
      const d = p.disponibilidad;
      if (d.agotado) {
        toast(`${p.nombre} está agotado`, "warning");
        return true;
      }
      if (presentacion === "paquete" && d.sinPaquetes) {
        // Escanearon la caja pero no quedan cajas cerradas: se abre la ventana para decidir.
        toast(
          `No quedan ${pluralPaquete(nombrePaquete(p)).toLowerCase()} sin abrir de ${p.nombre}`,
          "warning",
        );
        setSeleccionado(p);
        return true;
      }
      // Sin unidades sueltas: se abre la ventana para "Abrir 1 caja" o vender por caja.
      if (presentacion === "unidad" && p.fraccionable && d.sinSueltas) {
        setSeleccionado(p);
        return true;
      }
      // Directo al carrito: 1 unidad (o 1 caja si escanearon la caja). La cantidad se cambia en el carrito.
      const nuevo = agregarLinea(carritoStore.get(), {
        productoId: p.id,
        tipo: "venta",
        presentacion,
        cantidad: 1,
      });
      carritoStore.set(nuevo);
      const linea = nuevo.find(
        (l) => l.productoId === p.id && l.tipo === "venta" && l.presentacion === presentacion,
      );
      const que = presentacion === "paquete" ? ` (${nombrePaquete(p).toLowerCase()})` : "";
      toast(`✓ ${p.nombre}${que} agregado (${linea?.cantidad ?? 1} en el carrito)`, "success");
      return true;
    },
    [productos, toast],
  );

  const manejarError = useErrorApi();

  // Lector de código de barras: funciona en cualquier pantalla del Empleado.
  const lectorPropio = useRef<((codigo: string) => void) | null>(null);
  const leer = useCallback(
    (codigo: string) => {
      if (lectorPropio.current) lectorPropio.current(codigo);
      else escanear(codigo);
    },
    [escanear],
  );
  const usarLector = useCallback((alLeer: ((codigo: string) => void) | null) => {
    lectorPropio.current = alLeer;
  }, []);
  useLectorCodigoBarras(leer, !seleccionado && !comprobante);

  const valor = useMemo<VentaValue>(
    () => ({
      productos,
      lineas,
      calculado,
      confirmando,
      abrirProducto: setSeleccionado,
      escanear,
      actualizarProductos,
      usarLector,
      agregar: (linea) => carritoStore.set(agregarLinea(carritoStore.get(), linea)),
      cambiar: (i, cantidad) => carritoStore.set(cambiarCantidad(carritoStore.get(), i, cantidad)),
      vaciar: () => carritoStore.set([]),
      abrirPaquete: async (productoId) => {
        try {
          const { producto } = await postApi<{ producto: ProductoVenta }>(
            `/api/productos/${encodeURIComponent(productoId)}/abrir-paquete`,
          );
          actualizarProductos([producto]);
          const u = producto.fraccionable?.unidadesPorPaquete ?? 0;
          toast(
            `Se abrió 1 ${nombrePaquete(producto).toLowerCase()}: ${u} unidades sueltas disponibles`,
            "success",
          );
          return true;
        } catch (e) {
          manejarError(e);
          return false;
        }
      },
      confirmar: async () => {
        setConfirmando(true);
        try {
          const r = await postApi<{
            comprobante: Comprobante | null;
            consumos: number;
            mermas: number;
            productos: ProductoVenta[];
          }>("/api/ventas", { lineas: carritoStore.get() });
          actualizarProductos(r.productos);
          carritoStore.set([]);
          if (r.comprobante) setComprobante(r.comprobante);
          const otros = [
            r.consumos &&
              `${r.consumos} consumo${r.consumos > 1 ? "s" : ""} interno${r.consumos > 1 ? "s" : ""}`,
            r.mermas && `${r.mermas} merma${r.mermas > 1 ? "s" : ""}`,
          ].filter(Boolean);
          if (otros.length) toast(`Registrado: ${otros.join(" y ")}`, "success");
          return true;
        } catch (e) {
          manejarError(e);
          return false;
        } finally {
          setConfirmando(false);
        }
      },
    }),
    [
      productos,
      lineas,
      calculado,
      confirmando,
      escanear,
      actualizarProductos,
      usarLector,
      manejarError,
      toast,
    ],
  );

  return (
    <VentaContext.Provider value={valor}>
      {children}
      {seleccionado && (
        <ModalAgregar
          key={seleccionado.id}
          producto={seleccionado}
          onClose={() => setSeleccionado(null)}
        />
      )}
      <ModalComprobante comprobante={comprobante} onClose={() => setComprobante(null)} />
    </VentaContext.Provider>
  );
}
