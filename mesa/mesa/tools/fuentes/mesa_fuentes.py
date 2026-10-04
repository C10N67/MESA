"""Mesa · fuentes para el título y los rótulos

Genera tres fuentes de mayúsculas romanas, inspiradas en el rótulo «MESA»:
capitales de inscripción, con trazo grueso en las verticales y en las
diagonales que bajan hacia la derecha, filetes finos en las horizontales y
remates largos.

  Lapidaria   la más fiel al rótulo: remates con su curva de unión.
  Cincelada   sin remates: los trazos se abren en las puntas, como tallados.
  Grabada     más gruesa y con una línea incisa dentro de los trazos gruesos.

Las minúsculas salen como versalitas (mayúsculas pequeñas), como en las
inscripciones clásicas.

Cada letra se dibuja con una «pluma ancha»: un trazo sigue una línea central
y su grosor depende de su dirección respecto al ángulo de la pluma. Así sale
solo el contraste de las capitales romanas, también en las curvas.

  pip install fonttools shapely brotli
  python3 tools/fuentes/mesa_fuentes.py      (desde mesa/mesa)

Deja en public/fonts/ un .woff2 (para la web) y un .ttf (para instalar) de
cada una.
"""

import math
import os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely.geometry import Polygon, MultiPolygon, LineString, box
from shapely.ops import unary_union
from shapely.geometry.polygon import orient
from shapely.validation import make_valid

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "public", "fonts"))

UPM = 1000
CREATED = 3_870_000_000   # fecha fija (segundos desde 1904): el archivo sale igual cada vez
CAP = 700          # altura de las mayúsculas
SMALL = 530        # altura de las versalitas

# ---------------------------------------------------------------- variantes
VARIANTS = {
    "lapidaria": dict(name="Mesa Lapidaria", thick=128, thin=32, pen=14, power=2.6,
                      serif=True, s=52, st=14, br=44, flare=0.0, inline=0.0, track=1.0),
    "cincelada": dict(name="Mesa Cincelada", thick=120, thin=34, pen=14, power=2.4,
                      serif=False, s=0, st=0, br=0, flare=0.95, inline=0.0, track=0.9),
    "grabada":   dict(name="Mesa Grabada", thick=150, thin=36, pen=14, power=2.4,
                      serif=True, s=54, st=16, br=44, flare=0.0, inline=0.17, track=1.05),
}


# ---------------------------------------------------------------- geometría
def bez(p0, p1, p2, p3, n=40):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


def arc(cx, cy, rx, ry, a0, a1, n=None):
    """Arco de elipse de a0 a a1 grados (positivo: antihorario)"""
    n = n or max(8, int(abs(a1 - a0) / 3))
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def line(x0, y0, x1, y1, n=12):
    return [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) for i in range(n + 1)]


def poly(geom):
    """Polígonos sueltos de una geometría de shapely"""
    if geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        return [geom]
    if hasattr(geom, "geoms"):
        out = []
        for g in geom.geoms:
            out += poly(g)
        return out
    return []


