# Requerimientos funcionales — Tremendas Listas

Especificación funcional del sistema de gestión de Tremenda Feria.
Complementa el [PRD](PRD.md).

**Prioridades:** `M` imprescindible · `S` importante · `C` deseable

**Convención:** los requerimientos se enuncian como *el sistema debe…*. Los
criterios de aceptación aparecen cuando el enunciado admite más de una lectura.

---

## Índice

| Módulo | Rango |
|---|---|
| A. Acceso y seguridad | RF-A01 … RF-A06 |
| B. Ediciones | RF-B01 … RF-B09 |
| C. Emprendimientos | RF-C01 … RF-C08 |
| D. Perfil e historial | RF-D01 … RF-D09 |
| E. Postulaciones e importación | RF-E01 … RF-E12 |
| F. Curaduría | RF-F01 … RF-F14 |
| G. Selección y puestos | RF-G01 … RF-G07 |
| H. Cobros | RF-H01 … RF-H12 |
| I. Fotos y catálogo | RF-I01 … RF-I04 |
| J. Armado del salón | RF-J01 … RF-J08 |
| K. Día del evento | RF-K01 … RF-K12 |
| L. Consultas y reportes | RF-L01 … RF-L06 |
| M. Datos y consistencia | RF-M01 … RF-M10 |
| N. Interfaz | RF-N01 … RF-N08 |

---

## A. Acceso y seguridad

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-A01** | M | El sistema debe exigir un PIN compartido para acceder a cualquier pantalla con datos. |
| **RF-A02** | M | La protección debe operar sobre los datos, no solo sobre la interfaz: sin sesión válida, el almacén no debe entregar información. |
| **RF-A03** | M | La sesión debe persistir en el dispositivo entre visitas, para no reingresar el PIN en cada uso. |
| **RF-A04** | S | El sistema debe permitir cambiar el PIN sin necesidad de desplegar código. |
| **RF-A05** | M | El sistema no debe exponer datos personales (mails, teléfonos) ni montos a usuarios no autenticados. |
| **RF-A06** | C | El sistema debe permitir cerrar sesión manualmente en un dispositivo. |

> **RF-A01 — criterio de aceptación:** con la sesión cerrada, cualquier intento de
> leer datos devuelve vacío o error, incluso consultando el almacén directamente
> con las credenciales públicas de la aplicación.

---

## B. Ediciones

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-B01** | M | El sistema debe permitir crear una edición con nombre y fecha del evento. |
| **RF-B02** | M | El sistema debe listar las ediciones ordenadas por fecha, de la más reciente a la más antigua. |
| **RF-B03** | M | El sistema debe permitir registrar dos fechas límite por edición: seña con envío de fotos, y pago del saldo. |
| **RF-B04** | M | El sistema debe permitir marcar una edición como cancelada. |
| **RF-B05** | M | Una edición cancelada debe contar como selección pero **no** como participación en todas las estadísticas. |
| **RF-B06** | M | El sistema debe permitir definir los tipos de puesto de cada edición, con nombre, precio y cupo. |
| **RF-B07** | M | Los precios de los tipos de puesto deben ser propios de cada edición: cambiarlos en una nueva no debe alterar las anteriores. |
| **RF-B08** | S | El sistema debe permitir definir los sectores del salón de cada edición, con nombre y color. |
| **RF-B09** | S | El sistema debe recordar la última edición abierta y ofrecerla al reingresar. |

---

## C. Emprendimientos

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-C01** | M | El sistema debe representar cada emprendimiento como una entidad única y persistente entre ediciones. |
| **RF-C02** | M | La identidad de un emprendimiento debe basarse en su usuario de Instagram, normalizado (sin URL, sin arroba, sin distinción de mayúsculas ni acentos). |
| **RF-C03** | M | Cuando una fuente no aporte usuario de Instagram, el sistema debe poder identificar por correo electrónico y marcar el caso para revisión humana. |
| **RF-C04** | M | El sistema debe guardar por emprendimiento: nombre del proyecto, responsable, mail, teléfono, web y ciudad. |
| **RF-C05** | M | El sistema debe permitir marcar un emprendimiento como federal. |
| **RF-C06** | S | El sistema debe permitir registrar notas libres sobre un emprendimiento, que persistan entre ediciones. |
| **RF-C07** | M | El sistema debe ofrecer un directorio de todos los emprendimientos, con búsqueda por nombre, responsable, usuario de Instagram o ciudad. |
| **RF-C08** | S | El directorio debe poder ordenarse por cantidad de participaciones, cantidad de postulaciones o nombre. |

