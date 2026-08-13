# PRD — Sistema de gestión de Tremenda Feria

| | |
|---|---|
| **Producto** | Tremendas Listas |
| **Tipo** | Aplicación web mobile-first para el equipo organizador |
| **Autor** | Equipo de producto |
| **Estado** | Propuesta |

---

## 1. Resumen

Tremenda Feria es una feria de emprendimientos que se realiza en CABA cada dos
meses aproximadamente. Cada edición reúne alrededor de **63 puestos** elegidos
entre **150 a 200 postulaciones**, y su organización recae en dos personas.

Hoy el ciclo completo —convocatoria, curaduría, selección, cobro, armado del salón
y recepción el día del evento— se gestiona con un formulario de Google, su planilla
de respuestas y una hoja de cálculo que se arma copiando filas a mano. La
información más operativa (quién pagó, a qué cuenta, qué falta resolver) está
codificada en **colores de celda**.

Este documento propone un sistema que sostenga el ciclo entero: una sola fuente de
verdad, consultable, con memoria entre ediciones.

---

## 2. El problema

### 2.1 La información no es consultable

El estado de cada feriante vive en el color de fondo de una celda. Eso no se puede
filtrar, no se puede contar, y no sobrevive a exportar la planilla. Preguntas
operativas básicas —*¿a quién le falta pagar esta semana?*— requieren leer la hoja
entera a ojo.

### 2.2 No hay memoria entre ediciones

Cada edición arranca una planilla nueva. Nadie puede responder **cuántas veces
participó un emprendimiento**, quién se postula sistemáticamente sin quedar nunca,
o quién quedó y después se bajó. Ese dato pesa mucho al momento de elegir y hoy
depende de que alguien se acuerde.

> Pedido textual de una de las organizadoras:
> *"quiero poder contabilizar cuántas veces participó X feriante"*

### 2.3 La curaduría es cara en tiempo

Las dos organizadoras revisan **todas** las postulaciones, una por una. Eso no se
discute: es parte de cómo funciona la feria. Pero hacerlo sobre una planilla obliga
a abrir el Instagram de cada proyecto en otra pestaña y las fotos en carpetas de
Drive aparte. Multiplicado por 200 postulaciones y por dos personas, cada edición.

Después hay que cruzar a mano las dos columnas de votos para ver dónde coinciden.

### 2.4 Los totales de las planillas fallan en silencio

Las fórmulas de suma se escribieron a mano apuntando a celdas sueltas
(`=H10+H27+H42+H65`). Al agregar una fila el total deja de incluirla, sin aviso.
Una de las planillas arrastra una referencia rota (`#REF!`). Los montos que se
usan para saber cuánto se recaudó no son confiables.

### 2.5 El día de la feria no hay herramienta

La recepción de 60+ feriantes se hace con una lista impresa. No hay forma de saber
en tiempo real cuántos llegaron ni de coordinar entre las varias personas que
reciben.

---

## 3. Objetivos

| # | Objetivo | Cómo se mide |
|---|---|---|
| O1 | Que el estado de cada feriante sea consultable y filtrable | Responder "a quién le falta pagar" en menos de 5 segundos, sin leer fila por fila |
| O2 | Dar memoria entre ediciones | Ver participaciones y postulaciones históricas de cualquier emprendimiento |
| O3 | Bajar el costo de la curaduría sin cambiar el criterio | Las dos siguen viendo todas; el cruce de votos deja de hacerse a mano |
| O4 | Que los números de recaudación sean correctos por construcción | El total sale de sumar pagos registrados, no de una fórmula manual |
| O5 | Sostener la recepción el día del evento | Saber en cualquier momento cuántos llegaron y quién falta |
| O6 | Que la app sirva edición tras edición sin rearmarla | Crear una edición nueva no requiere intervención técnica |

### No objetivos

- **No** automatiza ni asiste la decisión de curaduría. Sin puntajes, sin ranking,
  sin recomendaciones, sin pre-filtros que escondan postulaciones.
- **No** reemplaza el formulario de postulación público. La convocatoria sigue
  saliendo por Google Forms.
- **No** procesa pagos. Registra pagos que ya ocurrieron por fuera.
- **No** es una herramienta para los feriantes. Es interna del equipo.
- **No** administra la difusión en redes ni el catálogo publicado.

---

## 4. Usuarios

