import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Edicion, Punto } from '../types'

const AUTOR_KEY = 'tremendas-autor'

interface Props {
  emprendimientoId: string
}

/** Registro de puntos positivos y negativos. Es memoria del equipo: no altera
 *  la selección de ninguna edición ni excluye a nadie. */
export default function Puntos({ emprendimientoId }: Props) {
  const [puntos, setPuntos] = useState<Punto[] | null>(null)
  const [ediciones, setEdiciones] = useState<Edicion[]>([])
  const [cargando, setCargando] = useState<'positivo' | 'negativo' | null>(null)
  const [editando, setEditando] = useState<Punto | null>(null)

  useEffect(() => {
    cargar()
    supabase
      .from('ediciones')
      .select('*')
      .order('fecha', { ascending: false, nullsFirst: false })
      .then(({ data }) => setEdiciones(data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emprendimientoId])

  async function cargar() {
    const { data } = await supabase
      .from('puntos')
      .select('*, ediciones ( nombre )')
      .eq('emprendimiento_id', emprendimientoId)
      .order('created_at', { ascending: false })
    setPuntos((data as Punto[]) ?? [])
  }

  async function borrar(p: Punto) {
    if (!confirm('¿Borrar este punto?')) return
    setPuntos((prev) => prev?.filter((x) => x.id !== p.id) ?? prev)
    const { error } = await supabase.from('puntos').delete().eq('id', p.id)
    if (error) {
      alert('No se pudo borrar: ' + error.message)
      cargar()
    }
  }

  const positivos = puntos?.filter((p) => p.signo === 'positivo').length ?? 0
  const negativos = puntos?.filter((p) => p.signo === 'negativo').length ?? 0

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Puntos</h2>
        {puntos && puntos.length > 0 && (
          <span className="flex items-center gap-2.5 text-xs">
            <span className="flex items-center gap-1 font-semibold text-green-700">
              <Carita signo="positivo" className="h-4 w-4" />
              {positivos}
            </span>
            <span className="flex items-center gap-1 font-semibold text-red-700">
              <Carita signo="negativo" className="h-4 w-4" />
              {negativos}
            </span>
          </span>
        )}
      </div>

      <div className="mb-2 flex gap-2">
        <button
          onClick={() => setCargando('positivo')}
          aria-label="Sumar algo bueno"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-50 py-3 font-semibold text-green-700 ring-1 ring-green-200 active:bg-green-100"
        >
          <Carita signo="positivo" className="h-7 w-7" />
          <span className="text-sm">Algo bueno</span>
        </button>
        <button
          onClick={() => setCargando('negativo')}
          aria-label="Sumar algo que estuvo mal"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 py-3 font-semibold text-red-700 ring-1 ring-red-200 active:bg-red-100"
        >
          <Carita signo="negativo" className="h-7 w-7" />
          <span className="text-sm">Algo malo</span>
        </button>
      </div>

      <div className="space-y-2">
        {puntos?.map((p) => (
          <article
            key={p.id}
            className={`rounded-2xl p-3 shadow-sm ring-1 ${
              p.signo === 'positivo'
                ? 'bg-green-50 ring-green-200'
                : 'bg-red-50 ring-red-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <Carita
                signo={p.signo}
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  p.signo === 'positivo' ? 'text-green-600' : 'text-red-600'
                }`}
              />
              <p
                className={`min-w-0 flex-1 whitespace-pre-line text-sm ${
                  p.signo === 'positivo' ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {p.descripcion}
              </p>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditando(p)}
                  className="rounded-lg px-2 py-1 text-xs text-zinc-500 active:bg-black/5"
                >
                  Editar
                </button>
                <button
                  onClick={() => borrar(p)}
                  className="rounded-lg px-2 py-1 text-xs text-zinc-500 active:bg-black/5"
                >
                  Borrar
                </button>
              </div>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-2 text-[11px] text-zinc-500">
              <span>{new Date(p.created_at).toLocaleDateString('es-AR')}</span>
              {p.ediciones?.nombre && <span>· {p.ediciones.nombre}</span>}
              {p.autor && <span>· {p.autor}</span>}
            </div>
          </article>
        ))}

        {puntos?.length === 0 && (
          <p className="py-3 text-center text-sm text-zinc-500">Sin puntos cargados</p>
        )}
      </div>

      {(cargando || editando) && (
        <Formulario
          emprendimientoId={emprendimientoId}
          ediciones={ediciones}
          signo={editando?.signo ?? cargando!}
          punto={editando}
          onCerrar={() => {
            setCargando(null)
            setEditando(null)
          }}
          onGuardado={() => {
            setCargando(null)
            setEditando(null)
            cargar()
          }}
        />
      )}
    </section>
  )
}


/** Carita dibujada en vez de emoji: los emoji cambian de estilo según el
 *  teléfono, y así toma el color exacto del contexto donde se use. */
function Carita({ signo, className = '' }: { signo: 'positivo' | 'negativo'; className?: string }) {
  const feliz = signo === 'positivo'
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="8.6" cy="9.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="9.8" r="1.15" fill="currentColor" stroke="none" />
      <path d={feliz ? 'M7.8 14.6c1.2 1.5 2.6 2.2 4.2 2.2s3-.7 4.2-2.2' : 'M16.2 17c-1.2-1.5-2.6-2.2-4.2-2.2s-3 .7-4.2 2.2'} />
    </svg>
  )
}

function Formulario({
  emprendimientoId,
  ediciones,
  signo,
  punto,
  onCerrar,
  onGuardado,
}: {
  emprendimientoId: string
  ediciones: Edicion[]
  signo: 'positivo' | 'negativo'
  punto: Punto | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [descripcion, setDescripcion] = useState(punto?.descripcion ?? '')
  const [edicionId, setEdicionId] = useState(punto?.edicion_id ?? '')
  const [autor, setAutor] = useState(punto?.autor ?? localStorage.getItem(AUTOR_KEY) ?? '')
  const [guardando, setGuardando] = useState(false)

  const positivo = signo === 'positivo'

  async function guardar() {
    if (!descripcion.trim()) return
    setGuardando(true)
    // El autor se recuerda en el dispositivo: la cuenta es compartida, así que
    // es una referencia declarada, no una identidad verificada.
    if (autor.trim()) localStorage.setItem(AUTOR_KEY, autor.trim())
    const fila = {
      emprendimiento_id: emprendimientoId,
      edicion_id: edicionId || null,
      signo,
      descripcion: descripcion.trim(),
      autor: autor.trim() || null,
    }
    const { error } = punto
      ? await supabase.from('puntos').update(fila).eq('id', punto.id)
      : await supabase.from('puntos').insert(fila)
    setGuardando(false)
    if (error) {
      alert('No se pudo guardar: ' + error.message)
      return
    }
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={onCerrar}>
      <div
        className="mx-auto w-full max-w-md rounded-t-2xl bg-white p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className={`mb-3 flex items-center gap-2 text-base font-semibold ${
            positivo ? 'text-green-700' : 'text-red-700'
          }`}
        >
          <Carita signo={signo} className="h-6 w-6" />
          {punto ? 'Editar' : positivo ? 'Algo bueno' : 'Algo malo'}
        </h3>

        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          autoFocus
          placeholder={
            positivo ? 'Qué estuvo bien…' : 'Qué pasó… (por ejemplo: reclamó por su ubicación)'
          }
          className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-base outline-none focus:border-zinc-900"
        />

        <div className="mt-2 flex gap-2">
          <select
            value={edicionId}
            onChange={(e) => setEdicionId(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-900"
          >
            <option value="">Sin edición</option>
            {ediciones.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <input
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            placeholder="Quién lo carga"
            className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-900"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onCerrar}
            className="flex-1 rounded-xl bg-zinc-200 py-3 font-medium text-zinc-700 active:bg-zinc-300"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !descripcion.trim()}
            className={`flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-40 ${
              positivo ? 'bg-green-600 active:bg-green-700' : 'bg-red-600 active:bg-red-700'
            }`}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
