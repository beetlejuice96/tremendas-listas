"""Lectura tolerante de los excels/CSV históricos de la feria.

Los archivos mutaron de formato entre ediciones y, peor, en varios los headers
están corridos respecto de los datos (en julio 2026 el header dice `cel` sobre la
columna donde están los emprendimientos). Por eso acá las columnas se detectan
mirando el CONTENIDO de las filas de datos, usando los headers sólo como desempate.
"""
from __future__ import annotations

import csv
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

import openpyxl

# Marca el punto a partir del cual las filas ya no cuentan como participación:
# "NO VIENEN:" en octubre 2025, "se bajaron" en noviembre 2025.
CORTE = re.compile(r"^\s*(no vienen|se bajaron|no vinieron)\b", re.I)
URL_INSTAGRAM = re.compile(r"instagram\.com/+([^/?\s]+)", re.I)
SOLO_DIGITOS = re.compile(r"^[\d\s+()-]{7,}$")
MONTO = re.compile(r"^\$?\s*([\d.]+(?:,\d+)?)\s*$")

OTRAS_REDES = ("facebook", "linktr", "behance", "tiktok", "twitter")
SUFIJOS_WEB = (".com", ".ar", ".com.ar", ".net", ".org", ".store", ".shop")


def leer_filas(path: Path) -> list[list[str]]:
    """Devuelve todas las filas del archivo como listas de strings ya limpias."""
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8") as f:
            return [[celda.strip() for celda in fila] for fila in csv.reader(f)]
    hoja = openpyxl.load_workbook(path, data_only=True).worksheets[0]
    return [
        ["" if celda is None else str(celda).strip() for celda in fila]
        for fila in hoja.iter_rows(values_only=True)
    ]


def normalizar_handle(valor: str) -> str | None:
    """De cualquier forma de escribir un Instagram saca el handle limpio.

    Acepta 'https://www.instagram.com/pepe/', '@pepe', 'Www.instagram.com/pepe?x=1'.
    Devuelve None si el valor no parece un handle (mails, webs, texto suelto).
    """
    v = (valor or "").strip().rstrip("/")
    if not v:
        return None
    match = URL_INSTAGRAM.search(v)
    handle = (match.group(1) if match else v).split("?")[0].lstrip("@").strip().lower()
    handle = unicodedata.normalize("NFD", handle).encode("ascii", "ignore").decode()
    if not handle or " " in handle or "@" in handle or len(handle) > 40:
        return None
    # Si vino de una URL de instagram el handle es confiable tal cual: hay handles
    # legítimos que parecen dominios ('chicle.ar', 'sofiandreoli.arte') y descartarlos
    # borraría emprendimientos reales. Sin esa URL, sí hay que filtrar.
    if match:
        return handle
    if any(r in handle for r in OTRAS_REDES) or handle.startswith(("http", "www.")):
        return None
    return None if handle.endswith(SUFIJOS_WEB) else handle


def parsear_monto(valor: str) -> float | None:
    """'$52.000' / '26000.0' / '22500' -> float. None si no es un monto.

    El punto es ambiguo: en '$52.000' separa miles y en '26000.0' (como lo escribe
    openpyxl) es decimal. Se distingue por la cantidad de dígitos que le siguen.
    """
    m = MONTO.match((valor or "").strip())
    if not m:
        return None
    crudo = m.group(1).replace(",", ".")
    if "." in crudo:
        entero, _, ultimo = crudo.rpartition(".")
        crudo = f"{entero.replace('.', '')}.{ultimo}" if len(ultimo) < 3 \
            else crudo.replace(".", "")
    try:
        monto = float(crudo)
    except ValueError:
        return None
    # El puesto más barato fue $45.000 y la seña más chica ~$20.000: pedir 5.000 de
    # mínimo descarta años (2025, 2026) y cupos sin dejar afuera ningún pago real.
    return monto if 5_000 <= monto <= 10_000_000 else None


def _texto(valor: str) -> str:
    return unicodedata.normalize("NFD", (valor or "").lower()).encode("ascii", "ignore").decode()


