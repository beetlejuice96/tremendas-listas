"""Genera src/lib/mesas.json a partir del plano SVG de la feria.

Los números de mesa vienen vectorizados en el SVG (no hay elementos de texto), así
que el mapeo rect -> número se hace a mano leyendo el plano renderizado. Los
bloques grises agrupan 2 o 3 puestos y se subdividen a lo largo de su lado largo.

Uso:  python3 scripts/gen_mesas.py DATA/map-septiembre.svg
"""
from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

# clave = (x, y) del atributo del rect, redondeados. Valor = mesas en orden visual
# (los bloques verticales se numeran de arriba abajo; los horizontales, de izquierda
# a derecha). El orden se recalcula tras rotar, así que acá sólo importa el conjunto.
BLOQUES = {
    (748, 493): [26, 25],
    (655, 745): [22, 21, 20],
    (1643, 71): [32, 33],
    (1889, 71): [34, 35],
    (2299, 78): [36, 37],
    (1132, 919): [51, 50],
    (1380, 918): [49, 48, 47],
    (2033, 841): [45, 44, 43],
    (2280, 841): [42, 41, 40],
    (998, 1462): [15, 13],
    (997, 1762): [12, 11],
    (76, 1291): [5, 4],
    (76, 1549): [3, 2],
    (909, 1772): [8, 9, 10],
}

SIMPLES = {
    (706, 195): 27, (837, 77): 28, (943, 76): 29, (1144, 76): 30, (1305, 83): 31,
    (1093, 337): 54, (1093, 442): 53, (1093, 547): 52,
    (1309, 427): 55, (1410, 428): 56,
    (1462, 363): 57, (1716, 363): 58, (2002, 364): 59,
    (1309, 573): 64, (1411, 573): 63,
    (1460, 514): 62, (1722, 514): 61, (1962, 513): 60,
    (735, 544): 24, (735, 645): 23,
    (2380, 563): 38, (2380, 668): 39,
    (1694, 852): 46,
    (991, 896): 19, (991, 1001): 18, (991, 1106): 17,
    (607, 1224): 16, (606, 1428): 14,
    (505, 1570): 6, (94, 1843): 1, (600, 1918): 7,
}


def esquinas(x, y, w, h, angulo, dentro=(0.0, 1.0), eje="h"):
    """Esquinas de una porción del rect, ya rotadas alrededor de (x, y).

    `dentro` acota qué tramo del rect se toma, en coordenadas locales (0 a 1),
    a lo largo del eje indicado. Sirve para partir un bloque en varios puestos.
    """
    desde, hasta = dentro
    if eje == "h":
        x0, x1, y0, y1 = w * desde, w * hasta, 0.0, h
    else:
        x0, x1, y0, y1 = 0.0, w, h * desde, h * hasta
    r = math.radians(angulo)
    cos, sin = math.cos(r), math.sin(r)
    return [
        (x + dx * cos - dy * sin, y + dx * sin + dy * cos)
        for dx, dy in [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    ]


def caja(puntos):
    xs = [p[0] for p in puntos]
    ys = [p[1] for p in puntos]
    return min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)


def main(ruta_svg: str) -> int:
    svg = Path(ruta_svg).read_text()
    mesas: dict[int, tuple] = {}
    vistos_bloques, vistos_simples = set(), set()

    for tag in re.findall(r"<rect[^>]*>", svg):
        attr = lambda n, d="": (re.search(n + r'="([^"]*)"', tag) or [None, d])[1]
        x, y = float(attr("x", "0")), float(attr("y", "0"))
        w, h = float(attr("width", "0")), float(attr("height", "0"))
        rot = re.search(r"rotate\(([-\d.]+)", attr("transform"))
        angulo = float(rot.group(1)) if rot else 0.0
        clave = (round(x), round(y))

        if clave in BLOQUES:
            numeros = BLOQUES[clave]
            eje = "h" if w >= h else "v"
            partes = []
            for i in range(len(numeros)):
                tramo = (i / len(numeros), (i + 1) / len(numeros))
                partes.append(caja(esquinas(x, y, w, h, angulo, tramo, eje)))
            # El orden visual se define después de rotar: puede haberse invertido.
            horizontal = max(p[2] for p in partes) >= max(p[3] for p in partes)
            partes.sort(key=lambda p: p[0] if horizontal else p[1])
            for numero, parte in zip(numeros, partes):
                mesas[numero] = parte
            vistos_bloques.add(clave)

        elif clave in SIMPLES:
            mesas[SIMPLES[clave]] = caja(esquinas(x, y, w, h, angulo))
            vistos_simples.add(clave)

    faltan_b = set(BLOQUES) - vistos_bloques
    faltan_s = set(SIMPLES) - vistos_simples
    assert not faltan_b, f"bloques no encontrados en el SVG: {sorted(faltan_b)}"
    assert not faltan_s, f"mesas sueltas no encontradas en el SVG: {sorted(faltan_s)}"
    esperadas = list(range(1, 65))
    assert sorted(mesas) == esperadas, (
        f"faltan {sorted(set(esperadas) - set(mesas))}, "
        f"sobran {sorted(set(mesas) - set(esperadas))}"
    )

    salida = [
        {"n": n, "x": round(x, 1), "y": round(y, 1), "w": round(w, 1), "h": round(h, 1)}
        for n, (x, y, w, h) in sorted(mesas.items())
    ]
    destino = Path(__file__).resolve().parents[1] / "src/lib/mesas.json"
    destino.write_text(json.dumps(salida, indent=1))
    print(f"OK {len(salida)} mesas -> {destino}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else "DATA/map-septiembre.svg"))
