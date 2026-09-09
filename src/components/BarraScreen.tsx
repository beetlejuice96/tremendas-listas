import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pesos } from '../lib/text'
import type { Edicion, ProductoBarra, VentaBarra } from '../types'

type TipoPrecio = 'publico' | 'feriante'
type Vista = 'vender' | 'resumen'

interface Props {
  onBack: () => void
}

export default function BarraScreen({ onBack }: Props) {
  const [ediciones, setEdiciones] = useState<Edicion[]>([])
  const [edicionId, setEdicionId] = useState<string | null>(null)
  const [productos, setProductos] = useState<ProductoBarra[]>([])
  const [tipo, setTipo] = useState<TipoPrecio>('publico')
  const [ticket, setTicket] = useState<Map<string, number>>(new Map())
  const [vista, setVista] = useState<Vista>('vender')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase
      .from('productos_barra')
      .select('*')
      .eq('activo', true)
      .order('orden')
      .then(({ data }) => setProductos(data ?? []))

    supabase
      .from('ediciones')
      .select('*')
      .order('fecha', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        const lista = data ?? []
        setEdiciones(lista)
        // Arranca en la feria más próxima: la primera que todavía no pasó, o
        // la última que pasó. Así el día de la feria no hay que elegir nada.
        const hoy = new Date().toISOString().slice(0, 10)
        const futuras = lista.filter((e) => e.fecha && e.fecha >= hoy && !e.cancelada)
        const proxima = futuras.length ? futuras[futuras.length - 1] : lista[0]
        setEdicionId(proxima?.id ?? null)
      })
  }, [])

  const precio = (p: ProductoBarra) =>
    Number(tipo === 'publico' ? p.precio_publico : p.precio_feriante)

  const total = useMemo(
    () =>
      [...ticket.entries()].reduce((suma, [id, cant]) => {
        const p = productos.find((x) => x.id === id)
        return suma + (p ? precio(p) * cant : 0)
      }, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ticket, productos, tipo],
  )

  const unidades = [...ticket.values()].reduce((a, b) => a + b, 0)

  function sumar(id: string, delta: number) {
    setTicket((prev) => {
      const next = new Map(prev)
      const cant = (next.get(id) ?? 0) + delta
      if (cant <= 0) next.delete(id)
      else next.set(id, cant)
      return next
    })
  }

  async function cobrar() {
    if (!edicionId || ticket.size === 0) return
    setGuardando(true)
    // Un ticket agrupa lo que se cobró junto, para poder anularlo entero.
    const ticketId = crypto.randomUUID()
    const filas = [...ticket.entries()].map(([producto_id, cantidad]) => ({
      edicion_id: edicionId,
      producto_id,
      cantidad,
      precio_unitario: precio(productos.find((p) => p.id === producto_id)!),
      tipo_precio: tipo,
      ticket: ticketId,
    }))
    const { error } = await supabase.from('ventas_barra').insert(filas)
    setGuardando(false)
    if (error) {
      alert('No se pudo registrar la venta: ' + error.message)
      return
    }
    setTicket(new Map())
  }

  const edicion = ediciones.find((e) => e.id === edicionId)
  const categorias = [...new Set(productos.map((p) => p.categoria))]

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-100">
      <header className="sticky top-0 z-10 bg-zinc-900 px-4 pb-3 pt-4 text-white shadow-md">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button onClick={onBack} className="-ml-1 px-1 text-sm text-zinc-400">
            ‹ Volver
          </button>
          <h1 className="font-semibold">Barra</h1>
          <select
            value={edicionId ?? ''}
            onChange={(e) => setEdicionId(e.target.value)}
            className="max-w-[9.5rem] truncate rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-300 outline-none"
          >
            {ediciones.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex rounded-full bg-zinc-800 p-1">
          {(
            [
              ['vender', 'Vender'],
              ['resumen', 'Resumen'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setVista(key)}
              className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
                vista === key ? 'bg-white text-zinc-900' : 'text-zinc-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {vista === 'resumen' ? (
        <Resumen edicionId={edicionId} nombreEdicion={edicion?.nombre ?? ''} />
      ) : (
        <>
          <main className="flex-1 overflow-y-auto p-3 pb-4">
            <div className="mx-auto max-w-md space-y-4">
              {/* El precio de feriante aplica a tandas enteras, por eso el
                  interruptor manda sobre toda la pantalla y no por producto. */}
              <div className="flex rounded-xl bg-white p-1 shadow-sm">
                {(
                  [
                    ['publico', 'Público'],
                    ['feriante', 'Feriante'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTipo(key)}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      tipo === key ? 'bg-zinc-900 text-white' : 'text-zinc-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {categorias.map((cat) => (
                <section key={cat}>
                  <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {cat}
                  </h2>
                  <div className="space-y-1.5">
                    {productos
                      .filter((p) => p.categoria === cat)
                      .map((p) => {
                        const cant = ticket.get(p.id) ?? 0
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm ${
                              cant > 0 ? 'ring-2 ring-zinc-900' : ''
                            }`}
                          >
                            <button
                              onClick={() => sumar(p.id, 1)}
                              className="min-w-0 flex-1 text-left active:opacity-60"
                            >
                              <div className="font-semibold leading-tight text-zinc-900">
                                {p.nombre}
                              </div>
                              <div className="text-xs text-zinc-500">{pesos(precio(p))}</div>
                            </button>
                            {cant > 0 && (
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  onClick={() => sumar(p.id, -1)}
                                  className="h-9 w-9 rounded-lg bg-zinc-100 text-lg font-bold text-zinc-600 active:bg-zinc-200"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-lg font-bold tabular-nums">
                                  {cant}
                                </span>
                              </div>
                            )}
                            <button
                              onClick={() => sumar(p.id, 1)}
                              className="h-9 w-9 shrink-0 rounded-lg bg-zinc-900 text-lg font-bold text-white active:bg-zinc-700"
                            >
                              +
                            </button>
                          </div>
                        )
                      })}
                  </div>
                </section>
              ))}
            </div>
          </main>

          {ticket.size > 0 && (
            <div className="sticky bottom-0 border-t border-zinc-200 bg-white p-3">
              <div className="mx-auto flex max-w-md items-center gap-3">
                <button
                  onClick={() => setTicket(new Map())}
                  className="rounded-xl bg-zinc-200 px-4 py-3.5 text-sm font-medium text-zinc-700 active:bg-zinc-300"
                >
                  Limpiar
                </button>
                <button
                  onClick={cobrar}
                  disabled={guardando}
                  className="flex flex-1 items-center justify-between rounded-xl bg-green-600 px-4 py-3.5 font-semibold text-white active:bg-green-700 disabled:opacity-50"
                >
                  <span>{guardando ? 'Guardando…' : `Cobrar ${unidades}`}</span>
                  <span className="text-lg tabular-nums">{pesos(total)}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Resumen({
  edicionId,
  nombreEdicion,
}: {
  edicionId: string | null
  nombreEdicion: string
}) {
  const [ventas, setVentas] = useState<VentaBarra[] | null>(null)

  useEffect(() => {
    if (!edicionId) return
    supabase
      .from('ventas_barra')
      .select('*, productos_barra ( nombre, categoria, costo )')
      .eq('edicion_id', edicionId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setVentas((data as VentaBarra[]) ?? []))
  }, [edicionId])

  async function anularTicket(ticket: string) {
    if (!confirm('¿Anular esta venta?')) return
    setVentas((prev) =>
      prev?.map((v) => (v.ticket === ticket ? { ...v, anulada: true } : v)) ?? prev,
    )
    const { error } = await supabase
      .from('ventas_barra')
      .update({ anulada: true })
      .eq('ticket', ticket)
    if (error) alert('No se pudo anular: ' + error.message)
  }

  const activas = (ventas ?? []).filter((v) => !v.anulada)
  const recaudado = activas.reduce((s, v) => s + v.cantidad * Number(v.precio_unitario), 0)
  const unidades = activas.reduce((s, v) => s + v.cantidad, 0)
  const tickets = new Set(activas.map((v) => v.ticket)).size

  const conCosto = activas.filter((v) => v.productos_barra?.costo != null)
  const gananciaParcial = conCosto.reduce(
    (s, v) => s + v.cantidad * (Number(v.precio_unitario) - Number(v.productos_barra!.costo)),
    0,
  )

  const porProducto = useMemo(() => {
    const acc = new Map<string, { nombre: string; unidades: number; total: number }>()
    for (const v of activas) {
      const nombre = v.productos_barra?.nombre ?? '—'
      const actual = acc.get(nombre) ?? { nombre, unidades: 0, total: 0 }
      actual.unidades += v.cantidad
      actual.total += v.cantidad * Number(v.precio_unitario)
      acc.set(nombre, actual)
    }
    return [...acc.values()].sort((a, b) => b.unidades - a.unidades)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventas])

  const porTipo = (t: TipoPrecio) =>
    activas
      .filter((v) => v.tipo_precio === t)
      .reduce((s, v) => s + v.cantidad * Number(v.precio_unitario), 0)

  // Un ticket por fila, para poder anularlo entero.
  const ticketsRecientes = useMemo(() => {
    const acc = new Map<string, { ticket: string; total: number; items: number; fecha: string; anulada: boolean }>()
    for (const v of ventas ?? []) {
      const actual = acc.get(v.ticket) ?? {
        ticket: v.ticket, total: 0, items: 0, fecha: v.created_at, anulada: v.anulada,
      }
      actual.total += v.cantidad * Number(v.precio_unitario)
      actual.items += v.cantidad
      acc.set(v.ticket, actual)
    }
    return [...acc.values()].slice(0, 15)
  }, [ventas])

  if (!edicionId) return <p className="py-10 text-center text-zinc-500">Elegí una edición</p>
  if (ventas === null) return <p className="py-10 text-center text-zinc-500">Cargando…</p>

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-3 p-3 pb-8">
      <section className="rounded-2xl bg-zinc-900 p-4 text-white">
        <div className="text-xs text-zinc-400">{nombreEdicion}</div>
        <div className="mt-0.5 text-3xl font-bold tabular-nums">{pesos(recaudado)}</div>
        <div className="mt-1 flex gap-3 text-xs text-zinc-400">
          <span>{tickets} ventas</span>
          <span>{unidades} unidades</span>
        </div>
        <div className="mt-3 flex gap-4 border-t border-zinc-700 pt-3 text-xs">
          <span className="text-zinc-300">
            Público <strong className="tabular-nums">{pesos(porTipo('publico'))}</strong>
          </span>
          <span className="text-zinc-300">
            Feriante <strong className="tabular-nums">{pesos(porTipo('feriante'))}</strong>
          </span>
        </div>
        {conCosto.length > 0 && (
          <div className="mt-2 border-t border-zinc-700 pt-2 text-xs text-green-400">
            Ganancia <strong className="tabular-nums">{pesos(gananciaParcial)}</strong>
            {conCosto.length < activas.length && (
              <span className="text-zinc-500"> · faltan costos de algunos productos</span>
            )}
          </div>
        )}
        {conCosto.length === 0 && activas.length > 0 && (
          <div className="mt-2 border-t border-zinc-700 pt-2 text-xs text-zinc-500">
            Para ver la ganancia hay que cargar el costo de cada producto
          </div>
        )}
      </section>

      {porProducto.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Qué se vendió
          </h2>
          <div className="space-y-1.5">
            {porProducto.map((p) => (
              <div key={p.nombre} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-zinc-800">{p.nombre}</span>
                <span className="shrink-0 font-semibold tabular-nums">{p.unidades}</span>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                  {pesos(p.total)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {ticketsRecientes.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Últimas ventas
          </h2>
          <div className="space-y-1">
            {ticketsRecientes.map((t) => (
              <div
                key={t.ticket}
                className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm ${
                  t.anulada ? 'text-zinc-400 line-through' : 'text-zinc-800'
                }`}
              >
                <span className="text-xs tabular-nums text-zinc-500">
                  {new Date(t.fecha).toLocaleTimeString('es-AR', {
                    hour: '2-digit', minute: '2-digit', hour12: false,
                  })}
                </span>
                <span className="text-xs text-zinc-500">{t.items} u.</span>
                <span className="flex-1 text-right font-semibold tabular-nums">
                  {pesos(t.total)}
                </span>
                {!t.anulada && (
                  <button
                    onClick={() => anularTicket(t.ticket)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs text-red-600 active:bg-red-50"
                  >
                    Anular
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {activas.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">Todavía no se vendió nada</p>
      )}
    </main>
  )
}
