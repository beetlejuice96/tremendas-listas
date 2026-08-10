import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Edicion, FichaCuraduria, Owner, Voto } from '../types'

const OWNER_KEY = 'tremendas-owner'

const INDUMENTARIA: Record<string, string> = {
  sin_prendas: 'No vende indumentaria',
  talles_ok: 'Talles llegan al mínimo',
  talles_insuficientes: 'Talles por debajo del mínimo',
}

interface Props {
  edicion: Edicion
  onBack: () => void
  onVerResultados: () => void
}

export default function CuraduriaScreen({ edicion, onBack, onVerResultados }: Props) {
  const [owners, setOwners] = useState<Owner[]>([])
  const [ownerId, setOwnerId] = useState<string | null>(localStorage.getItem(OWNER_KEY))
  const [fichas, setFichas] = useState<FichaCuraduria[] | null>(null)
  const [misVotos, setMisVotos] = useState<Map<string, Voto>>(new Map())
  const [indice, setIndice] = useState(0)
  const [soloPendientes, setSoloPendientes] = useState(true)

  useEffect(() => {
    supabase.from('owners').select('id, nombre').order('nombre').then(({ data }) => {
      setOwners(data ?? [])
    })
  }, [])

  useEffect(() => {
    if (!ownerId) return
    async function cargar() {
      const [f, v] = await Promise.all([
        supabase.from('curaduria').select('*').eq('edicion_id', edicion.id)
          .order('nombre_proyecto'),
        supabase.from('votos').select('postulacion_id, voto').eq('owner_id', ownerId!),
      ])
      setFichas(f.data ?? [])
      setMisVotos(new Map((v.data ?? []).map((x) => [x.postulacion_id, x.voto as Voto])))
    }
    cargar()
  }, [edicion.id, ownerId])

  const pendientes = useMemo(
    () => (fichas ?? []).filter((f) => !misVotos.has(f.id)),
    [fichas, misVotos],
  )
  const cola = soloPendientes ? pendientes : (fichas ?? [])
  const ficha = cola[Math.min(indice, Math.max(cola.length - 1, 0))] ?? null

  async function votar(voto: Voto) {
    if (!ficha || !ownerId) return
    // Optimista: la fila se va de la cola apenas votás, para no frenar el ritmo.
    setMisVotos((prev) => new Map(prev).set(ficha.id, voto))
    if (!soloPendientes) setIndice((i) => Math.min(i + 1, cola.length - 1))
    const { error } = await supabase
      .from('votos')
      .upsert(
        { postulacion_id: ficha.id, owner_id: ownerId, voto },
        { onConflict: 'postulacion_id,owner_id' },
      )
    if (error) {
      alert('No se pudo guardar el voto: ' + error.message)
      setMisVotos((prev) => {
        const next = new Map(prev)
        next.delete(ficha.id)
        return next
      })
    }
  }

  if (!ownerId) {
    return (
      <div className="flex min-h-dvh flex-col justify-center bg-zinc-900 px-6 text-white">
        <h1 className="text-2xl font-bold">¿Quién está votando?</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Cada una vota por su lado; después se cruzan los votos.
        </p>
        <div className="mt-6 space-y-2">
          {owners.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                localStorage.setItem(OWNER_KEY, o.id)
                setOwnerId(o.id)
              }}
              className="w-full rounded-2xl bg-white py-4 text-lg font-semibold capitalize text-zinc-900 active:bg-zinc-200"
            >
              {o.nombre}
            </button>
          ))}
        </div>
        <button onClick={onBack} className="mt-6 text-sm text-zinc-400">
          ‹ Volver
        </button>
      </div>
    )
  }

  const total = fichas?.length ?? 0
  const votadas = total - pendientes.length

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-100">
      <header className="bg-zinc-900 px-4 pb-3 pt-4 text-white">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="-ml-1 px-1 text-sm text-zinc-400">
            ‹ Volver
          </button>
          <span className="text-sm font-medium">
            {votadas} de {total}
          </span>
          <button onClick={onVerResultados} className="px-1 text-sm text-zinc-400">
            Cruce ›
          </button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-700">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: total ? `${(votadas / total) * 100}%` : '0%' }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
          <span className="capitalize">
            votás como {owners.find((o) => o.id === ownerId)?.nombre}
          </span>
          <button
            onClick={() => {
              setSoloPendientes((s) => !s)
              setIndice(0)
            }}
            className="underline"
          >
            {soloPendientes ? 'ver todas' : 'sólo las que faltan'}
          </button>
        </div>
      </header>

      {fichas === null ? (
        <p className="py-16 text-center text-zinc-500">Cargando…</p>
      ) : !ficha ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-semibold text-zinc-900">Votaste todas 🎉</p>
          <p className="text-sm text-zinc-500">
            Cuando la otra también termine, el cruce muestra dónde coinciden.
          </p>
          <button
            onClick={onVerResultados}
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Ver el cruce
          </button>
        </div>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto p-3 pb-4">
            <Ficha ficha={ficha} miVoto={misVotos.get(ficha.id)} />
          </main>

          <div className="sticky bottom-0 flex gap-2 border-t border-zinc-200 bg-white p-3">
            <BotonVoto voto="no" actual={misVotos.get(ficha.id)} onVotar={votar}>
              No
            </BotonVoto>
            <BotonVoto voto="tal_vez" actual={misVotos.get(ficha.id)} onVotar={votar}>
              Tal vez
            </BotonVoto>
            <BotonVoto voto="si" actual={misVotos.get(ficha.id)} onVotar={votar}>
              Sí
            </BotonVoto>
          </div>

          {!soloPendientes && (
            <div className="flex items-center justify-between gap-2 bg-zinc-100 px-3 pb-3 text-sm">
              <button
                onClick={() => setIndice((i) => Math.max(i - 1, 0))}
                disabled={indice === 0}
                className="rounded-lg px-3 py-1.5 text-zinc-600 disabled:opacity-30"
              >
                ‹ Anterior
              </button>
              <span className="text-xs text-zinc-500">
                {indice + 1} de {cola.length}
              </span>
              <button
                onClick={() => setIndice((i) => Math.min(i + 1, cola.length - 1))}
                disabled={indice >= cola.length - 1}
                className="rounded-lg px-3 py-1.5 text-zinc-600 disabled:opacity-30"
              >
                Siguiente ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Ficha({ ficha: f, miVoto }: { ficha: FichaCuraduria; miVoto?: Voto }) {
  const esLink = f.fotos_url?.trim().toLowerCase().startsWith('http')

  return (
    <article className="mx-auto max-w-md space-y-3">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-tight text-zinc-900">
              {f.nombre_proyecto}
            </h2>
            {f.responsable && <p className="text-sm text-zinc-600">{f.responsable}</p>}
          </div>
          {miVoto && <EtiquetaVoto voto={miVoto} />}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {f.rubro && <Chip>{f.rubro}</Chip>}
          {f.ciudad && <Chip>{f.ciudad}</Chip>}
          {f.puesto_pedido && <Chip>pide {f.puesto_pedido}</Chip>}
          {f.tiene_taller && <Chip>tiene taller</Chip>}
          {f.indumentaria && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                f.indumentaria === 'talles_insuficientes'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {INDUMENTARIA[f.indumentaria]}
            </span>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <a
            href={`https://instagram.com/${f.handle}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-center text-sm font-semibold text-white active:bg-zinc-700"
          >
            Ver Instagram
          </a>
          {esLink && (
            <a
              href={f.fotos_url!}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl bg-zinc-200 py-2.5 text-center text-sm font-semibold text-zinc-800 active:bg-zinc-300"
            >
              Ver fotos
            </a>
          )}
        </div>
        {f.fotos_url && !esLink && (
          <p className="mt-2 text-xs text-zinc-500">Fotos: {f.fotos_url}</p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Historia con la feria
        </h3>
        {f.veces_postulo === 0 && f.veces_participo === 0 ? (
          <p className="text-sm font-medium text-blue-700">Primera vez que se postula</p>
        ) : (
          <p className="text-sm text-zinc-700">
            Participó <strong>{f.veces_participo}</strong>
            {f.veces_participo === 1 ? ' vez' : ' veces'} · se postuló antes{' '}
            <strong>{f.veces_postulo}</strong>
            {f.veces_postulo === 1 ? ' vez' : ' veces'}
            {f.veces_se_bajo > 0 && (
              <span className="text-red-600"> · se bajó {f.veces_se_bajo}</span>
            )}
          </p>
        )}
        {f.veces_postulo >= 2 && f.veces_participo === 0 && (
          <p className="mt-1 text-sm text-amber-700">
            Viene insistiendo y todavía no quedó.
          </p>
        )}
      </section>

      {f.descripcion && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            El proyecto
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
            {f.descripcion}
          </p>
        </section>
      )}

      {f.productos && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Qué vende
          </h3>
          <p className="text-sm text-zinc-700">{f.productos}</p>
        </section>
      )}

      {f.mensaje && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Por qué quiere participar
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
            {f.mensaje}
          </p>
        </section>
      )}
    </article>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">{children}</span>
}

function EtiquetaVoto({ voto }: { voto: Voto }) {
  const estilo = {
    si: 'bg-green-100 text-green-700',
    tal_vez: 'bg-amber-100 text-amber-800',
    no: 'bg-red-100 text-red-700',
  }[voto]
  const texto = { si: 'Sí', tal_vez: 'Tal vez', no: 'No' }[voto]
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${estilo}`}>
      {texto}
    </span>
  )
}

function BotonVoto({
  voto,
  actual,
  onVotar,
  children,
}: {
  voto: Voto
  actual?: Voto
  onVotar: (v: Voto) => void
  children: React.ReactNode
}) {
  const activo = actual === voto
  const base = {
    no: activo ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 active:bg-red-100',
    tal_vez: activo ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 active:bg-amber-100',
    si: activo ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 active:bg-green-100',
  }[voto]
  return (
    <button
      onClick={() => onVotar(voto)}
      className={`flex-1 rounded-xl py-3.5 text-base font-semibold transition-colors ${base}`}
    >
      {children}
    </button>
  )
}
