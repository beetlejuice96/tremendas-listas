export interface Edicion {
  id: string
  nombre: string
  fecha: string | null
  cancelada: boolean
  created_at: string
}

/** Una fila de `participaciones` con los datos del emprendimiento ya resueltos. */
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

/** Forma cruda que devuelve Supabase al traer participaciones con su emprendimiento. */
export interface ParticipacionConEmprendimiento {
  id: string
  edicion_id: string
  numero_mesa: number | null
  sector: string | null
  sector_color: string | null
  llegado_at: string | null
  created_at: string
  emprendimientos: {
    handle: string
    nombre_proyecto: string
    responsable: string | null
  } | null
}

export function aFeriante(p: ParticipacionConEmprendimiento): Feriante {
  return {
    id: p.id,
    edicion_id: p.edicion_id,
    proyecto: p.emprendimientos?.nombre_proyecto ?? '(sin nombre)',
    responsable: p.emprendimientos?.responsable ?? null,
    numero: p.numero_mesa,
    sector: p.sector,
    sector_color: p.sector_color,
    handle: p.emprendimientos?.handle ?? null,
    llegado_at: p.llegado_at,
    created_at: p.created_at,
  }
}

export interface FerianteImport {
  proyecto: string
  responsable: string | null
  numero: number | null
  sector: string | null
  sector_color: string | null
  handle: string | null
}
