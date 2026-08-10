import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseFeriantesFile } from '../lib/parseExcel'
import type { Edicion } from '../types'

interface Props {
  ediciones: Edicion[]
  onSelect: (edicion: Edicion) => void
}

export default function EdicionesScreen({ ediciones, onSelect }: Props) {
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function crearEdicion() {
    if (!nombre.trim()) {
      alert('Poné un nombre para la edición')
      return
    }
    if (!archivo) {
      alert('Subí el excel con la lista de feriantes')
      return
    }
    setGuardando(true)
    try {
      const feriantes = parseFeriantesFile(await archivo.arrayBuffer())
      const { data: edicion, error } = await supabase
        .from('ediciones')
        .insert({ nombre: nombre.trim() })
        .select()
        .single()
      if (error) throw error
      try {
        // Cada feriante del excel es un emprendimiento (que puede venir de ediciones
        // anteriores, identificado por su handle) más su participación en ésta.
        const conHandle = feriantes.filter((f) => f.handle?.trim())
        if (conHandle.length !== feriantes.length) {
          throw new Error('Hay filas sin Instagram: es lo que identifica al emprendimiento')
        }
        const { data: emprendimientos, error: errorEmpr } = await supabase
          .from('emprendimientos')
          .upsert(
            conHandle.map((f) => ({
              handle: f.handle!.trim().toLowerCase(),
              nombre_proyecto: f.proyecto,
              responsable: f.responsable,
            })),
            { onConflict: 'handle' },
          )
          .select('id, handle')
        if (errorEmpr) throw errorEmpr

        const idPorHandle = new Map(emprendimientos.map((e) => [e.handle, e.id]))

        // Los sectores son filas propias: el color pertenece al sector, no a cada
        // feriante, así que se crean una vez por edición.
        const coloresPorSector = new Map<string, string | null>()
        for (const f of conHandle) {
          if (f.sector && !coloresPorSector.has(f.sector)) {
            coloresPorSector.set(f.sector, f.sector_color)
          }
        }
        const idPorSector = new Map<string, string>()
        if (coloresPorSector.size > 0) {
          const { data: sectores, error: errorSectores } = await supabase
            .from('sectores')
            .insert(
              [...coloresPorSector].map(([nombre, color], orden) => ({
                edicion_id: edicion.id,
                nombre,
                color,
                orden,
              })),
            )
            .select('id, nombre')
          if (errorSectores) throw errorSectores
          for (const s of sectores) idPorSector.set(s.nombre, s.id)
        }

        const { error: errorPart } = await supabase.from('participaciones').insert(
          conHandle.map((f) => ({
            edicion_id: edicion.id,
            emprendimiento_id: idPorHandle.get(f.handle!.trim().toLowerCase()),
            numero_mesa: f.numero,
            sector_id: f.sector ? idPorSector.get(f.sector) : null,
          })),
        )
        if (errorPart) throw errorPart
      } catch (e) {
        await supabase.from('ediciones').delete().eq('id', edicion.id)
        throw e
      }
      onSelect(edicion)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error creando la edición')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-100">
      <header className="bg-zinc-900 px-4 pb-4 pt-6 text-white">
        <h1 className="text-2xl font-bold">Tremendas Listas</h1>
        <p className="text-sm text-zinc-400">Check-in de feriantes</p>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4">
        {creando ? (
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Nueva edición</h2>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre (ej: Julio 2026)"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-900"
            />
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-zinc-300 px-4 py-4 text-center text-sm text-zinc-600 active:bg-zinc-50"
            >
              {archivo ? `📄 ${archivo.name}` : 'Tocá para subir el excel (.xlsx / .csv)'}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setCreando(false)}
                disabled={guardando}
                className="flex-1 rounded-xl bg-zinc-200 py-3 font-medium text-zinc-700 active:bg-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={crearEdicion}
                disabled={guardando}
                className="flex-1 rounded-xl bg-zinc-900 py-3 font-medium text-white active:bg-zinc-700 disabled:opacity-50"
              >
                {guardando ? 'Creando…' : 'Crear'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreando(true)}
            className="w-full rounded-2xl bg-zinc-900 py-4 text-base font-semibold text-white shadow-sm active:bg-zinc-700"
          >
            + Nueva edición
          </button>
        )}

        {ediciones.length > 0 && (
          <div className="space-y-2">
            <h2 className="px-1 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Ediciones
            </h2>
            {ediciones.map((e) => (
              <button
                key={e.id}
                onClick={() => onSelect(e)}
                className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-left shadow-sm active:bg-zinc-50"
              >
                <div>
                  <div className="font-semibold text-zinc-900">{e.nombre}</div>
                  <div className="text-xs text-zinc-500">
                    {e.fecha
                      // La fecha viene como 'YYYY-MM-DD': partirla evita que se
                      // corra un día por zona horaria al pasarla por Date().
                      ? e.fecha.split('-').reverse().join('/')
                      : new Date(e.created_at).toLocaleDateString('es-AR')}
                    {e.cancelada && ' · cancelada'}
                  </div>
                </div>
                <span className="text-zinc-400">›</span>
              </button>
            ))}
          </div>
        )}

        {ediciones.length === 0 && !creando && (
          <p className="px-1 text-center text-sm text-zinc-500">
            Todavía no hay ediciones. Creá la primera subiendo el excel de feriantes.
          </p>
        )}
      </main>
    </div>
  )
}
