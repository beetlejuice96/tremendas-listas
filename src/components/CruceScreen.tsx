import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Edicion, FichaCuraduria, Owner, Voto } from '../types'

type Grupo = 'discrepan' | 'ambas_si' | 'tal_vez' | 'ambas_no' | 'falta_votar'

const GRUPOS: [Grupo, string][] = [
  ['discrepan', 'No coinciden'],
  ['ambas_si', 'Sí de las dos'],
  ['tal_vez', 'Con un tal vez'],
  ['ambas_no', 'No de las dos'],
  ['falta_votar', 'Falta votar'],
]

interface Props {
  edicion: Edicion
  onBack: () => void
  onVerPerfil: (emprendimientoId: string) => void
}

export default function CruceScreen({ edicion, onBack, onVerPerfil }: Props) {
  const [fichas, setFichas] = useState<FichaCuraduria[] | null>(null)
  const [votos, setVotos] = useState<Map<string, Map<string, Voto>>>(new Map())
  const [owners, setOwners] = useState<Owner[]>([])
  const [grupo, setGrupo] = useState<Grupo>('discrepan')

  useEffect(() => {
    async function cargar() {
      const [f, o] = await Promise.all([
        supabase.from('curaduria').select('*').eq('edicion_id', edicion.id).order('nombre_proyecto'),
        supabase.from('owners').select('id, nombre').order('nombre'),
      ])
      const ids = (f.data ?? []).map((x) => x.id)
      const porFicha = new Map<string, Map<string, Voto>>()
      // Los ids se piden por tandas para no armar una URL gigante con 200 uuids.
      for (let i = 0; i < ids.length; i += 100) {
        const { data } = await supabase
          .from('votos')
          .select('postulacion_id, owner_id, voto')
          .in('postulacion_id', ids.slice(i, i + 100))
        for (const v of data ?? []) {
          if (!porFicha.has(v.postulacion_id)) porFicha.set(v.postulacion_id, new Map())
          porFicha.get(v.postulacion_id)!.set(v.owner_id, v.voto as Voto)
        }
      }
      setFichas(f.data ?? [])
      setOwners(o.data ?? [])
      setVotos(porFicha)
    }
    cargar()
  }, [edicion.id])

  function clasificar(id: string): Grupo {
    const emitidos = [...(votos.get(id)?.values() ?? [])]
    if (owners.length === 0 || emitidos.length < owners.length) return 'falta_votar'
    if (emitidos.includes('tal_vez')) return 'tal_vez'
    if (emitidos.every((v) => v === 'si')) return 'ambas_si'
    if (emitidos.every((v) => v === 'no')) return 'ambas_no'
    return 'discrepan'
  }

  const conteos = useMemo(() => {
    const acc: Record<Grupo, number> = {
      discrepan: 0, ambas_si: 0, tal_vez: 0, ambas_no: 0, falta_votar: 0,
    }
    for (const f of fichas ?? []) acc[clasificar(f.id)]++
    return acc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichas, votos, owners])

  const visibles = (fichas ?? []).filter((f) => clasificar(f.id) === grupo)

  // El balance ayuda a que no queden 40 ilustradores y 2 de cerámica.
  const porRubro = useMemo(() => {
    const acc = new Map<string, number>()
    for (const f of fichas ?? []) {
      if (clasificar(f.id) !== 'ambas_si') continue
      const r = f.rubro ?? 'sin rubro'
      acc.set(r, (acc.get(r) ?? 0) + 1)
    }
    return [...acc.entries()].sort((a, b) => b[1] - a[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fichas, votos, owners])

  return (
    <div className="min-h-dvh bg-zinc-100 pb-8">
      <header className="sticky top-0 z-10 bg-zinc-900 px-4 pb-3 pt-4 text-white shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={onBack} className="-ml-1 px-1 text-sm text-zinc-400">
            ‹ Votar
          </button>
          <h1 className="font-semibold">Cruce de votos</h1>
          <span className="text-sm tabular-nums text-zinc-400">{fichas?.length ?? '—'}</span>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {GRUPOS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setGrupo(key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                grupo === key ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {label} {conteos[key]}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-2 p-3">
        {grupo === 'discrepan' && conteos.discrepan > 0 && (
          <p className="px-1 pb-1 text-sm text-zinc-600">
            Estas son las únicas que hace falta charlar: en el resto ya coinciden.
          </p>
        )}

        {grupo === 'ambas_si' && porRubro.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Balance de las elegidas
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {porRubro.map(([rubro, n]) => (
                <span
                  key={rubro}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
                >
                  {rubro} <strong>{n}</strong>
                </span>
              ))}
            </div>
          </section>
        )}

        {fichas === null && <p className="py-8 text-center text-zinc-500">Cargando…</p>}
        {fichas !== null && visibles.length === 0 && (
          <p className="py-8 text-center text-zinc-500">Ninguna en este grupo</p>
        )}

        {visibles.map((f) => (
          <div key={f.id} className="rounded-2xl bg-white p-3 shadow-sm">
            <button
              onClick={() => onVerPerfil(f.emprendimiento_id)}
              className="w-full text-left active:opacity-60"
            >
              <div className="font-semibold leading-tight text-zinc-900">{f.nombre_proyecto}</div>
              <div className="truncate text-xs text-zinc-500">
                {[f.rubro, f.ciudad].filter(Boolean).join(' · ')}
              </div>
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {owners.map((o) => {
                const v = votos.get(f.id)?.get(o.id)
                return (
                  <span
                    key={o.id}
                    className={`rounded-full px-2 py-0.5 font-medium capitalize ${
                      v === 'si'
                        ? 'bg-green-100 text-green-700'
                        : v === 'no'
                          ? 'bg-red-100 text-red-700'
                          : v === 'tal_vez'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-zinc-100 text-zinc-400'
                    }`}
                  >
                    {o.nombre}: {v === 'tal_vez' ? 'tal vez' : (v ?? '—')}
                  </span>
                )
              })}
              {f.veces_participo > 0 && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">
                  vino {f.veces_participo}
                </span>
              )}
              {f.veces_postulo >= 2 && f.veces_participo === 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                  insiste hace {f.veces_postulo}
                </span>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
