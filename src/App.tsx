import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Edicion } from './types'
import EdicionesScreen from './components/EdicionesScreen'
import CheckinScreen from './components/CheckinScreen'
import DirectorioScreen from './components/DirectorioScreen'
import PerfilScreen from './components/PerfilScreen'
import CuraduriaScreen from './components/CuraduriaScreen'
import CruceScreen from './components/CruceScreen'
import PantallaPin from './components/PantallaPin'

const STORAGE_KEY = 'tremendas-edicion-activa'

// El PIN se exige sólo si hay un usuario de equipo configurado. Así la app sigue
// andando mientras la cuenta compartida no esté creada en Supabase.
const PIN_ACTIVO = Boolean(import.meta.env.VITE_EMAIL_EQUIPO)

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sesionLista, setSesionLista] = useState(!PIN_ACTIVO)
  const [ediciones, setEdiciones] = useState<Edicion[] | null>(null)
  const [edicionActiva, setEdicionActiva] = useState<Edicion | null>(null)
  const [verDirectorio, setVerDirectorio] = useState(false)
  const [curando, setCurando] = useState<'votar' | 'cruce' | null>(null)
  // El perfil se abre encima de lo que estés mirando y vuelve ahí al cerrarse.
  const [perfilId, setPerfilId] = useState<string | null>(null)

  useEffect(() => {
    if (!PIN_ACTIVO) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSesionLista(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const autenticado = !PIN_ACTIVO || session !== null

  useEffect(() => {
    if (!autenticado) return
    supabase
      .from('ediciones')
      .select('*')
      .order('fecha', { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) {
          alert('Error cargando ediciones: ' + error.message)
          setEdiciones([])
          return
        }
        setEdiciones(data)
        const guardada = data.find((e) => e.id === localStorage.getItem(STORAGE_KEY))
        if (guardada) setEdicionActiva(guardada)
      })
  }, [autenticado])

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

  if (!sesionLista) return <Cargando />
  if (!autenticado) return <PantallaPin />
  if (ediciones === null) return <Cargando />

  if (perfilId) {
    return <PerfilScreen emprendimientoId={perfilId} onBack={() => setPerfilId(null)} />
  }
  if (verDirectorio) {
    return <DirectorioScreen onVerPerfil={setPerfilId} onBack={() => setVerDirectorio(false)} />
  }
  if (curando && edicionActiva) {
    return curando === 'votar' ? (
      <CuraduriaScreen
        edicion={edicionActiva}
        onBack={() => setCurando(null)}
        onVerResultados={() => setCurando('cruce')}
      />
    ) : (
      <CruceScreen
        edicion={edicionActiva}
        onBack={() => setCurando('votar')}
        onVerPerfil={setPerfilId}
      />
    )
  }
  if (!edicionActiva) {
    return (
      <EdicionesScreen
        ediciones={ediciones}
        onSelect={seleccionarEdicion}
        onVerDirectorio={() => setVerDirectorio(true)}
      />
    )
  }
  return (
    <CheckinScreen
      edicion={edicionActiva}
      onBack={salirDeEdicion}
      onVerPerfil={setPerfilId}
      onCurar={() => setCurando('votar')}
      onEdicionActualizada={(actualizada) => {
        setEdicionActiva(actualizada)
        setEdiciones((prev) =>
          prev?.map((e) => (e.id === actualizada.id ? actualizada : e)) ?? prev,
        )
      }}
    />
  )
}

function Cargando() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-zinc-500">
      Cargando…
    </div>
  )
}