| Rol | Quiénes | Qué necesitan |
|---|---|---|
| **Organizadoras** | 2 personas, dueñas de la feria | Curar postulaciones, decidir la selección, seguir los cobros, ver el historial de cada proyecto |
| **Recepción** | Varias personas en la puerta el día del evento | Buscar un feriante, decirle dónde está su mesa, marcar que llegó |
| **Coordinación** | Quien mira el panorama durante el evento | Cuántos llegaron, quiénes faltan, cómo va cada sector |
| **Armado** | Quienes montan el salón | Qué mesa corresponde a quién, qué pedidos especiales hay |

Todo el equipo comparte el mismo nivel de acceso. No hay jerarquía de permisos.

### Contexto de uso

- **Predominantemente celular.** La curaduría se hace en el sillón; la recepción,
  de pie en la puerta. El escritorio es la excepción.
- Varias personas usando la app **al mismo tiempo** el día del evento.
- Conectividad estable en la sede.

---

## 5. El ciclo de una edición

```
1. CONVOCATORIA      Se publica el formulario. Llegan 150-200 postulaciones.
                     ↓
2. CURADURÍA         Las dos revisan todas. Cada una vota por su lado.
                     Se cruzan los votos y se discuten las diferencias.
                     ↓
3. SELECCIÓN         Quedan ~63. A cada uno se le asigna tipo de puesto.
                     ↓
4. COMUNICACIÓN      Mail de selección con dos fechas límite:
                     seña + fotos, y pago del resto.
                     ↓
5. COBRO             Pagos de monto libre, a dos cuentas. Seguimiento de
                     quién debe. Envío de fotos para el catálogo.
                     ↓
6. ARMADO            Se asignan mesas y sectores sobre el plano del salón.
                     ↓
7. DÍA DE LA FERIA   Recepción: buscar, ubicar, marcar llegada con hora.
```

El sistema debe cubrir los siete pasos. Hoy solo el 1 está soportado (por Google
Forms) y el resto vive en planillas.

---

## 6. Alcance funcional

### 6.1 Emprendimientos e historial

Un emprendimiento es una entidad **estable a lo largo del tiempo**, identificada
por su usuario de Instagram. Sus participaciones en cada edición son eventos
separados que cuelgan de él.

Esto habilita el perfil: quién es, cómo contactarlo, cuántas veces participó,
cuántas se postuló, en qué ediciones, qué puesto tuvo, cuánto pagó, si alguna vez
se bajó.

### 6.2 Ediciones y postulaciones

Cada edición tiene fecha, fechas límite de pago, sus tipos de puesto con precios
propios (los precios cambian entre ediciones) y sus sectores del salón.

Las postulaciones se importan desde las respuestas del formulario. Cada
postulación es una **foto del momento**: los datos que la persona mandó ese día,
que pueden diferir de los de la edición anterior.

### 6.3 Curaduría

Una postulación por pantalla, con todo lo necesario para decidir a la vista,
incluyendo la historia previa del proyecto con la feria. Cada organizadora vota
sí / tal vez / no desde su dispositivo. El sistema cruza los votos y separa las
coincidencias de las discrepancias.

**Restricción de diseño:** el sistema no ordena, puntúa ni filtra postulaciones por
criterios propios. Muestra las que hay, en un orden estable, todas.

### 6.4 Cobros

Cada participación tiene un precio según su tipo de puesto, con descuento aplicable
para proyectos federales. Los pagos son de **monto libre** —la persona seña lo que
quiere y completa después— y pueden ser varios, a cuentas distintas. El saldo se
calcula; nunca se carga a mano.

### 6.5 Armado y día del evento

Asignación de mesa y sector sobre el plano real del salón. El día de la feria:
búsqueda por cualquier dato, ubicación visible, marca de llegada con hora, y
sincronización en vivo entre los dispositivos del equipo.

---

## 7. Restricciones y decisiones

### 7.1 Mobile-first, no responsive

La app se diseña para pantalla de celular y se adapta hacia arriba, no al revés.
Es requisito, no preferencia.

### 7.2 Acceso compartido, sin cuentas individuales

El equipo entra con un PIN único. No hay usuarios personales: el costo de
administrar cuentas no se justifica para un equipo de esta escala, y la fricción
en la puerta el día del evento tiene que ser cero.

Excepción: la curaduría necesita distinguir **quién** vota. Se resuelve eligiendo
identidad al entrar a esa sección, sin autenticación adicional.

### 7.3 Los datos son sensibles

El sistema acumula nombres, mails, teléfonos y montos de cientos de personas. El
acceso debe estar protegido de verdad —no basta con esconder la interfaz— y la
información no puede quedar expuesta públicamente.