> **RF-C02 — criterio de aceptación:** `https://www.instagram.com/Proyecto/`,
> `@proyecto` y `Www.instagram.com/proyecto?igsh=x` deben resolver al mismo
> emprendimiento. Usuarios legítimos que parecen dominios (`chicle.ar`,
> `sofiandreoli.arte`) no deben descartarse.

---

## D. Perfil e historial

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-D01** | M | El sistema debe ofrecer una ficha por emprendimiento accesible desde el directorio, la curaduría, el cobro y el check-in. |
| **RF-D02** | M | La ficha debe mostrar **cuántas veces participó** el emprendimiento. |
| **RF-D03** | M | La ficha debe mostrar **cuántas veces se postuló**. |
| **RF-D04** | M | La ficha debe mostrar cuántas veces fue seleccionado y luego se dio de baja. |
| **RF-D05** | M | La ficha debe mostrar una línea de tiempo con una entrada por edición en la que el emprendimiento aparece, indicando qué ocurrió: se postuló sin quedar, participó, se bajó, o la edición se canceló. |
| **RF-D06** | S | Cada entrada de la línea de tiempo debe mostrar, cuando corresponda, el tipo de puesto, el precio, lo pagado, el número de mesa y la hora de llegada. |
| **RF-D07** | S | La ficha debe ofrecer contacto directo por WhatsApp, correo e Instagram. |
| **RF-D08** | S | La ficha debe distinguir visualmente a quien se postuló repetidamente sin haber quedado nunca. |
| **RF-D09** | C | La ficha debe mostrar los datos de contacto tal como llegaron en cada postulación, no solo los más recientes. |

> **RF-D02 / RF-D03 — criterio de aceptación:** los conteos deben excluir de
> *participaciones* las ediciones canceladas, y deben coincidir con el recuento
> manual sobre las planillas de origen.

---

## E. Postulaciones e importación

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-E01** | M | El sistema debe importar postulaciones desde un archivo de respuestas de formulario (`.xlsx` o `.csv`). |
| **RF-E02** | M | El sistema debe importar la lista de seleccionados de una edición desde archivo. |
| **RF-E03** | M | La importación debe tolerar variaciones de formato entre ediciones: distinto orden de columnas y campos ausentes o añadidos. |
| **RF-E04** | M | La importación debe identificar cada columna por el **contenido** de sus datos, usando los encabezados solo como pista, porque existen archivos con encabezados desalineados. |
| **RF-E05** | M | La importación debe reconocer los bloques finales de las planillas y distinguir su significado: proyectos descartados en la curaduría (no son participación) frente a proyectos que quedaron y luego se cayeron (participación dada de baja). |
| **RF-E06** | M | Un rótulo de sección debe reconocerse por aparecer solo en su fila, para no confundirlo con una anotación escrita junto a los datos de un feriante. |
| **RF-E07** | M | La importación debe registrar, por cada postulación: descripción del proyecto, rubro, productos, mensaje, situación de talles de indumentaria, disponibilidad de taller, tipo de puesto solicitado y enlace a fotos. |
| **RF-E08** | M | La importación debe guardar los datos de contacto **tal como llegaron en esa edición**, sin sobrescribir los de ediciones anteriores. |
| **RF-E09** | M | La importación debe ser idempotente: reimportar el mismo archivo actualiza en lugar de duplicar. |
| **RF-E10** | M | La reimportación no debe destruir información que solo existe en el sistema, en particular los registros de llegada. |
| **RF-E11** | M | Ante emprendimientos repetidos dentro de un mismo archivo, el sistema debe conservar una sola postulación por edición. |
| **RF-E12** | S | La importación debe reportar los casos ambiguos —identidad dudosa, columnas no reconocidas— para resolución humana, sin resolverlos por su cuenta. |

