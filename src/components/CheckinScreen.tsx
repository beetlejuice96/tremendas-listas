import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { normalizeText, formatHora } from '../lib/text'
import MapaView from './MapaView'
import { aFeriante } from '../types'
import type { Edicion, Feriante, ParticipacionConEmprendimiento } from '../types'

const CAMPOS_PARTICIPACION =
  'id, edicion_id, numero_mesa, sector, sector_color, llegado_at, created_at,' +
  ' emprendimientos ( handle, nombre_proyecto, responsable )'

interface Props {
  edicion: Edicion
  onBack: () => void
}

type Filtro = 'todos' | 'pendientes' | 'llegaron'

export default function CheckinScreen({ edicion, onBack }: Props) {
  const [feriantes, setFeriantes] = useState<Feriante[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [sectoresActivos, setSectoresActivos] = useState<Set<string>>(new Set())
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista')

  function toggleSector(sector: string) {
    setSectoresActivos((prev) => {
      const next = new Set(prev)
      if (next.has(sector)) next.delete(sector)
      else next.add(sector)
      return next
    })
  }

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      const { data, error } = await supabase
        .from('participaciones')
        .select(CAMPOS_PARTICIPACION)
        .eq('edicion_id', edicion.id)
        .eq('estado', 'confirmada')
        .order('numero_mesa', { ascending: true, nullsFirst: false })
      if (cancelado) return
      if (error) {
        alert('Error cargando feriantes: ' + error.message)
        setFeriantes([])
        return
      }
      setFeriantes((data as unknown as ParticipacionConEmprendimiento[]).map(aFeriante))
    }

    cargar()

    const canal = supabase
      .channel(`participaciones-${edicion.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participaciones',
          filter: `edicion_id=eq.${edicion.id}`,
        },
        // El payload de realtime no trae el emprendimiento embebido, así que sólo
        // se sincroniza la llegada: es lo único que cambia durante la feria.
        (payload) => {
          const { id, llegado_at } = payload.new as { id: string; llegado_at: string | null }
          setFeriantes((prev) =>
            prev ? prev.map((f) => (f.id === id ? { ...f, llegado_at } : f)) : prev,
          )
        },
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [edicion.id])

  async function toggleLlegada(f: Feriante) {
    if (f.llegado_at && !confirm(`¿Desmarcar la llegada de ${f.proyecto}?`)) return
    const llegado_at = f.llegado_at ? null : new Date().toISOString()
    setFeriantes((prev) =>
      prev ? prev.map((x) => (x.id === f.id ? { ...x, llegado_at } : x)) : prev,
    )
    const { error } = await supabase.from('participaciones').update({ llegado_at }).eq('id', f.id)
    if (error) {
      setFeriantes((prev) =>
        prev ? prev.map((x) => (x.id === f.id ? { ...x, llegado_at: f.llegado_at } : x)) : prev,
      )
      alert('No se pudo guardar: ' + error.message)
    }
  }

  const sectores = useMemo(() => {
    if (!feriantes) return []
    const vistos = new Map<string, string | null>()
    for (const f of feriantes) {
      if (f.sector && !vistos.has(f.sector)) vistos.set(f.sector, f.sector_color)
    }
    return [...vistos.entries()].map(([nombre, color]) => ({ nombre, color }))
  }, [feriantes])

  const filtrados = useMemo(() => {
    if (!feriantes) return []
    const q = normalizeText(busqueda)
    return feriantes.filter((f) => {
      if (filtro === 'pendientes' && f.llegado_at) return false
      if (filtro === 'llegaron' && !f.llegado_at) return false
      if (sectoresActivos.size > 0 && (!f.sector || !sectoresActivos.has(f.sector))) return false
      if (!q) return true
      const texto = normalizeText(
        `${f.proyecto} ${f.responsable ?? ''} ${f.handle ?? ''} ${f.numero ?? ''}`,
      )
      return texto.includes(q)
    })
  }, [feriantes, busqueda, filtro, sectoresActivos])

  const total = feriantes?.length ?? 0
  const llegaron = feriantes?.filter((f) => f.llegado_at).length ?? 0

  return (
    <div className="min-h-dvh bg-zinc-100 pb-8">
      <header className="sticky top-0 z-10 bg-zinc-900 px-4 pb-3 pt-4 text-white shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={onBack} className="-ml-1 rounded-lg px-1 py-1 text-sm text-zinc-400">
            ‹ Ediciones
          </button>
          <h1 className="font-semibold">{edicion.nombre}</h1>
          <span className="rounded-full bg-zinc-700 px-2.5 py-0.5 text-sm font-medium tabular-nums">
            {llegaron}/{total}
          </span>
        </div>

        <div className="mb-3 flex rounded-full bg-zinc-800 p-1">
          {(
            [
              ['lista', 'Lista'],
              ['mapa', 'Mapa'],
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

        {vista === 'lista' && (
          <>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar proyecto, nombre, @handle o mesa…"
          className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-base text-white placeholder-zinc-500 outline-none focus:bg-zinc-700"
        />

        <div className="mt-3 flex gap-2">
          {(
            [
              ['todos', 'Todos'],
              ['pendientes', 'Pendientes'],
              ['llegaron', 'Llegaron'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
                filtro === key ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {sectores.length > 0 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {sectores.map((s) => {
              const activo = sectoresActivos.has(s.nombre)
              return (
                <button
                  key={s.nombre}
                  onClick={() => toggleSector(s.nombre)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium text-zinc-900 transition-all ${
                    activo
                      ? 'border-white ring-2 ring-white'
                      : 'border-black/10 opacity-60'
                  }`}
                  style={{ backgroundColor: s.color ? `#${s.color}` : '#e4e4e7' }}
                >
                  {s.nombre}
                  {activo ? ' ✓' : ''}
                </button>
              )
            })}
          </div>
        )}
          </>
        )}
      </header>

      {vista === 'mapa' && feriantes !== null && (
        <MapaView feriantes={feriantes} onToggle={toggleLlegada} />
      )}

      {vista === 'lista' && (
      <main className="mx-auto max-w-md space-y-2 p-3">
        {feriantes === null && <p className="py-8 text-center text-zinc-500">Cargando…</p>}

        {feriantes !== null && filtrados.length === 0 && (
          <p className="py-8 text-center text-zinc-500">
            {busqueda ? 'Sin resultados para esa búsqueda' : 'No hay feriantes en este filtro'}
          </p>
        )}

        {filtrados.map((f) => (
          <div
            key={f.id}
            className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ${
              f.llegado_at ? 'opacity-80 ring-2 ring-green-500/60' : ''
            }`}
          >
            <div
              className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-black/10 text-zinc-900"
              style={{ backgroundColor: f.sector_color ? `#${f.sector_color}` : '#e4e4e7' }}
            >
              <span className="text-lg font-bold leading-none">{f.numero ?? '—'}</span>
              <span className="mt-0.5 text-[10px] leading-none">{f.sector ?? ''}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight text-zinc-900">{f.proyecto}</div>
              {f.responsable && (
                <div className="truncate text-sm text-zinc-600">{f.responsable}</div>
              )}
              {f.handle && <div className="truncate text-xs text-zinc-400">@{f.handle}</div>}
            </div>

            <button
              onClick={() => toggleLlegada(f)}
              className={`shrink-0 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                f.llegado_at
                  ? 'bg-green-100 text-green-700 active:bg-green-200'
                  : 'bg-zinc-900 text-white active:bg-zinc-700'
              }`}
            >
              {f.llegado_at ? `✓ ${formatHora(f.llegado_at)}` : 'Llegó'}
            </button>
          </div>
        ))}
      </main>
      )}
    </div>
  )
}