### 7.4 Compatibilidad con planillas heredadas

Existen ediciones anteriores documentadas en planillas cuyo formato **fue mutando**:
cambia el orden de columnas, aparecen y desaparecen campos, y en algunos archivos
los encabezados están desalineados respecto de los datos. La importación debe
tolerarlo, porque ese historial es la razón de ser del sistema.

### 7.5 Convivencia con Google Forms

El formulario público sigue siendo de Google. El sistema importa sus respuestas.
Migrar la captura de postulaciones es una posibilidad futura, no un requisito.

---

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El cruce de identidad entre ediciones falla (mismo proyecto escrito distinto) | Historial incorrecto, que es el valor central | Identidad por usuario de Instagram normalizado; los casos dudosos se muestran para resolución humana, nunca se adivinan |
| La importación de planillas heredadas interpreta mal alguna columna | Datos históricos erróneos | Detección por contenido además de encabezado; validación contra los totales declarados en cada planilla |
| Se pierde el registro de llegadas, que no existe en ningún otro lado | Irrecuperable | Es el único dato nacido en la app: debe respaldarse ante cualquier reimportación |
| El equipo vuelve a la planilla por fricción | El sistema queda sin uso | Cada pantalla debe reemplazar una tarea concreta que hoy se hace peor |
| Falla de conectividad en la sede | Recepción bloqueada | Aceptado: la sede tiene señal estable. Reevaluar si cambia de lugar |

---

## 9. Métricas de éxito

**A los 3 meses (dos ediciones):**

- El equipo no vuelve a abrir la hoja de "Seleccionados" para operar.
- Las llegadas del día del evento se registran íntegramente en la app.
- El cruce de votos de curaduría se hace en la app y no comparando columnas.

**A los 12 meses:**

- El historial acumulado se consulta efectivamente durante la curaduría.
- La recaudación por edición sale del sistema y nadie la recalcula aparte.

---

## 10. Fases de entrega

| Fase | Contenido | Por qué en este orden |
|---|---|---|
| **0 — Cimientos** | Modelo de datos, importación del historial, control de acceso | Todo lo demás se apoya acá; el historial debe cargarse antes de acumular más ediciones |
| **1 — Perfil e historial** | Directorio de emprendimientos y ficha con línea de tiempo | Es el pedido explícito de las organizadoras y da valor apenas termina la fase 0 |
| **2 — Cobros** | Seguimiento de pagos, estados, fechas límite | Reemplaza la hoja "Seleccionados", que es el documento más usado |
| **3 — Día del evento** | Asignación de mesas, mapa, check-in | Autónomo respecto del resto; su fecha la fija el calendario de la feria |
| **4 — Curaduría** | Votación y cruce | Requiere el historial de la fase 1 para aportar su mayor valor |

---

## 11. Apéndice: datos del dominio

Valores reales relevados, para dimensionar.

**Volumen por edición**

| | |
|---|---|
| Postulaciones recibidas | 88 – 196 |
| Seleccionados | 52 – 83 |
| Puestos disponibles | ~63 más la barra propia |
| Emprendimientos distintos acumulados | ~700 |

**Tipos de puesto y precios** (varían por edición)

| Puesto | Precio de referencia |
|---|---|
| Espacio 90 | $52.000 |
| Espacio 1.90 | $84.000 |
| Mesa chica sin extra | $84.000 |
| Mesa chica con extra | $100.000 |
| Mesa grande sin extra | $95.000 |
| Mesa grande con extra | $115.000 |
| Gastronómico | $115.000 |

**Reglas de cobro**

- La seña es de monto libre. El 50% es sugerencia, no regla.
- Proyectos federales: 25% de descuento sobre el puesto elegido.
- Dos cuentas receptoras, según la organizadora.
- Existen invitaciones sin cargo.
- Dos fechas límite por edición: seña + fotos, y pago del resto.

**Rubros más frecuentes**

Ilustración, arte gráfico, cerámica, objetos, indumentaria, fotografía, editorial,
bordado, accesorios, gastronomía.

**Casos particulares del dominio**

- Mesas compartidas entre dos proyectos.
- Preferencias de ubicación ("cerca de tal puesto").
- Una edición cancelada por lluvia: hubo selección pero no participación.
- Compromiso de inclusión de talles: el formulario pregunta si las prendas
  alcanzan un mínimo de centímetros, y hay casos que no lo cumplen.
