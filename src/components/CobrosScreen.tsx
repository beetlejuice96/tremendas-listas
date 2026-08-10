import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { normalizeText, pesos, soloDigitos } from '../lib/text'
import PanelCobro from './PanelCobro'
import type { Edicion, FilaGestion, Owner, TipoPuesto } from '../types'

type Filtro = 'todos' | 'sin_pagar' | 'parcial' | 'al_dia' | 'sin_fotos'

const FILTROS: [Filtro, string][] = [
  ['todos', 'Todos'],
  ['sin_pagar', 'Sin pagar'],
  ['parcial', 'Parcial'],
  ['al_dia', 'Al día'],
  ['sin_fotos', 'Sin fotos'],
]

interface Props {
  edicion: Edicion
  onVerPerfil: (emprendimientoId: string) => void
  onEdicionActualizada: (edicion: Edicion) => void
}

export default function CobrosScreen({ edicion, onVerPerfil, onEdicionActualizada }: Props) {
  const [filas, setFilas] = useState<FilaGestion[] | null>(null)
  const [owners, setOwners] = useState<Owner[]>([])
  const [tipos, setTipos] = useState<TipoPuesto[]>([])
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [abierta, setAbierta] = useState<string | null>(null)

  async function cargar() {
    const { data, error } = await supabase
      .from('gestion_edicion')
      .select('*')
      .eq('edicion_id', edicion.id)
      .order('nombre_proyecto')
    if (error) {
      alert('Error cargando cobros: ' + error.message)
      setFilas([])
      return
    }
    setFilas(data)
  }

  async function guardarLimite(campo: 'fecha_limite_sena' | 'fecha_limite_pago', fecha: string) {
    const valor = fecha || null
    const { error } = await supabase
      .from('ediciones')
      .update({ [campo]: valor })
      .eq('id', edicion.id)
    if (error) alert('No se pudo guardar la fecha: ' + error.message)
    else onEdicionActualizada({ ...edicion, [campo]: valor })
  }

  useEffect(() => {
    cargar()
    supabase.from('owners').select('id, nombre').then(({ data }) => setOwners(data ?? []))
    supabase
      .from('tipos_puesto')
      .select('id, nombre, precio, orden')
      .eq('edicion_id', edicion.id)
      .order('orden')
      .then(({ data }) => setTipos(data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicion.id])

  const total = useMemo(() => {
    const activos = (filas ?? []).filter((f) => f.estado === 'confirmada')
    return {
      puestos: activos.length,
      esperado: activos.reduce((s, f) => s + (f.no_paga ? 0 : Number(f.precio_final ?? 0)), 0),
      cobrado: activos.reduce((s, f) => s + Number(f.pagado), 0),
      sinPagar: activos.filter((f) => !f.no_paga && Number(f.pagado) === 0).length,
      parcial: activos.filter((f) => Number(f.pagado) > 0 && Number(f.saldo) > 0).length,
      alDia: activos.filter((f) => f.no_paga || Number(f.saldo) <= 0).length,
    }
  }, [filas])

  const visibles = useMemo(() => {
    if (!filas) return []
    const q = normalizeText(busqueda)
    return filas.filter((f) => {
      if (f.estado !== 'confirmada') return false
      if (filtro === 'sin_pagar' && (f.no_paga || Number(f.pagado) > 0)) return false
      if (filtro === 'parcial' && !(Number(f.pagado) > 0 && Number(f.saldo) > 0)) return false
      if (filtro === 'al_dia' && !(f.no_paga || Number(f.saldo) <= 0)) return false
      if (filtro === 'sin_fotos' && f.fotos_estado === 'ok') return false
      if (!q) return true
      return normalizeText(`${f.nombre_proyecto} ${f.responsable ?? ''} ${f.handle}`).includes(q)
    })
  }, [filas, filtro, busqueda])

  const avance = total.esperado > 0 ? (total.cobrado / total.esperado) * 100 : 0
  const filaAbierta = filas?.find((f) => f.id === abierta) ?? null

  const hoy = new Date().toISOString().slice(0, 10)
  const diasPara = (fecha: string | null) =>
    fecha
      ? Math.round((new Date(fecha).getTime() - new Date(hoy).getTime()) / 86_400_000)
      : null

  return (
    <div className="pb-8">
      <div className="bg-zinc-800 px-4 py-3 text-white">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tabular-nums">{pesos(total.cobrado)}</span>
          <span className="text-sm text-zinc-400">de {pesos(total.esperado)}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-700">
          <div className="h-full rounded-full bg-green-500" style={{ width: `${avance}%` }} />
        </div>
        <div className="mt-2 flex gap-3 text-xs text-zinc-400">
          <span>{total.puestos} puestos</span>
          <span className="text-red-400">{total.sinPagar} sin pagar</span>
          <span className="text-amber-400">{total.parcial} parcial</span>
          <span className="text-green-400">{total.alDia} al día</span>
        </div>

        <div className="mt-3 flex gap-2 border-t border-zinc-700 pt-3 text-xs">
          <LimiteFecha
            etiqueta="Seña"
            fecha={edicion.fecha_limite_sena}
            dias={diasPara(edicion.fecha_limite_sena)}
            onCambiar={(f) => guardarLimite('fecha_limite_sena', f)}
          />
          <LimiteFecha
            etiqueta="Pago total"
            fecha={edicion.fecha_limite_pago}
            dias={diasPara(edicion.fecha_limite_pago)}
            onCambiar={(f) => guardarLimite('fecha_limite_pago', f)}
          />
          <LimiteFecha
            etiqueta="Feria"
            fecha={edicion.fecha}
            dias={diasPara(edicion.fecha)}
          />
        </div>
      </div>

      <div className="sticky top-0 z-10 space-y-2 bg-zinc-100 px-3 py-2">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar proyecto o responsable…"
          className="w-full rounded-xl bg-white px-4 py-2.5 text-base shadow-sm ring-1 ring-black/5 outline-none focus:ring-zinc-900"
        />
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
          {FILTROS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                filtro === key ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 shadow-sm'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-md space-y-2 px-3">
        {filas === null && <p className="py-8 text-center text-zinc-500">Cargando…</p>}
        {filas !== null && visibles.length === 0 && (
          <p className="py-8 text-center text-zinc-500">Nadie en este filtro</p>
        )}

        {visibles.map((f) => {
          const saldo = Number(f.saldo)
          const pagado = Number(f.pagado)
          return (
            <div key={f.id} className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => onVerPerfil(f.emprendimiento_id)}
                  className="min-w-0 flex-1 text-left active:opacity-60"
                >
                  <div className="font-semibold leading-tight text-zinc-900">
                    {f.nombre_proyecto}
                    {f.es_federal && (
                      <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        federal
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {f.tipo_puesto ?? 'sin puesto'}
                    {f.precio_final != null && ` · ${pesos(Number(f.precio_final))}`}
                  </div>
                </button>
                <button
                  onClick={() => setAbierta(f.id)}
                  className="shrink-0 rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700 active:bg-zinc-200"
                >
                  Editar
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                {f.no_paga ? (
                  <Chip tono="neutro">no paga</Chip>
                ) : saldo <= 0 ? (
                  <Chip tono="ok">pagó todo</Chip>
                ) : pagado > 0 ? (
                  <Chip tono="alerta">
                    pagó {pesos(pagado)} · debe {pesos(saldo)}
                  </Chip>
                ) : (
                  <Chip tono="error">debe {pesos(saldo)}</Chip>
                )}
                {f.mail_enviado_at && <Chip tono="neutro">mail enviado</Chip>}
                {f.fotos_estado === 'ok' && <Chip tono="ok">fotos ok</Chip>}
                {f.fotos_estado === 'pedir_mas' && <Chip tono="alerta">pedir fotos</Chip>}
                {f.celular && (
                  <a
                    href={`https://wa.me/${soloDigitos(f.celular)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto rounded-full bg-green-600 px-2.5 py-1 font-medium text-white active:bg-green-700"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </main>

      {filaAbierta && (
        <PanelCobro
          fila={filaAbierta}
          owners={owners}
          tipos={tipos}
          onCerrar={() => setAbierta(null)}
          onGuardado={async () => {
            await cargar()
          }}
        />
      )}
    </div>
  )
}

/** Una fecha clave de la edición, con la cuenta regresiva. Editable si se puede. */
function LimiteFecha({
  etiqueta,
  fecha,
  dias,
  onCambiar,
}: {
  etiqueta: string
  fecha: string | null
  dias: number | null
  onCambiar?: (fecha: string) => void
}) {
  const vencida = dias != null && dias < 0
  const cerca = dias != null && dias >= 0 && dias <= 7

  return (
    <div className="flex-1">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{etiqueta}</div>
      {onCambiar ? (
        <input
          type="date"
          value={fecha ?? ''}
          onChange={(e) => onCambiar(e.target.value)}
          className="w-full bg-transparent text-xs text-white outline-none"
        />
      ) : (
        <div className="text-xs text-white">
          {fecha ? fecha.split('-').reverse().join('/') : '—'}
        </div>
      )}
      {dias != null && (
        <div
          className={`text-[10px] ${
            vencida ? 'text-red-400' : cerca ? 'text-amber-400' : 'text-zinc-500'
          }`}
        >
          {vencida
            ? `vencida hace ${Math.abs(dias)}d`
            : dias === 0
              ? 'es hoy'
              : `en ${dias} días`}
        </div>
      )}
    </div>
  )
}

function Chip({
  children,
  tono,
}: {
  children: React.ReactNode
  tono: 'ok' | 'alerta' | 'error' | 'neutro'
}) {
  const estilos = {
    ok: 'bg-green-100 text-green-700',
    alerta: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-700',
    neutro: 'bg-zinc-100 text-zinc-600',
  }[tono]
  return <span className={`rounded-full px-2 py-0.5 font-medium ${estilos}`}>{children}</span>
}
