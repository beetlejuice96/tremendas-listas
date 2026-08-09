# Activar el PIN de acceso

El código ya está listo. Falta crear la cuenta compartida del equipo, que es un
paso que tenés que hacer vos: definir una contraseña no es algo que deba hacer yo
por vos.

Mientras no lo hagas, **la app sigue funcionando sin PIN** (queda como está hoy).

## 1. Crear el usuario del equipo

En el dashboard de Supabase → **Authentication** → **Users** → **Add user** →
*Create new user*:

- **Email**: algo genérico del equipo, por ejemplo `equipo@tremendaferia.com`.
  No hace falta que exista de verdad.
- **Password**: el PIN que va a usar el equipo. Mínimo 6 caracteres.
  Si querés que sean números para escribirlo rápido en el celular, que sean al
  menos 8 dígitos: 6 dígitos son 1.000.000 de combinaciones y se prueban solas.
- Tildar **Auto Confirm User** (si no, Supabase espera una confirmación por mail
  que nunca va a llegar).

## 2. Cerrar el registro público

Mismo dashboard → **Authentication** → **Sign In / Providers** → **Email**:
desactivar **Allow new users to sign up**.

Sin esto, cualquiera puede crearse una cuenta y entrar.

## 3. Configurar el email en la app

En `.env` (local) y en Vercel → Settings → Environment Variables (producción):

```
VITE_EMAIL_EQUIPO=equipo@tremendaferia.com
```

Redeployar. Desde ahí la app pide PIN al entrar.

## 4. Cerrar el acceso anónimo (avisame y lo hago)

Hoy las políticas de la base permiten leer y escribir sin estar logueado. Una vez
que el PIN funcione, hay que cambiarlas para que exijan sesión:

```sql
-- Se repite para cada tabla: emprendimientos, ediciones, tipos_puesto,
-- postulaciones, votos, participaciones, pagos.
drop policy "acceso app emprendimientos" on public.emprendimientos;
create policy "solo equipo emprendimientos" on public.emprendimientos
  for all to authenticated using (true) with check (true);
```

Este paso va **después** de verificar que el PIN entra bien: si se aplica antes,
la app deja de leer datos.

## Por qué un PIN y no sólo una pantalla

La pantalla usa Supabase Auth por detrás. Para el equipo es "poné el PIN", pero la
protección es real: sin sesión válida, la base no devuelve datos. Una pantalla de
PIN que sólo esconde la interfaz no protegería nada, porque los datos igual viajan
al navegador.

Importa porque en la base ya hay **701 emprendimientos con sus mails y teléfonos**,
más los montos de pago.