@dataclass
class Columnas:
    """Índices de columna detectados por contenido."""

    handle: int | None = None
    email: int | None = None
    celular: int | None = None
    nombre_proyecto: int | None = None
    responsable: int | None = None
    web: int | None = None
    ciudad: int | None = None
    rubro: int | None = None
    descripcion: int | None = None
    puesto: int | None = None
    indumentaria: int | None = None
    productos: int | None = None
    montos: list[int] = field(default_factory=list)


def detectar_columnas(filas: list[list[str]], header: list[str]) -> Columnas:
    """Detecta qué hay en cada columna mirando los datos, no los títulos.

    Para cada columna cuenta cuántas de sus celdas cumplen cada patrón y se queda
    con la columna que más veces lo cumple. Los headers sólo desempatan los campos
    que no tienen una forma reconocible (nombre de proyecto vs. responsable).
    """
    ancho = max((len(f) for f in filas), default=0)
    cols = Columnas()

    def puntajes(test) -> dict[int, int]:
        return {
            j: sum(1 for fila in filas if j < len(fila) and test(fila[j]))
            for j in range(ancho)
        }

    def mejor(test, minimo: int = 3) -> int | None:
        marcador = puntajes(test)
        j, n = max(marcador.items(), key=lambda kv: kv[1], default=(None, 0))
        return j if n >= minimo else None

    cols.handle = mejor(lambda v: normalizar_handle(v) is not None and (
        "instagram" in v.lower() or v.startswith("@")
    ))
    cols.email = mejor(lambda v: "@" in v and "." in v.split("@")[-1])
    cols.celular = mejor(lambda v: bool(SOLO_DIGITOS.match(v)) and len(re.sub(r"\D", "", v)) >= 8)
    cols.web = mejor(lambda v: ("http" in v.lower() or "www." in v.lower())
                     and "instagram" not in v.lower())
    cols.puesto = mejor(lambda v: "$" in v and ("espacio" in _texto(v) or "mesa" in _texto(v)))
    cols.indumentaria = mejor(lambda v: "prenda" in _texto(v) or "modelos" in _texto(v))
    cols.descripcion = mejor(lambda v: len(v) > 120, minimo=5)

    # Columnas con montos: son los pagos (señó, completó pago). Se excluye la
    # columna TOTAL, que es el precio del puesto y no un pago recibido: contarla
    # duplicaría la recaudación de las ediciones que la tienen.
    def es_columna_precio(j: int) -> bool:
        titulo = _texto(header[j]) if j < len(header) else ""
        return titulo.startswith("total") or "precio" in titulo

    def es_columna_de_pagos(j: int) -> bool:
        """Una columna de pagos tiene casi puros montos.

        En marzo 2026 hay una columna sin título que mezcla montos con notas
        ('remeras', 'viene de antes'): esa no es de pagos y contarla infla el total.
        """
        celdas = [f[j] for f in filas if j < len(f) and f[j].strip()]
        if len(celdas) < 3:
            return False
        montos = sum(1 for c in celdas if parsear_monto(c) is not None)
        return montos / len(celdas) >= 0.8

    cols.montos = [
        j for j in range(ancho) if es_columna_de_pagos(j) and not es_columna_precio(j)
    ]

    # Los campos sin forma propia se resuelven por header.
    pistas = {
        "nombre_proyecto": ("emprendimiento",),
        "responsable": ("nombre y apellido", "nombre"),
        "ciudad": ("ciudad", "ubicacion"),
        "rubro": ("rubro",),
        "productos": ("productos de esta lista", "productos"),
    }
    usadas = {c for c in (cols.handle, cols.email, cols.celular, cols.web,
                          cols.puesto, cols.indumentaria, cols.descripcion) if c is not None}
    for campo, claves in pistas.items():
        for j, titulo in enumerate(header):
            t = _texto(titulo)
            if j not in usadas and any(k in t for k in claves):
                setattr(cols, campo, j)
                usadas.add(j)
                break

    # Cuando el header falla o está corrido (pasa en julio y mayo 2026), vale la
    # posición: en los 14 archivos el emprendimiento está en la columna inmediata
    # anterior al Instagram, y el responsable justo antes del emprendimiento.
    def texto_util(j: int) -> bool:
        muestras = [f[j] for f in filas if j < len(f) and f[j].strip()]
        return len(muestras) >= 3 and sum(len(m) < 60 for m in muestras) > len(muestras) / 2

    if cols.nombre_proyecto is None and cols.handle:
        j = cols.handle - 1
        if j >= 0 and j not in usadas and texto_util(j):
            cols.nombre_proyecto = j
            usadas.add(j)
    if cols.responsable is None and cols.nombre_proyecto:
        j = cols.nombre_proyecto - 1
        if j >= 0 and j not in usadas and texto_util(j):
            cols.responsable = j

    return cols