class Glyph:
    """Una letra en construcción. Las coordenadas de las definiciones van en
    el espacio de diseño de las mayúsculas (alto 700); aquí se escalan a
    versalitas si hace falta."""

    def __init__(self, v, height=CAP, sx=1.0):
        self.v, self.h, self.sx = v, height, sx
        self.k = height / CAP                       # escala vertical
        self.wk = 1.0 if height == CAP else 0.86    # los trazos de las versalitas, algo más finos
        self.parts, self.cuts, self.strokes = [], [], []

    # coordenadas
    def P(self, pts):
        return [(x * self.sx, y * self.k) for x, y in pts]

    def width_at(self, ang, weight):
        v = self.v
        if weight == "thin":
            return v["thin"] * self.wk
        if weight == "thick":
            return v["thick"] * self.wk
        s = abs(math.sin(ang - math.radians(v["pen"]))) ** v["power"]
        w = v["thin"] + (v["thick"] - v["thin"]) * s
        if isinstance(weight, (int, float)):
            w *= weight
        return w * self.wk

    def stroke(self, pts, weight=None, clip=True, ymin=0, ymax=CAP, inline=True, flare=True):
        pts = self.P(pts)
        p, widths, acc = self._outline(pts, weight, clip, ymin, ymax, (False, False))
        self.strokes.append(dict(pts=pts, weight=weight, clip=clip, ymin=ymin, ymax=ymax, flare=flare, index=len(self.parts)))
        self.parts.append(p)
        # línea incisa (variante grabada): por el centro de los trazos gruesos
        total = acc[-1] or 1
        if self.v["inline"] and inline and sum(widths) / len(widths) > 0.6 * self.v["thick"] * self.wk:
            cut_w = self.v["thick"] * self.v["inline"] * self.wk
            trim = 34 * self.k
            core = [q for q, s_ in zip(pts, acc) if trim < s_ < total - trim]
            if len(core) > 1:
                self.cuts.append(LineString(core).buffer(cut_w / 2, cap_style=2))
        return p

    def _outline(self, pts, weight, clip, ymin, ymax, ends):
        """El contorno de un trazo. «ends» dice qué puntas se abren (cincelada)."""
        n = len(pts)
        # longitud acumulada, para abrir las puntas (variante cincelada)
        acc = [0.0]
        for i in range(1, n):
            acc.append(acc[-1] + math.dist(pts[i], pts[i - 1]))
        total = acc[-1] or 1
        left, right, widths = [], [], []
        ext = 0 if not clip else 40     # se alarga y luego se recorta: el corte sale horizontal
        for i in range(n):
            a = pts[max(0, i - 1)]
            b = pts[min(n - 1, i + 1)]
            ang = math.atan2(b[1] - a[1], b[0] - a[0])
            w = self.width_at(ang, weight)
            if self.v["flare"] and (ends[0] or ends[1]):
                d0, d1 = acc[i], total - acc[i]
                f0 = max(0.0, 1 - d0 / (80 * self.k)) if ends[0] else 0
                f1 = max(0.0, 1 - d1 / (80 * self.k)) if ends[1] else 0
                f = max(f0, f1)
                w *= 1 + self.v["flare"] * f * f
            nx, ny = -math.sin(ang), math.cos(ang)
            x, y = pts[i]
            if clip and i in (0, n - 1):      # prolonga las puntas para el recorte
                dx, dy = math.cos(ang), math.sin(ang)
                sgn = -1 if i == 0 else 1
                x, y = x + dx * ext * sgn, y + dy * ext * sgn
            left.append((x + nx * w / 2, y + ny * w / 2))
            right.append((x - nx * w / 2, y - ny * w / 2))
            widths.append(w)
        p = make_valid(Polygon(left + right[::-1]))
        if clip:
            p = p.intersection(box(-1e4, ymin * self.k, 1e4, ymax * self.k))
        return p, widths, acc

    def edges_at(self, geom, y):
        hit = geom.intersection(LineString([(-1e4, y), (1e4, y)]))
        if hit.is_empty:
            return None
        x0, _, x1, _ = hit.bounds
        return x0, x1

    def foot(self, geom, side="both", top=False, y=None, scale=1.0):
        """Remate al pie (o a la cabeza) de un trazo, con su curva de unión"""
        v = self.v
        if not v["serif"]:
            return
        k = (self.k if self.h == CAP else self.k * 1.15) * scale
        s, st, br = v["s"] * k, v["st"] * k, v["br"] * k
        H = self.h
        y0 = (H if top else 0) if y is None else y * self.k
        e = self.edges_at(geom, y0 + (-2 if top else 2))
        if not e:
            return
        xl, xr = e
        sl = s if side in ("both", "left") else 0
        sr = s if side in ("both", "right") else 0
        sg = -1 if top else 1

        def Y(d):
            return y0 + sg * d

        pts = [(xl - sl, Y(0)), (xr + sr, Y(0)), (xr + sr, Y(st))]
        if sr:
            pts += [(xr + sr * (1 - t) ** 2 + 0, Y(st + br * t * t)) for t in [i / 10 for i in range(1, 11)]]
        pts += [(xr, Y(st + br + 6 * k)), (xl, Y(st + br + 6 * k))]
        if sl:
            pts += [(xl - sl * t * t, Y(st + br * (1 - t) ** 2)) for t in [i / 10 for i in range(0, 10)]]
        pts += [(xl - sl, Y(st))]
        self.parts.append(make_valid(Polygon(pts)))

    def arm(self, x, y_edge, down=True, drop=72, length=56, right=True):
        """Remate vertical al final de un brazo horizontal (E, F, T, L, Z)"""
        if not self.v["serif"]:
            return
        x = x * self.sx
        k = self.k
        y = y_edge * k
        d = drop * k * (-1 if down else 1)
        L = length * k * (1 if right else -1)
        tip = x + (6 if right else -6) * k
        pts = [(x - L, y), (tip, y), (tip + (3 if right else -3) * k, y + d)]
        for i in range(1, 11):
            t = i / 10
            pts.append((tip + (x - L - tip) * t * t, y + d * (1 - t) ** 1.6))
        self.parts.append(make_valid(Polygon(pts)))

    def dot(self, x, y, r):
        p = Polygon(arc(x * self.sx, y * self.k, r * self.k * (1 if self.h == CAP else 1.1), r * self.k * (1 if self.h == CAP else 1.1), 0, 360, 48))
        self.parts.append(p)

    def shape(self):
        """Une las piezas. En la cincelada, antes abre las puntas libres de cada
        trazo: las que no caen dentro de otro trazo (un pie, un brazo, el
        final de una curva), no las uniones."""
        if self.v["flare"]:
            for i, st in enumerate(self.strokes):
                others = [self.parts[o["index"]] for j, o in enumerate(self.strokes) if j != i and o["flare"]]
                others += [self.parts[o["index"]] for j, o in enumerate(self.strokes) if j != i and not o["flare"]]
                def free(pt):
                    from shapely.geometry import Point
                    q = Point(pt)
                    return not any(o.buffer(4).contains(q) for o in others)
                if not st["flare"]:
                    continue
                ends = (free(st["pts"][0]), free(st["pts"][-1]))
                closed = math.dist(st["pts"][0], st["pts"][-1]) < 1
                if closed or not (ends[0] or ends[1]):
                    continue
                self.parts[st["index"]] = self._outline(st["pts"], st["weight"], st["clip"], st["ymin"], st["ymax"], ends)[0]
        g = unary_union([make_valid(p) for p in self.parts]) if self.parts else Polygon()
        if self.cuts:
            g = g.difference(unary_union(self.cuts))
        return g.buffer(0)


