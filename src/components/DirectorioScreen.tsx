import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { normalizeText } from '../lib/text'
import type { ResumenEmprendimiento } from '../types'

type Orden = 'participaciones' | 'nombre' | 'postulaciones'

interface Props {
  onVerPerfil: (id: string) => void
  onBack: () => void
}

export default function DirectorioScreen({ onVerPerfil, onBack }: Props) {
  const [todos, setTodos] = useState<ResumenEmprendimiento[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<Orden>('participaciones')

  useEffect(() => {
    supabase
      .from('historial_emprendimientos')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          alert('Error cargando emprendimientos: ' + error.message)
          setTodos([])
          return
        }
        setTodos(data)
      })
  }, [])

  const visibles = useMemo(() => {
    if (!todos) return []
    const q = normalizeText(busqueda)
    const filtrados = q
      ? todos.filter((e) =>
          normalizeText(
            `${e.nombre_proyecto} ${e.responsable ?? ''} ${e.handle} ${e.ciudad ?? ''}`,
          ).includes(q),
        )
      : todos
    const porNombre = (a: ResumenEmprendimiento, b: ResumenEmprendimiento) =>
      a.nombre_proyecto.localeCompare(b.nombre_proyecto, 'es')
    return [...filtrados].sort((a, b) => {
      if (orden === 'nombre') return porNombre(a, b)
      if (orden === 'postulaciones') {
        return b.veces_postulo - a.veces_postulo || porNombre(a, b)
      }
      return b.veces_participo - a.veces_participo || porNombre(a, b)
    })
  }, [todos, busqueda, orden])

  return (
    <div className="min-h-dvh bg-zinc-100 pb-8">
      <header className="sticky top-0 z-10 bg-zinc-900 px-4 pb-3 pt-4 text-white shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={onBack} className="-ml-1 px-1 py-1 text-sm text-zinc-400">
            ‹ Inicio
          </button>
          <h1 className="font-semibold">Emprendimientos</h1>
          <span className="rounded-full bg-zinc-700 px-2.5 py-0.5 text-sm font-medium tabular-nums">
            {todos?.length ?? '—'}
          </span>
        </div>

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por proyecto, nombre, @handle o ciudad…"
          className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-base text-white placeholder-zinc-500 outline-none focus:bg-zinc-700"
        />

        <div className="mt-3 flex gap-2">
          {(
            [
              ['participaciones', 'Más veces'],
              ['postulaciones', 'Más postulan'],
              ['nombre', 'A-Z'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setOrden(key)}
              className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
                orden === key ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-2 p-3">
        {todos === null && <p className="py-8 text-center text-zinc-500">Cargando…</p>}
        {todos !== null && visibles.length === 0 && (
          <p className="py-8 text-center text-zinc-500">Sin resultados</p>
        )}

        {visibles.slice(0, 100).map((e) => (
          <button
            key={e.id}
            onClick={() => onVerPerfil(e.id)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm active:bg-zinc-50"
          >
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-900 text-white">
              <span className="text-lg font-bold leading-none">{e.veces_participo}</span>
              <span className="text-[9px] leading-none text-zinc-400">
                {e.veces_participo === 1 ? 'vez' : 'veces'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight text-zinc-900">
                {e.nombre_proyecto}
                {e.es_federal && (
                  <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                    federal
                  </span>
                )}
              </div>
              {e.responsable && (
                <div className="truncate text-sm text-zinc-600">{e.responsable}</div>
              )}
              <div className="truncate text-xs text-zinc-400">
                se postuló {e.veces_postulo}
                {e.veces_postulo === 1 ? ' vez' : ' veces'}
                {e.veces_se_bajo > 0 && ` · se bajó ${e.veces_se_bajo}`}
              </div>
            </div>
            <span className="shrink-0 text-zinc-300">›</span>
          </button>
        ))}

        {visibles.length > 100 && (
          <p className="py-3 text-center text-sm text-zinc-500">
            Mostrando 100 de {visibles.length}. Afiná la búsqueda para ver el resto.
          </p>
        )}
      </main>
    </div>
  )
}
