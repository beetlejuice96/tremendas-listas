import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatHora, pesos, soloDigitos } from '../lib/text'
import type { HitoEdicion, ResumenEmprendimiento } from '../types'

interface Props {
  emprendimientoId: string
  onBack: () => void
}

interface Detalle {
  email: string | null
  celular: string | null
  web: string | null
  notas: string | null
}

interface UltimaPostulacion {
  descripcion: string | null
  indumentaria: string | null
  rubros: { nombre: string } | null
}

const INDUMENTARIA: Record<string, string> = {
  sin_prendas: 'No vende indumentaria',
  talles_ok: 'Talles llegan al mínimo',
  talles_insuficientes: 'Talles por debajo del mínimo',
}

export default function PerfilScreen({ emprendimientoId, onBack }: Props) {
  const [resumen, setResumen] = useState<ResumenEmprendimiento | null>(null)
  const [detalle, setDetalle] = useState<Detalle | null>(null)
  const [hitos, setHitos] = useState<HitoEdicion[] | null>(null)
  const [ultima, setUltima] = useState<UltimaPostulacion | null>(null)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      const [r, d, l, p] = await Promise.all([
        supabase.from('historial_emprendimientos').select('*').eq('id', emprendimientoId).single(),
        supabase.from('emprendimientos').select('email, celular, web, notas')
          .eq('id', emprendimientoId).single(),
        supabase.from('linea_tiempo').select('*')
          .eq('emprendimiento_id', emprendimientoId)
          .order('fecha', { ascending: false, nullsFirst: false }),
        // La última postulación describe cómo se presenta hoy el proyecto.
        supabase.from('postulaciones')
          .select('descripcion, indumentaria, rubros ( nombre ), ediciones!inner ( fecha )')
          .eq('emprendimiento_id', emprendimientoId)
          .order('fecha', { ascending: false, foreignTable: 'ediciones' })
          .limit(1),
      ])
      if (cancelado) return
      if (r.error) {
        alert('Error cargando el perfil: ' + r.error.message)
        return
      }
      setResumen(r.data)
      setDetalle(d.data)
      setHitos(l.data ?? [])
      setUltima((p.data?.[0] as unknown as UltimaPostulacion) ?? null)
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [emprendimientoId])

  if (!resumen) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-zinc-500">
        Cargando…
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-zinc-100 pb-10">
      <header className="bg-zinc-900 px-4 pb-5 pt-4 text-white">
        <button onClick={onBack} className="-ml-1 mb-3 px-1 py-1 text-sm text-zinc-400">
          ‹ Volver
        </button>
        <h1 className="text-2xl font-bold leading-tight">{resumen.nombre_proyecto}</h1>
        {resumen.responsable && <p className="text-zinc-300">{resumen.responsable}</p>}
        <p className="mt-1 text-sm text-zinc-400">
          @{resumen.handle}
          {resumen.ciudad && ` · ${resumen.ciudad}`}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {resumen.es_federal && (
            <span className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-950">
              Federal · 25% off
            </span>
          )}
          {ultima?.rubros?.nombre && (
            <span className="rounded-full bg-zinc-700 px-2.5 py-1 text-xs">
              {ultima.rubros.nombre}
            </span>
          )}
          {ultima?.indumentaria && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs ${
                ultima.indumentaria === 'talles_insuficientes'
                  ? 'bg-red-500/90 text-white'
                  : 'bg-zinc-700 text-zinc-200'
              }`}
            >
              {INDUMENTARIA[ultima.indumentaria]}
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {detalle?.celular && (
            <a
              href={`https://wa.me/${soloDigitos(detalle.celular)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl bg-green-600 py-2.5 text-center text-sm font-semibold active:bg-green-700"
            >
              WhatsApp
            </a>
          )}
          {detalle?.email && (
            <a
              href={`mailto:${detalle.email}`}
              className="flex-1 rounded-xl bg-zinc-700 py-2.5 text-center text-sm font-semibold active:bg-zinc-600"
            >
              Mail
            </a>
          )}
          <a
            href={`https://instagram.com/${resumen.handle}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl bg-zinc-700 py-2.5 text-center text-sm font-semibold active:bg-zinc-600"
          >
            Instagram
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-3">
        <div className="grid grid-cols-3 gap-2">
          <Contador valor={resumen.veces_participo} etiqueta="participó" destacado />
          <Contador valor={resumen.veces_postulo} etiqueta="se postuló" />
          <Contador valor={resumen.veces_se_bajo} etiqueta="se bajó" />
        </div>

        {ultima?.descripcion && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Cómo se presenta
            </h2>
            <p className="text-sm leading-relaxed text-zinc-700">{ultima.descripcion}</p>
          </section>
        )}

        {detalle?.notas && (
          <section className="rounded-2xl bg-amber-50 p-4 shadow-sm ring-1 ring-amber-200">
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
              Notas
            </h2>
            <p className="whitespace-pre-line text-sm text-amber-900">{detalle.notas}</p>
          </section>
        )}

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Historial
          </h2>
          <div className="space-y-2">
            {hitos?.map((h) => (
              <Hito key={h.edicion_id} hito={h} />
            ))}
            {hitos?.length === 0 && (
              <p className="py-4 text-center text-sm text-zinc-500">Sin historial todavía</p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function Contador({
  valor,
  etiqueta,
  destacado,
}: {
  valor: number
  etiqueta: string
  destacado?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-3 text-center shadow-sm ${
        destacado ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'
      }`}
    >
      <div className="text-2xl font-bold tabular-nums">{valor}</div>
      <div className={`text-xs ${destacado ? 'text-zinc-400' : 'text-zinc-500'}`}>{etiqueta}</div>
    </div>
  )
}

function Hito({ hito: h }: { hito: HitoEdicion }) {
  const participo = h.participacion_id !== null
  const seCayo = participo && h.estado !== 'confirmada'

  return (
    <div
      className={`rounded-2xl bg-white p-3 shadow-sm ${
        h.cancelada ? 'opacity-70' : ''
      } ${seCayo ? 'ring-1 ring-red-200' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-zinc-900">{h.edicion}</span>
        {h.fecha && (
          <span className="shrink-0 text-xs text-zinc-400">
            {h.fecha.split('-').reverse().join('/')}
          </span>
        )}
      </div>

      <p className="mt-0.5 text-sm text-zinc-600">
        {h.cancelada
          ? 'Seleccionada — la edición se canceló por lluvia'
          : seCayo
            ? 'Quedó seleccionada pero no participó'
            : participo
              ? [
                  h.tipo_puesto ?? 'Participó',
                  h.numero_mesa != null && `mesa ${h.numero_mesa}`,
                  h.sector,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Se postuló, no quedó'}
      </p>

      {participo && !h.cancelada && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {h.llegado_at && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">
              llegó {formatHora(h.llegado_at)}
            </span>
          )}
          {h.no_paga ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">no paga</span>
          ) : h.precio_final != null ? (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                Number(h.saldo) <= 0
                  ? 'bg-zinc-100 text-zinc-600'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {Number(h.saldo) <= 0
                ? `pagó ${pesos(h.precio_final)}`
                : `debe ${pesos(Number(h.saldo))} de ${pesos(h.precio_final)}`}
            </span>
          ) : null}
          {!h.se_postulo && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
              invitación directa
            </span>
          )}
        </div>
      )}
    </div>
  )
}