# ---------------------------------------------------------------- las letras
# Cada definición dibuja en el espacio de las mayúsculas (alto 700) y
# devuelve el ancho del cuerpo de la letra.
T = CAP


def L_A(g):
    left = g.stroke(line(30, 0, 320, T + 18), None)
    right = g.stroke(line(320, T + 18, 610, 0), None)
    g.stroke(line(150, 228, 490, 228), "thin", clip=False)
    g.foot(left, "both"); g.foot(right, "both")
    return 640


def L_B(g):
    st = g.stroke(line(70, 0, 70, T), "thick")
    t = g.v["thin"] / 2
    g.stroke(line(70, T - t, 250, T - t), "thin", clip=False)
    g.stroke(arc(250, 540, 160, 160 - t, 90, -90), None, clip=False)
    g.stroke(line(70, 380 + t, 250, 380 + t), "thin", clip=False)
    g.stroke(arc(270, 192, 190, 192 - t, 90, -90), None, clip=False)
    g.stroke(line(70, t, 270, t), "thin", clip=False)
    g.foot(st, "left"); g.foot(st, "left", top=True)
    return 480


def L_C(g):
    g.stroke(arc(345, 350, 300, 362, 42, 318), None, clip=False)
    g.arm(560, T - 40, down=False, drop=58, length=40)
    return 610


def L_D(g):
    st = g.stroke(line(70, 0, 70, T), "thick")
    t = g.v["thin"] / 2
    g.stroke(line(70, T - t, 300, T - t), "thin", clip=False)
    g.stroke(arc(300, 350, 300, 350 - t, 90, -90), None, clip=False)
    g.stroke(line(70, t, 300, t), "thin", clip=False)
    g.foot(st, "left"); g.foot(st, "left", top=True)
    return 650


