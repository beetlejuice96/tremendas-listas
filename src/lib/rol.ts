import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Rol = 'owner' | 'equipo'

/** Rol de la cuenta con la que se entró. Decide qué partes de la app se ven.
 *
 *  Esto sólo gobierna la interfaz: lo económico además está restringido en la
 *  base, así que una cuenta de equipo tampoco lo obtiene consultando directo.
 *  Mientras se resuelve arranca en 'equipo', que es lo más restrictivo: si
 *  arrancara en 'owner' se vería un parpadeo con datos que no corresponden. */
export function useRol(): { rol: Rol; listo: boolean; email: string | null } {
  const [rol, setRol] = useState<Rol>('equipo')
  const [email, setEmail] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      const { data: sesion } = await supabase.auth.getSession()
      if (!sesion.session) {
        if (!cancelado) {
          setEmail(null)
          setListo(true)
        }
        return
      }
      if (!cancelado) setEmail(sesion.session.user.email ?? null)
      const { data } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('user_id', sesion.session.user.id)
        .maybeSingle()
      if (cancelado) return
      setRol((data?.rol as Rol) ?? 'equipo')
      setListo(true)
    }

    cargar()
    const { data: sub } = supabase.auth.onAuthStateChange(() => cargar())
    return () => {
      cancelado = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return { rol, listo, email }
}
