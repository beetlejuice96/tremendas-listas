"""Carga las ediciones históricas de la feria en Supabase.

Uso:
    python3 scripts/importar/importar.py --dry-run     # muestra qué haría
    python3 scripts/importar/importar.py               # escribe en la base

Idempotente: usa el handle de Instagram como identidad del emprendimiento y
(edicion, emprendimiento) como clave de postulación y participación, así que
volver a correrlo actualiza en vez de duplicar.
"""
from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lectura import Fila, parsear  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "DATA"


@dataclass
class Edicion:
    nombre: str
    fecha: str
    convocatoria: str
    seleccionados: str
    cancelada: bool = False


EDICIONES = [
    Edicion("Octubre 2025", "2025-10-19",
            "convocatoria 19 de octubre 2025.xlsx",
            "seleccionados 19 de octubre 2025.xlsx"),
    Edicion("Noviembre 2025", "2025-11-21",
            "convocatoria 21 de noviembre 2025 - edicion cancelada por lluvia.xlsx",
            "seleccionados 21 de noviembre 2025 - edicion cancelada por lluvia.xlsx",
            cancelada=True),
    Edicion("Diciembre 2025", "2025-12-21",
            "convocatoria 21 de diciembre 2025.xlsx",
            "seleccionados 21 de diciembre 2025.xlsx"),
    Edicion("Marzo 2026", "2026-03-15",
            "convocatoria 15 de marzo 2026.xlsx",
            "seleccionados 15 de marzo 2026.xlsx"),
    Edicion("Mayo 2026", "2026-05-10",
            "convocatoria 10 de mayo 2026.xlsx",
            "seleciconados 10 de mayo 2026.xlsx"),
    Edicion("Julio 2026", "2026-07-12",
            "convocatoria 12 de julio 2026.xlsx",
            "seleccionados 12 de julio 2026.xlsx"),
    Edicion("Septiembre 2026", "2026-09-13",
            "Convocatoria Tremenda Feria SEPTIEMBRE (respuestas) - Respuestas de formulario 1.csv",
            "🌷 \xa0Seleccionados SEPTIEMBRE - Hoja 1.csv"),
]

INDUMENTARIA = {
    "no tengo ninguna prenda": "sin_prendas",
    "al menos el 50%": "talles_ok",
    "tengo prendas": "talles_insuficientes",
}


def clasificar_indumentaria(texto: str) -> str | None:
    t = (texto or "").lower()
    for clave, valor in INDUMENTARIA.items():
        if clave in t:
            return valor
    return None


def nombre_tipo_puesto(texto: str) -> tuple[str, float] | None:
    """'Espacio 90: $52.000 /// Vos traés...' -> ('Espacio 90', 52000.0)"""
    from lectura import parsear_monto

    if not texto or ":" not in texto:
        return None
    nombre, _, resto = texto.partition(":")
    precio = parsear_monto(resto.split("///")[0].strip())
    return (nombre.strip(), precio) if precio else None


def mejor(actual: str | None, nuevo: str) -> str | None:
    """Prefiere el dato más reciente no vacío (las ediciones se recorren en orden)."""
    return nuevo.strip() if nuevo and nuevo.strip() else actual


def clave(texto: str) -> str:
    """Normaliza para comparar nombres de catálogo sin tildes ni mayúsculas."""
    import unicodedata

    t = unicodedata.normalize("NFD", (texto or "").strip().lower())
    return t.encode("ascii", "ignore").decode()


def catalogo(sb, tabla: str, nombres: set[str]) -> dict[str, str]:
    """Garantiza que existan esos nombres en un catálogo y devuelve {clave: id}."""
    limpios = sorted({n.strip() for n in nombres if n and n.strip()})
    if limpios:
        sb.table(tabla).upsert(
            [{"nombre": n} for n in limpios], on_conflict="nombre", ignore_duplicates=True
        ).execute()
    return {
        clave(r["nombre"]): r["id"]
        for r in sb.table(tabla).select("id,nombre").execute().data
    }