def L_E(g):
    st = g.stroke(line(70, 0, 70, T), "thick")
    t = g.v["thin"] / 2
    g.stroke(line(70, T - t, 400, T - t), "thin", clip=False)
    g.stroke(line(70, 365, 360, 365), "thin", clip=False)
    g.stroke(line(70, t, 420, t), "thin", clip=False)
    g.arm(400, T - 2 * t, down=True)
    g.arm(360, 365 - t, down=True, drop=44, length=34)
    g.arm(360, 365 + t, down=False, drop=44, length=34)
    g.arm(420, 2 * t, down=False)
    g.foot(st, "left"); g.foot(st, "left", top=True)
    return 450


def L_F(g):
    st = g.stroke(line(70, 0, 70, T), "thick")
    t = g.v["thin"] / 2
    g.stroke(line(70, T - t, 400, T - t), "thin", clip=False)
    g.stroke(line(70, 350, 350, 350), "thin", clip=False)
    g.arm(400, T - 2 * t, down=True)
    g.arm(350, 350 - t, down=True, drop=44, length=34)
    g.arm(350, 350 + t, down=False, drop=44, length=34)
    g.foot(st, "both"); g.foot(st, "left", top=True)
    return 430


def L_G(g):
    g.stroke(arc(345, 350, 300, 362, 42, 330), None, clip=False)
    jaw = g.stroke(line(605, 70, 605, 320), "thick", ymin=70, ymax=320)
    g.arm(560, T - 40, down=False, drop=58, length=40)
    g.foot(jaw, "both", top=True, y=320, scale=0.8)
    return 650


def L_H(g):
    a = g.stroke(line(70, 0, 70, T), "thick")
    b = g.stroke(line(570, 0, 570, T), "thick")
    g.stroke(line(70, 370, 570, 370), "thin", clip=False)
    for s_ in (a, b):
        g.foot(s_, "both"); g.foot(s_, "both", top=True)
    return 640


def L_I(g):
    a = g.stroke(line(70, 0, 70, T), "thick")
    g.foot(a, "both"); g.foot(a, "both", top=True)
    return 140


def L_J(g):
    a = g.stroke(line(170, 120, 170, T), "thick", ymin=120)
    g.stroke(bez((170, 140), (170, -40), (110, -120), (10, -150)), None, clip=False)
    g.foot(a, "both", top=True)
    return 240


def L_K(g):
    st = g.stroke(line(70, 0, 70, T), "thick")
    arm = g.stroke(line(100, 300, 500, T), "thin")
    leg = g.stroke(line(210, 410, 560, 0), "thick")
    g.foot(st, "both"); g.foot(st, "both", top=True)
    g.foot(arm, "both", top=True, scale=0.9); g.foot(leg, "both", scale=0.9)
    return 590


def L_L(g):
    st = g.stroke(line(70, 0, 70, T), "thick")
    t = g.v["thin"] / 2
    g.stroke(line(70, t, 440, t), "thin", clip=False)
    g.arm(440, 2 * t, down=False)
    g.foot(st, "left"); g.foot(st, "both", top=True)
    return 460


def L_M(g):
    a = g.stroke(line(40, 0, 120, T), "thin")
    g.stroke(line(120, T, 400, 0), "thick", ymin=-10)
    g.stroke(line(400, 0, 680, T), "thin", ymin=-10)
    b = g.stroke(line(680, T, 760, 0), "thick")
    g.foot(a, "both"); g.foot(b, "both")
    g.foot(a, "left", top=True); g.foot(b, "right", top=True)
    return 800


def L_N(g):
    a = g.stroke(line(70, 0, 70, T), "thin")
    g.stroke(line(70, T, 580, 0), "thick")
    b = g.stroke(line(580, 0, 580, T), "thin")
    g.foot(a, "both"); g.foot(a, "left", top=True); g.foot(b, "both", top=True)
    return 650


