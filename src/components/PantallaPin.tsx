import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Usuario compartido del equipo. Para quien usa la app esto es "poné el PIN";
// por detrás es Supabase Auth, así que la protección es real y no sólo de pantalla.
const EMAIL_EQUIPO = import.meta.env.VITE_EMAIL_EQUIPO as string

export default function PantallaPin() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: EMAIL_EQUIPO,
      password: pin,
    })
    if (error) {
      setError(error.message.includes('Invalid') ? 'PIN incorrecto' : error.message)
      setPin('')
    }
    setEntrando(false)
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-zinc-900 px-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white">Tremendas Listas</h1>
        <p className="mt-1 text-sm text-zinc-400">Ingresá el PIN del equipo</p>

        <form onSubmit={entrar} className="mt-8 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            autoFocus
            className="w-full rounded-xl bg-zinc-800 px-4 py-4 text-center text-2xl tracking-[0.4em] text-white placeholder-zinc-600 outline-none focus:bg-zinc-700"
          />
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={entrando || pin.length < 4}
            className="w-full rounded-xl bg-white py-4 text-base font-semibold text-zinc-900 active:bg-zinc-200 disabled:opacity-40"
          >
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
