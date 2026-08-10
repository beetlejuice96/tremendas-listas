# Plan: de app de check-in a gestión integral de la feria

> Propuesta. Escrita el 2026-08-05, actualizada con el análisis de las 7 ediciones
> que están en `DATA/`. La app hoy en producción cubre check-in y mapa.

## Por qué

La app cubre el último paso del proceso: el día de la feria. Todo lo anterior
—postulaciones, curaduría, selección, cobro, fotos para el catálogo— vive en un
Google Form, su planilla de respuestas y una hoja "Seleccionados" que se arma
copiando filas a mano y se opera **pintando celdas de colores**.

Ese es el problema de fondo: la información más operativa (quién pagó, a qué cuenta,
qué falta resolver) está codificada en colores de celda, que ni siquiera sobreviven a
una exportación. No es consultable, no es filtrable, no deja historia.

Y hay un pedido explícito de una de las owners: **"quiero poder contabilizar cuántas
veces participó X feriante"**.

## Lo que hay: 7 ediciones analizadas

| Edición | Postularon | Seleccionados |
|---|---|---|
| Octubre 2025 | 177 | 52 |
| Noviembre 2025 | 149 | 57 |
| Diciembre 2025 | 88 | 73 |
| Marzo 2026 | 183 | 79 |
| Mayo 2026 | 173 | 63 |
| Julio 2026 | 160 | 73 |
| Septiembre 2026 | 136 | 60 |

**641 emprendimientos únicos** en toda la historia. La edición de noviembre 2025 se
canceló por lluvia: sus seleccionados cuentan como *elegidos* pero no como
*participación efectiva*. Excluyéndola, el máximo posible son 6 participaciones.

Distribución real de participaciones:

| Participó | Emprendimientos |
|---|---|
| nunca | 434 |
| 1 vez | 111 |
| 2 veces | 44 |
| 3 veces | 26 |
| 4 veces | 13 |
| 5 veces | 7 |
| **las 6** | **6** |

Y el dato que hoy nadie puede ver: **105 emprendimientos se postularon dos o más veces
sin quedar nunca**. Uno se postuló a las 6 ediciones y nunca entró.

## Reglas del negocio confirmadas

- **La seña es de monto libre.** El feriante paga lo que quiere y completa después. En
  los datos aparecen `22.500 + 22.500`, `25.000 + 20.000`, `45.000` de una sola vez.
  El 50% es referencia sugerida, no una regla. → el modelo necesita **N pagos por
  participación**, no dos campos fijos.
- **Federal = 25% de descuento** sobre el puesto elegido. Se calcula, no se carga a
  mano. La marca de "federal" sí es manual: la ciudad viene como texto libre y sucio
  (`CABA`, `Caba`, `C.A.B.A.`, `Capital Federal`, `Bs As`) y no se puede derivar con
  confianza. La app sugiere candidatos por ciudad; una persona confirma.