def L_O(g):
    g.stroke(arc(355, 350, 330, 362, 0, 360), None, clip=False, flare=False)
    return 710


def L_P(g):
    st = g.stroke(line(70, 0, 70, T), "thick")
    t = g.v["thin"] / 2
    g.stroke(line(70, T - t, 260, T - t), "thin", clip=False)
    g.stroke(arc(260, 495, 190, 205 - t, 90, -90), None, clip=False)
    g.stroke(line(70, 290 + t, 260, 290 + t), "thin", clip=False)
    g.foot(st, "both"); g.foot(st, "left", top=True)
    return 470


def L_Q(g):
    L_O(g)
    g.stroke(bez((330, 30), (470, -40), (600, -110), (760, -150)), None, clip=False)
    return 720


def L_R(g):
    st = g.stroke(line(70, 0, 70, T), "thick")
    t = g.v["thin"] / 2
    g.stroke(line(70, T - t, 260, T - t), "thin", clip=False)
    g.stroke(arc(260, 510, 180, 190 - t, 90, -90), None, clip=False)
    g.stroke(line(70, 320 + t, 260, 320 + t), "thin", clip=False)
    leg = g.stroke(line(250, 330, 560, 0), "thick")
    g.foot(st, "both"); g.foot(st, "left", top=True)
    g.foot(leg, "right")
    return 580


def L_S(g):
    pts = bez((395, 612), (360, 700), (250, 712), (210, 712))
    pts += bez((210, 712), (110, 712), (55, 640), (60, 560))[1:]
    pts += bez((60, 560), (65, 440), (390, 380), (400, 200))[1:]
    pts += bez((400, 200), (410, 70), (300, -12), (210, -12))[1:]
    pts += bez((210, -12), (110, -12), (40, 40), (25, 110))[1:]
    g.stroke(pts, None, clip=False)
    g.arm(392, 606, down=False, drop=46, length=40)
    g.arm(30, 112, down=True, drop=46, length=40, right=False)
    return 450


def L_T(g):
    t = g.v["thin"] / 2
    g.stroke(line(20, T - t, 600, T - t), "thin", clip=False)
    st = g.stroke(line(310, 0, 310, T), "thick")
    g.arm(600, T - 2 * t, down=True)
    g.arm(20, T - 2 * t, down=True, right=False)
    g.foot(st, "both")
    return 620


def L_U(g):
    a = g.stroke(line(70, 230, 70, T), "thick", ymin=200)
    b = g.stroke(line(570, 230, 570, T), "thin", ymin=200)
    g.stroke(arc(320, 230, 250, 242, 180, 360), None, clip=False)
    g.foot(a, "both", top=True); g.foot(b, "both", top=True)
    return 640


def L_V(g):
    a = g.stroke(line(20, T, 320, -14), "thick")
    b = g.stroke(line(320, -14, 620, T), "thin")
    g.foot(a, "both", top=True); g.foot(b, "both", top=True)
    return 640


def L_W(g):
    a = g.stroke(line(20, T, 270, -14), "thick")
    g.stroke(line(270, -14, 490, T - 30), "thin")
    g.stroke(line(450, T - 30, 690, -14), "thick")
    b = g.stroke(line(690, -14, 920, T), "thin")
    g.foot(a, "both", top=True); g.foot(b, "both", top=True)
    return 940


def L_X(g):
    a = g.stroke(line(40, T, 570, 0), "thick")
    b = g.stroke(line(60, 0, 550, T), "thin")
    g.foot(a, "both", top=True); g.foot(a, "both")
    g.foot(b, "both", top=True); g.foot(b, "both")
    return 610


def L_Y(g):
    a = g.stroke(line(20, T, 300, 330), "thick", ymin=320)
    b = g.stroke(line(580, T, 300, 330), "thin", ymin=320)
    st = g.stroke(line(300, 0, 300, 360), "thick")
    g.foot(a, "both", top=True); g.foot(b, "both", top=True); g.foot(st, "both")
    return 600


