import { useLayoutEffect, useRef, useState } from 'react'
import mesas from '../lib/mesas.json'
import { formatHora } from '../lib/text'
import type { Feriante } from '../types'

const MAPA_W = 2517
const MAPA_H = 2296
const FACTORES = [1, 2.5, 5, 8]

interface Props {
  feriantes: Feriante[]
  onToggle: (f: Feriante) => void
}

export default function MapaView({ feriantes, onToggle }: Props) {
  const [zoomIdx, setZoomIdx] = useState(0)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [fitZoom, setFitZoom] = useState(0.15)
  const contRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (contRef.current) setFitZoom(contRef.current.clientWidth / MAPA_W)
  }, [])

  const zoom = fitZoom * FACTORES[zoomIdx]
  const porNumero = new Map(feriantes.map((f) => [f.numero, f]))
  const sel = seleccionado ? feriantes.find((f) => f.id === seleccionado) : null

  return (
    <div className="relative">
      <div ref={contRef} className="overflow-auto" style={{ height: 'calc(100dvh - 150px)' }}>
        <div
          className="relative"
          style={{ width: MAPA_W * zoom, height: MAPA_H * zoom }}
        >
          <img
            src="/map.svg"
            alt="Mapa de la feria"
            width={MAPA_W * zoom}
            height={MAPA_H * zoom}
            className="max-w-none select-none"
            draggable={false}
          />
          {mesas.map((m) => {
            const f = porNumero.get(m.n)
            if (!f) return null
            const activo = sel?.id === f.id
            return (
              <button
                key={m.n}
                onClick={() => setSeleccionado(activo ? null : f.id)}
                className={`absolute flex items-center justify-center rounded font-bold text-zinc-900 ${
                  activo ? 'z-10 ring-4 ring-zinc-900' : ''
                }`}
                style={{
                  left: m.x * zoom,
                  top: m.y * zoom,
                  width: m.w * zoom,
                  height: m.h * zoom,
                  fontSize: Math.max(11, 26 * zoom),
                  backgroundColor: f.llegado_at
                    ? 'rgba(34,197,94,0.85)'
                    : f.sector_color
                      ? `#${f.sector_color}`
                      : '#e4e4e7',
                  border: '1.5px solid rgba(0,0,0,0.35)',
                }}
              >
                {f.llegado_at ? '✓' : m.n}
              </button>
            )
          })}
        </div>
      </div>

      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl bg-zinc-900 text-white shadow-lg">
        <button
          onClick={() => setZoomIdx((i) => Math.min(i + 1, FACTORES.length - 1))}
          className="px-4 py-3 text-lg font-bold active:bg-zinc-700"
        >
          +
        </button>
        <button
          onClick={() => setZoomIdx((i) => Math.max(i - 1, 0))}
          className="border-t border-zinc-700 px-4 py-3 text-lg font-bold active:bg-zinc-700"
        >
          −
        </button>
      </div>

      {sel && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md">
          <div className="m-3 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10">
            <div
              className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-black/10 text-zinc-900"
              style={{
                backgroundColor: sel.sector_color ? `#${sel.sector_color}` : '#e4e4e7',
              }}
            >
              <span className="text-lg font-bold leading-none">{sel.numero ?? '—'}</span>
              <span className="mt-0.5 text-[10px] leading-none">{sel.sector ?? ''}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight text-zinc-900">{sel.proyecto}</div>
              {sel.responsable && (
                <div className="truncate text-sm text-zinc-600">{sel.responsable}</div>
              )}
              {sel.handle && <div className="truncate text-xs text-zinc-400">@{sel.handle}</div>}
            </div>
            <button
              onClick={() => onToggle(sel)}
              className={`shrink-0 rounded-xl px-3 py-3 text-sm font-semibold ${
                sel.llegado_at
                  ? 'bg-green-100 text-green-700 active:bg-green-200'
                  : 'bg-zinc-900 text-white active:bg-zinc-700'
              }`}
            >
              {sel.llegado_at ? `✓ ${formatHora(sel.llegado_at)}` : 'Llegó'}
            </button>
            <button
              onClick={() => setSeleccionado(null)}
              className="-mr-1 shrink-0 px-1 text-xl leading-none text-zinc-400"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