- Dos fechas límite por edición: una para **seña + fotos**, otra para el **resto**.
- Los pagos van a **dos cuentas** (ceci / cata). Hoy es un color de celda.
- Hay casos de **"NO PAGA"** (invitadas) y de **invitación directa sin postulación**.
- **Mesas compartidas** ("van juntas") y **preferencias de ubicación** ("cerca de fina
  estampa").
- **Indumentaria**: enum de 3 valores. En septiembre: 126 sin prendas, 21 con talles
  que llegan al mínimo de 65 cm, **5 que no llegan** — que son los que hoy están
  pintados como "hay algo que resolver".
- Próxima feria: **13 de septiembre de 2026**. Selección ya cerrada.

## Modelo de datos

El cambio central: separar **el emprendimiento** (que persiste entre ediciones) de
**su participación en cada edición**.

```sql
-- Catálogos ------------------------------------------------------------------
owners (id, nombre unique, activo)          -- las dos organizadoras
rubros (id, nombre unique, fusionado_en)    -- el form los deja escribir libre
productos (id, nombre unique)

-- Identidad estable. Clave natural: handle de Instagram normalizado.
emprendimientos (
  id, handle unique, nombre_proyecto, responsable,
  email, celular, web, ciudad,              -- el dato de contacto más reciente
  es_federal boolean default false,
  notas, created_at, updated_at
)

ediciones (
  id, nombre, fecha,
  fecha_limite_sena, fecha_limite_pago,
  cancelada boolean default false,          -- noviembre 2025
  created_at, updated_at
)

tipos_puesto (id, edicion_id, nombre, precio, cupo, orden)
sectores (id, edicion_id, nombre, color, orden)   -- el color es del sector
grupos_mesa (id, edicion_id, nota)                -- "van juntas"

postulaciones (                             -- snapshot de lo que mandó ESA edición
  id, edicion_id, emprendimiento_id,
  descripcion, mensaje, rubro_id, tipo_puesto_id,
  indumentaria,                             -- sin_prendas | talles_ok | talles_insuficientes
  tiene_taller boolean, fotos_url,
  -- Contacto tal como llegó ese día: un cambio de mail no borra el anterior.
  email, celular, ciudad, web, nombre_proyecto, responsable,
  created_at, updated_at,
  unique (edicion_id, emprendimiento_id)
)

postulacion_productos (postulacion_id, producto_id)   -- N:M

votos (
  id, postulacion_id, owner_id, voto,       -- si | no | tal_vez
  updated_at, unique (postulacion_id, owner_id)
)

participaciones (
  id, edicion_id, emprendimiento_id,
  postulacion_id,                           -- null si fue invitación directa
  tipo_puesto_id, sector_id, grupo_mesa_id,
  precio_final,                             -- lo efectivamente cobrado
  descuento_pct,                            -- 25 para federales, por edición
  no_paga boolean,
  estado,                                   -- confirmada | se_bajo | no_vino
  mail_enviado_at,
  fotos_estado, fotos_nota,                 -- pendiente | ok | pedir_mas
  numero_mesa, nota_ubicacion, notas,
  llegado_at,                               -- el día de la feria
  unique (edicion_id, emprendimiento_id),
  unique (edicion_id, numero_mesa),         -- dos puestos no comparten mesa
  check (llegado_at is null or estado = 'confirmada')
)

pagos (                                     -- N por participación, monto libre
  id, participacion_id, monto, fecha,
  cuenta_id, registrado_por_id, created_at
)
```

Total pagado = suma de `pagos`. Saldo = `precio_final − pagado`. Eso cubre pagos
parciales de cualquier monto, pagos de más y pagos en varias cuotas sin casos especiales.

### Decisiones de diseño

**`precio_final` es desnormalizado a propósito.** Se podría calcular desde
`tipos_puesto` y `descuento_pct`, pero es el registro de lo que se le cobró a esa
persona: si el precio del puesto sube el año que viene, lo cobrado en marzo no
puede cambiar retroactivamente.

**`es_federal` vive en el emprendimiento; `descuento_pct` en la participación.**
Ser federal es una propiedad de dónde está radicado el proyecto. Que el descuento
se haya aplicado es un hecho de cada edición, y puede no aplicarse.

**Los rubros se pueden fusionar sin perder el original.** El formulario deja
escribir el rubro libremente, así que llegan variantes de lo mismo. Las que sólo
diferían en tildes o mayúsculas ya están unificadas; `fusionado_en` permite
agrupar el resto sin borrar lo que la persona escribió.

**Las vistas `historial_emprendimientos` y `estado_cobro`** resuelven los conteos
y el saldo con agregaciones, para no repetir la lógica en cada consulta.

## Perfil del emprendimiento

Es la pieza que une todo y la respuesta directa al pedido de la owner. Una pantalla por
emprendimiento, accesible desde cualquier lado de la app (curaduría, lista de
seleccionados, check-in, mapa).

**Arriba — quién es.** Nombre, foto/handle de Instagram, responsable, rubro, ciudad,
contacto (con botones de WhatsApp y mail), marca de federal, última declaración de
talles.

**Los números.** Participó N veces · se postuló M veces · quedó y no vino K veces.
Un dato derivado interesante: la tasa de aceptación de esa persona.

**La línea de tiempo.** Una fila por edición, en orden, con qué pasó en cada una:

```
Septiembre 2026   seleccionada · Mesa grande · $95.000 · pagó todo · mesa 42
Julio 2026        seleccionada · Espacio 90 · $52.000 · pagó todo · mesa 8 · llegó 10:15
Mayo 2026         se postuló, no quedó
Marzo 2026        seleccionada · Espacio 90 · $45.000 · pagó todo · mesa 12
Diciembre 2025    seleccionada · Espacio 90 · $45.000 · saldo $22.500 pendiente
Noviembre 2025    seleccionada — edición cancelada por lluvia
Octubre 2025      se postuló, no quedó
```

**Notas acumuladas.** Lo que hoy se pierde entre planillas: "trae perchero", "siempre
comparte con Baby Pollo", "paga tarde", "tiene taller en Flores".

**Historial de pagos** y links de fotos de cada edición, para el catálogo.

## Importación de las ediciones anteriores

Los formatos mutaron, pero de forma manejable: los nombres de columna son casi
estables, cambia el orden y aparecen/desaparecen campos. Dos cuidados concretos que
salieron del análisis:

- **Los headers no son confiables.** En `seleccionados 12 de julio 2026.xlsx` el header
  dice `cel` en la columna 9, pero ahí están los emprendimientos. El importador debe
  detectar columnas **por contenido** (una celda con `instagram.com` es el handle, una
  con `@` es el mail, una de solo dígitos es el celular), usando los headers apenas
  como pista.
- **Secciones a cortar:** en `seleccionados 19 de octubre 2025` hay un bloque
  `NO VIENEN:` (19 filas) y en `seleccionados 21 de noviembre 2025` uno de
  `se bajaron` (2 filas). Todo lo que está debajo de esos marcadores no cuenta como
  participación. Vale guardarlos con `estado = no_vino` / `se_bajo` en vez de
  descartarlos: es información valiosa para el perfil.

**El matching necesita revisión humana.** El cruce automático por handle deja
**44 casos** de emprendimientos que figuran como seleccionados más veces de las que se
postularon. Son dos cosas mezcladas: invitaciones directas (legítimas) y el mismo
proyecto escrito distinto entre ediciones. La app tiene que mostrar esos casos para que
una persona los resuelva, no adivinar.

## Fases

### Fase 0 — Base

- Migración al modelo nuevo. Los 62 de julio pasan de `feriantes` a `emprendimientos` +
  `participaciones`.
- Importador tolerante + pantalla de resolución de dudosos.
- Cargar las 7 ediciones → el historial queda disponible desde el día uno.
- **PIN de acceso.** Con 641 emprendimientos, sus teléfonos y mails, y los montos de
  pago adentro, el link público deja de ser aceptable.

### Fase 1 — Perfil e historial

Es lo que pidió la owner y lo que da valor inmediato apenas termina la Fase 0, sin
depender de nada más.

### Fase 2 — Tracking de la edición en curso

Reemplaza la hoja "Seleccionados": tipos de puesto, pagos de monto libre, federal,
estados en lugar de colores, y la vista *a quién hay que perseguir* cruzando pendientes
con las fechas límite.

### Fase 3 — Día de la feria

Asignación de mesa y check-in: ya construidos, se conectan al modelo nuevo. Deja de
hacer falta subir un excel.

### Fase 4 — Curaduría

Para la edición siguiente a septiembre. Una postulación por pantalla con fotos e
historial visible, voto de cada owner por separado desde su celular, y cruce automático
que deja la lista corta de discrepancias. Sin ranking ni pre-filtros: las dos ven todas.

## Advertencia de tiempos

La feria es el **13 de septiembre**. Si para cuando la Fase 2 esté lista el cobro ya
está cerrado, conviene terminar esa edición en la hoja y estrenar la app con la
siguiente. Las fases 0 y 1 no tienen esa restricción: se pueden hacer y usar ya.