def L_Z(g):
    t = g.v["thin"] / 2
    g.stroke(line(70, T - t, 520, T - t), "thin", clip=False)
    g.stroke(line(500, T, 60, 0), "thick")
    g.stroke(line(50, t, 540, t), "thin", clip=False)
    g.arm(70, T - 2 * t, down=True, right=False)
    g.arm(540, 2 * t, down=False)
    return 580


# Cifras
def D_0(g):
    g.stroke(arc(260, 350, 230, 362, 0, 360), None, clip=False, flare=False)
    return 520


def D_1(g):
    st = g.stroke(line(220, 0, 220, T + 10), "thick")
    g.stroke(line(220, T + 10, 90, T - 120), "thin", clip=False)
    g.foot(st, "both")
    return 360


def D_2(g):
    pts = bez((70, 540), (70, 650), (160, 712), (250, 712))
    pts += bez((250, 712), (360, 712), (440, 640), (440, 540))[1:]
    pts += bez((440, 540), (440, 420), (250, 300), (70, 20))[1:]
    g.stroke(pts, None, clip=False)
    g.stroke(line(60, 11, 470, 11), "thin", clip=False)
    g.arm(470, 22, down=False)
    return 500


def D_3(g):
    g.stroke(arc(245, 535, 175, 177, 155, -90), None, clip=False)
    g.stroke(arc(255, 190, 205, 202, 90, -155), None, clip=False)
    return 490


def D_4(g):
    st = g.stroke(line(380, 0, 380, T), "thick")
    g.stroke(line(380, T, 40, 210), "thin")
    g.stroke(line(40, 210, 500, 210), "thin", clip=False)
    g.foot(st, "both")
    return 520


def D_5(g):
    t = g.v["thin"] / 2
    g.stroke(line(130, T - t, 450, T - t), "thin", clip=False)
    g.stroke(line(130, T, 110, 400), "thick")
    pts = bez((110, 405), (170, 450), (230, 460), (270, 460))
    pts += bez((270, 460), (400, 460), (470, 360), (470, 240))[1:]
    pts += bez((470, 240), (470, 80), (360, -12), (240, -12))[1:]
    pts += bez((240, -12), (140, -12), (60, 40), (40, 110))[1:]
    g.stroke(pts, None, clip=False)
    g.arm(450, T - 2 * t, down=True, drop=56, length=44)
    return 510


def D_6(g):
    g.stroke(arc(265, 225, 215, 237, 0, 360), None, clip=False, flare=False)
    g.stroke(bez((52, 240), (52, 560), (210, 712), (430, 700)), None, clip=False)
    return 530


def D_7(g):
    t = g.v["thin"] / 2
    g.stroke(line(50, T - t, 480, T - t), "thin", clip=False)
    g.stroke(line(480, T, 190, 0), "thick")
    g.arm(50, T - 2 * t, down=True, right=False)
    return 510


def D_8(g):
    g.stroke(arc(255, 530, 175, 172, 0, 360), None, clip=False, flare=False)
    g.stroke(arc(255, 190, 210, 202, 0, 360), None, clip=False, flare=False)
    return 510


def D_9(g):
    g.stroke(arc(265, 475, 215, 237, 0, 360), None, clip=False, flare=False)
    g.stroke(bez((478, 460), (478, 140), (320, -12), (100, 0)), None, clip=False)
    return 530


# Signos
def S_period(g):
    g.dot(90, 45, 50)
    return 180


def S_comma(g):
    g.dot(95, 50, 50)
    g.stroke(bez((135, 40), (140, -40), (100, -110), (40, -150)), "thin", clip=False)
    return 190


def S_colon(g):
    g.dot(90, 45, 50); g.dot(90, 420, 50)
    return 180


def S_semicolon(g):
    S_comma(g); g.dot(95, 420, 50)
    return 190


def S_hyphen(g):
    g.stroke(line(40, 300, 300, 300), 1.6, clip=False)
    return 340


def S_endash(g):
    g.stroke(line(30, 300, 470, 300), 1.6, clip=False)
    return 500


def S_middot(g):
    # el punto clásico de las inscripciones: un triángulo
    k = g.k
    g.parts.append(Polygon([(40 * g.sx, 300 * k), (150 * g.sx, 345 * k), (60 * g.sx, 400 * k)]))
    return 190


