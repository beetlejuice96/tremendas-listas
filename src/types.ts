export interface Edicion {
  id: string
  nombre: string
  created_at: string
}

export interface Feriante {
  id: string
  edicion_id: string
  proyecto: string
  responsable: string | null
  numero: number | null
  sector: string | null
  sector_color: string | null
  handle: string | null
  llegado_at: string | null
  created_at: string
}

export interface FerianteImport {
  proyecto: string
  responsable: string | null
  numero: number | null
  sector: string | null
  sector_color: string | null
  handle: string | null
}
