"""Genera los íconos de la PWA.

Provisorios: iniciales sobre el fondo oscuro que ya usa la app. Para
reemplazarlos por el logo de la feria alcanza con pisar los PNG de public/.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONDO = (24, 24, 27)      # zinc-900, el mismo del encabezado de la app
TEXTO = (255, 255, 255)
INICIALES = "TL"
DESTINO = Path(__file__).resolve().parents[1] / "public"

FUENTES = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial.ttf",
]


def fuente(tamano: int):
    for ruta in FUENTES:
        if Path(ruta).exists():
            try:
                return ImageFont.truetype(ruta, tamano)
            except OSError:
                continue
    return ImageFont.load_default()


def icono(lado: int, margen: float = 0.0, redondeado: bool = False) -> Image.Image:
    """`margen` reserva espacio libre alrededor, que es lo que pide un ícono
    maskable: el sistema puede recortarlo en círculo sin comerse el texto."""
    img = Image.new("RGB", (lado, lado), FONDO)
    dib = ImageDraw.Draw(img)
    if redondeado:
        img = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
        dib = ImageDraw.Draw(img)
        dib.rounded_rectangle([0, 0, lado, lado], radius=int(lado * 0.22), fill=FONDO)

    util = lado * (1 - 2 * margen)
    f = fuente(int(util * 0.46))
    izq, arriba, der, abajo = dib.textbbox((0, 0), INICIALES, font=f)
    dib.text(
        ((lado - (der - izq)) / 2 - izq, (lado - (abajo - arriba)) / 2 - arriba),
        INICIALES, font=f, fill=TEXTO,
    )
    return img


def main() -> int:
    salidas = [
        ("pwa-192.png", icono(192)),
        ("pwa-512.png", icono(512)),
        # Maskable: Android lo recorta con la forma del sistema, así que necesita
        # margen o se pierde parte del contenido.
        ("pwa-maskable-512.png", icono(512, margen=0.18)),
        ("apple-touch-icon.png", icono(180, redondeado=True)),
        ("favicon.png", icono(64)),
    ]
    for nombre, img in salidas:
        destino = DESTINO / nombre
        img.save(destino)
        print(f"  {nombre:<26} {destino.stat().st_size / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