> **RF-E05 — criterio de aceptación:** dada una planilla con un bloque final
> rotulado *"SACADAS…"*, esos proyectos deben quedar registrados como postulantes
> y **no** como participantes. Dado un bloque *"se bajaron"* o *"NO VIENEN"*, deben
> quedar como participación con estado de baja.

---

## F. Curaduría

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-F01** | M | El sistema debe presentar las postulaciones de una edición **una por pantalla**. |
| **RF-F02** | M | El sistema **no debe** ordenar, puntuar, filtrar ni recomendar postulaciones según criterios propios. Todas deben ser accesibles, en un orden estable. |
| **RF-F03** | M | Cada ficha debe mostrar: nombre del proyecto, responsable, rubro, ciudad, tipo de puesto solicitado, descripción, productos y mensaje. |
| **RF-F04** | M | Cada ficha debe ofrecer acceso directo al Instagram del proyecto. |
| **RF-F05** | M | Cada ficha debe ofrecer acceso a las fotos cuando la postulación aporte un enlace; cuando el dato sea texto libre, debe mostrarse tal cual. |
| **RF-F06** | M | Cada ficha debe mostrar la historia del proyecto con la feria **previa a esa edición**: participaciones, postulaciones y bajas. |
| **RF-F07** | S | La ficha debe destacar los casos de postulación reiterada sin haber quedado nunca. |
| **RF-F08** | S | La ficha debe destacar cuando la situación de talles declarada esté por debajo del mínimo. |
| **RF-F09** | M | El sistema debe permitir votar cada postulación como **sí**, **tal vez** o **no**. |
| **RF-F10** | M | El voto debe quedar asociado a la organizadora que lo emite; cada una vota desde su propio dispositivo. |
| **RF-F11** | M | El sistema **no debe** mostrar el voto de la otra organizadora mientras se está votando, para no condicionar la decisión. |
| **RF-F12** | M | El sistema debe permitir cambiar un voto ya emitido. |
| **RF-F13** | M | El sistema debe mostrar el avance de la votación propia sobre el total. |
| **RF-F14** | S | El sistema debe permitir alternar entre revisar solo lo pendiente o recorrer todas las postulaciones. |

### Cruce de votos

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-F15** | M | El sistema debe clasificar las postulaciones votadas en: coincidencia en sí, coincidencia en no, con algún tal vez, y discrepancia. |
| **RF-F16** | M | El grupo de discrepancias debe presentarse como el conjunto que requiere conversación. |
| **RF-F17** | M | En cada postulación cruzada debe verse qué votó cada organizadora. |
| **RF-F18** | S | El sistema debe mostrar el balance por rubro de las postulaciones con acuerdo positivo. |
| **RF-F19** | S | El sistema debe indicar cuántas postulaciones aún no votó alguna de las dos. |
| **RF-F20** | C | El sistema debe permitir convertir las postulaciones acordadas en participaciones de la edición. |

---

## G. Selección y puestos

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-G01** | M | El sistema debe permitir registrar qué emprendimientos participan de una edición. |
| **RF-G02** | M | El sistema debe permitir asignar un tipo de puesto a cada participación. |
| **RF-G03** | M | El sistema debe admitir participaciones sin postulación previa, para casos de invitación directa. |
| **RF-G04** | M | El sistema debe registrar el estado de cada participación: confirmada, dada de baja o ausente. |
| **RF-G05** | S | El sistema debe mostrar la ocupación por tipo de puesto contra su cupo. |
| **RF-G06** | S | El sistema debe permitir registrar el envío del mail de selección. |
| **RF-G07** | S | El sistema debe permitir anotar observaciones por participación (pedidos especiales, acuerdos particulares). |

---

