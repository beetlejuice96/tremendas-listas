export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export function pesos(monto: number | null): string {
  if (monto == null) return '—'
  return '$' + Math.round(monto).toLocaleString('es-AR')
}

/** Arma el número para wa.me: sin símbolos y con el código de país. */
export function soloDigitos(celular: string): string {
  const n = celular.replace(/\D/g, '')
  return n.startsWith('54') ? n : `54${n.replace(/^0/, '')}`
}

export function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
