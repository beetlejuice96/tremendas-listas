import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pesos } from '../lib/text'
import type { FilaGestion, Owner, Pago, TipoPuesto } from '../types'

const DESCUENTO_FEDERAL = 25

interface Props {
  fila: FilaGestion
  owners: Owner[]
  tipos: TipoPuesto[]
  onCerrar: () => void
  onGuardado: () => Promise<void>
}

export default function PanelCobro({ fila, owners, tipos, onCerrar, onGuardado }: Props) {
  const [pagos, setPagos] = useState<Pago[] | null>(null)
  const [monto, setMonto] = useState('')
  const [cuenta, setCuenta] = useState<string>(owners[0]?.id ?? '')
  const [notas, setNotas] = useState(fila.notas ?? '')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase
      .from('pagos')
      .select('*')
      .eq('participacion_id', fila.id)
      .order('created_at')
      .then(({ data }) => setPagos(data ?? []))
  }, [fila.id])

  async function actualizar(cambios: Record<string, unknown>) {
    setGuardando(true)
    const { error } = await supabase.from('participaciones').update(cambios).eq('id', fila.id)
    if (error) alert('No se pudo guardar: ' + error.message)
    else await onGuardado()
    setGuardando(false)
  }

  /** El precio sale del puesto y del descuento; se guarda porque es lo que se cobra. */
  async function cambiarPuesto(tipoId: string) {
    const tipo = tipos.find((t) => t.id === tipoId)
    if (!tipo) return
    const precio = Number(tipo.precio) * (1 - Number(fila.descuento_pct) / 100)
    await actualizar({ tipo_puesto_id: tipoId, precio_final: precio })
  }

  async function alternarFederal() {
    const nuevoDescuento = Number(fila.descuento_pct) > 0 ? 0 : DESCUENTO_FEDERAL
    const base = Number(fila.precio_lista ?? fila.precio_final ?? 0)
    await Promise.all([
      supabase
        .from('emprendimientos')
        .update({ es_federal: nuevoDescuento > 0 })
        .eq('id', fila.emprendimiento_id),
      supabase
        .from('participaciones')
        .update({
          descuento_pct: nuevoDescuento,
          precio_final: base * (1 - nuevoDescuento / 100),
        })
        .eq('id', fila.id),
    ])
    await onGuardado()
  }

  async function registrarPago() {
    const valor = Number(monto.replace(/[^\d]/g, ''))
    if (!valor) {
      alert('Poné un monto')
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('pagos').insert({
      participacion_id: fila.id,
      monto: valor,
      fecha: new Date().toISOString().slice(0, 10),
      cuenta_id: cuenta || null,
    })
    if (error) {
      alert('No se pudo registrar el pago: ' + error.message)
    } else {
      setMonto('')
      const { data } = await supabase
        .from('pagos').select('*').eq('participacion_id', fila.id).order('created_at')
      setPagos(data ?? [])
      await onGuardado()
    }
    setGuardando(false)
  }

  async function borrarPago(id: string) {
    if (!confirm('¿Borrar este pago?')) return
    await supabase.from('pagos').delete().eq('id', id)
    setPagos((prev) => prev?.filter((p) => p.id !== id) ?? null)
    await onGuardado()
  }

  const saldo = Number(fila.saldo)

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/40" onClick={onCerrar}>
      <div
        className="max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-zinc-100 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 bg-white px-4 pb-3 pt-4 shadow-sm">
          <div className="min-w-0">
            <h2 className="font-bold leading-tight text-zinc-900">{fila.nombre_proyecto}</h2>
            {fila.responsable && <p className="text-sm text-zinc-500">{fila.responsable}</p>}
          </div>
          <button onClick={onCerrar} className="-mr-1 shrink-0 px-2 text-2xl leading-none text-zinc-400">
            ×
          </button>
        </div>

        <div className="space-y-3 p-3">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-500">
                {fila.no_paga ? 'No paga' : saldo <= 0 ? 'Al día' : 'Debe'}
              </span>
              <span
                className={`text-2xl font-bold tabular-nums ${
                  saldo > 0 && !fila.no_paga ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {fila.no_paga ? '—' : pesos(Math.max(saldo, 0))}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              pagó {pesos(Number(fila.pagado))} de {pesos(Number(fila.precio_final ?? 0))}
              {Number(fila.descuento_pct) > 0 && ` · ${fila.descuento_pct}% off`}
            </p>

            {!fila.no_paga && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="Monto"
                    className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-base outline-none focus:border-zinc-900"
                  />
                  <button
                    onClick={registrarPago}
                    disabled={guardando}
                    className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white active:bg-zinc-700 disabled:opacity-50"
                  >
                    Registrar
                  </button>
                </div>
                {owners.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">A la cuenta de</span>
                    {owners.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setCuenta(o.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                          cuenta === o.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {o.nombre}
                      </button>
                    ))}
                  </div>
                )}
                {saldo > 0 && (
                  <button
                    onClick={() => setMonto(String(Math.round(saldo)))}
                    className="text-xs text-zinc-500 underline"
                  >
                    completar el saldo ({pesos(saldo)})
                  </button>
                )}
              </div>
            )}

            {pagos && pagos.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3">
                {pagos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-700">
                      {pesos(Number(p.monto))}
                      <span className="ml-2 text-xs text-zinc-400">
                        {p.fecha ? p.fecha.split('-').reverse().join('/') : ''}
                        {owners.find((o) => o.id === p.cuenta_id)?.nombre &&
                          ` · ${owners.find((o) => o.id === p.cuenta_id)!.nombre}`}
                      </span>
                    </span>
                    <button
                      onClick={() => borrarPago(p.id)}
                      className="px-2 text-xs text-zinc-400 active:text-red-600"
                    >
                      borrar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <Campo etiqueta="Puesto">
              <select
                value={fila.tipo_puesto_id ?? ''}
                onChange={(e) => cambiarPuesto(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base"
              >
                <option value="">— sin asignar —</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} · {pesos(Number(t.precio))}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo etiqueta="Fotos para el catálogo">
              <div className="flex gap-2">
                {(
                  [
                    ['pendiente', 'Pendiente'],
                    ['ok', 'Están ok'],
                    ['pedir_mas', 'Pedir más'],
                  ] as const
                ).map(([valor, label]) => (
                  <button
                    key={valor}
                    onClick={() => actualizar({ fotos_estado: valor })}
                    className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                      fila.fotos_estado === valor
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Campo>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  actualizar({ mail_enviado_at: fila.mail_enviado_at ? null : new Date().toISOString() })
                }
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                  fila.mail_enviado_at ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {fila.mail_enviado_at ? '✓ Mail enviado' : 'Marcar mail enviado'}
              </button>
              <button
                onClick={() => actualizar({ no_paga: !fila.no_paga })}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                  fila.no_paga ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {fila.no_paga ? '✓ No paga' : 'Marcar no paga'}
              </button>
            </div>

            <button
              onClick={alternarFederal}
              className={`w-full rounded-xl py-2.5 text-sm font-medium ${
                Number(fila.descuento_pct) > 0
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {Number(fila.descuento_pct) > 0
                ? `✓ Federal · ${DESCUENTO_FEDERAL}% off aplicado`
                : `Marcar federal (${DESCUENTO_FEDERAL}% off)`}
            </button>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <Campo etiqueta="Notas">
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                onBlur={() => notas !== (fila.notas ?? '') && actualizar({ notas: notas || null })}
                rows={3}
                placeholder="Comparte mesa, trae perchero, algo a resolver…"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-base outline-none focus:border-zinc-900"
              />
            </Campo>
          </section>
        </div>
      </div>
    </div>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {etiqueta}
      </span>
      {children}
    </label>
  )
}