## H. Cobros

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-H01** | M | El sistema debe calcular el precio de cada participación a partir del tipo de puesto asignado. |
| **RF-H02** | M | El sistema debe aplicar un descuento del 25% a los proyectos federales. |
| **RF-H03** | M | El descuento aplicado debe registrarse **por participación**: ser federal describe al emprendimiento, aplicar el descuento es una decisión de cada edición. |
| **RF-H04** | M | El precio cobrado debe conservarse tal como fue: un cambio posterior en la lista de precios no debe alterar ediciones ya cerradas. |
| **RF-H05** | M | El sistema debe admitir **varios pagos por participación**, cada uno con su monto. |
| **RF-H06** | M | Los montos deben ser libres: no debe asumirse que la seña es un porcentaje fijo. |
| **RF-H07** | M | Cada pago debe registrar a cuál de las cuentas del equipo ingresó. |
| **RF-H08** | M | El saldo debe calcularse siempre como precio menos pagos registrados, nunca cargarse manualmente. |
| **RF-H09** | M | El sistema debe permitir marcar participaciones sin cargo. |
| **RF-H10** | M | El sistema debe permitir filtrar por estado de cobro: sin pagar, pago parcial, saldado. |
| **RF-H11** | M | El sistema debe mostrar el total recaudado y el total pendiente de una edición. |
| **RF-H12** | S | El sistema debe señalar a quiénes se les venció una fecha límite con saldo pendiente. |

> **RF-H05 / RF-H06 — criterio de aceptación:** deben poder registrarse dos pagos
> de $22.500 y $22.500, o de $25.000 y $20.000, o uno solo de $45.000, sin que
> ninguno sea un caso especial.

> **RF-H08 — criterio de aceptación:** el total recaudado de una edición debe
> coincidir con la suma de los pagos registrados, sin depender de ninguna fórmula
> mantenida a mano.

---

## I. Fotos y catálogo

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-I01** | M | El sistema debe registrar el estado de las fotos de cada participación: pendiente, recibidas, o pedir más. |
| **RF-I02** | S | El sistema debe permitir anotar una observación sobre las fotos. |
| **RF-I03** | M | El sistema debe permitir filtrar por participaciones con fotos pendientes. |
| **RF-I04** | C | El sistema debe conservar el enlace a las fotos aportado en la postulación. |

---

## J. Armado del salón

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-J01** | M | El sistema debe permitir asignar un número de mesa a cada participación. |
| **RF-J02** | M | El sistema debe impedir que dos participaciones de una misma edición tengan el mismo número de mesa. |
| **RF-J03** | M | El sistema debe permitir asignar un sector a cada participación. |
| **RF-J04** | M | El color debe ser propiedad del sector y no repetirse en cada participación, de modo que renombrarlo o recolorearlo sea una sola operación. |
| **RF-J05** | S | El sistema debe permitir agrupar participaciones que comparten mesa, admitiendo grupos de más de dos. |
| **RF-J06** | S | El sistema debe permitir registrar preferencias de ubicación en texto libre. |
| **RF-J07** | S | El sistema debe mostrar el plano del salón con la ubicación de cada puesto. |
| **RF-J08** | C | El plano debe poder actualizarse cuando cambie la disposición del salón, sin rehacer la aplicación. |

---

## K. Día del evento

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-K01** | M | El sistema debe listar los participantes de la edición activa. |
| **RF-K02** | M | El sistema debe permitir buscar por nombre de proyecto, responsable, usuario de Instagram o número de mesa. |
| **RF-K03** | M | La búsqueda debe ser insensible a mayúsculas y acentos. |
| **RF-K04** | M | Cada participante debe mostrar su número de mesa y su sector, con el color correspondiente. |
| **RF-K05** | M | El sistema debe permitir marcar la llegada de un participante, registrando la hora. |
| **RF-K06** | M | El sistema debe permitir revertir una marca de llegada. |
| **RF-K07** | M | El sistema debe mostrar en todo momento cuántos llegaron sobre el total. |
| **RF-K08** | M | El sistema debe permitir filtrar entre todos, pendientes y llegados. |
| **RF-K09** | M | El sistema debe permitir filtrar por sector, seleccionando varios a la vez, para repartir la recepción entre varias personas. |
| **RF-K10** | M | Los cambios deben propagarse en vivo entre los dispositivos del equipo, sin recargar. |
| **RF-K11** | S | El sistema debe ofrecer una vista de mapa donde cada puesto cambie de aspecto al llegar su feriante. |
| **RF-K12** | S | El mapa debe permitir buscar un puesto y centrarlo, y marcar la llegada desde ahí. |

> **RF-K03 — criterio de aceptación:** buscar `chavez` debe encontrar a
> *Maia Chávez Corzo*.

