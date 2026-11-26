"use client";

import { useState, type ReactNode } from "react";
import {
  Bell,
  Boxes,
  Download,
  Hand,
  MoreHorizontal,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Counter,
  Field,
  Input,
  KpiCard,
  Modal,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  StatusChip,
  StockChip,
  Switch,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { formatQ } from "@/lib/format";
import { nivelStock } from "@/lib/stock";

/**
 * Galería de componentes (solo desarrollo).
 * Sirve para revisar que cada pieza cumple la Guía UI v2 antes de armar las pantallas.
 */

const pendientes = [
  {
    fecha: "20/11/2026",
    cliente: "Rosa Méndez",
    producto: "Cuaderno universitario",
    cant: 3,
    precio: 15,
  },
  {
    fecha: "21/11/2026",
    cliente: "Escuela El Progreso",
    producto: "Resma hojas carta 75g",
    cant: 2,
    precio: 42,
  },
  {
    fecha: "22/11/2026",
    cliente: "Juan Pérez",
    producto: "Folder tamaño carta",
    cant: 25,
    precio: 1.5,
  },
  {
    fecha: "24/11/2026",
    cliente: "María López",
    producto: "Marcadores permanentes",
    cant: 4,
    precio: 8,
  },
];

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-overline font-semibold tracking-[0.06em] text-ink-muted uppercase">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default function GaleriaComponentes() {
  const toast = useToast();
  const [movimiento, setMovimiento] = useState<"venta" | "consumo" | "merma">("venta");
  const [presentacion, setPresentacion] = useState<"unidad" | "paquete">("unidad");
  const [fraccionable, setFraccionable] = useState(true);
  const [consumo, setConsumo] = useState(false);
  const [tab, setTab] = useState<"org" | "ind">("ind");
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState(1);
  const [modal, setModal] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="flex h-topbar items-center justify-between border-b border-gray-200 bg-white px-6">
        <h1 className="text-h1 font-light text-ink-strong">Componentes</h1>
        <div className="flex items-center gap-4">
          <span className="relative text-ink-muted">
            <Bell className="size-[18px]" />
            <Counter value={2} className="absolute -top-2 -right-2.5" />
          </span>
          <span className="relative text-ink-muted">
            <ShoppingCart className="size-[18px]" />
            <Counter value={12} className="absolute -top-2 -right-2.5" />
          </span>
          <span className="flex items-center gap-2 text-button text-ink">
            <Avatar name="Paola" size={28} />
            Paola
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-8 p-6">
        <Seccion titulo="Botones">
          <div className="flex flex-wrap items-center gap-2">
            <Button>
              <Plus /> Confirmar venta
            </Button>
            <Button variant="dark">Buscar</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="outline">
              <Download /> Descargar PDF
            </Button>
            <Button variant="danger">
              <Trash2 /> Eliminar
            </Button>
            <Button variant="icon" aria-label="Editar">
              <Pencil />
            </Button>
            <Button variant="icon" aria-label="Más acciones">
              <MoreHorizontal />
            </Button>
            <Button size="sm" variant="outline">
              Pequeño (28px)
            </Button>
            <Button disabled>Deshabilitado</Button>
          </div>
        </Seccion>

        <Seccion titulo="Tarjetas KPI">
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              highlight
              label="Ventas de hoy"
              value={formatQ(1240.5)}
              detail="32 ventas"
              icon={<ShoppingCart />}
            />
            <KpiCard label="Pendientes" value={formatQ(865)} detail="12 clientes" icon={<Hand />} />
            <KpiCard label="Entradas sin leer" value="3" detail="trámites" icon={<Bell />} />
            <KpiCard
              danger
              label="Stock bajo"
              value="7"
              detail="productos"
              icon={<TriangleAlert />}
            />
          </div>
        </Seccion>

        <Seccion titulo="Chips: semáforo, estados y contadores">
          <div className="flex flex-wrap items-center gap-2">
            <StockChip nivel={nivelStock(80, 100)} disponible={80} />
            <StockChip nivel={nivelStock(42, 100)} disponible={42} />
            <StockChip nivel={nivelStock(3, 100)} disponible={3} />
            <StockChip nivel={nivelStock(0, 100)} disponible={0} />
            <StockChip nivel={nivelStock(42, 100)} disponible={42} detalle="42 de 100" />
            <span className="mx-2 h-5 w-px bg-gray-200" />
            <StatusChip estado="recibido" />
            <StatusChip estado="en_proceso" />
            <StatusChip estado="listo" />
            <StatusChip estado="entregado" />
            <span className="mx-2 h-5 w-px bg-gray-200" />
            <Chip>Consumo interno</Chip>
            <Chip>Unidad / Paquete</Chip>
            <Counter value={3} />
            <Counter value={14} />
            <Counter value={2} urgent />
          </div>
        </Seccion>

        <Seccion titulo="Avisos">
          <Alert tone="info" onClose={() => undefined}>
            Folder tamaño carta cambió de {formatQ(2)} a {formatQ(1.5)} por compra al por mayor.
          </Alert>
          <Alert tone="success">Venta confirmada.</Alert>
          <Alert
            tone="warning"
            action={
              <Button size="sm" variant="secondary">
                <Boxes /> Abrir nuevo paquete
              </Button>
            }
          >
            No quedan unidades sueltas: abre un nuevo paquete.
          </Alert>
          <Alert tone="danger">El motivo de la merma es obligatorio.</Alert>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast("Entrada enviada a Paola", "success")}>
              Mostrar toast
            </Button>
            <Button variant="outline" onClick={() => setModal(true)}>
              Abrir modal
            </Button>
          </div>
        </Seccion>

        <Seccion titulo="Formularios">
          <Card>
            <CardBody className="grid grid-cols-3 gap-4 pt-5">
              <Field label="Nombre del cliente">
                {(id) => <Input id={id} placeholder="Ej. María López" />}
              </Field>
              <Field label="Tipo de trámite">
                {(id) => (
                  <Select id={id} defaultValue="nit">
                    <optgroup label="SAT">
                      <option value="nit">Actualización de NIT</option>
                      <option value="solvencia">Solvencia fiscal</option>
                    </optgroup>
                    <optgroup label="RENAP">
                      <option value="nac">Certificado de nacimiento</option>
                    </optgroup>
                  </Select>
                )}
              </Field>
              <Field label="Buscar">
                {(id) => <SearchInput id={id} placeholder="Buscar producto o código" />}
              </Field>
              <Field label="Motivo de la merma" error="Este campo es obligatorio.">
                {(id, desc) => <Input id={id} invalid aria-describedby={desc} />}
              </Field>
              <Field label="Notas" hint="Opcional" className="col-span-2">
                {(id, desc) => (
                  <Textarea
                    id={id}
                    aria-describedby={desc}
                    placeholder="Viene a recoger el viernes"
                  />
                )}
              </Field>
              <div className="flex flex-col gap-3">
                <span className="text-small font-medium text-ink">Tipo de movimiento</span>
                <SegmentedControl
                  ariaLabel="Tipo de movimiento"
                  value={movimiento}
                  onChange={setMovimiento}
                  options={[
                    { value: "venta", label: "Venta" },
                    { value: "consumo", label: "Consumo interno" },
                    { value: "merma", label: "Merma" },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-small font-medium text-ink">Presentación</span>
                <SegmentedControl
                  ariaLabel="Presentación"
                  value={presentacion}
                  onChange={setPresentacion}
                  options={[
                    { value: "unidad", label: "Por unidad" },
                    { value: "paquete", label: "Por paquete (100 u.)" },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Switch
                  label="Producto fraccionable"
                  checked={fraccionable}
                  onChange={setFraccionable}
                />
                <Switch label="Aplica a consumo interno" checked={consumo} onChange={setConsumo} />
              </div>
            </CardBody>
          </Card>
        </Seccion>

        <Seccion titulo="Tabla con pestañas y paginación">
          <Card>
            <div className="px-4 pt-3">
              <Tabs
                ariaLabel="Tipo de cliente"
                value={tab}
                onChange={setTab}
                items={[
                  { value: "org", label: "Organizaciones", count: 4 },
                  { value: "ind", label: "Clientes individuales", count: 12 },
                ]}
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <SearchInput placeholder="Buscar cliente" className="w-64" />
              <Button size="sm">
                <Plus /> Nuevo pendiente
              </Button>
            </div>
            <Table>
              <THead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Cliente</Th>
                  <Th>Descripción del producto</Th>
                  <Th numeric>Cantidad</Th>
                  <Th numeric>Precio unitario</Th>
                  <Th numeric>Total</Th>
                  <Th className="w-28">Acciones</Th>
                </tr>
              </THead>
              <TBody>
                {pendientes.map((p, i) => (
                  <Tr
                    key={p.cliente}
                    selected={i === seleccion}
                    onClick={() => setSeleccion(i)}
                    className="cursor-pointer"
                  >
                    <Td className="text-ink-muted tabular">{p.fecha}</Td>
                    <Td>
                      <span className="flex items-center gap-2 font-semibold text-ink-strong">
                        <Avatar name={p.cliente} size={28} />
                        {p.cliente}
                      </span>
                    </Td>
                    <Td>{p.producto}</Td>
                    <Td numeric>{p.cant}</Td>
                    <Td numeric>{formatQ(p.precio)}</Td>
                    <Td numeric className="font-semibold text-ink-strong">
                      {formatQ(p.cant * p.precio)}
                    </Td>
                    <Td>
                      <Button size="sm" variant="icon" aria-label="Más acciones">
                        <MoreHorizontal />
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination
              page={pagina}
              total={24}
              onChange={setPagina}
              className="border-t border-gray-200"
            />
          </Card>
        </Seccion>

        <Seccion titulo="Tarjetas">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader
                title="Entradas de trámite"
                actions={
                  <a className="text-small text-ink-muted hover:text-navy-900" href="#">
                    Ver todo
                  </a>
                }
              />
              <CardBody className="text-ink-muted">
                Tarjeta base: borde #E5E5E5, radio 6px, relleno 20px.
              </CardBody>
            </Card>
            <div className="rounded-md border border-gold-200 bg-grad-gold-soft p-5">
              <h3 className="text-body font-semibold text-ink-strong">Resumen de hoy</h3>
              <p className="mt-1 text-ink-muted">
                Tarjeta de resumen con el degradado dorado suave.
              </p>
            </div>
            <Card className="border-t-[3px] border-t-navy-900">
              <CardHeader
                title="NIT por primera vez"
                actions={<Chip tono="bg-st-recibido-bg text-navy-900">SAT</Chip>}
              />
              <CardBody className="flex items-end justify-between">
                <span className="text-small text-ink-muted">
                  DPI, recibo de luz, correo, teléfono
                </span>
                <span className="font-semibold text-ink-strong tabular">{formatQ(80)}</span>
              </CardBody>
            </Card>
          </div>
        </Seccion>
      </main>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Enviar comentario"
        subtitle="Se notificará a la persona que elijas"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setModal(false);
                toast("Comentario enviado", "success");
              }}
            >
              Enviar
            </Button>
          </>
        }
      >
        <Field label="Comentario">
          {(id) => (
            <Textarea id={id} defaultValue="Se acabaron los folders tamaño oficio, ¿pedimos más?" />
          )}
        </Field>
      </Modal>
    </div>
  );
}
