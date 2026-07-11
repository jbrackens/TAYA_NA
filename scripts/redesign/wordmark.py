#!/usr/bin/env python3
"""Regenerate the BrandWordmark outlines (P10 brand rule, name-portable).

Rule: derive lowercase outlines from Bricolage Grotesque (wght 640 /
opsz 40), then apply the two signature moves:
  1. split stroke — each `t` right crossbar arm steps DOWN 62 units
     (two arms, two levels: the two sides of a binary market);
  2. landing dot — mint period (r=78) 58 units after the last glyph.

Usage:  pip install fonttools brotli skia-pathops
        python3 scripts/redesign/wordmark.py <word> \
          apps/taptrade-platform/frontend/packages/app/public/fonts/BricolageGrotesque-var.woff2

Prints the SVG path `d`, the period circle geometry, and the viewBox —
paste into app/components/BrandWordmark.tsx and public/brand/*.svg.
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
from pathops import Path, PathOp, op

WGHT, OPSZ, SHIFT, DOT_R, DOT_GAP = 640, 40, 62, 78, 58

def svg_to_skia(dstr):
    from fontTools.svgLib.path import parse_path
    p = Path(); parse_path(dstr, p.getPen()); return p

def rect(x0, y0, x1, y1):
    p = Path(); pen = p.getPen()
    pen.moveTo((x0, y0)); pen.lineTo((x1, y0)); pen.lineTo((x1, y1)); pen.lineTo((x0, y1)); pen.closePath()
    return p

def translate(path, dx, dy):
    out = Path(); path.draw(TransformPen(out.getPen(), Transform(1, 0, 0, 1, dx, dy))); return out

def main(word, font_path):
    font = TTFont(font_path)
    inst = instantiateVariableFont(font, {"wght": WGHT, "opsz": OPSZ}, inplace=False)
    glyf, cmap = inst.getGlyphSet(), inst.getBestCmap()
    merged, x = Path(), 0
    for ch in word:
        pen = SVGPathPen(glyf); g = glyf[cmap[ord(ch)]]; g.draw(pen)
        p = svg_to_skia(pen.getCommands())
        if ch == "t":  # split stroke: detach + drop the right crossbar arm
            # locate the arm: widest region right of the stem in the
            # crossbar band; for Bricolage-t these bounds are stable
            arm_zone = rect(213.0, 413.5, 350.0, 524.0)
            arm = op(p, arm_zone, PathOp.INTERSECTION)
            p = op(op(p, arm_zone, PathOp.DIFFERENCE), translate(arm, 0, -SHIFT), PathOp.UNION)
        merged = op(merged, translate(p, x, 0), PathOp.UNION)
        x += g.width
    ymax = merged.bounds[3]
    final = Path(); merged.draw(TransformPen(final.getPen(), Transform(1, 0, 0, -1, 0, ymax)))
    pen = SVGPathPen(None); final.draw(pen)
    b = final.bounds
    cx, cy = b[2] + DOT_GAP + DOT_R, ymax - DOT_R
    print("d:", pen.getCommands()[:120], "…")
    print("circle:", cx, cy, DOT_R)
    print("viewBox: 0 0", cx + DOT_R + 12, b[3] + 4)

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "taptrade", sys.argv[2])