> **RF-K10 — criterio de aceptación:** si una persona marca una llegada, el resto
> del equipo debe verlo reflejado sin intervención.

---

## L. Consultas y reportes

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-L01** | M | El sistema debe responder cuántas veces participó un emprendimiento determinado. |
| **RF-L02** | M | El sistema debe responder cuántas veces se postuló un emprendimiento determinado. |
| **RF-L03** | S | El sistema debe permitir identificar quiénes se postularon reiteradamente sin haber quedado nunca. |
| **RF-L04** | S | El sistema debe mostrar la ocupación y la recaudación por tipo de puesto en una edición. |
| **RF-L05** | S | El sistema debe mostrar la distribución por rubro de los participantes de una edición. |
| **RF-L06** | C | El sistema debe permitir exportar la información de una edición para uso externo. |

---

## M. Datos y consistencia

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-M01** | M | El modelo debe separar la identidad del emprendimiento de sus participaciones por edición. |
| **RF-M02** | M | Un emprendimiento no debe poder tener más de una participación en la misma edición. |
| **RF-M03** | M | Un emprendimiento no debe poder tener más de una postulación en la misma edición. |
| **RF-M04** | M | Una organizadora no debe poder emitir más de un voto por postulación. |
| **RF-M05** | M | El sistema no debe admitir una llegada registrada en una participación dada de baja o ausente. |
| **RF-M06** | M | Los catálogos compartidos (rubros, productos, sectores, cuentas del equipo) deben ser entidades propias y no texto libre repetido. |
| **RF-M07** | S | Los rubros deben poder unificarse cuando lleguen variantes de un mismo valor, sin perder el texto original que escribió la persona. |
| **RF-M08** | S | Los productos deben registrarse individualmente y no como una lista dentro de un mismo campo, para poder contarlos y filtrarlos. |
| **RF-M09** | S | El sistema debe registrar cuándo se modificó por última vez cada registro relevante. |
| **RF-M10** | M | La información de llegadas debe respaldarse antes de cualquier operación masiva de reimportación. |

---

## N. Interfaz

| ID | Pri | Requerimiento |
|---|---|---|
| **RF-N01** | M | La aplicación debe diseñarse para pantalla de teléfono y adaptarse hacia pantallas mayores. |
| **RF-N02** | M | Las acciones frecuentes deben ser alcanzables con una sola mano. |
| **RF-N03** | M | Los controles principales deben tener área táctil suficiente para usarse de pie y con apuro. |
| **RF-N04** | M | Ninguna vista debe requerir desplazamiento horizontal de la página. |
| **RF-N05** | M | El contenido no debe quedar tapado por controles superpuestos. |
| **RF-N06** | S | Las acciones irreversibles deben pedir confirmación. |
| **RF-N07** | S | Las acciones deben reflejarse de inmediato en pantalla y revertirse si fallan al guardarse. |
| **RF-N08** | S | La aplicación debe estar íntegramente en español rioplatense, con la terminología que usa el equipo. |

---

## Trazabilidad con los objetivos del PRD

| Objetivo | Requerimientos |
|---|---|
| **O1** Estado consultable | RF-H10, RF-H11, RF-H12, RF-I03, RF-M06 |
| **O2** Memoria entre ediciones | RF-C01, RF-C02, RF-D01…RF-D09, RF-L01…RF-L03 |
| **O3** Curaduría más barata | RF-F01…RF-F20 |
| **O4** Números correctos | RF-H05, RF-H06, RF-H08, RF-H11 |
| **O5** Recepción sostenida | RF-K01…RF-K12 |
| **O6** Reutilizable por edición | RF-B01…RF-B09, RF-E01…RF-E12 |

## Requerimientos explícitamente excluidos

| Excluido | Motivo |
|---|---|
| Puntaje, ranking o recomendación de postulaciones | Contradice el criterio de curaduría de la feria (RF-F02) |
| Formulario público de postulación | La convocatoria sigue en Google Forms |
| Procesamiento de pagos en línea | El sistema registra pagos ocurridos por fuera |
| Cuentas de usuario individuales | Acceso compartido por decisión de producto (RF-A01) |
| Acceso para feriantes | Herramienta interna del equipo |
| Funcionamiento sin conexión | La sede tiene conectividad estable |