def S_exclam(g):
    g.stroke(line(100, 220, 100, T), "thick", clip=False)
    g.dot(100, 45, 50)
    return 200


def S_question(g):
    pts = bez((60, 560), (60, 660), (150, 712), (240, 712))
    pts += bez((240, 712), (350, 712), (420, 640), (420, 545))[1:]
    pts += bez((420, 545), (420, 420), (250, 400), (240, 230))[1:]
    g.stroke(pts, None, clip=False)
    g.dot(240, 45, 50)
    return 470


def S_quote(g):
    g.stroke(line(90, T, 70, T - 220), "thick", clip=False)
    return 170


def S_dquote(g):
    g.stroke(line(90, T, 70, T - 220), "thick", clip=False)
    g.stroke(line(230, T, 210, T - 220), "thick", clip=False)
    return 300


def S_slash(g):
    g.stroke(line(20, -80, 380, T + 40), "thin", clip=False)
    return 400


def S_paren_l(g):
    g.stroke(arc(330, 300, 250, 470, 120, 240), None, clip=False)
    return 300


def S_paren_r(g):
    g.stroke(arc(-30, 300, 250, 470, 60, -60), None, clip=False)
    return 300


def S_amp(g):
    # «et» latino, a la manera de las inscripciones: E y T enlazadas
    st = g.stroke(line(70, 0, 70, T), "thick")
    t = g.v["thin"] / 2
    g.stroke(line(70, T - t, 330, T - t), "thin", clip=False)
    g.stroke(line(70, 365, 300, 365), "thin", clip=False)
    g.stroke(line(70, t, 330, t), "thin", clip=False)
    g.stroke(line(330, T - t, 640, T - t), "thin", clip=False)
    s2 = g.stroke(line(480, 0, 480, T), "thick")
    g.foot(st, "left"); g.foot(st, "left", top=True); g.foot(s2, "both")
    g.arm(640, T - 2 * t, down=True)
    return 660


def S_space(g):
    return 260


