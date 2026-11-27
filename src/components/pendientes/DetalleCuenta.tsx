"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  FileText,
  HandCoins,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Confirmar,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from "@/components/ui";
import { useErrorApi } from "@/hooks/useErrorApi";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { centavos } from "@/lib/reglas/dinero";
import { formatQ } from "@/lib/format";
import { pedirApi, postApi } from "@/lib/http";
import { cargosPendientes, montoPagoCargos, totalCargo } from "@/lib/reglas/cuentas";
import type { DetalleCuenta as Detalle, PagoCuenta } from "@/types/pendiente";
import { ComprobantePago, EstadoCuenta } from "./Documentos";
import { ModalAbono } from "./ModalAbono";
import { ModalCargo } from "./ModalCargo";
import { ModalCuenta } from "./ModalCuenta";

/** Cuenta de un cliente u organización: cargos, pagos, saldo y comprobantes. */
export function DetalleCuenta({
  detalle,
  soloLectura,
}: {
  detalle: Detalle;
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const manejarError = useErrorApi();
  const { cuenta, cargos, pagos, saldo } = detalle;
  const esOrg = cuenta.grupo === "organizacion";

  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<
    "cargo" | "abono" | "editar" | "estado" | "pagar" | "eliminar" | null
  >(null);
  const [comprobante, setComprobante] = useState<{ pago: PagoCuenta; detalle: Detalle } | null>(
    null,
  );

  const pendientes = cargosPendientes(cargos);
  const elegidos = useMemo(() => cargos.filter((c) => seleccion.has(c.id)), [cargos, seleccion]);
  const aPagar = montoPagoCargos(elegidos, saldo);

  function alPagar(pago: PagoCuenta, nuevo: Detalle) {
    setModal(null);
    setSeleccion(new Set());
    setComprobante({ pago, detalle: nuevo });
    toast(`Pagó ${formatQ(pago.monto)} · Le quedan ${formatQ(pago.saldoDespues)}`, "success");
    router.refresh();
  }

  async function pagarSeleccionados() {
    try {
      const r = await postApi<{ pago: PagoCuenta; detalle: Detalle }>(
        `/api/cuentas/${encodeURIComponent(cuenta.id)}/pagar-cargos`,
        { cargoIds: [...seleccion] },
      );
      alPagar(r.pago, r.detalle);
    } catch (e) {
      manejarError(e);
    }
  }

  async function eliminar() {
    try {
      await pedirApi("DELETE", `/api/cuentas/${encodeURIComponent(cuenta.id)}`);
      toast(`${cuenta.nombre} eliminado`, "success");
      router.push("/empleado/pendientes");
      router.refresh();
    } catch (e) {
      manejarError(e);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/empleado/pendientes"
        className="inline-flex w-fit items-center gap-1.5 rounded-xs text-small text-ink-muted hover:text-navy-900"
      >
        <ArrowLeft className="size-3.5" /> Todos los pendientes
      </Link>

      {/* Encabezado con el saldo */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg bg-grad-hero p-5 text-white">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-h1 font-semibold">{cuenta.nombre}</h2>
            <Chip tono="bg-white/10 text-navy-300">{esOrg ? "Organización" : "Individual"}</Chip>
          </div>
          {cuenta.telefono && (
            <a
              href={`tel:${cuenta.telefono.replace(/\D/g, "")}`}
              className="mt-1 inline-flex items-center gap-1.5 text-body text-navy-300 hover:text-white"
            >
              <Phone className="size-3.5" /> {cuenta.telefono}
            </a>
          )}
          {cuenta.notas && <p className="mt-2 max-w-xl text-body text-navy-300">{cuenta.notas}</p>}
        </div>
        <div className="text-right">
          <p className="text-overline font-semibold tracking-[0.06em] text-navy-300 uppercase">
            Saldo pendiente
          </p>
          <p className="text-[28px] leading-9 font-semibold text-gold-500 tabular">
            {formatQ(saldo)}
          </p>
          <p className="text-small text-navy-300">
            {pendientes.length} cargo{pendientes.length === 1 ? "" : "s"} sin pagar
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!soloLectura && (
          <>
            <Button onClick={() => setModal("cargo")}>
              <Plus /> Agregar a la cuenta
            </Button>
            <Button variant="dark" onClick={() => setModal("abono")} disabled={saldo <= 0}>
              <HandCoins /> Registrar abono
            </Button>
          </>
        )}
        <Button variant="outline" onClick={() => setModal("estado")}>
          <FileText /> Estado de cuenta
        </Button>
        {!soloLectura && (
          <>
            <Button variant="outline" onClick={() => setModal("editar")}>
              <Pencil /> Editar datos
            </Button>
            <Button
              variant="danger"
              className="ml-auto"
              onClick={() => setModal("eliminar")}
              disabled={saldo > 0}
              title={saldo > 0 ? "Solo se puede eliminar con saldo Q 0.00" : undefined}
            >
              <Trash2 /> Eliminar cliente
            </Button>
          </>
        )}
      </div>

      {/* Cargos */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h3 className="text-body font-semibold text-ink-strong">Lo que se ha llevado</h3>
          {!soloLectura && seleccion.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-small text-ink-muted">
                {seleccion.size} seleccionado{seleccion.size === 1 ? "" : "s"}
              </span>
              <Button size="sm" onClick={() => setModal("pagar")}>
                <HandCoins /> Pagar seleccionados ({formatQ(aPagar)})
              </Button>
            </div>
          )}
        </div>
        {cargos.length === 0 ? (
          <p className="px-5 pb-6 text-body text-ink-muted">Todavía no tiene cargos.</p>
        ) : (
          <Table>
            <THead>
              <tr>
                {!soloLectura && (
                  <Th className="w-10">
                    <span className="sr-only">Seleccionar</span>
                  </Th>
                )}
                <Th>Fecha</Th>
                <Th>Descripción</Th>
                {esOrg && <Th>Se lo llevó</Th>}
                <Th numeric>Cantidad</Th>
                <Th numeric>Precio</Th>
                <Th numeric>Total</Th>
                <Th>Estado</Th>
              </tr>
            </THead>
            <TBody>
              {cargos.map((c) => {
                const pagado = !!c.pagoId;
                return (
                  <Tr
                    key={c.id}
                    selected={seleccion.has(c.id)}
                    className={pagado ? "opacity-60" : undefined}
                  >
                    {!soloLectura && (
                      <Td>
                        {!pagado && saldo > 0 && (
                          <Checkbox
                            label={`Seleccionar ${c.descripcion}`}
                            checked={seleccion.has(c.id)}
                            onChange={(v) =>
                              setSeleccion((prev) => {
                                const s = new Set(prev);
                                if (v) s.add(c.id);
                                else s.delete(c.id);
                                return s;
                              })
                            }
                            className="[&>span:last-child]:sr-only"
                          />
                        )}
                      </Td>
                    )}
                    <Td className="whitespace-nowrap text-ink-muted tabular">
                      {formatFecha(c.fecha)}
                    </Td>
                    <Td>
                      <span className="text-ink-strong">{c.descripcion}</span>
                      {c.nota && <span className="block text-small text-ink-muted">{c.nota}</span>}
                    </Td>
                    {esOrg && (
                      <Td className="whitespace-nowrap">
                        {c.llevadoPor ? (
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="size-3.5 text-ink-muted" /> {c.llevadoPor}
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </Td>
                    )}
                    <Td numeric>{c.cantidad}</Td>
                    <Td numeric>{formatQ(c.precioUnitario)}</Td>
                    <Td numeric className="font-semibold text-ink-strong">
                      {formatQ(totalCargo(c))}
                    </Td>
                    <Td>
                      {pagado ? (
                        <Chip tono="bg-stock-ok-bg text-stock-ok-text">Pagado</Chip>
                      ) : (
                        <Chip tono="bg-gold-100 text-gold-text">Pendiente</Chip>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Pagos */}
      {pagos.length > 0 && (
        <Card>
          <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3">
            <h3 className="text-body font-semibold text-ink-strong">Pagos y abonos</h3>
            <p className="text-small text-ink-muted">
              Total pagado{" "}
              <span className="font-semibold text-stock-ok-text tabular">
                {formatQ(centavos(pagos.reduce((t, p) => t + p.monto, 0)))}
              </span>
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {pagos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-body text-ink-strong">
                    {p.tipo === "abono"
                      ? "Abono"
                      : `Pago de ${p.cargoIds.length} cargo${p.cargoIds.length === 1 ? "" : "s"}`}
                    {p.nota && <span className="text-ink-muted"> · {p.nota}</span>}
                  </p>
                  <p className="text-small text-ink-muted">
                    {formatFechaHora(p.fecha)} · Atendió {p.registradoPor}
                  </p>
                </div>
                <span className="text-price font-semibold text-stock-ok-text tabular">
                  −{formatQ(p.monto)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setComprobante({ pago: p, detalle })}
                >
                  <Receipt /> Comprobante
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {modal === "cargo" && <ModalCargo cuenta={cuenta} onClose={() => setModal(null)} />}
      {modal === "abono" && (
        <ModalAbono detalle={detalle} onClose={() => setModal(null)} onPagado={alPagar} />
      )}
      {modal === "editar" && <ModalCuenta cuenta={cuenta} onClose={() => setModal(null)} />}
      {modal === "estado" && <EstadoCuenta detalle={detalle} onClose={() => setModal(null)} />}
      {modal === "pagar" && (
        <Confirmar
          titulo="¿Paga estos cargos?"
          textoConfirmar={`Sí, pagó ${formatQ(aPagar)}`}
          onCancelar={() => setModal(null)}
          onConfirmar={pagarSeleccionados}
        >
          <ul className="flex flex-col gap-1">
            {elegidos.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span>
                  {c.descripcion} × {c.cantidad}
                </span>
                <span className="tabular">{formatQ(totalCargo(c))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-ink-muted">
            Le quedarán <strong className="text-ink-strong">{formatQ(saldo - aPagar)}</strong>.
            {aPagar < elegidos.reduce((s, c) => s + totalCargo(c), 0) &&
              " (Se descontó lo que ya había abonado.)"}
          </p>
        </Confirmar>
      )}
      {modal === "eliminar" && (
        <Confirmar
          titulo={`¿Eliminar a ${cuenta.nombre}?`}
          textoConfirmar="Sí, eliminar"
          peligro
          onCancelar={() => setModal(null)}
          onConfirmar={eliminar}
        >
          <p>Se borrará la cuenta con todo su historial de cargos y pagos.</p>
          <p className="mt-2 text-ink-muted">Esto no se puede deshacer.</p>
        </Confirmar>
      )}
      {comprobante && (
        <ComprobantePago
          detalle={comprobante.detalle}
          pago={comprobante.pago}
          onClose={() => setComprobante(null)}
        />
      )}
    </div>
  );
}