def sin_repetidos(filas: list[Fila]) -> list[Fila]:
    """Un emprendimiento por edición: alguna gente se postuló dos veces.

    Gana la última aparición, que suele ser la corrección de la anterior.
    """
    unicas: dict[str, Fila] = {}
    for fila in filas:
        unicas[fila.handle] = fila
    return list(unicas.values())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="no escribe, sólo reporta")
    args = ap.parse_args()

    # ---- 1. Leer todo y consolidar emprendimientos ----------------------------
    emprendimientos: dict[str, dict] = {}
    por_edicion: dict[str, tuple[list[Fila], list[Fila]]] = {}

    for ed in EDICIONES:
        postulantes = sin_repetidos(parsear(DATA / ed.convocatoria)[0])
        seleccionados = sin_repetidos(parsear(DATA / ed.seleccionados)[0])
        por_edicion[ed.nombre] = (postulantes, seleccionados)

        for fila in postulantes + seleccionados:
            e = emprendimientos.setdefault(fila.handle, {
                "handle": fila.handle, "nombre_proyecto": fila.handle,
                "responsable": None, "email": None, "celular": None,
                "web": None, "ciudad": None,
            })
            e["nombre_proyecto"] = mejor(e["nombre_proyecto"], fila.nombre_proyecto) or fila.handle
            # Si el "responsable" repite el nombre del proyecto, la columna estaba
            # corrida en esa edición: mejor no pisar el dato bueno de otra.
            if fila.responsable.strip().lower() != fila.nombre_proyecto.strip().lower():
                e["responsable"] = mejor(e["responsable"], fila.responsable)
            e["email"] = mejor(e["email"], fila.email)
            e["celular"] = mejor(e["celular"], fila.celular)
            e["web"] = mejor(e["web"], fila.web)
            e["ciudad"] = mejor(e["ciudad"], fila.ciudad)

    print(f"Emprendimientos únicos: {len(emprendimientos)}")
    for ed in EDICIONES:
        post, sel = por_edicion[ed.nombre]
        activos = [f for f in sel if not f.excluida]
        excl = [f for f in sel if f.excluida]
        marca = "  (cancelada)" if ed.cancelada else ""
        print(f"  {ed.nombre:<18} postulaciones={len(post):>4}  "
              f"seleccionados={len(activos):>3}  excluidos={len(excl):>2}{marca}")

    if args.dry_run:
        print("\n--dry-run: no se escribió nada.")
        return 0

    # ---- 2. Escribir ----------------------------------------------------------
    from supabase import create_client

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    sb = create_client(url, key)

    print("\nEscribiendo emprendimientos...")
    filas = list(emprendimientos.values())
    for i in range(0, len(filas), 200):
        sb.table("emprendimientos").upsert(filas[i:i + 200], on_conflict="handle").execute()
    ids_empr = {
        e["handle"]: e["id"]
        for e in sb.table("emprendimientos").select("id,handle").execute().data
    }
    print(f"  {len(ids_empr)} en la base")

    for ed in EDICIONES:
        postulantes, seleccionados = por_edicion[ed.nombre]

        existente = sb.table("ediciones").select("id").eq("nombre", ed.nombre).execute().data
        if existente:
            edicion_id = existente[0]["id"]
            sb.table("ediciones").update(
                {"fecha": ed.fecha, "cancelada": ed.cancelada}
            ).eq("id", edicion_id).execute()
        else:
            edicion_id = sb.table("ediciones").insert(
                {"nombre": ed.nombre, "fecha": ed.fecha, "cancelada": ed.cancelada}
            ).execute().data[0]["id"]

        # Tipos de puesto: salen de lo que pidieron los postulantes de esa edición.
        tipos: dict[str, float] = {}
        for fila in postulantes + seleccionados:
            if par := nombre_tipo_puesto(fila.puesto):
                tipos.setdefault(par[0], par[1])
        if tipos:
            sb.table("tipos_puesto").upsert(
                [{"edicion_id": edicion_id, "nombre": n, "precio": p, "orden": i}
                 for i, (n, p) in enumerate(sorted(tipos.items(), key=lambda kv: kv[1]))],
                on_conflict="edicion_id,nombre",
            ).execute()
        ids_tipo = {
            t["nombre"]: t["id"]
            for t in sb.table("tipos_puesto").select("id,nombre")
              .eq("edicion_id", edicion_id).execute().data
        }

        if postulantes:
            ids_rubro = catalogo(sb, "rubros", {f.rubro for f in postulantes if f.rubro})
            sb.table("postulaciones").upsert([{
                "edicion_id": edicion_id,
                "emprendimiento_id": ids_empr[f.handle],
                "descripcion": f.descripcion or None,
                "rubro_id": ids_rubro.get(clave(f.rubro)),
                "indumentaria": clasificar_indumentaria(f.indumentaria),
                "tipo_puesto_id": ids_tipo.get((nombre_tipo_puesto(f.puesto) or (None,))[0]),
                # Snapshot de contacto tal como llegó en esta edición.
                "email": f.email or None,
                "celular": f.celular or None,
                "ciudad": f.ciudad or None,
                "web": f.web or None,
                "nombre_proyecto": f.nombre_proyecto or None,
                "responsable": f.responsable or None,
            } for f in postulantes], on_conflict="edicion_id,emprendimiento_id").execute()

        ids_post = {
            p["emprendimiento_id"]: p["id"]
            for p in sb.table("postulaciones").select("id,emprendimiento_id")
              .eq("edicion_id", edicion_id).execute().data
        }

        # Productos: la lista 'Fanzine, Poster, Stickers' se guarda como relaciones.
        sueltos = {
            p.strip()
            for f in postulantes for p in f.productos.split(",") if p.strip()
        }
        if sueltos:
            ids_producto = catalogo(sb, "productos", sueltos)
            relaciones = [
                {"postulacion_id": ids_post[ids_empr[f.handle]],
                 "producto_id": ids_producto[clave(p)]}
                for f in postulantes if ids_post.get(ids_empr[f.handle])
                for p in {x.strip() for x in f.productos.split(",") if x.strip()}
                if clave(p) in ids_producto
            ]
            for i in range(0, len(relaciones), 500):
                sb.table("postulacion_productos").upsert(
                    relaciones[i:i + 500], on_conflict="postulacion_id,producto_id",
                    ignore_duplicates=True,
                ).execute()

        # Las 'descartadas' se miraron y quedaron afuera: nunca fueron seleccionadas,
        # así que no son participaciones. Su postulación ya quedó registrada arriba.
        participantes = [f for f in seleccionados if f.exclusion != "descarte"]

        if participantes:
            registros = []
            for f in participantes:
                empr_id = ids_empr[f.handle]
                tipo = nombre_tipo_puesto(f.puesto)
                registros.append({
                    "edicion_id": edicion_id,
                    "emprendimiento_id": empr_id,
                    "postulacion_id": ids_post.get(empr_id),
                    "tipo_puesto_id": ids_tipo.get(tipo[0]) if tipo else None,
                    "precio_final": tipo[1] if tipo else None,
                    "estado": "se_bajo" if f.exclusion == "baja" else "confirmada",
                })
            sb.table("participaciones").upsert(
                registros, on_conflict="edicion_id,emprendimiento_id"
            ).execute()

            # Reimportar debe poder corregir de más: se borran las participaciones
            # de esta edición que ya no figuran en la planilla, salvo que tengan
            # una llegada registrada (ese dato sólo existe en la app).
            validos = {ids_empr[f.handle] for f in participantes}
            for p in sb.table("participaciones").select("id, emprendimiento_id, llegado_at") \
                    .eq("edicion_id", edicion_id).execute().data:
                if p["emprendimiento_id"] not in validos and p["llegado_at"] is None:
                    sb.table("participaciones").delete().eq("id", p["id"]).execute()

            # Pagos: cada monto de la fila es un pago suelto de monto libre.
            ids_part = {
                p["emprendimiento_id"]: p["id"]
                for p in sb.table("participaciones").select("id,emprendimiento_id")
                  .eq("edicion_id", edicion_id).execute().data
            }
            pagos = [
                {"participacion_id": ids_part[ids_empr[f.handle]], "monto": monto}
                for f in seleccionados if not f.excluida
                for monto in f.montos
                if ids_part.get(ids_empr[f.handle])
            ]
            if pagos:
                ids = list({p["participacion_id"] for p in pagos})
                for i in range(0, len(ids), 100):
                    sb.table("pagos").delete().in_("participacion_id", ids[i:i + 100]).execute()
                for i in range(0, len(pagos), 200):
                    sb.table("pagos").insert(pagos[i:i + 200]).execute()

        print(f"  {ed.nombre:<18} listo "
              f"({len(postulantes)} postulaciones, {len(seleccionados)} participaciones)")

    print("\nImportación terminada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
