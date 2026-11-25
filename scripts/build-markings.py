#!/usr/bin/env python3
"""Draws the road-marking tile images in markings/ (top-down view of a road)."""
from pathlib import Path
OUT = Path(__file__).resolve().parent.parent / 'markings'
A, W, Y, RED, BLUE, PAVE = '#5b616a', '#f4f4ee', '#f2c230', '#b45a4e', '#2a63c7', '#d6d0c3'

def tile(body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><clipPath id="c"><rect width="200" height="200" rx="22"/></clipPath>{defs}</defs><g clip-path="url(#c)"><rect width="200" height="200" fill="{A}"/>{body}</g></svg>'
def dash(y, x0=0, x1=200, w=7, on=26, off=18, c=W):
    s, x = '', x0
    while x < x1: s += f'<rect x="{x}" y="{y - w / 2}" width="{min(on, x1 - x)}" height="{w}" fill="{c}"/>'; x += on + off
    return s
def solid(y, x0=0, x1=200, w=7, c=W): return f'<rect x="{x0}" y="{y - w / 2}" width="{x1 - x0}" height="{w}" fill="{c}"/>'
def bike(x, y, s=1, c=W):
    return f'<g transform="translate({x},{y}) scale({s})" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="-14" cy="6" r="9"/><circle cx="14" cy="6" r="9"/><path d="M-14 6l9 -15h16l3 15M-5 -9l5 15h14M8 -14h7"/></g>'
def arrow(x, y, kind, c=W):
    p = {'up': 'M-5 26v-30h-9l14 -22l14 22h-9v30z',
         'left': 'M5 26v-22c0 -10 -6 -14 -14 -14v8l-16 -15l16 -15v8c16 0 24 10 24 28v22z',
         'right': 'M-5 26v-22c0 -10 6 -14 14 -14v8l16 -15l-16 -15v8c-16 0 -24 10 -24 28v22z'}[kind]
    return f'<path transform="translate({x},{y})" d="{p}" fill="{c}"/>'
def kerb(): return f'<rect y="150" width="200" height="50" fill="{PAVE}"/><rect y="146" width="200" height="5" fill="#b9b2a3"/>'

T = {}
T['M1'] = tile(solid(100))
T['M2'] = tile(dash(100, -6))
T['M3'] = tile(solid(92) + dash(108, -6))
T['M4'] = tile(dash(100, -6, 110) + solid(100, 120) + ''.join(f'<path transform="translate({x},128) rotate(-18)" d="M-24 -4h30v-9l16 13l-16 13v-9h-30z" fill="{W}"/>' for x in (34, 84)))
T['M5'] = tile(f'<path d="M0 100L90 62H200M0 100L90 138H200" fill="none" stroke="{W}" stroke-width="6"/>' + f'<g clip-path="url(#h)">' + ''.join(f'<path d="M{x} 40l60 120" stroke="{W}" stroke-width="7"/>' for x in range(-20, 260, 24)) + '</g>', defs='<clipPath id="h"><path d="M0 100L90 62H200V138H90Z"/></clipPath>')
T['M6'] = tile(''.join(f'<path d="M{x - 15} 86h30l-15 34z" fill="{W}"/>' for x in (28, 64, 100, 136, 172)))
T['M7'] = tile(dash(60, -6) + f'<rect x="96" y="70" width="18" height="130" fill="{W}"/>' + f'<g transform="translate(150,34)"><rect x="-12" y="-26" width="24" height="56" rx="6" fill="#1d1d1d"/><circle cy="-12" r="7" fill="#e53935"/><circle cy="4" r="7" fill="#4a4628"/><circle cy="20" r="7" fill="#233d27"/></g>')
T['M8'] = tile(''.join(f'<rect x="{x}" y="10" width="18" height="180" fill="{W}"/>' for x in (14, 50, 86, 122, 158)))
T['M9'] = tile(f'<rect y="122" width="200" height="78" fill="{RED}"/>' + solid(122) + bike(100, 162, 1.25) + dash(50, -6))
T['M10'] = tile(f'<rect y="122" width="200" height="78" fill="{RED}"/>' + dash(122, -6, w=6, on=18, off=14) + dash(50, -6))
T['M11'] = tile(f'<rect x="58" width="84" height="200" fill="{RED}"/>' + ''.join(f'<rect x="{x}" y="{y}" width="16" height="16" fill="{W}"/>' for x in (52, 132) for y in range(6, 200, 30)) + ''.join(f'<path d="M34 {y - 10}v20l-18 -10z" fill="{W}"/>' for y in (124, 150, 176)))
T['M12'] = tile(f'<rect y="104" width="200" height="96" fill="#8e5a52"/>' + solid(104) + f'<text x="100" y="172" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="48" fill="{W}" transform="scale(1,1)">BUS</text>' + dash(40, -6))
T['M13'] = tile(dash(66, -6, w=5) + dash(134, -6, w=5) + arrow(34, 112, 'left') + arrow(100, 116, 'up') + arrow(166, 112, 'right'), )
T['M13'] = tile(f'<rect x="64" width="5" height="200" fill="{W}"/><rect x="131" width="5" height="200" fill="{W}"/>' + arrow(33, 120, 'left') + arrow(100, 120, 'up') + arrow(166, 120, 'right'))
T['M14'] = tile(''.join(f'<rect x="{x}" y="92" width="14" height="18" fill="{W}"/>' for x in range(4, 200, 26)) + dash(36, -6) + f'<path d="M110 200L200 160V200Z" fill="#a6c98a"/>')
T['M15'] = tile(dash(40, -6) + kerb() + solid(140, w=7, c=Y))
T['M16'] = tile(dash(40, -6) + kerb() + dash(140, -4, w=7, on=22, off=14, c=Y))
T['M17'] = tile(dash(30, -6) + kerb() + ''.join(f'<rect x="{x}" y="80" width="4" height="66" fill="{W}"/>' for x in (8, 98, 188)) + solid(140, w=8, c=BLUE) + f'<g transform="translate(150,112)"><rect x="-17" y="-20" width="34" height="38" rx="3" fill="{BLUE}"/><circle r="11" fill="#fff"/><path d="M0 -8v8l6 4" stroke="{BLUE}" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>')
T['M18'] = tile(dash(100, -6) + f'<path d="M0 132H60Q100 132 120 70H200" fill="none" stroke="{Y}" stroke-width="7" stroke-dasharray="22 12"/>' + ''.join(f'<g><circle cx="{x}" cy="150" r="11" fill="#f06a1f"/><circle cx="{x}" cy="150" r="4.5" fill="#fff"/></g>' for x in (130, 160, 190)))
for k, v in T.items(): (OUT / f'{k}.svg').write_text(v)
print(len(T), 'tiles written')
