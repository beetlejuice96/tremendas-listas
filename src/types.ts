export interface Edicion {
  id: string
  nombre: string
  fecha: string | null
  fecha_limite_sena: string | null
  fecha_limite_pago: string | null
  cancelada: boolean
  created_at: string
}

/** Una fila de `participaciones` con los datos del emprendimiento ya resueltos. */
export interface Feriante {
  id: string
  edicion_id: string
  emprendimiento_id: string
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
  emprendimiento_id: string
  numero_mesa: number | null
  llegado_at: string | null
  created_at: string
  emprendimientos: {
    handle: string
    nombre_proyecto: string
    responsable: string | null
  } | null
  sectores: {
    nombre: string
    color: string | null
  } | null
}

/** Fila de la vista `historial_emprendimientos`. */
export interface ResumenEmprendimiento {
  id: string
  handle: string
  nombre_proyecto: string
  responsable: string | null
  ciudad: string | null
  es_federal: boolean
  veces_postulo: number
  veces_participo: number
  veces_seleccionado: number
  veces_se_bajo: number
  ultima_participacion: string | null
}

export type Voto = 'si' | 'tal_vez' | 'no'

/** Fila de la vista `curaduria`: una postulación con su historia con la feria. */
export interface FichaCuraduria {
  id: string
  edicion_id: string
  emprendimiento_id: string
  handle: string
  nombre_proyecto: string
  responsable: string | null
  ciudad: string | null
  descripcion: string | null
  mensaje: string | null
  fotos_url: string | null
  indumentaria: string | null
  tiene_taller: boolean | null
  rubro: string | null
  puesto_pedido: string | null
  es_federal: boolean
  veces_participo: number
  veces_postulo: number
  veces_se_bajo: number
  productos: string | null
  votos_emitidos: number
}

/** Fila de la vista `gestion_edicion`: el seguimiento de cobro de un puesto. */
export interface FilaGestion {
  id: string
  edicion_id: string
  emprendimiento_id: string
  handle: string
  nombre_proyecto: string
  responsable: string | null
  celular: string | null
  email: string | null
  es_federal: boolean
  estado: string
  tipo_puesto_id: string | null
  tipo_puesto: string | null
  precio_lista: number | null
  precio_final: number | null
  descuento_pct: number
  no_paga: boolean
  mail_enviado_at: string | null
  fotos_estado: string | null
  fotos_nota: string | null
  numero_mesa: number | null
  notas: string | null
  pagado: number
  saldo: number
}

export interface Pago {
  id: string
  participacion_id: string
  monto: number
  fecha: string | null
  cuenta_id: string | null
  created_at: string
}

export interface Owner {
  id: string
  nombre: string
}

export interface TipoPuesto {
  id: string
  nombre: string
  precio: number
  orden: number
}

/** Fila de la vista `linea_tiempo`: qué pasó en cada edición. */
export interface HitoEdicion {
  edicion_id: string
  edicion: string
  fecha: string | null
  cancelada: boolean
  se_postulo: boolean
  participacion_id: string | null
  estado: string | null
  numero_mesa: number | null
  llegado_at: string | null
  precio_final: number | null
  no_paga: boolean | null
  tipo_puesto: string | null
  sector: string | null
  sector_color: string | null
  pagado: number
  saldo: number
}

export function aFeriante(p: ParticipacionConEmprendimiento): Feriante {
  return {
    id: p.id,
    edicion_id: p.edicion_id,
    emprendimiento_id: p.emprendimiento_id,
    proyecto: p.emprendimientos?.nombre_proyecto ?? '(sin nombre)',
    responsable: p.emprendimientos?.responsable ?? null,
    numero: p.numero_mesa,
    sector: p.sectores?.nombre ?? null,
    sector_color: p.sectores?.color ?? null,
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
