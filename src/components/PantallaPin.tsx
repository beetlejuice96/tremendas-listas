import { useState } from 'react'
import { supabase } from '../lib/supabase'

const EMAIL_KEY = 'tremendas-email'

// Sugerencia para la primera vez; después manda el último mail usado en ese
// dispositivo. Cada cuenta ve una parte distinta de la app según su rol.
const EMAIL_SUGERIDO = (import.meta.env.VITE_EMAIL_EQUIPO as string) ?? ''

export default function PantallaPin() {
  const [email, setEmail] = useState(localStorage.getItem(EMAIL_KEY) ?? EMAIL_SUGERIDO)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pin,
    })
    if (error) {
      // Mensaje único a propósito: distinguir "no existe" de "PIN incorrecto"
      // le diría a cualquiera qué cuentas existen.
      setError('Email o PIN incorrecto')
      setPin('')
    } else {
      localStorage.setItem(EMAIL_KEY, email.trim())
    }
    setEntrando(false)
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-zinc-900 px-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white">Tremendas Listas</h1>
        <p className="mt-1 text-sm text-zinc-400">Entrá con tu cuenta</p>

        <form onSubmit={entrar} className="mt-8 space-y-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl bg-zinc-800 px-4 py-3.5 text-base text-white placeholder-zinc-500 outline-none focus:bg-zinc-700"
          />
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            className="w-full rounded-xl bg-zinc-800 px-4 py-3.5 text-center text-2xl tracking-[0.4em] text-white placeholder-zinc-600 outline-none focus:bg-zinc-700"
          />
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={entrando || !email.trim() || pin.length < 4}
            className="w-full rounded-xl bg-white py-4 text-base font-semibold text-zinc-900 active:bg-zinc-200 disabled:opacity-40"
          >
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