LETTERS = {c: globals()["L_" + c] for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
DIGITS = {str(i): globals()[f"D_{i}"] for i in range(10)}
SIGNS = {".": S_period, ",": S_comma, ":": S_colon, ";": S_semicolon, "-": S_hyphen, "–": S_endash,
         "·": S_middot, "!": S_exclam, "?": S_question, "'": S_quote, "’": S_quote, '"': S_dquote,
         "/": S_slash, "(": S_paren_l, ")": S_paren_r, "&": S_amp, " ": S_space}


# Acentos, encima de la letra
def mark(g, kind, cx, top):
    k = g.k
    if kind == "acute":
        g.stroke(line(cx - 30, top + 60, cx + 70, top + 175), 1.3, clip=False, inline=False)
    elif kind == "dier":
        g.dot(cx - 85, top + 105, 40); g.dot(cx + 85, top + 105, 40)
    elif kind == "tilde":
        g.stroke(bez((cx - 150, top + 70), (cx - 90, top + 170), (cx + 90, top + 50), (cx + 150, top + 150)), 1.1, clip=False, inline=False)


ACCENTED = {"Á": ("A", "acute"), "É": ("E", "acute"), "Í": ("I", "acute"), "Ó": ("O", "acute"), "Ú": ("U", "acute"),
            "Ü": ("U", "dier"), "Ñ": ("N", "tilde")}


# ---------------------------------------------------------------- la fuente
def build(key):
    v = VARIANTS[key]
    side = (v["s"] if v["serif"] else 30) + 34

    glyphs = {}          # nombre -> (forma, avance)
    cmap = {}

    def make(name, fn, height=CAP, sx=1.0, accent=None):
        g = Glyph(v, height, sx)
        w = fn(g) * sx
        if accent:
            mark(g, accent, w / 2 / sx, CAP + (0 if height == CAP else -40))
        shape = g.shape()
        bounds = shape.bounds if not shape.is_empty else (0, 0, w, 0)
        lsb = side * (1 if height == CAP else 0.8) * v["track"]
        adv = int(round(w + 2 * lsb)) if fn is not S_space else int(round(w))
        shape = translate(shape, lsb - min(0, bounds[0]) if fn is not S_space else 0)
        glyphs[name] = (shape, adv)

    for ch, fn in LETTERS.items():
        make(ch, fn)
        cmap[ord(ch)] = ch
        make(ch.lower() + ".sc", fn, SMALL, 0.84)
        cmap[ord(ch.lower())] = ch.lower() + ".sc"
    for ch, (base, acc) in ACCENTED.items():
        name = "uni%04X" % ord(ch)
        make(name, LETTERS[base], accent=acc)
        cmap[ord(ch)] = name
        low = ch.lower()
        name2 = "uni%04X" % ord(low)
        make(name2, LETTERS[base], SMALL, 0.84, accent=acc)
        cmap[ord(low)] = name2
    for ch, fn in DIGITS.items():
        name = "digit" + ch
        make(name, fn)
        cmap[ord(ch)] = name
    for ch, fn in SIGNS.items():
        name = "space" if ch == " " else "uni%04X" % ord(ch)
        if name in glyphs:
            cmap[ord(ch)] = name
            continue
        make(name, fn)
        cmap[ord(ch)] = name
    # ¡ y ¿: girados
    for ch, src in (("¡", "!"), ("¿", "?")):
        shape, adv = glyphs["uni%04X" % ord(src)]
        name = "uni%04X" % ord(ch)
        glyphs[name] = (rotate180(shape, adv, CAP), adv)
        cmap[ord(ch)] = name
    cmap[0xA0] = "space"

    order = [".notdef"] + sorted(glyphs)
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    pen_glyphs, metrics = {}, {}
    empty = TTGlyphPen(None)
    pen_glyphs[".notdef"] = empty.glyph()
    metrics[".notdef"] = (500, 0)
    for name in order[1:]:
        shape, adv = glyphs[name]
        pen = TTGlyphPen(None)
        for p in poly(shape.simplify(0.6)):
            p = orient(p, sign=-1.0)          # TrueType: exterior en sentido horario
            for ring in [p.exterior] + list(p.interiors):
                pts = [(int(round(x)), int(round(y))) for x, y in list(ring.coords)[:-1]]
                clean = [q for i, q in enumerate(pts) if q != pts[i - 1]]
                if len(clean) < 3:
                    continue
                pen.moveTo(clean[0])
                for q in clean[1:]:
                    pen.lineTo(q)
                pen.closePath()
        gl = pen.glyph()
        pen_glyphs[name] = gl
        xmin = 0 if shape.is_empty else int(math.floor(shape.bounds[0]))
        metrics[name] = (adv, xmin)
    fb.setupGlyf(pen_glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=930, descent=-230)
    family = v["name"]
    fb.setupNameTable({
        "familyName": family, "styleName": "Regular", "uniqueFontIdentifier": family.replace(" ", "") + "-1.0",
        "fullName": family, "psName": family.replace(" ", "") + "-Regular", "version": "Version 1.000",
        "copyright": "Mesa · dibujada para el proyecto Mesa",
        "licenseDescription": "Licencia MIT, como el resto de Mesa"})
    fb.setupOS2(sTypoAscender=930, sTypoDescender=-230, sTypoLineGap=0, usWinAscent=960, usWinDescent=260,
                sxHeight=SMALL, sCapHeight=CAP, achVendID="MESA", fsType=0)
    fb.setupPost()
    fb.setupHead(unitsPerEm=UPM, created=CREATED, modified=CREATED)
    os.makedirs(OUT, exist_ok=True)
    base = os.path.join(OUT, "mesa-" + key)
    fb.save(base + ".ttf")
    fb.font.flavor = "woff2"
    fb.save(base + ".woff2")
    return base


def translate(shape, dx):
    from shapely.affinity import translate as tr
    return tr(shape, xoff=dx)


def rotate180(shape, adv, h):
    from shapely.affinity import rotate
    return rotate(shape, 180, origin=(adv / 2, h * 0.36))


if __name__ == "__main__":
    for key in VARIANTS:
        print(build(key))