def encontrar_header(filas: list[list[str]]) -> tuple[int, list[str]]:
    """La fila de header es la primera que nombra la columna de Instagram."""
    for i, fila in enumerate(filas[:20]):
        for celda in fila:
            t = _texto(celda)
            if t == "insta" or t.startswith("instagram") or "instagram de tu" in t \
               or t.startswith("link del instagram"):
                return i, fila
    return -1, []


@dataclass
class Fila:
    """Una fila de datos ya interpretada.

    `handle` es la identidad del emprendimiento. Cuando la fila no trae Instagram
    (pasa con varios seleccionados reales) se usa el mail como respaldo, con el
    prefijo `mail:`, y `sin_instagram` queda en True para revisarlo después.
    """

    handle: str
    nombre_proyecto: str = ""
    responsable: str = ""
    email: str = ""
    celular: str = ""
    web: str = ""
    ciudad: str = ""
    rubro: str = ""
    descripcion: str = ""
    puesto: str = ""
    indumentaria: str = ""
    productos: str = ""
    montos: list[float] = field(default_factory=list)
    excluida: bool = False       # está debajo de "NO VIENEN" / "se bajaron"
    sin_instagram: bool = False  # identificada por mail: necesita revisión humana


def parsear(path: Path) -> tuple[list[Fila], Columnas]:
    """Lee un archivo y devuelve sus filas de datos interpretadas."""
    filas = leer_filas(path)
    idx_header, header = encontrar_header(filas)
    datos = filas[idx_header + 1:] if idx_header >= 0 else filas
    cols = detectar_columnas(datos, header)

    if cols.handle is None:
        raise ValueError(f"no encontré la columna de Instagram en {path.name}")

    def valor(fila: list[str], j: int | None) -> str:
        return fila[j].strip() if j is not None and j < len(fila) else ""

    resultado: list[Fila] = []
    excluidas = False
    for fila in datos:
        if any(CORTE.match(c) for c in fila if c):
            excluidas = True
        handle = normalizar_handle(valor(fila, cols.handle))
        email = valor(fila, cols.email)
        # Sin Instagram, el mail alcanza como identidad: si no, se pierden
        # participaciones y pagos reales (pasa en mayo 2026 con 3 feriantes).
        sin_instagram = not handle
        if sin_instagram:
            if "@" not in email:
                continue
            handle = f"mail:{email.lower()}"
        montos = [m for j in cols.montos if (m := parsear_monto(valor(fila, j))) is not None]
        resultado.append(Fila(
            handle=handle,
            sin_instagram=sin_instagram,
            nombre_proyecto=valor(fila, cols.nombre_proyecto),
            responsable=valor(fila, cols.responsable),
            email=valor(fila, cols.email),
            celular=valor(fila, cols.celular),
            web=valor(fila, cols.web),
            ciudad=valor(fila, cols.ciudad),
            rubro=valor(fila, cols.rubro),
            descripcion=valor(fila, cols.descripcion),
            puesto=valor(fila, cols.puesto),
            indumentaria=valor(fila, cols.indumentaria),
            productos=valor(fila, cols.productos),
            montos=montos,
            excluida=excluidas,
        ))
    return resultado, cols
