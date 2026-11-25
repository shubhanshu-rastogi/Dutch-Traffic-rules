#!/usr/bin/env python3
"""Regenerate sw.js: lists every app file for offline use and versions the cache by content hash.

Run after changing any app file:  python3 scripts/build-sw.py
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INCLUDE = ['index.html', 'manifest.webmanifest', 'app.js', 'data.js', 'scenes.js', 'pwa.js']
INCLUDE += sorted(str(p.relative_to(ROOT)) for p in (ROOT / 'icons').glob('*.png'))
INCLUDE += sorted(str(p.relative_to(ROOT)) for p in (ROOT / 'signs').glob('*.webp'))

h = hashlib.sha256()
for f in INCLUDE:
    h.update(f.encode())
    h.update((ROOT / f).read_bytes())
version = h.hexdigest()[:10]

files = ['./'] + ['./' + f for f in INCLUDE]
template = (ROOT / 'scripts' / 'sw.template.js').read_text()
out = template.replace('__VERSION__', version).replace('__FILES__', json.dumps(files, indent=1))
(ROOT / 'sw.js').write_text(out)
print(f'sw.js written: {len(files)} files, cache version {version}')
