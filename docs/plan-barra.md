# Plan — Barra de tragos

> Propuesta. La feria suma una barra propia y las owners quieren saber cuánto
> se vendió y cuánto se ganó con eso, por separado del resto de la operación.

## Qué se pide

Una sección aparte, en `/barra`, para registrar lo que se vende en la barra
durante la feria y ver el resultado económico de ese negocio solo.

No debe mezclarse con la app de feriantes: quien entra a `/barra` ve la barra y
nada más, y desde la app principal no hay forma de llegar ahí.

## Cómo aislarlo

La app hoy no usa router: navega con estado interno. Para una sola sección
aparte no hace falta sumar una librería de ruteo.

**Bifurcación por URL en el arranque.** En `main.tsx`, si la dirección empieza
con `/barra` se monta el módulo de barra y no se carga nada de la app de
feriantes; en cualquier otro caso, la app como está hoy.

**Un `vercel.json` con reescritura.** Hoy `/barra` devuelve 404 porque Vercel no
sabe que es una app de una sola página. Con la reescritura, cualquier ruta sirve
el mismo `index.html` y el navegador decide qué mostrar.

Consecuencia a tener presente: **la URL es la única llave**. No es un secreto
criptográfico, es una dirección que no está enlazada en ningún lado. Alcanza para
que nadie entre por equivocación, no para impedir que alguien que la conoce
entre a propósito.

## Datos

### Productos

Los 12 del CSV, en la base y no en el código, para poder corregir un precio sin
volver a publicar la app.

```sql
productos_barra (
  id, categoria,            -- Con alcohol | Sin alcohol | Promos
  nombre, descripcion,
  precio_publico, precio_feriante,
  costo,                    -- ver "La pregunta abierta"
  activo, orden
)
```

Las promos son productos por derecho propio, no combos calculados: *2 bebidas con
alcohol* cuesta $8.000 aunque dos sueltas sumen $9.000. Se cargan como uno más.

### Ventas

```sql
ventas_barra (
  id, edicion_id,
  producto_id,
  cantidad,
  precio_unitario,          -- congelado al vender, como en el resto del sistema
  tipo_precio,              -- publico | feriante
  anulada boolean,          -- se anula, no se borra
  created_at
)
```

El precio se guarda en la venta y no se lee del producto: si a mitad de la feria
cambian un precio, lo ya cobrado no se altera. Es el mismo criterio que usamos
con `precio_final` en las participaciones.

Las ventas se anulan en vez de borrarse, para que un error de tipeo no
desaparezca del registro sin dejar rastro.

## Cómo se usa

**Pantalla de venta**, pensada para una barra con gente esperando:

- Un interruptor arriba: **público / feriante**. Cambia todos los precios de
  una, porque el mostrador atiende tandas parecidas.
- Los productos en grilla, agrupados por categoría, con el precio visible.
- Tocás un producto y se suma al ticket. Volvés a tocar, se suma otro.
- El total se ve siempre, grande.
- Un botón confirma la venta y limpia el ticket.

Con carrito en vez de registrar cada toque directo, porque una persona que pide
dos tragos y una gaseosa es un solo cobro, y ver el total antes de cobrar evita
errores.

**Pantalla de resultados**, para las owners:

- Cuánto se vendió en total.
- Cuánto de cada producto, ordenado por cantidad.
- Cuánto por categoría, y cuánto a precio de feriante contra precio público.
- Si se cargan costos: la ganancia.
- Las últimas ventas, para poder anular la que se cargó mal.

## La pregunta abierta: qué es "en limpio"

El pedido dice *"cuánto dinero se ganó en limpio solo en tragos"*, pero el CSV
solo trae precios de venta. Hay dos lecturas posibles y cambian el trabajo:

1. **Total recaudado.** Lo que entró por la barra. Sale directo de las ventas y
   no hace falta nada más.
2. **Ganancia neta.** Lo recaudado menos lo que costó. Para eso hace falta el
   costo de cada producto: la lata de cerveza, la medida de amargo, la gaseosa.

La segunda es más útil —una cerveza a $4.500 que costó $2.000 deja bastante menos
de lo que parece— pero necesita un dato que hoy no tengo. Se puede dejar el campo
listo y cargarlo después, sin rehacer nada.

## Fases

| Fase | Contenido |
|---|---|
| **1** | Reescritura de rutas, bifurcación por URL, tablas y carga de los 12 productos |
| **2** | Pantalla de venta con ticket y precios público/feriante |
| **3** | Pantalla de resultados y anulación de ventas |
| **4** | Costos y ganancia neta, si deciden cargarlos |

Las fases 1 a 3 dejan la barra usable. La 4 depende de la respuesta sobre los
costos.

## Lo que este módulo no hace

- No cobra ni integra medios de pago: registra ventas que ya ocurrieron.
- No controla stock: no avisa cuando se están por quedar sin cerveza.
- No se mezcla con los cobros a feriantes, que son otro negocio y otra pantalla.
