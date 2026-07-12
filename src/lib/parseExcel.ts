import * as XLSX from 'xlsx'
import type { FerianteImport } from '../types'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

// "Rosa (F6D5F3)" -> { name: "Rosa", hex: "F6D5F3" }
function parseSector(raw: unknown): { name: string | null; hex: string | null } {
  if (raw == null) return { name: null, hex: null }
  const s = String(raw).trim()
  const match = s.match(/^(.*?)\s*\(([0-9a-fA-F]{6})\)\s*$/)
  if (match) return { name: match[1].trim(), hex: match[2].toUpperCase() }
  return { name: s || null, hex: null }
}

const COLUMN_MATCHERS: Record<string, (h: string) => boolean> = {
  proyecto: (h) => h.includes('proyecto') || h.includes('emprendimiento'),
  responsable: (h) => h.includes('responsable'),
  numero: (h) => h.includes('numero') || h.includes('mesa'),
  sector: (h) => h.includes('color') || h.includes('sector'),
  handle: (h) => h.includes('handle') || h.includes('instagram') || h.includes('ig'),
}

export function parseFeriantesFile(data: ArrayBuffer): FerianteImport[] {
  const wb = XLSX.read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  if (rows.length === 0) throw new Error('El archivo está vacío')

  // Find the header row: first row matching the "proyecto" column
  let headerIdx = -1
  const colIdx: Record<string, number> = {}
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const headers = rows[i].map((c) => normalize(String(c ?? '')))
    const pIdx = headers.findIndex(COLUMN_MATCHERS.proyecto)
    if (pIdx >= 0) {
      headerIdx = i
      for (const [key, matcher] of Object.entries(COLUMN_MATCHERS)) {
        colIdx[key] = headers.findIndex(matcher)
      }
      break
    }
  }
  if (headerIdx === -1) {
    throw new Error('No encontré la columna "Nombre del proyecto" en el archivo')
  }

  const get = (row: unknown[], key: string): unknown =>
    colIdx[key] >= 0 ? row[colIdx[key]] : null

  const result: FerianteImport[] = []
  for (const row of rows.slice(headerIdx + 1)) {
    const proyecto = get(row, 'proyecto')
    if (proyecto == null || String(proyecto).trim() === '') continue
    const sector = parseSector(get(row, 'sector'))
    const numeroRaw = get(row, 'numero')
    const numero = numeroRaw == null || numeroRaw === '' ? null : Math.round(Number(numeroRaw))
    result.push({
      proyecto: String(proyecto).trim(),
      responsable: get(row, 'responsable') ? String(get(row, 'responsable')).trim() : null,
      numero: Number.isFinite(numero) ? numero : null,
      sector: sector.name,
      sector_color: sector.hex,
      handle: get(row, 'handle') ? String(get(row, 'handle')).trim() : null,
    })
  }
  if (result.length === 0) throw new Error('No encontré feriantes en el archivo')
  return result
}
