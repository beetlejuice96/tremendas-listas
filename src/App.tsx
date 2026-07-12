import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Edicion } from './types'
import EdicionesScreen from './components/EdicionesScreen'
import CheckinScreen from './components/CheckinScreen'

const STORAGE_KEY = 'tremendas-edicion-activa'

export default function App() {
  const [ediciones, setEdiciones] = useState<Edicion[] | null>(null)
  const [edicionActiva, setEdicionActiva] = useState<Edicion | null>(null)

  useEffect(() => {
    supabase
      .from('ediciones')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          alert('Error cargando ediciones: ' + error.message)
          setEdiciones([])
          return
        }
        setEdiciones(data)
        const savedId = localStorage.getItem(STORAGE_KEY)
        const saved = data.find((e) => e.id === savedId)
        if (saved) setEdicionActiva(saved)
      })
  }, [])

  function seleccionarEdicion(edicion: Edicion) {
    localStorage.setItem(STORAGE_KEY, edicion.id)
    setEdicionActiva(edicion)
    setEdiciones((prev) =>
      prev && prev.some((e) => e.id === edicion.id) ? prev : [edicion, ...(prev ?? [])],
    )
  }

  function salirDeEdicion() {
    localStorage.removeItem(STORAGE_KEY)
    setEdicionActiva(null)
  }

  if (ediciones === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-zinc-500">
        Cargando…
      </div>
    )
  }

  if (!edicionActiva) {
    return <EdicionesScreen ediciones={ediciones} onSelect={seleccionarEdicion} />
  }

  return <CheckinScreen edicion={edicionActiva} onBack={salirDeEdicion} />
}
