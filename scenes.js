/* Scene engine: top-down animated road examples.
   A scene = { base: svg string, actors: [...], caps: [[t,text]], hud, dur }
   Actor: { g, color, label, path, keys:[[t,d,ease]], at:{x,y,r}, rot:[[t,deg]], op:[[t,o]], badges:[{a,b,k,txt}] }
   Distances in keys are px along the path; 'end' = path end. */
(function () {
  const P = {
    grass: '#a6c98a', grassD: '#94bb78', tree: '#5d8f4c', treeD: '#47763a',
    asph: '#5b616a', asphD: '#4c5159', mark: '#f4f4ee', yellow: '#f0c02c',
    pave: '#d6d0c3', paveD: '#c3bcad', bike: '#b45a4e', sand: '#d8c28e', water: '#6aa6d6',
    roof: '#c46c50', roof2: '#8f9ba8', roof3: '#b9a07a', brick: '#b8775d', rail: '#6d5f50',
    you: '#2f6fd6'
  };
  const W = 800, H = 450;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // deterministic pseudo random
  function rng(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

  /* ---------- static base helpers ---------- */
  function bg(seed = 3) {
    const r = rng(seed); let s = `<rect width="${W}" height="${H}" fill="${P.grass}"/>`;
    for (let i = 0; i < 70; i++) s += `<circle cx="${(r() * W) | 0}" cy="${(r() * H) | 0}" r="${(2 + r() * 5) | 0}" fill="${P.grassD}" opacity=".55"/>`;
    return s;
  }
  function tree(x, y, r = 16) {
    return `<g><circle cx="${x + 3}" cy="${y + 4}" r="${r}" fill="#0002"/><circle cx="${x}" cy="${y}" r="${r}" fill="${P.tree}"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .55}" fill="${P.treeD}" opacity=".45"/></g>`;
  }
  const trees = list => list.map(t => tree(...t)).join('');
  function house(x, y, w = 70, h = 50, c = P.roof) {
    return `<g><rect x="${x + 4}" y="${y + 5}" width="${w}" height="${h}" fill="#0002"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/><path d="M${x} ${y + h / 2}H${x + w}" stroke="#0003" stroke-width="2"/></g>`;
  }
  function houses(y, xs, h = 50) { const cs = [P.roof, P.roof2, P.roof3, P.brick]; return xs.map((x, i) => house(x, y, 64, h, cs[i % 4])).join(''); }
  function rect(x, y, w, h, f, extra = '') { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${extra}/>`; }

  // horizontal road centred on y
  function roadH(y, w = 128, o = {}) {
    const x0 = o.x0 ?? -10, x1 = o.x1 ?? W + 10, fill = o.fill || P.asph;
    let s = rect(x0, y - w / 2, x1 - x0, w, fill);
    if (o.kerb !== false) s += rect(x0, y - w / 2 - 6, x1 - x0, 6, P.pave) + rect(x0, y + w / 2, x1 - x0, 6, P.pave);
    if (o.edges !== false && !o.surface) s += `<path d="M${x0} ${y - w / 2 + 7}H${x1}M${x0} ${y + w / 2 - 7}H${x1}" stroke="${P.mark}" stroke-width="3" opacity=".85"/>`;
    const c = o.center ?? 'dash';
    (o.gaps ? splitSeg(x0, x1, o.gaps) : [[x0, x1]]).forEach(([a, b]) => {
      if (c === 'dash') s += `<path d="M${a} ${y}H${b}" stroke="${P.mark}" stroke-width="4" stroke-dasharray="26 18"/>`;
      if (c === 'solid') s += `<path d="M${a} ${y}H${b}" stroke="${P.mark}" stroke-width="4"/>`;
      if (c === 'double') s += `<path d="M${a} ${y - 4}H${b}M${a} ${y + 4}H${b}" stroke="${P.mark}" stroke-width="3"/>`;
    });
    return s;
  }
  function roadV(x, w = 110, o = {}) {
    const y0 = o.y0 ?? -10, y1 = o.y1 ?? H + 10, fill = o.fill || P.asph;
    let s = rect(x - w / 2, y0, w, y1 - y0, fill);
    if (o.kerb !== false) s += rect(x - w / 2 - 6, y0, 6, y1 - y0, P.pave) + rect(x + w / 2, y0, 6, y1 - y0, P.pave);
    const c = o.center ?? 'dash';
    (o.gaps ? splitSeg(y0, y1, o.gaps) : [[y0, y1]]).forEach(([a, b]) => {
      if (c === 'dash') s += `<path d="M${x} ${a}V${b}" stroke="${P.mark}" stroke-width="4" stroke-dasharray="26 18"/>`;
    });
    return s;
  }
  function splitSeg(a, b, gaps) { const out = []; let cur = a; gaps.slice().sort((p, q) => p[0] - q[0]).forEach(([g0, g1]) => { if (g0 > cur) out.push([cur, g0]); cur = Math.max(cur, g1); }); if (cur < b) out.push([cur, b]); return out; }
  function surfaceH(y, w, x0, x1, kind) {
    const fills = { bike: P.bike, foot: P.pave, sand: P.sand, brick: P.brick, road: P.asph };
    let s = rect(x0, y - w / 2, x1 - x0, w, fills[kind] || P.asph);
    if (kind === 'foot' || kind === 'brick') { for (let x = x0; x < x1; x += 22) s += `<path d="M${x} ${y - w / 2}V${y + w / 2}" stroke="${kind === 'brick' ? '#9d634c' : P.paveD}" stroke-width="2"/>`; s += `<path d="M${x0} ${y}H${x1}" stroke="${kind === 'brick' ? '#9d634c' : P.paveD}" stroke-width="2"/>`; }
    if (kind === 'bike') s += `<path d="M${x0} ${y}H${x1}" stroke="#f3e9e4" stroke-width="3" stroke-dasharray="16 14" opacity=".8"/>`;
    if (kind === 'sand') { const r = rng(7); for (let i = 0; i < 40; i++) s += `<circle cx="${x0 + r() * (x1 - x0)}" cy="${y - w / 2 + r() * w}" r="2" fill="#b9a26f"/>`; }
    return s;
  }
  // shark teeth: a row of triangles across a lane, pointing toward the driver who must give way
  function teeth(x, y, n, dir, gap = 15) {
    let s = '';
    for (let i = 0; i < n; i++) {
      if (dir === 'down') { const cx = x + i * gap; s += `<path d="M${cx - 6} ${y}L${cx + 6} ${y}L${cx} ${y + 12}Z" fill="${P.mark}"/>`; }
      if (dir === 'up') { const cx = x + i * gap; s += `<path d="M${cx - 6} ${y}L${cx + 6} ${y}L${cx} ${y - 12}Z" fill="${P.mark}"/>`; }
      if (dir === 'left') { const cy = y + i * gap; s += `<path d="M${x} ${cy - 6}L${x} ${cy + 6}L${x - 12} ${cy}Z" fill="${P.mark}"/>`; }
      if (dir === 'right') { const cy = y + i * gap; s += `<path d="M${x} ${cy - 6}L${x} ${cy + 6}L${x + 12} ${cy}Z" fill="${P.mark}"/>`; }
    }
    return s;
  }
  function zebraV(x, y0, y1, w = 46) { let s = ''; for (let y = y0 + 4; y < y1 - 6; y += 16) s += rect(x - w / 2, y, w, 9, P.mark); return s; }
  function zebraH(y, x0, x1, h = 46) { let s = ''; for (let x = x0 + 4; x < x1 - 6; x += 16) s += rect(x, y - h / 2, 9, h, P.mark); return s; }
  // upright sign seen from above: pole base at (x,y), panel rises "up" the screen
  function sign(x, y, code, s = 58, o = {}) {
    const plate = o.plate ? `<g><rect x="${x - 34}" y="${y - 12}" width="68" height="15" rx="2" fill="#fff" stroke="#333" stroke-width="1"/><text x="${x}" y="${y - 1.5}" font-size="9" text-anchor="middle" font-family="Overpass,Inter,sans-serif" font-weight="700" fill="#222">${esc(o.plate)}</text></g>` : '';
    const ph = o.plate ? 16 : 0;
    return `<g class="sc-sign"><ellipse cx="${x}" cy="${y + 2}" rx="11" ry="4" fill="#0003"/><rect x="${x - 2}" y="${y - 16 - ph}" width="4" height="${18 + ph}" fill="#8d939b"/>${plate}<image href="signs/${code}.webp" x="${x - s / 2}" y="${y - 16 - ph - s}" width="${s}" height="${s}" preserveAspectRatio="xMidYMax meet" filter="url(#scShadow)"/></g>`;
  }
  function gantry(x, y0, y1, panels) { // overhead gantry across a horizontal road at x
    let s = `<rect x="${x - 5}" y="${y0 - 14}" width="10" height="${y1 - y0 + 28}" fill="#9aa1aa" stroke="#6f767f" stroke-width="1.5"/>`;
    panels.forEach(([y, code, sz = 34]) => { s += `<image href="signs/${code}.webp" x="${x - sz / 2}" y="${y - sz / 2}" width="${sz}" height="${sz}" preserveAspectRatio="xMidYMid meet" filter="url(#scShadow)"/>`; });
    return s;
  }
  function arrowMark(x, y, dir = 'right', c = P.mark) { // painted lane arrow
    const paths = { right: `M${x - 18} ${y - 3}h22v-7l12 10l-12 10v-7h-22z`, left: `M${x + 18} ${y - 3}h-22v-7l-12 10l12 10v-7h22z`, rightTurn: `M${x - 18} ${y - 3}h14v-12h-6l9-10l9 10h-6v18h-20z` };
    return `<path d="${paths[dir]}" fill="${c}" opacity=".9"/>`;
  }
  // dashed ghost route with verdict marker at end
  function ghost(d, kind = 'no', ex, ey) {
    const c = kind === 'no' ? '#d93a32' : '#1f9d55';
    const mark = kind === 'no' ? `<path d="M${ex - 6} ${ey - 6}l12 12m0-12l-12 12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` : `<path d="M${ex - 6} ${ey}l4 5l8-10" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<g opacity=".95"><path d="${d}" fill="none" stroke="${c}" stroke-width="5" stroke-dasharray="10 9" stroke-linecap="round" opacity=".85"/><circle cx="${ex}" cy="${ey}" r="13" fill="${c}" stroke="#fff" stroke-width="2.5"/>${mark}</g>`;
  }
  function label(x, y, txt, c = '#1d2330') { const w = txt.length * 6.4 + 14; return `<g><rect x="${x - w / 2}" y="${y - 10}" width="${w}" height="20" rx="4" fill="#ffffffe8" stroke="${c}33"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${c}" font-family="Inter,system-ui,sans-serif">${esc(txt)}</text></g>`; }
  function water(x, y, w, h) { let s = rect(x, y, w, h, P.water); for (let i = 0; i < 8; i++) s += `<path d="M${x + 20 + i * w / 8} ${y + 14 + (i % 3) * 18}q8 -6 16 0t16 0" stroke="#ffffff88" stroke-width="2" fill="none"/>`; return s; }
  function rails(x, y0, y1, n = 1, gap = 46) { // vertical railway at x
    let s = '';
    for (let k = 0; k < n; k++) {
      const cx = x + (k - (n - 1) / 2) * gap;
      for (let y = y0; y < y1; y += 12) s += rect(cx - 16, y, 32, 6, '#8a7560');
      s += `<path d="M${cx - 9} ${y0}V${y1}M${cx + 9} ${y0}V${y1}" stroke="#4d4f55" stroke-width="3.5"/>`;
    }
    return s;
  }
  function cones(x0, y, n, gap = 26) { let s = ''; for (let i = 0; i < n; i++) s += `<g><circle cx="${x0 + i * gap}" cy="${y}" r="7" fill="#f06a1f"/><circle cx="${x0 + i * gap}" cy="${y}" r="3.2" fill="#fff"/></g>`; return s; }
  function bays(x0, y, n, w = 46, h = 62, opts = {}) { // perpendicular parking bays, top edge at y
    let s = rect(x0 - 3, y, n * w + 6, h, opts.fill || '#646a73');
    for (let i = 0; i <= n; i++) s += `<path d="M${x0 + i * w} ${y}V${y + h}" stroke="${P.mark}" stroke-width="2.5"/>`;
    if (opts.blue) s += `<path d="M${x0} ${y + h - 3}H${x0 + n * w}" stroke="#2a63c7" stroke-width="5"/>`;
    if (opts.text) for (let i = 0; i < n; i++) s += `<text x="${x0 + i * w + w / 2}" y="${y + h - 10}" font-size="10" text-anchor="middle" fill="${P.mark}" font-weight="700" font-family="Inter,sans-serif">${opts.text}</text>`;
    if (opts.icon === 'wheel') for (let i = 0; i < n; i++) s += `<g transform="translate(${x0 + i * w + w / 2},${y + h - 18})"><circle r="9" fill="#2a63c7"/><circle cy="-4" r="2" fill="#fff"/><path d="M-1 -1v4h4l2 4M-4 0a5 5 0 1 0 7 5" stroke="#fff" stroke-width="1.6" fill="none"/></g>`;
    return s;
  }

  /* ---------- glyphs (pointing +x, centred) ---------- */
  const SH = (w, h, rx = 5) => `<rect x="${-w / 2 + 2}" y="${-h / 2 + 3}" width="${w}" height="${h}" rx="${rx}" fill="#0003"/>`;
  const G = {
    car: c => `${SH(44, 22, 7)}<rect x="-22" y="-11" width="44" height="22" rx="7" fill="${c}"/><rect x="3" y="-9" width="9" height="18" rx="2.5" fill="#d7e7f6"/><rect x="-16" y="-8" width="6" height="16" rx="2" fill="#d7e7f6" opacity=".85"/><rect x="-9" y="-9" width="11" height="18" rx="2" fill="#000" opacity=".12"/><rect x="19" y="-9" width="3" height="4" rx="1" fill="#fff6c2"/><rect x="19" y="5" width="3" height="4" rx="1" fill="#fff6c2"/>`,
    taxi: () => G.car('#f2c230') + `<rect x="-6" y="-5" width="9" height="10" rx="1.5" fill="#222"/><text x="-1.5" y="2.6" font-size="5" fill="#f2c230" text-anchor="middle" font-weight="800" transform="rotate(90 -1.5 0)">TAXI</text>`,
    van: c => `${SH(52, 24)}<rect x="-26" y="-12" width="52" height="24" rx="4" fill="${c}"/><rect x="12" y="-10" width="8" height="20" rx="2" fill="#d7e7f6"/><rect x="-24" y="-10" width="34" height="20" rx="2" fill="#000" opacity=".08"/>`,
    truck: c => `${SH(86, 28, 3)}<rect x="-44" y="-14" width="64" height="28" rx="2" fill="#eef0f2" stroke="#b9bec5"/><rect x="-40" y="-10" width="56" height="20" fill="${c}" opacity=".25"/><rect x="22" y="-13" width="21" height="26" rx="3" fill="${c}"/><rect x="36" y="-11" width="5" height="22" rx="1.5" fill="#d7e7f6"/>`,
    longtruck: c => `${SH(130, 28, 3)}<rect x="-66" y="-14" width="104" height="28" rx="2" fill="#eef0f2" stroke="#b9bec5"/><rect x="40" y="-13" width="24" height="26" rx="3" fill="${c}"/><rect x="57" y="-11" width="5" height="22" rx="1.5" fill="#d7e7f6"/>`,
    tanker: c => `${SH(86, 28, 3)}<rect x="-44" y="-12" width="64" height="24" rx="12" fill="#d9dde2" stroke="#9ba1a9"/><rect x="-4" y="-5" width="10" height="10" fill="#f07a1a" stroke="#222" stroke-width=".8"/><rect x="22" y="-13" width="21" height="26" rx="3" fill="${c}"/><rect x="36" y="-11" width="5" height="22" rx="1.5" fill="#d7e7f6"/>`,
    bus: c => `${SH(90, 28, 5)}<rect x="-45" y="-14" width="90" height="28" rx="5" fill="${c}"/><rect x="-36" y="-8" width="16" height="16" rx="2" fill="#fff" opacity=".35"/><rect x="-12" y="-8" width="16" height="16" rx="2" fill="#fff" opacity=".35"/><rect x="38" y="-12" width="5" height="24" rx="1.5" fill="#d7e7f6"/>`,
    tram: c => `${SH(136, 28, 6)}<rect x="-68" y="-14" width="136" height="28" rx="9" fill="${c}"/><path d="M-22 -14v28M22 -14v28" stroke="#0004" stroke-width="2"/><rect x="-6" y="-4" width="12" height="8" fill="#333"/><rect x="62" y="-11" width="4" height="22" rx="1.5" fill="#d7e7f6"/>`,
    train: c => `${SH(250, 30, 6)}<rect x="-125" y="-15" width="250" height="30" rx="8" fill="${c}"/><path d="M-42 -15v30M42 -15v30" stroke="#0005" stroke-width="2.5"/><rect x="-125" y="-4" width="250" height="8" fill="#1d3f8f" opacity=".6"/><rect x="116" y="-12" width="6" height="24" rx="2" fill="#d7e7f6"/>`,
    bike: c => `<ellipse cx="2" cy="3" rx="16" ry="5" fill="#0002"/><rect x="-15" y="-1.6" width="30" height="3.2" rx="1.6" fill="#2b2f36"/><path d="M9 -7v14" stroke="#2b2f36" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="-1" cy="0" rx="6" ry="8.5" fill="${c}"/><circle cx="2" cy="0" r="4.2" fill="#f0c9a0"/><path d="M-2 -2.6a4.2 4.2 0 0 1 0 5.2" fill="#6b4630"/>`,
    moped: c => `<ellipse cx="2" cy="3" rx="18" ry="6" fill="#0002"/><rect x="-17" y="-3" width="34" height="6" rx="3" fill="#2b2f36"/><rect x="-12" y="-5" width="18" height="10" rx="4" fill="${c}"/><path d="M10 -8v16" stroke="#2b2f36" stroke-width="2.4" stroke-linecap="round"/><circle cx="1" cy="0" r="5" fill="#1f1f1f"/><circle cx="2" cy="-1.2" r="1.6" fill="#fff" opacity=".6"/>`,
    motorbike: c => `<ellipse cx="2" cy="3" rx="21" ry="6" fill="#0002"/><rect x="-21" y="-3.5" width="42" height="7" rx="3.5" fill="#2b2f36"/><rect x="-10" y="-6" width="22" height="12" rx="5" fill="${c}"/><path d="M13 -9v18" stroke="#2b2f36" stroke-width="2.6" stroke-linecap="round"/><circle cx="2" cy="0" r="5.4" fill="#e8e8e8" stroke="#333" stroke-width="1.4"/>`,
    ped: c => `<ellipse cx="1" cy="3" rx="7" ry="8" fill="#0002"/><ellipse cx="0" cy="0" rx="5" ry="8" fill="${c}"/><circle cx="1" cy="0" r="4.2" fill="#6b4630"/>`,
    child: c => `<ellipse cx="1" cy="2" rx="5" ry="6" fill="#0002"/><ellipse cx="0" cy="0" rx="3.8" ry="6" fill="${c}"/><circle cx="0.6" cy="0" r="3.2" fill="#e0a86a"/>`,
    horse: c => `<ellipse cx="2" cy="3" rx="22" ry="7" fill="#0002"/><ellipse cx="-2" cy="0" rx="17" ry="7" fill="${c}"/><ellipse cx="18" cy="0" rx="7" ry="4" fill="${c}"/><path d="M-20 0h-6" stroke="#3a2618" stroke-width="3" stroke-linecap="round"/><ellipse cx="-1" cy="0" rx="5.5" ry="7.5" fill="#2f5d8c"/><circle cx="1" cy="0" r="3.8" fill="#222"/>`,
    tractor: c => `${SH(46, 30, 3)}<rect x="-24" y="-17" width="16" height="8" rx="2" fill="#222"/><rect x="-24" y="9" width="16" height="8" rx="2" fill="#222"/><rect x="10" y="-13" width="9" height="5" rx="1.5" fill="#222"/><rect x="10" y="8" width="9" height="5" rx="1.5" fill="#222"/><rect x="-20" y="-9" width="44" height="18" rx="3" fill="${c}"/><rect x="-18" y="-8" width="14" height="16" rx="2" fill="#d7e7f6" opacity=".8"/>`,
    wide: c => `${SH(60, 48, 3)}<rect x="-30" y="-24" width="60" height="48" rx="3" fill="${c}"/><rect x="18" y="-24" width="10" height="48" fill="#0003"/><rect x="-26" y="-8" width="14" height="16" rx="2" fill="#d7e7f6" opacity=".8"/>`,
    cartrailer: c => G.car(c) + `<path d="M-22 0h-10" stroke="#333" stroke-width="2.5"/>` + `<g transform="translate(-50,0)">${SH(32, 22, 2)}<rect x="-16" y="-11" width="32" height="22" rx="2" fill="#8a929c"/><rect x="-13" y="-8" width="26" height="16" fill="#0002"/></g>`,
    cow: () => `<ellipse cx="2" cy="3" rx="16" ry="8" fill="#0002"/><ellipse cx="-2" cy="0" rx="15" ry="8" fill="#fafafa" stroke="#555" stroke-width="1"/><circle cx="-6" cy="-3" r="4" fill="#222"/><circle cx="3" cy="3" r="3.4" fill="#222"/><ellipse cx="15" cy="0" rx="6" ry="4.5" fill="#f0c0b4" stroke="#555" stroke-width="1"/>`,
    deer: () => `<ellipse cx="2" cy="3" rx="14" ry="6" fill="#0002"/><ellipse cx="-2" cy="0" rx="13" ry="5.5" fill="#a86a3c"/><ellipse cx="12" cy="0" rx="5" ry="3.5" fill="#a86a3c"/><path d="M14 -3l4 -7m-6 6l-1 -8M14 3l4 7m-6 -6l-1 8" stroke="#5a3b22" stroke-width="1.8" stroke-linecap="round"/>`,
    barrier: () => `<rect x="-4" y="-6" width="10" height="12" fill="#555"/><rect x="0" y="-3" width="128" height="6" rx="2" fill="#fff" stroke="#d33" stroke-width="1"/><path d="M14 -3v6M34 -3v6M54 -3v6M74 -3v6M94 -3v6M114 -3v6" stroke="#d93a32" stroke-width="9" stroke-dasharray="0"/>`,
    bollard: () => `<circle r="9" fill="#555"/><circle r="6.5" fill="#d93a32"/><circle r="3" fill="#fff"/>`,
    officer: () => `<ellipse cx="1" cy="3" rx="7" ry="9" fill="#0002"/><ellipse cx="0" cy="0" rx="5.5" ry="9" fill="#1d2a57"/><circle cx="1" cy="0" r="4.6" fill="#f3d36b"/><path d="M5 -2l12 -8" stroke="#1d2a57" stroke-width="3" stroke-linecap="round"/>`,
    plane: () => `<path d="M26 0l-8 -3h-14l-10 -22h-7l6 22h-14l-5 -7h-5l3 10l-3 10h5l5 -7h14l-6 22h7l10 -22h14z" fill="#e7eaee" stroke="#8b939c" stroke-width="1.2"/>`,
    boat: () => `<path d="M-40 -12h62l18 12l-18 12h-62z" fill="#fff" stroke="#7a8794" stroke-width="1.5"/><rect x="-26" y="-7" width="26" height="14" rx="2" fill="#2f5d8c"/>`
  };

  /* ---------- runtime ---------- */
  const ease = { o: u => 1 - (1 - u) * (1 - u), i: u => u * u, io: u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2 };
  function interp(keys, t) {
    if (!keys || !keys.length) return null;
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) { let u = (t - t0) / (t1 - t0 || 1); if (e && ease[e]) u = ease[e](u); return v0 + (v1 - v0) * u; }
    }
    return keys[keys.length - 1][1];
  }
  const BADGE = { no: ['#d93a32', '✕'], ok: ['#1f9d55', '✓'], wait: ['#e08a00', '!'], stop: ['#d93a32', '■'], info: ['#2f6fd6', 'i'] };

  function mount(host, spec, opts = {}) {
    const NS = 'http://www.w3.org/2000/svg';
    const dur = spec.dur || 10;
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.alt || 'Animated example')}"><defs><filter id="scShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="1.5" dy="3" stdDeviation="1.6" flood-opacity=".35"/></filter></defs><g class="sc-base">${spec.base}</g><g class="sc-measure" opacity="0"></g><g class="sc-actors"></g><g class="sc-over">${spec.over || ''}</g><g class="sc-hud"></g></svg>`;
    const svg = host.firstChild, meas = svg.querySelector('.sc-measure'), layer = svg.querySelector('.sc-actors'), hudG = svg.querySelector('.sc-hud');
    const acts = (spec.actors || []).map(a => {
      const o = Object.assign({}, a);
      if (a.path) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', a.path); meas.appendChild(p); o.el = p; o.len = p.getTotalLength(); o.keys = (a.keys || [[0, 0], [dur, 'end']]).map(k => [k[0], k[1] === 'end' ? o.len : (typeof k[1] === 'string' && k[1].startsWith('end-') ? o.len - (+k[1].slice(4)) : k[1]), k[2]]); }
      const g = document.createElementNS(NS, 'g'); const body = document.createElementNS(NS, 'g'); const lab = document.createElementNS(NS, 'g');
      body.innerHTML = (G[a.g] || G.car)(a.color || '#888'); if (a.scale) body.setAttribute('data-s', a.scale);
      g.appendChild(body); layer.appendChild(g); o.g_ = g; o.body = body;
      layer.appendChild(lab); o.lab = lab; o.lastRot = a.at?.r || 0;
      return o;
    });
    // HUD speedometer
    let hudText = null;
    if (spec.hud) {
      hudG.innerHTML = `<g transform="translate(16,16)"><rect width="128" height="58" rx="10" fill="#141922e6"/><text x="14" y="21" font-size="10.5" fill="#9fb0c8" font-family="Inter,sans-serif" font-weight="600" letter-spacing=".08em">YOUR SPEED</text><text class="hud-v" x="14" y="47" font-size="26" fill="#fff" font-family="Overpass Mono,monospace" font-weight="700">0</text><text x="76" y="47" font-size="12" fill="#9fb0c8" font-family="Inter,sans-serif">km/h</text></g>`;
      hudText = hudG.querySelector('.hud-v');
    }
    function setLabel(o, x, y, t) {
      let txt = o.label, col = o.labelColor || '#1d2330', k = null;
      (o.badges || []).forEach(b => { if (t >= b.a && t < b.b) { k = b.k; if (b.txt) txt = b.txt; } });
      const key = (txt || '') + '|' + k;
      if (o._lk !== key) {
        o._lk = key;
        if (!txt && !k) { o.lab.innerHTML = ''; }
        else {
          const [bc, sym] = k ? BADGE[k] : ['', ''];
          const tw = txt ? txt.length * 6.3 + 14 : 0, total = (k ? 22 : 0) + tw;
          let s = `<g>`;
          if (txt) s += `<rect x="${-total / 2 + (k ? 16 : 0)}" y="-10" width="${tw + (k ? 6 : 0)}" height="20" rx="4" fill="${k ? bc : '#ffffffee'}" stroke="${k ? '#fff' : '#1d233022'}" stroke-width="${k ? 1.5 : 1}"/><text x="${-total / 2 + (k ? 22 : 0) + tw / 2}" y="4" text-anchor="middle" font-size="11.5" font-weight="700" fill="${k ? '#fff' : col}" font-family="Inter,system-ui,sans-serif">${esc(txt)}</text>`;
          if (k) s += `<circle cx="${-total / 2 + 10}" cy="0" r="11" fill="${bc}" stroke="#fff" stroke-width="2"/><text x="${-total / 2 + 10}" y="4.5" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="Inter,sans-serif">${sym}</text>`;
          o.lab.innerHTML = s + '</g>';
        }
      }
      o.lab.setAttribute('transform', `translate(${x.toFixed(1)},${(y - (o.labelDy || 30)).toFixed(1)})`);
    }
    function render(t) {
      acts.forEach(o => {
        let x, y, r;
        if (o.el) {
          const d = Math.max(0, Math.min(o.len, interp(o.keys, t)));
          const p = o.el.getPointAtLength(d);
          const q1 = o.el.getPointAtLength(Math.max(0, d - 2)), q2 = o.el.getPointAtLength(Math.min(o.len, d + 2));
          x = p.x; y = p.y;
          if (Math.hypot(q2.x - q1.x, q2.y - q1.y) > .5) o.lastRot = Math.atan2(q2.y - q1.y, q2.x - q1.x) * 180 / Math.PI;
          r = o.lastRot + (o.flip ? 180 : 0);
        } else { x = o.at.x; y = o.at.y; r = o.rot ? interp(o.rot, t) : (o.at.r || 0); }
        const op = o.op ? interp(o.op, t) : 1;
        const sc = o.scale || 1;
        o.g_.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${r.toFixed(1)}) scale(${sc})`);
        o.g_.setAttribute('opacity', op.toFixed(2)); o.lab.setAttribute('opacity', op.toFixed(2));
        if (o.noLabel) o.lab.innerHTML = ''; else setLabel(o, x, y, t);
      });
      if (hudText) { const v = Math.round(interp(spec.hud, t)); hudText.textContent = v; }
      if (opts.onTime) opts.onTime(t);
    }
    const ctl = { dur, t: 0, playing: false, rate: 1, raf: 0, last: 0 };
    function frame(now) {
      if (!ctl.playing) return;
      const dt = ctl.last ? (now - ctl.last) / 1000 : 0; ctl.last = now;
      ctl.t = (ctl.t + dt * ctl.rate) % dur; render(ctl.t); ctl.raf = requestAnimationFrame(frame);
    }
    ctl.play = () => { if (ctl.playing) return; ctl.playing = true; ctl.last = 0; ctl.raf = requestAnimationFrame(frame); opts.onState && opts.onState(true); };
    ctl.pause = () => { ctl.playing = false; cancelAnimationFrame(ctl.raf); opts.onState && opts.onState(false); };
    ctl.seek = t => { ctl.t = Math.max(0, Math.min(dur - .01, t)); render(ctl.t); };
    ctl.destroy = () => { ctl.pause(); };
    render(0);
    return ctl;
  }

  /* ---------- reusable layouts ---------- */
  const E_Y = 282, W_Y = 218, ROADY = 250; // straight road lanes
  const EAST = `M-90 ${E_Y}H890`, WEST = `M890 ${W_Y}H-90`;
  const xd = x => x + 90; // distance along EAST/WEST(from right use 890-x)
  const wd = x => 890 - x;
  const SIGN_Y = 376; // pole base on south verge of straight road
  const NAMES = { car: 'Car', truck: 'Lorry', longtruck: 'Lorry', bus: 'Bus', bike: 'Cyclist', moped: 'Moped', motorbike: 'Motorcycle', ped: 'Pedestrian', horse: 'Horse rider', tractor: 'Tractor', cartrailer: 'Car + trailer', van: 'Van', tanker: 'Tanker', taxi: 'Taxi', wide: 'Wide vehicle', tram: 'Tram' };
  const COL = { car: '#c8483e', truck: '#3a7d5c', longtruck: '#7b5ea7', bus: '#e0a21a', bike: '#e05a7a', moped: '#3f8fbf', motorbike: '#444b55', ped: '#7a59b8', horse: '#8a5a32', tractor: '#3f9a3f', cartrailer: '#5c6f87', van: '#e9eef3', tanker: '#c0392b', taxi: '#f2c230', wide: '#c9a227', tram: '#e8c22c' };
  // speed→distance: px per second per km/h
  const K = 2.1;

  function decor(seed, avoidY = [180, 320]) {
    const r = rng(seed), out = [];
    for (let i = 0; i < 9; i++) { const x = 20 + r() * 760; const top = r() < .5; const y = top ? 30 + r() * 100 : 395 + r() * 40; out.push([x, y, 12 + r() * 10]); }
    return trees(out);
  }

  /* SPEED: car approaches a sign and adapts its speed. */
  function speedProfile(from, to, signX, mode) {
    // returns keys for distance + hud keys
    const keys = [], hud = []; let x = -60, t = 0, v = from; const dt = .05;
    const a0 = mode === 'down' ? signX - 260 : signX + 10, a1 = mode === 'down' ? signX - 30 : signX + 230;
    let tSign = null, tA = null;
    while (x < 880 && t < 20) {
      if (x < a0) v = from; else if (x < a1) v = from + (to - from) * (x - a0) / (a1 - a0); else v = to;
      if (tA === null && x >= a0) tA = t; if (tSign === null && x >= signX) tSign = t;
      if (Math.round(t / dt) % 2 === 0) { keys.push([+t.toFixed(2), x + 90]); hud.push([+t.toFixed(2), v]); }
      x += v * K * dt; t += dt;
    }
    keys.push([+t.toFixed(2), x + 90]); hud.push([+t.toFixed(2), v]);
    return { keys, hud, end: t, tSign, tA };
  }
  function speed(o) {
    const code = o.code, signX = 400, up = o.to > o.from;
    const pr = speedProfile(o.from, o.to, signX, up ? 'up' : 'down');
    const dur = pr.end + 1.2;
    let base = bg(4);
    if (o.built === 'after') base += houses(70, [470, 560, 650, 740], 56) + houses(392, [520, 610, 700]);
    else if (o.built === 'before') base += houses(70, [-20, 70, 160, 250], 56) + houses(392, [20, 110, 200]);
    else base += decor(11);
    if (o.motorway) { base += roadH(ROADY, 150, { center: 'none' }) + `<path d="M-10 ${ROADY}H810" stroke="${P.mark}" stroke-width="4" stroke-dasharray="30 20"/>`; }
    else base += roadH(ROADY);
    if (o.gantry) base += gantry(signX, 180, 320, [[E_Y, code, 40], [W_Y, code, 40]]);
    else base += sign(signX, SIGN_Y, code, o.size || 60, { plate: o.plate });
    const actors = [
      { g: 'car', color: P.you, label: 'You', path: EAST, keys: pr.keys },
      { g: 'car', color: '#8a96a3', path: WEST, keys: [[0, 0], [dur, wd(-200) ]], noLabel: true }
    ];
    const caps = o.caps ? o.caps(pr) : [];
    return { base, actors, hud: pr.hud, caps, dur };
  }

  /* BAN: some road users must take another route; others may continue. */
  function ban(o) {
    const code = o.code, signX = 360;
    const surface = o.surface; // undefined = normal road
    let base = bg(6) + decor(5);
    base += roadV(250, 96, { y0: ROADY, center: 'dash' });
    if (surface) {
      base += roadH(ROADY, 128, { x1: signX - 20, gaps: [[202, 298]] });
      base += surfaceH(ROADY, o.surfW || 70, signX - 20, 820, surface);
      base += rect(signX - 26, ROADY - 70, 8, 140, P.pave);
    } else base += roadH(ROADY, 128, { gaps: [[202, 298]] });
    base += sign(signX, SIGN_Y, code, 62, { plate: o.plate });
    if (o.extraBase) base += o.extraBase;
    const SIDE = `M-90 ${E_Y}H196Q226 ${E_Y} 226 ${E_Y + 30}V520`;
    const pathMain = surface ? `M-90 ${E_Y}H${signX - 40}Q${signX - 10} ${E_Y} ${signX + 10} ${ROADY + (o.laneOff || 12)}H890` : EAST;
    const actors = [], caps = [[0, o.cap0 || 'The sign stands where the restriction starts']];
    let t = 0;
    (o.ban || []).forEach((b, i) => {
      const nm = b.label || NAMES[b.g];
      actors.push({ g: b.g, color: b.color || COL[b.g], label: nm, path: SIDE, keys: [[t, 0], [t + 1.6, xd(150), 'o'], [t + 2.6, xd(160)], [t + 4.2, 'end', 'i']], badges: [{ a: t + 1.2, b: t + 3.6, k: 'no', txt: b.txt || `${nm}: not allowed` }] });
      caps.push([t + 1.2, b.cap || `${nm}: not allowed past the sign, so it takes another route`]);
      t += 3.2;
    });
    (o.ok || []).forEach((b, i) => {
      const nm = b.label || NAMES[b.g];
      const sp = b.g === 'ped' ? 70 : b.g === 'bike' || b.g === 'horse' ? 120 : 170;
      const len = surface ? 1000 : 980; const dd = len / sp;
      actors.push({ g: b.g, color: b.color || COL[b.g], label: nm, path: b.path || pathMain, keys: [[t, 0], [t + dd, 'end']], badges: [{ a: t + (450 / sp), b: t + dd, k: 'ok', txt: b.txt || `${nm}: may continue` }] });
      caps.push([t + 420 / sp, b.cap || `${nm}: allowed, continues past the sign`]);
      t += Math.min(dd, b.g === 'ped' ? 6 : 3.4);
    });
    const dur = Math.max(t + 2.6, 9);
    return { base, actors, caps, dur };
  }

  /* END: the restriction ends after the sign; road users go back to normal rules. */
  function endOf(o) {
    const signX = 420;
    let base = bg(8) + decor(9);
    if (o.before) base += surfaceH(ROADY, o.beforeW || 70, -10, signX, o.before); else base += roadH(ROADY, 128, { x1: signX });
    if (o.after === 'road') base += roadH(ROADY, 128, { x0: signX });
    else if (o.after) base += surfaceH(ROADY, o.afterW || 70, signX, 810, o.after);
    if (o.houses === 'before') base += houses(70, [-20, 70, 160, 250], 56);
    base += sign(signX, SIGN_Y, o.code, 60, { plate: o.plate });
    if (o.extraBase) base += o.extraBase;
    const lane = o.lane ?? (o.before && o.before !== 'road' ? ROADY + 12 : E_Y);
    const pathY = `M-90 ${lane}H890`;
    const actors = (o.actors || [{ g: 'car' }]).map((a, i) => ({ g: a.g, color: a.color || (i === 0 && a.g === 'car' ? P.you : COL[a.g]), label: a.label || NAMES[a.g], path: a.path || pathY, keys: a.keys || [[i * 1.2, 0], [i * 1.2 + 7, 'end']], badges: a.badges }));
    return { base, actors, caps: o.caps || [], dur: o.dur || 9, hud: o.hud };
  }

  /* CROSSROADS family: priority and give-way. centre (400,250) */
  const CX = 400, CY = 250, HW = 64, VW = 55; // half widths
  const JE = `M-90 ${E_Y}H890`; // you eastbound
  const N_UP = `M428 540V-90`; // northbound from bottom (x=428)
  const S_DN = `M372 -90V540`; // southbound from top
  const WB = `M890 ${W_Y}H-90`;
  function crossBase(o = {}) {
    let base = bg(12) + trees([[90, 90, 20], [190, 60, 16], [600, 80, 22], [700, 120, 15], [110, 410, 18], [640, 400, 20], [720, 360, 14]]);
    const hasTop = o.top !== false, hasBottom = o.bottom !== false;
    base += roadH(CY, 128, { gaps: [[CX - VW, CX + VW]], center: o.mainCenter });
    if (hasTop) base += roadV(CX, 110, { y0: -10, y1: CY - HW, kerb: true });
    if (hasBottom) base += roadV(CX, 110, { y0: CY + HW, y1: H + 10, kerb: true });
    base += rect(CX - VW, CY - HW, VW * 2, HW * 2, P.asph);
    if (o.teethSide) { if (hasBottom) base += teeth(404, CY + HW + 6, 4, 'down'); if (hasTop) base += teeth(352, CY - HW - 6, 4, 'up'); }
    if (o.teethMain) { base += teeth(CX - VW - 8, CY + 6, 4, 'left'); base += teeth(CX + VW + 8, CY - HW + 6, 4, 'right'); }
    if (o.stopLine) base += rect(400, CY + HW + 6, 54, 6, P.mark) + `<text x="428" y="${CY + HW + 46}" font-size="18" font-weight="800" fill="${P.mark}" text-anchor="middle" font-family="Overpass,sans-serif" transform="rotate(0)">STOP</text>`;
    return base;
  }
  function prio(o) {
    const m = o.mode; let base, actors = [], caps = [], dur = 10;
    if (m === 'main') { // B1 / B3 / B4 / B5: you go, side traffic waits
      const top = o.side !== 'right', bottom = o.side !== 'left';
      base = crossBase({ teethSide: true, top, bottom }) + sign(250, SIGN_Y, o.code, 60);
      actors.push({ g: 'car', color: P.you, label: 'You', path: JE, keys: [[0, 0], [5.5, 'end']], badges: [{ a: 2.2, b: 4.5, k: 'ok', txt: 'You have priority' }] });
      if (bottom) actors.push({ g: 'car', color: '#c8483e', label: 'Side road', path: N_UP, keys: [[0, 0], [1.6, 540 - 340, 'o'], [4.6, 200], [7.6, 'end', 'i']], badges: [{ a: 1.4, b: 4.4, k: 'wait', txt: 'Gives way' }] });
      if (top) actors.push({ g: 'van', color: '#e9eef3', label: 'Side road', path: S_DN, keys: [[0, 0], [1.8, 250, 'o'], [5, 254], [8.4, 'end', 'i']], badges: [{ a: 1.6, b: 4.8, k: 'wait', txt: 'Gives way' }] });
      caps = [[0, 'You drive on the priority road'], [1.6, 'Traffic from the side roads sees shark teeth and must wait'], [4.6, 'After you have passed, they may go']];
    }
    if (m === 'end') { // B2: priority ends, next junction is equal: right has priority
      base = crossBase({ mainCenter: 'none' }) + sign(220, SIGN_Y, o.code, 60);
      actors.push({ g: 'car', color: P.you, label: 'You', path: JE, keys: [[0, 0], [2.4, xd(310), 'o'], [5.2, xd(312)], [8.4, 'end', 'i']], badges: [{ a: 2.2, b: 5, k: 'wait', txt: 'Give way to the right' }] });
      actors.push({ g: 'car', color: '#c8483e', label: 'From your right', path: N_UP, keys: [[0, 0], [5.4, 'end']], badges: [{ a: 2.4, b: 4.6, k: 'ok', txt: 'Has priority' }] });
      caps = [[0, 'The priority road ends at this sign'], [2.2, 'At the next junction normal rules apply: traffic from the right goes first'], [5.2, 'When it is clear, you continue']];
    }
    if (m === 'equal') { // J8: dangerous crossing (no priority)
      base = crossBase({ mainCenter: 'none' }) + sign(200, SIGN_Y, o.code, 60);
      actors.push({ g: 'car', color: P.you, label: 'You', path: JE, keys: [[0, 0], [2.6, xd(312), 'o'], [5.4, xd(314)], [8.6, 'end', 'i']], hudless: 1, badges: [{ a: 2.2, b: 5.2, k: 'wait', txt: 'Slow down, look right' }] });
      actors.push({ g: 'bike', color: '#e05a7a', label: 'Cyclist from right', path: N_UP, keys: [[0.6, 0], [6.2, 'end']], badges: [{ a: 2.4, b: 5, k: 'ok', txt: 'Goes first' }] });
      caps = [[0, 'Warning: a junction ahead where nobody has priority'], [2.2, 'Slow down. Traffic from the right goes first, including cyclists'], [5.4, 'Continue when it is safe']];
    }
    if (m === 'yield' || m === 'stop') { // B6 / B7: you come from side road (bottom)
      base = crossBase({ teethSide: m === 'yield', top: false, stopLine: m === 'stop' }) + sign(492, CY + HW + 92, o.code, 58);
      const YOU = `M428 560V${E_Y + 30}Q428 ${E_Y} 460 ${E_Y}H890`;
      const stopD = 560 - (CY + HW + 34);
      actors.push({ g: 'car', color: P.you, label: 'You', path: YOU, keys: [[0, 0], [2, stopD, 'o'], [5.6, stopD], [8.6, 'end', 'i']], badges: [{ a: 1.8, b: 5.4, k: m === 'stop' ? 'stop' : 'wait', txt: m === 'stop' ? 'Full stop at the line' : 'Give way' }] });
      actors.push({ g: 'car', color: '#c8483e', label: 'Main road', path: JE, keys: [[0.4, 0], [4.6, 'end']], noLabel: false, badges: [{ a: 2, b: 4, k: 'ok', txt: 'Has priority' }] });
      actors.push({ g: 'truck', color: '#3a7d5c', label: 'Main road', path: WB, keys: [[1.2, 0], [5.6, 'end']], noLabel: true });
      caps = m === 'stop' ? [[0, 'Your road meets a main road: STOP sign and stop line'], [1.8, 'Stop completely at the line, even if the road looks empty'], [5.6, 'Give way to all traffic on the main road, then go']]
        : [[0, 'Shark teeth and this sign: the main road has priority'], [1.8, 'Slow down and let traffic on the main road pass, from both directions'], [5.6, 'Then turn into the main road']];
      return { base, actors, caps, dur: 9.5, hud: m === 'stop' ? [[0, 40], [2, 0], [5.6, 0], [7, 30]] : null };
    }
    return { base, actors, caps, dur };
  }

  /* ROUNDABOUT */
  function roundabout(o) {
    const cx = 400, cy = 240, R = 92;
    let base = bg(14) + trees([[100, 80, 20], [680, 90, 18], [120, 400, 16], [690, 400, 20]]);
    base += roadH(cy, 110, { x1: cx - R + 10 }) + roadH(cy, 110, { x0: cx + R - 10 });
    base += roadV(cx, 100, { y1: cy - R + 10 }) + roadV(cx, 100, { y0: cy + R - 10 });
    base += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${P.asph}" stroke-width="64"/><circle cx="${cx}" cy="${cy}" r="${R - 32}" fill="${P.grassD}" stroke="${P.pave}" stroke-width="6"/>` + tree(cx, cy, 24);
    if (o.teeth !== false) base += teeth(cx - R - 24, cy + 6, 4, 'left', 13) + teeth(cx + 6, cy + R + 22, 4, 'down', 13) + teeth(cx + R + 24, cy - 50, 4, 'right', 13) + teeth(cx - 50, cy - R - 22, 4, 'up', 13);
    base += sign(cx - R - 70, cy + 128, o.code, 58, { plate: o.plate });
    const YOU = `M-90 258H280Q306 258 322 285A90 90 0 0 0 478 285Q500 258 530 258H890`;
    const OTHER = `M428 -90V150Q428 182 450 200A90 90 0 0 0 318 236Q300 222 270 222H-90`; // enters top, goes ccw to left exit
    const actors = [
      { g: 'car', color: P.you, label: 'You', path: YOU, keys: [[0, 0], [2.4, 300, 'o'], [4.4, 300], [9.6, 'end', 'i']], badges: [{ a: 2.2, b: 4.2, k: 'wait', txt: 'Give way to the circle' }, { a: 5, b: 7.6, k: 'ok', txt: 'Drive anticlockwise' }] },
      { g: 'van', color: '#e9eef3', label: 'On roundabout', path: OTHER, keys: [[0.6, 0], [6.6, 'end']], noLabel: false }
    ];
    const caps = o.caps || [[0, 'Approaching the roundabout'], [2.2, 'On most Dutch roundabouts, shark teeth mean traffic already on the circle goes first'], [4.6, 'Drive round anticlockwise, keep right and signal before your exit']];
    return { base, actors, caps, dur: 10.5 };
  }

  /* ISLAND: keep right / either side */
  function island(o) {
    let base = bg(16) + decor(13) + roadH(ROADY, 128, { gaps: [[330, 520]] });
    base += `<rect x="350" y="${ROADY - 16}" width="150" height="32" rx="16" fill="${P.pave}" stroke="${P.paveD}" stroke-width="3"/><path d="M330 ${ROADY}L350 ${ROADY - 10}M330 ${ROADY}L350 ${ROADY + 10}" stroke="${P.mark}" stroke-width="3"/>`;
    base += sign(372, ROADY + 14, o.code, 46);
    const RIGHT = `M-90 ${E_Y}H890`, LEFT = `M-90 ${E_Y}H260Q300 ${E_Y} 320 ${W_Y + 6}H520Q560 ${W_Y + 6} 590 ${E_Y}H890`;
    let actors, caps;
    if (o.mode === 'right') {
      base += ghost(`M250 ${E_Y}Q300 ${E_Y} 330 ${W_Y + 6}H470`, 'no', 486, W_Y + 6);
      actors = [{ g: 'car', color: P.you, label: 'You', path: RIGHT, keys: [[0, 0], [6.5, 'end']], badges: [{ a: 2.4, b: 5.4, k: 'ok', txt: 'Pass on the right' }] }];
      caps = [[0, 'A traffic island with this sign in front of it'], [2.2, 'Keep to the side the arrow points to (here: the right)'], [5, 'Driving left of the island would put you in oncoming traffic']];
    } else {
      actors = [{ g: 'car', color: P.you, label: 'You', path: RIGHT, keys: [[0, 0], [6.5, 'end']], badges: [{ a: 2.4, b: 5.4, k: 'ok', txt: 'Right side OK' }] },
      { g: 'bike', color: '#e05a7a', label: 'Cyclist', path: LEFT, keys: [[1.2, 0], [9.6, 'end']], badges: [{ a: 4, b: 7, k: 'ok', txt: 'Left side OK' }] }];
      caps = [[0, 'This sign on an island or obstacle'], [2.2, 'You may pass on either side'], [5, 'Both routes lead to the same road. Watch for others merging back']];
    }
    return { base, actors, caps, dur: 10 };
  }

  /* TURN RULES at a crossroads (D4–D8, F7, C4) */
  const ROUTES = {
    straight: { d: `M-90 ${E_Y}H890`, g: [`M300 ${E_Y}H500`, 516, E_Y] },
    right: { d: `M-90 ${E_Y}H340Q372 ${E_Y} 372 ${E_Y + 34}V540`, g: [`M300 ${E_Y}Q372 ${E_Y} 372 ${E_Y + 60}V370`, 372, 384] },
    left: { d: `M-90 ${E_Y}H370Q428 ${E_Y} 428 ${E_Y - 58}V-90`, g: [`M300 ${E_Y}Q428 ${E_Y} 428 ${E_Y - 120}V130`, 428, 116] },
    uturn: { d: `M-90 ${E_Y}H360C430 ${E_Y} 430 ${W_Y} 360 ${W_Y}H-90`, g: [`M300 ${E_Y}H350C410 ${E_Y} 410 ${W_Y} 350 ${W_Y}H330`, 316, W_Y] }
  };
  function turns(o) {
    let base = crossBase({ top: !o.tjunc, mainCenter: 'dash' });
    if (o.tjunc) base = crossBase({ top: false });
    if (o.tEnd) { // T-junction where main road ends: only left/right
      base = bg(12) + trees([[90, 90, 20], [600, 70, 22], [110, 410, 18], [700, 400, 18]]) + roadH(CY, 128, { x1: CX + VW }) + roadV(CX, 110, { y0: -10, y1: H + 10, gaps: [[CY - HW, CY + HW]] }) + rect(CX + VW, CY - HW - 6, 6, HW * 2 + 12, P.pave);
    }
    base += sign(o.signX || 250, SIGN_Y, o.code, 60, { plate: o.plate });
    (o.deny || []).forEach(k => { const r = ROUTES[k]; base += ghost(r.g[0], 'no', r.g[1], r.g[2]); });
    const actors = []; let t = 0;
    (o.allow || []).forEach((k, i) => {
      actors.push({ g: i === 0 ? 'car' : (o.second || 'car'), color: i === 0 ? P.you : '#c8483e', label: i === 0 ? 'You' : 'Next car', path: ROUTES[k].d, keys: [[t, 0], [t + 2.2, 380, 'o'], [t + 2.6, 390], [t + 6, 'end', 'i']], badges: [{ a: t + 2, b: t + 4.6, k: 'ok', txt: o.okTxt?.[i] || 'Allowed' }] });
      t += 3;
    });
    const caps = o.caps || [[0, 'The blue round sign tells you which way you must go'], [2, 'Follow the direction the arrow shows'], [4.6, 'The red dashed routes are not allowed']];
    return { base, actors, caps, dur: Math.max(t + 4, 9) };
  }

  /* ONE-WAY family */
  function oneway(o) {
    const m = o.mode;
    let base = bg(18) + houses(48, [10, 100, 190, 520, 610, 700], 64) + houses(380, [10, 100, 520, 610, 700], 60);
    if (m === 'C2') {
      base += roadH(CY, 128, { x0: -10, x1: 396, center: 'none' }) + roadH(CY, 128, { x0: 504, x1: 810 }) + roadV(450, 108, { y0: CY + HW, y1: 460 }) + rect(396, CY - HW, 108, 128, P.asph) + rect(396, CY - HW - 6, 108, 6, P.pave);
      base += arrowMark(110, CY, 'right') + arrowMark(270, CY, 'right');
      base += sign(352, 180, o.code, 58, { plate: o.plate });
      base += ghost(`M478 ${CY + 90}Q478 ${CY - 24} 420 ${CY - 24}H330`, 'no', 316, CY - 24);
      return {
        base, dur: 10, actors: [
          { g: 'car', color: P.you, label: 'You', path: `M478 560V${E_Y + 34}Q478 ${E_Y} 512 ${E_Y}H890`, keys: [[0, 0], [2.2, 210, 'o'], [3.8, 216], [6.6, 'end', 'i']], badges: [{ a: 1.6, b: 3.8, k: 'no', txt: 'No entry to the left' }, { a: 3.8, b: 6.2, k: 'ok', txt: 'Go another way' }] },
          { g: 'car', color: '#c8483e', label: 'One-way traffic', path: `M-90 ${CY - 10}H380Q430 ${CY - 10} 460 ${E_Y}H890`, keys: [[0.5, 0], [6.5, 'end']] }
        ], caps: [[0, 'The street on the left is one-way, coming towards you'], [1.6, 'No entry for vehicles in your direction'], [3.8, 'Choose another route. Check for a plate below: cyclists are often exempt']]
      };
    }
    if (m === 'C3') {
      base += roadH(CY, 110, { center: 'none' }) + arrowMark(200, CY, 'right') + arrowMark(520, CY, 'right');
      base += sign(110, SIGN_Y - 10, o.code, 60) + ghost(`M760 ${CY - 22}H620`, 'no', 606, CY - 22);
      return {
        base, dur: 9, actors: [
          { g: 'car', color: P.you, label: 'You', path: `M-90 ${CY + 18}H890`, keys: [[0, 0], [6, 'end']], badges: [{ a: 1.4, b: 5.4, k: 'ok', txt: 'Drive with the arrow' }] },
          { g: 'car', color: '#c8483e', label: '', path: `M-90 ${CY - 18}H890`, keys: [[1.6, 0], [7.6, 'end']], noLabel: true }
        ], caps: [[0, 'You enter a one-way road'], [1.6, 'All traffic drives in the direction of the arrow'], [4, 'You may use the full width; you will not meet oncoming traffic']]
      };
    }
    if (m === 'C4') {
      base += roadH(CY, 110, { center: 'none' }) + roadV(CX, 100, { y0: CY + 55, center: 'dash' }) + rect(CX - 50, CY - 55, 100, 110, P.asph) + arrowMark(200, CY, 'right') + arrowMark(640, CY, 'right');
      base += sign(CX + 10, 184, o.code, 64);
      base += ghost(`M${CX - 22} ${CY + 70}Q${CX - 22} ${CY - 10} ${CX - 90} ${CY - 10}H${CX - 150}`, 'no', CX - 164, CY - 10);
      return {
        base, dur: 9, actors: [
          { g: 'car', color: P.you, label: 'You', path: `M${CX + 22} 560V${CY + 40}Q${CX + 22} ${CY + 12} ${CX + 56} ${CY + 12}H890`, keys: [[0, 0], [2.2, 230, 'o'], [3, 236], [6, 'end', 'i']], badges: [{ a: 1.8, b: 5, k: 'ok', txt: 'Turn right only' }] },
          { g: 'car', color: '#c8483e', label: '', path: `M-90 ${CY - 14}H890`, keys: [[0, 0], [5, 'end']], noLabel: true }
        ], caps: [[0, 'The road you are joining is a one-way road'], [1.8, 'The arrow shows its direction: you may only turn that way'], [4.2, 'Turning the other way would be driving against the traffic']]
      };
    }
    // C5: two-way traffic permitted / access permitted
    base += roadH(CY, 128) + sign(120, SIGN_Y, o.code, 60);
    return {
      base, dur: 8, actors: [
        { g: 'car', color: P.you, label: 'You', path: EAST, keys: [[0, 0], [6, 'end']], badges: [{ a: 1.2, b: 5, k: 'ok', txt: 'Entry allowed' }] },
        { g: 'bike', color: '#e05a7a', label: 'Oncoming', path: WEST, keys: [[0.4, 0], [8, 'end']] }
      ], caps: [[0, 'This sign tells you entry is permitted here'], [1.6, 'Traffic may use the road in both directions'], [4, 'Expect oncoming traffic and keep right']]
    };
  }

  /* PARKING street. Road centre y=200, bays along south side y=270..332 */
  function park(o) {
    const RY = 200, LANE = 232;
    let base = bg(20) + houses(10, [0, 90, 180, 270, 360, 450, 540, 630, 720], 70);
    base += rect(-10, 120, 820, 14, P.pave) + roadH(RY, 128, { kerb: false, edges: false }) + rect(-10, RY + 64, 820, 8, P.paveD);
    const bayOpts = o.bayOpts || {};
    base += bays(200, RY + 72, 9, 46, 64, bayOpts) + rect(-10, RY + 136, 820, 40, P.pave);
    if (o.yellow) base += `<path d="M-10 ${RY + 60}H810" stroke="${P.yellow}" stroke-width="5"/>`;
    base += sign(160, RY + 168, o.code, 60, { plate: o.plate });
    // parked props
    (o.parked || []).forEach(([i, g, c]) => { base += `<g transform="translate(${200 + i * 46 + 23},${RY + 104}) rotate(-90)">${G[g](c)}</g>`; });
    const BAY = i => `M-90 ${LANE}H${200 + i * 46 - 30}Q${200 + i * 46 + 23} ${LANE} ${200 + i * 46 + 23} ${RY + 88}V${RY + 108}`;
    const actors = [], caps = []; let t = 0;
    (o.seq || []).forEach((s, i) => {
      if (s.do === 'park') {
        actors.push({ g: s.g || 'car', color: s.color || (i === 0 ? P.you : '#c8483e'), label: s.label || (i === 0 ? 'You' : 'Car'), path: BAY(s.bay), keys: [[t, 0], [t + 3.2, 'end', 'o'], [t + 6.4, 'end']], op: s.leave ? [[t, 1], [t + 5.4, 1], [t + 6.2, 0]] : null, badges: [{ a: t + 2.6, b: t + 6.4, k: s.k || 'ok', txt: s.txt }] });
        if (s.walk) actors.push({ g: 'ped', color: '#7a59b8', label: s.walkLabel || 'Driver', path: `M${200 + s.bay * 46 + 23} ${RY + 112}V${RY + 152}H${200 + s.bay * 46 + 180}`, keys: [[t + 3.4, 0], [t + 6.2, 'end']], op: [[t + 3.3, 0], [t + 3.4, 1], [t + 6.1, 1], [t + 6.3, 0]], noLabel: !s.walkLabel });
        caps.push([t + 2.6, s.cap]);
        t += 6.6;
      } else if (s.do === 'stop') { // stop at kerb briefly, passenger out, drive on
        const P2 = `M-90 ${LANE}H890`;
        actors.push({ g: s.g || 'car', color: s.color || P.you, label: s.label || 'You', path: P2, keys: [[t, 0], [t + 2.4, xd(560), 'o'], [t + 4.4, xd(560)], [t + 7, 'end', 'i']], badges: [{ a: t + 2.2, b: t + 4.6, k: s.k || 'ok', txt: s.txt }] });
        actors.push({ g: 'ped', color: '#2f8a6b', label: '', path: `M560 ${LANE + 14}V${RY + 150}H700`, keys: [[t + 2.6, 0], [t + 5.6, 'end']], op: [[t + 2.5, 0], [t + 2.6, 1], [t + 5.4, 1], [t + 5.7, 0]], noLabel: true });
        caps.push([t + 2.2, s.cap]); t += 7;
      } else if (s.do === 'pass') {
        actors.push({ g: s.g || 'car', color: s.color || P.you, label: s.label || 'You', path: `M-90 ${LANE}H890`, keys: [[t, 0], [t + 5, 'end']], badges: [{ a: t + 1.6, b: t + 4.4, k: s.k || 'ok', txt: s.txt }] });
        caps.push([t + 1.4, s.cap]); t += 4.6;
      }
    });
    return { base, actors, caps, dur: t + 1.2 };
  }
  // fix: park() collects caps after creation; wrap to rebuild
  function parkScene(o) {
    const caps = [[0, o.cap0 || 'The sign applies on this side of the road, from the sign onwards']];
    const sc = park(Object.assign({}, o, {}));
    // re-run collecting caps properly
    let t = 0; (o.seq || []).forEach(s => { const at = s.do === 'park' ? t + 2.6 : s.do === 'stop' ? t + 2.2 : t + 1.4; caps.push([at, s.cap]); t += s.do === 'park' ? 6.6 : s.do === 'stop' ? 7 : 4.6; });
    sc.caps = caps; return sc;
  }

  /* OVERTAKING on a two-lane road */
  function overtake(o) {
    let base = bg(22) + decor(21) + roadH(ROADY, 128, { center: o.solid ? 'solid' : 'dash' });
    base += sign(o.signX || 330, SIGN_Y, o.code, 60);
    const slowG = o.slow || 'car', slowC = slowG === 'car' ? '#8a96a3' : '#3a7d5c';
    const slow = { g: slowG, color: slowC, label: o.slowLabel || 'Slower vehicle', path: EAST, keys: [[0, xd(120)], [12, xd(120) + 12 * 70]] };
    o.passAt = o.passAt || 500;
    const PASS = `M-90 ${E_Y}H${o.passAt - 80}Q${o.passAt - 40} ${E_Y} ${o.passAt} ${W_Y}H${o.passAt + 140}Q${o.passAt + 180} ${W_Y} ${o.passAt + 220} ${E_Y}H900`;
    let actors;
    if (o.mode === 'hold') {
      actors = [slow, { g: o.you || 'car', color: o.you === 'truck' ? '#3a7d5c' : P.you, label: 'You', path: EAST, keys: [[0, 0], [3, xd(10)], [12, xd(10) + 12 * 70]], badges: [{ a: 2.4, b: 11, k: 'wait', txt: 'Stay behind' }] }];
      if (o.okOther) actors.push({ g: 'car', color: '#c8483e', label: 'Car', path: `M-90 ${E_Y}H60Q100 ${E_Y} 140 ${W_Y}H760Q800 ${W_Y} 840 ${E_Y}H900`, keys: [[4, 0], [9.6, 'end']], badges: [{ a: 6, b: 9, k: 'ok', txt: 'Cars may still overtake' }] });
    } else {
      actors = [slow, { g: o.you || 'car', color: P.you, label: 'You', path: PASS, keys: [[0, 0], [9, 'end']], badges: [{ a: 3.4, b: 7, k: 'ok', txt: 'Overtaking allowed again' }] }];
    }
    return { base, actors, caps: o.caps, dur: 11 };
  }

  /* NARROW passage: F5 / F6 */
  function narrow(o) {
    let base = bg(24) + decor(23) + roadH(ROADY, 128, { x1: 300 }) + roadH(ROADY, 128, { x0: 520 }) + rect(300, ROADY - 38, 220, 76, P.asph);
    base += rect(300, ROADY - 64, 220, 26, P.water) + rect(300, ROADY + 38, 220, 26, P.water) + `<path d="M300 ${ROADY - 38}H520M300 ${ROADY + 38}H520" stroke="#9aa1aa" stroke-width="6"/>`;
    const mine = o.mode === 'F6';
    base += sign(230, SIGN_Y, o.code, 60) + sign(590, 120, mine ? 'F5' : 'F6', 44);
    const you = { g: 'car', color: P.you, label: 'You', path: `M-90 ${E_Y}H220Q260 ${E_Y} 290 ${ROADY}H530Q560 ${ROADY} 600 ${E_Y}H890` };
    const oth = { g: 'car', color: '#c8483e', label: 'Oncoming', path: `M890 ${W_Y}H600Q560 ${W_Y} 530 ${ROADY}H290Q260 ${ROADY} 220 ${W_Y}H-90` };
    if (mine) { you.keys = [[0, 0], [6, 'end']]; you.badges = [{ a: 1.4, b: 4.4, k: 'ok', txt: 'You go first' }]; oth.keys = [[0, 0], [1.8, 230, 'o'], [4.6, 236], [8.6, 'end', 'i']]; oth.badges = [{ a: 1.6, b: 4.6, k: 'wait', txt: 'Waits for you' }]; }
    else { oth.keys = [[0, 0], [6, 'end']]; oth.badges = [{ a: 1.4, b: 4.4, k: 'ok', txt: 'Goes first' }]; you.keys = [[0, 0], [1.8, 260, 'o'], [4.6, 266], [8.6, 'end', 'i']]; you.badges = [{ a: 1.6, b: 4.6, k: 'wait', txt: 'Wait for oncoming' }]; }
    const caps = mine ? [[0, 'A narrow bridge: only one car at a time'], [1.4, 'Your sign says you have priority over oncoming traffic'], [4.4, 'Oncoming drivers see the red-arrow sign and wait']] : [[0, 'A narrow bridge: only one car at a time'], [1.4, 'This sign says: let oncoming traffic through first'], [4.6, 'When it is clear, you may drive through']];
    return { base, actors: [you, oth], caps, dur: 9.5 };
  }

  /* MOTORWAY lanes (A3, C23, F9, L4–L7, L11, L12, K4, K11) */
  function lanes(o) {
    const n = o.n || 3, lw = 50, top = 225 - (n * lw) / 2;
    let base = bg(26) + decor(25);
    base += rect(-10, top - 8, 820, n * lw + 16, P.asph) + rect(-10, top - 14, 820, 6, P.pave) + rect(-10, top + n * lw + 8, 820, 6, P.pave);
    for (let i = 1; i < n; i++) base += `<path d="M-10 ${top + i * lw}H810" stroke="${P.mark}" stroke-width="3.5" stroke-dasharray="${o.solidLast && i === n - 1 ? '0' : '28 22'}"/>`;
    base += `<path d="M-10 ${top - 2}H810M-10 ${top + n * lw + 2}H810" stroke="${P.mark}" stroke-width="3"/>`;
    if (o.exit) base += `<path d="M520 ${top + n * lw + 10}Q640 ${top + n * lw + 10} 820 ${top + n * lw + 110}" stroke="${P.asph}" stroke-width="54" fill="none"/>`;
    if (o.gantryCodes) base += gantry(o.gx || 330, top, top + n * lw, o.gantryCodes.map((c, i) => [top + i * lw + lw / 2, c, 38]));
    else if (o.code) base += sign(o.signX || 300, top + n * lw + (o.exit ? 150 : 110), o.code, o.size || 72, { plate: o.plate });
    if (o.extraBase) base += o.extraBase(top, lw, n);
    const ly = i => top + i * lw + lw / 2;
    const actors = (o.actors || []).map(a => ({ g: a.g || 'car', color: a.color || (a.you ? P.you : '#8a96a3'), label: a.label ?? (a.you ? 'You' : ''), noLabel: a.noLabel, path: a.path ? a.path(ly, top, lw, n) : `M-90 ${ly(a.lane)}H890`, keys: a.keys || [[a.t0 || 0, 0], [(a.t0 || 0) + (a.dd || 6), 'end']], badges: a.badges }));
    return { base, actors, caps: o.caps, dur: o.dur || 9, hud: o.hud };
  }

  /* WARNING scenes: hazard ahead, slow down */
  function warn(o) {
    const signX = 210, hz = o.hz;
    let base = bg(30), over = '';
    let road = EAST, extra = '';
    const straight = () => roadH(ROADY, 128, o.roadOpts || {});
    if (hz === 'bendR' || hz === 'bendL' || hz === 'double') {
      const d = hz === 'bendR' ? `M-20 ${ROADY}H330C470 ${ROADY} 520 300 560 470` : hz === 'bendL' ? `M-20 ${ROADY}H330C470 ${ROADY} 520 200 560 -20` : `M-20 ${ROADY}H300C420 ${ROADY} 420 ${o.first === 'L' ? 120 : 380} 520 ${o.first === 'L' ? 120 : 380}C620 ${o.first === 'L' ? 120 : 380} 620 ${ROADY} 820 ${ROADY}`;
      base += decor(31) + `<path d="${d}" stroke="${P.pave}" stroke-width="140" fill="none"/><path d="${d}" stroke="${P.asph}" stroke-width="128" fill="none"/><path d="${d}" stroke="${P.mark}" stroke-width="4" stroke-dasharray="26 18" fill="none"/>`;
      road = hz === 'bendR' ? `M-90 ${E_Y}H330C452 ${E_Y} 492 330 520 470` : hz === 'bendL' ? `M-90 ${E_Y}H330C480 ${E_Y} 548 220 592 -20` : (o.first === 'L' ? `M-90 ${E_Y}H300C452 ${E_Y} 388 152 520 152C652 152 588 ${E_Y} 820 ${E_Y}H900` : `M-90 ${E_Y}H300C388 ${E_Y} 388 412 520 412C652 412 652 ${E_Y} 820 ${E_Y}H900`);
    } else if (hz === 'hillUp' || hz === 'hillDown') {
      base += decor(32) + straight();
      for (let i = 0; i < 6; i++) base += `<path d="M${430 + i * 60} ${ROADY - 64}V${ROADY + 64}" stroke="#000" stroke-opacity="${hz === 'hillUp' ? .05 + i * .03 : .2 - i * .03}" stroke-width="60"/>`;
      base += label(600, 150, hz === 'hillUp' ? 'Steep climb' : 'Steep descent');
    } else if (hz === 'roundabout') {
      return roundabout({ code: o.code, caps: [[0, 'Warning: a roundabout is coming up'], [2.2, 'Slow down early and check the priority marks'], [4.6, 'Drive round anticlockwise and signal right before your exit']] });
    } else base += decor(33) + straight();

    // hazard props
    const hzX = 560;
    if (hz === 'bumps') base += [0, 1, 2, 3, 4].map(i => `<ellipse cx="${520 + i * 40}" cy="${ROADY + (i % 2 ? 22 : -18)}" rx="22" ry="10" fill="#3f444b"/>`).join('') + [0, 1, 2].map(i => `<path d="M${500 + i * 70} ${ROADY + 40}l12 -8l14 6" stroke="#2f3338" stroke-width="3" fill="none"/>`).join('');
    if (hz === 'hump') base += `<rect x="${hzX - 14}" y="${ROADY - 64}" width="28" height="128" fill="#e9e4d4"/>` + [0, 1, 2, 3, 4, 5].map(i => `<path d="M${hzX - 8} ${ROADY - 54 + i * 22}l8 8l8 -8" stroke="${P.mark}" stroke-width="3" fill="none"/>`).join('').replace(/#f4f4ee/g, '#e1a92b');
    if (hz === 'works') base += cones(470, E_Y - 26, 7, 24) + rect(520, E_Y - 18, 120, 44, '#f3a43a', 'opacity=".25"') + `<g transform="translate(600,${E_Y + 8})">${G.ped('#f07a1a')}</g>` + `<rect x="640" y="${E_Y - 8}" width="40" height="26" fill="#c89b5a"/>`;
    if (hz === 'narrowBoth' || hz === 'narrowR' || hz === 'narrowL') {
      const l = hz !== 'narrowR', r = hz !== 'narrowL';
      if (r) base += `<path d="M440 ${ROADY + 70}L540 ${ROADY + 26}H810V${ROADY + 70}Z" fill="${P.grass}"/><path d="M440 ${ROADY + 64}L540 ${ROADY + 26}H810" stroke="${P.pave}" stroke-width="6" fill="none"/>`;
      if (l) base += `<path d="M440 ${ROADY - 70}L540 ${ROADY - 26}H810V${ROADY - 70}Z" fill="${P.grass}"/><path d="M440 ${ROADY - 64}L540 ${ROADY - 26}H810" stroke="${P.pave}" stroke-width="6" fill="none"/>`;
      road = r ? `M-90 ${E_Y}H460Q520 ${E_Y} 540 ${ROADY + (l ? 4 : 2)}H900` : EAST;
    }
    if (hz === 'slippery' || hz === 'ice') { base += `<ellipse cx="${hzX + 40}" cy="${ROADY + 6}" rx="150" ry="52" fill="${hz === 'ice' ? '#e8f4ff' : '#2b3036'}" opacity="${hz === 'ice' ? .6 : .45}"/>`; if (hz === 'ice') { const r = rng(5); for (let i = 0; i < 26; i++) over += `<text x="${r() * 800}" y="${r() * 450}" font-size="${10 + r() * 10}" fill="#fff" opacity=".85">❄</text>`; } }
    if (hz === 'school' || hz === 'zebra') base += zebraV(hzX, ROADY - 62, ROADY + 62, 50);
    if (hz === 'chippings') { const r = rng(9); for (let i = 0; i < 90; i++) base += `<circle cx="${470 + r() * 260}" cy="${ROADY - 60 + r() * 120}" r="${1.5 + r() * 2}" fill="#b7aa93"/>`; }
    if (hz === 'quay') { base = bg(30) + decor(34) + roadH(ROADY - 40, 128, { kerb: false }) + rect(-10, ROADY - 110, 820, 6, P.pave) + rect(-10, ROADY + 24, 420, 60, P.grass) + water(400, ROADY + 30, 420, 200) + rect(400, ROADY + 24, 410, 6, '#8b8f94') + `<g transform="translate(640,${ROADY + 110})">${G.boat()}</g>`; road = `M-90 ${ROADY - 8}H880`; }
    if (hz === 'traffic') base += `<g transform="translate(${hzX + 40},${ROADY + 92})"><rect x="-10" y="-28" width="20" height="56" rx="5" fill="#222"/><circle cy="-16" r="6" fill="#d93a32" class="tl-r"/><circle cy="0" r="6" fill="#4a4a2a"/><circle cy="16" r="6" fill="#2a4a2a"/></g>` + rect(hzX + 20, ROADY + 2, 6, 62, P.mark);
    if (hz === 'bridge') base = bg(30) + roadH(ROADY, 128, { x1: 520 }) + roadH(ROADY, 128, { x0: 640 }) + water(520, 0, 120, 450) + `<rect x="520" y="${ROADY - 64}" width="120" height="128" fill="#6d737b" transform="rotate(-8 520 ${ROADY})" opacity=".85"/>` + rect(500, ROADY - 64, 6, 128, '#d93a32') + `<g transform="translate(580,380) rotate(-90)">${G.boat()}</g>` + decor(35);
    if (hz === 'aircraft') over += `<g transform="translate(520,120) rotate(160) scale(2.4)" opacity=".9">${G.plane()}</g>` + `<g transform="translate(560,300) rotate(160) scale(2.4)" opacity=".18">${G.plane().replace(/#e7eaee/g, '#000').replace(/#8b939c/g, '#000')}</g>`;
    if (hz === 'wind') { base += `<g transform="translate(${hzX},${ROADY - 96})"><rect x="-2" y="-30" width="4" height="34" fill="#888"/><path d="M0 -30l40 6v12l-40 6z" fill="#f06a1f"/><path d="M14 -28v16M28 -26v12" stroke="#fff" stroke-width="5"/></g>`; for (let i = 0; i < 4; i++) over += `<path d="M${460 + i * 70} ${60 + i * 8}q20 60 0 120q-20 60 0 120" stroke="#fff" stroke-width="3" fill="none" opacity=".8" stroke-dasharray="8 8"/>`; }
    if (hz === 'fog') over += `<rect x="380" y="0" width="420" height="450" fill="url(#fogG)"/><defs><linearGradient id="fogG" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".4" stop-color="#eef2f5" stop-opacity=".85"/><stop offset="1" stop-color="#eef2f5" stop-opacity=".92"/></linearGradient></defs>`;
    if (hz === 'accident') base += `<g transform="translate(${hzX + 60},${W_Y}) rotate(25)">${G.car('#8a96a3')}</g><g transform="translate(${hzX + 110},${W_Y + 10}) rotate(-30)">${G.car('#c8483e')}</g><path d="M${hzX - 40} ${W_Y + 12}l9 -16l9 16z" fill="none" stroke="#d93a32" stroke-width="3"/>`;
    if (hz === 'queue') { /* actors below */ }
    if (hz === 'bollard') base += `<rect x="${hzX - 8}" y="${ROADY - 64}" width="16" height="128" fill="#3f444b"/>` + `<g transform="translate(${hzX},${ROADY - 20})">${G.bollard()}</g><g transform="translate(${hzX},${ROADY + 20})">${G.bollard()}</g>` + label(hzX, ROADY - 90, 'Bus only');
    if (hz === 'twoWay') base += arrowMark(110, ROADY, 'right') + sign(signX - 120, SIGN_Y, 'C3', 40);
    if (hz === 'general') base += cones(500, E_Y, 4, 30) + rect(560, ROADY + 2, 120, 50, '#000', 'opacity=".25" rx="20"');

    base += sign(signX, SIGN_Y, o.code, 62, { plate: o.plate });
    // you: slow down from 80 to `slow` before hazard
    const v0 = o.v0 || 80, v1 = o.slow ?? 50;
    const actors = [];
    const youKeys = []; const hud = []; { let d = 0, t = 0, v = v0; const dt = .05; const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('d', road); const L = tmp.getTotalLength(); const dA = xd(signX - 40), dB = xd(signX + 200);
      const stopAt = o.stopAt != null ? xd(o.stopAt) : null; let waited = 0;
      while (d < L && t < 22) {
        if (stopAt != null) { if (d < stopAt - 160) v = v0; else if (d < stopAt) v = Math.max(6, v0 * (stopAt - d) / 160); }
        else if (d < dA) v = v0; else if (d < dB) v = v0 + (v1 - v0) * (d - dA) / (dB - dA); else v = v1;
        if (stopAt != null && d >= stopAt - 2) { v = 0; waited += dt; if (waited > (o.wait || 2.6)) { d = stopAt + 1; v = 30; } }
        if (Math.round(t / dt) % 2 === 0) { youKeys.push([+t.toFixed(2), +d.toFixed(1)]); hud.push([+t.toFixed(2), v]); }
        d += Math.max(v, stopAt != null && d >= stopAt ? 0 : 0) * K * dt + (v === 0 ? 0 : 0); t += dt;
        if (stopAt != null && d > stopAt + 0.5 && waited > (o.wait || 2.6)) { // leave
          while (d < L && t < 24) { v = Math.min(v + 1.2, 50); d += v * K * dt; t += dt; if (Math.round(t / dt) % 2 === 0) { youKeys.push([+t.toFixed(2), +d.toFixed(1)]); hud.push([+t.toFixed(2), v]); } }
          break;
        }
      }
      youKeys.push([+t.toFixed(2), 'end']); hud.push([+t.toFixed(2), v]);
    }
    const tEnd = youKeys[youKeys.length - 1][0];
    actors.push({ g: 'car', color: P.you, label: 'You', path: road, keys: youKeys, badges: o.youBadges || [{ a: 1.4, b: 4.2, k: 'wait', txt: o.youTxt || `Slow down` }] });
    (o.actors || []).forEach(a => actors.push(Object.assign({ color: COL[a.g], label: NAMES[a.g] || '' }, a)));
    if (hz === 'queue') for (let i = 0; i < 4; i++) actors.push({ g: i === 2 ? 'truck' : 'car', color: ['#8a96a3', '#c8483e', '#3a7d5c', '#e9eef3'][i], noLabel: true, path: EAST, keys: [[0, xd(560 + i * (i > 2 ? 70 : 56))], [tEnd, xd(600 + i * 60)]] });
    const caps = o.caps || [[0, 'A warning sign: danger ahead'], [1.4, o.capMid || 'Slow down and be ready to react'], [3.8, o.capEnd || 'Pass the danger carefully']];
    return { base: base + extra, over, actors, caps, dur: tEnd + 1, hud };
  }

  /* LEVEL CROSSING: barriers + train (J10–J13) */
  function railX(o) {
    const RX = 560;
    let base = bg(34) + decor(37) + roadH(ROADY, 128, { gaps: [[RX - 40, RX + 40]] }) + rails(RX, -10, 460, o.tracks || 1) ;
    if (o.crossOnly) base += sign(RX - 70, SIGN_Y - 10, o.code, 70); else base += sign(240, SIGN_Y, o.code, 60);
    if (o.crossOnly) base += rect(RX - 110, ROADY + 6, 8, 58, P.mark);
    const actors = [];
    if (o.barrier) {
      actors.push({ g: 'barrier', at: { x: RX - 64, y: ROADY + 70 }, rot: [[0, 0], [2, 0], [2.8, -90], [8.4, -90], [9.2, 0]], noLabel: true });
      actors.push({ g: 'barrier', at: { x: RX + 64, y: ROADY - 70 }, rot: [[0, 180], [2, 180], [2.8, 90], [8.4, 90], [9.2, 180]], noLabel: true });
    }
    actors.push({ g: 'train', color: '#f2c230', noLabel: true, path: `M${RX + (o.tracks > 1 ? -23 : 0)} -200V700`, keys: [[0, 0], [3.6, 0], [7.8, 'end']] });
    if (o.tracks > 1) actors.push({ g: 'train', color: '#3a6fc4', noLabel: true, path: `M${RX + 23} 700V-200`, keys: [[0, 0], [5, 0], [9.8, 'end']] });
    const stopX = RX - 150;
    actors.push({ g: 'car', color: P.you, label: 'You', path: EAST, keys: [[0, 0], [3, xd(stopX), 'o'], [o.tracks > 1 ? 10.4 : 9.4, xd(stopX)], [13, 'end', 'i']], badges: [{ a: 2.6, b: o.tracks > 1 ? 10.2 : 9.2, k: 'stop', txt: o.stopTxt || 'Stop. Train coming' }] });
    if (!o.barrier) base += `<g transform="translate(${RX - 98},${ROADY + 92})"><rect x="-14" y="-10" width="28" height="20" rx="4" fill="#222"/><circle cx="-6" r="5" fill="#d93a32"><animate attributeName="opacity" values="1;.15;1" dur="1s" repeatCount="indefinite"/></circle><circle cx="6" r="5" fill="#d93a32"><animate attributeName="opacity" values=".15;1;.15" dur="1s" repeatCount="indefinite"/></circle></g>`;
    return { base, actors, caps: o.caps, dur: 13.5 };
  }

  /* TRAM crossing J14 */
  function tramX(o) {
    const RX = 560;
    let base = bg(36) + decor(38) + roadH(ROADY, 128) + `<path d="M${RX - 9} -10V460M${RX + 9} -10V460" stroke="#4d4f55" stroke-width="3.5"/>` + sign(240, SIGN_Y, o.code, 60);
    const actors = [{ g: 'tram', color: '#e8c22c', label: 'Tram', path: `M${RX} -200V700`, keys: [[0, 0], [2.4, 0], [6.8, 'end']], badges: [{ a: 3, b: 5.6, k: 'ok', txt: 'Tram has priority' }] },
    { g: 'car', color: P.you, label: 'You', path: EAST, keys: [[0, 0], [2.8, xd(RX - 140), 'o'], [6.2, xd(RX - 140)], [9.6, 'end', 'i']], badges: [{ a: 2.6, b: 6, k: 'wait', txt: 'Let the tram pass' }] }];
    return { base, actors, caps: [[0, 'Warning: tram tracks cross the road ahead'], [2.6, 'Trams almost always have priority. Slow down and look'], [6.2, 'Continue once the tracks are clear']], dur: 10 };
  }

  /* PEDESTRIAN CROSSING L2 / J22 / J21 */
  function zebra(o) {
    const ZX = 520;
    let base = bg(40) + houses(40, [20, 110, 200, 560, 650, 740], 60) + rect(-10, 170, 820, 16, P.pave) + rect(-10, 314, 820, 22, P.pave) + roadH(ROADY, 128, { kerb: false }) + zebraV(ZX, ROADY - 62, ROADY + 62, 54);
    base += sign(o.signX || 300, SIGN_Y, o.code, 60);
    if (o.code === 'L2') base += sign(ZX - 44, 168, 'L2', 40);
    const pedG = o.child ? 'child' : 'ped';
    const actors = [
      { g: pedG, color: '#7a59b8', label: o.child ? 'Children' : 'Pedestrian', path: `M${ZX} 360V140`, keys: [[0, 0], [2.6, 40], [6.6, 'end']], badges: [{ a: 2.6, b: 6.4, k: 'ok', txt: 'Has priority' }] },
      { g: 'car', color: P.you, label: 'You', path: EAST, keys: [[0, 0], [2.8, xd(ZX - 70), 'o'], [6.4, xd(ZX - 70)], [9.4, 'end', 'i']], badges: [{ a: 2.6, b: 6.2, k: 'wait', txt: 'Stop and let them cross' }] }
    ];
    if (o.child) actors.splice(1, 0, { g: 'child', color: '#e05a7a', noLabel: true, path: `M${ZX + 14} 372V140`, keys: [[0.2, 0], [2.9, 40], [6.9, 'end']] });
    return { base, actors, caps: o.caps || [[0, 'A pedestrian crossing (zebra)'], [2.6, 'Give way to anyone who is crossing or clearly waiting to cross'], [6.2, 'Do not overtake just before or on the crossing']], dur: 10 };
  }

  /* BUS / TRAM STOP L3 */
  function busStop(o) {
    let base = bg(42) + houses(40, [20, 110, 200, 290, 560, 650, 740], 60) + rect(-10, 168, 820, 18, P.pave) + roadH(ROADY, 128, { kerb: false }) + rect(-10, 314, 820, 40, P.pave);
    base += `<path d="M380 ${ROADY + 60}H620" stroke="${P.yellow}" stroke-width="4" stroke-dasharray="10 8"/><text x="500" y="${ROADY + 48}" text-anchor="middle" font-size="20" font-weight="800" fill="${P.mark}" font-family="Overpass,sans-serif">BUS</text>`;
    base += sign(520, 352, o.code, 54) + rect(400, 326, 80, 18, '#9fb7c9');
    const veh = o.tram ? 'tram' : 'bus';
    const actors = [
      { g: veh, color: o.tram ? '#e8c22c' : '#e0a21a', label: o.tram ? 'Tram' : 'Bus', path: `M-150 ${E_Y + 8}H960`, keys: [[0, 0], [2.6, 640, 'o'], [5.8, 640], [9, 'end', 'i']], badges: [{ a: 5.4, b: 7, k: 'info', txt: 'Signals to pull away' }] },
      { g: 'ped', color: '#7a59b8', noLabel: true, path: `M470 340V${E_Y + 26}`, keys: [[3, 0], [5, 'end']], op: [[3, 1], [5, 1], [5.2, 0]] },
      { g: 'car', color: P.you, label: 'You', path: `M-90 ${E_Y}H890`, keys: [[1, 0], [4.6, xd(330), 'o'], [7.2, xd(330)], [10, 'end', 'i']], badges: [{ a: 4.4, b: 7, k: 'wait', txt: 'Let the bus pull away' }] }
    ];
    return { base, actors, caps: o.caps || [[0, 'A public transport stop'], [2.6, 'Do not wait or park within the stop markings (or within 12 m of the stop)'], [4.6, 'In built-up areas, let the bus pull away when it signals']], dur: 10.4 };
  }

  /* DEAD END L8 / L9 */
  function deadEnd(o) {
    let base = bg(44) + decor(45);
    if (o.side) {
      base += roadH(ROADY, 128, { gaps: [[452, 548]] }) + roadV(500, 96, { y0: ROADY, y1: 410 }) + rect(452, 400, 96, 10, '#d93a32') + rect(440, 410, 120, 30, P.grassD);
      base += sign(320, SIGN_Y, o.code, 62) + ghost(`M480 ${ROADY + 70}V380`, 'no', 480, 394);
      return { base, dur: 8, actors: [{ g: 'car', color: P.you, label: 'You', path: EAST, keys: [[0, 0], [6.4, 'end']], badges: [{ a: 1.6, b: 5, k: 'ok', txt: 'Go straight on' }] }], caps: [[0, 'The side road ahead is a dead end for vehicles'], [1.6, 'Only turn in if your destination is there'], [4, 'Walkers and cyclists can often continue (look for gaps in the red bar)']] };
    }
    base += roadH(ROADY, 128, { x1: 640 }) + `<circle cx="640" cy="${ROADY}" r="78" fill="${P.asph}"/>` + rect(712, ROADY - 66, 12, 132, '#d93a32') + sign(200, SIGN_Y, o.code, 62);
    const TURN = `M-90 ${E_Y}H560C700 ${E_Y} 700 ${W_Y} 560 ${W_Y}H-90`;
    return { base, dur: 11, actors: [{ g: 'car', color: P.you, label: 'You', path: TURN, keys: [[0, 0], [10, 'end']], badges: [{ a: 4, b: 7, k: 'info', txt: 'No way through: turn back' }] }], caps: [[0, 'This road is a dead end for vehicles'], [3, 'There is no way out at the far end'], [6.4, 'You will have to turn around and come back']] };
  }

  /* DIRECTION signs: road forks, read the destination and pick the lane */
  function direction(o) {
    let base = bg(46) + decor(47);
    const mw = o.motorway, BR = `M420 ${ROADY}Q560 ${ROADY} 820 ${ROADY + 150}`;
    base += `<path d="M-20 ${ROADY}H420Q560 ${ROADY} 820 ${ROADY + 150}" stroke="${P.asph}" stroke-width="${mw ? 100 : 80}" fill="none"/><path d="M-20 ${ROADY}H820" stroke="${P.asph}" stroke-width="${mw ? 120 : 96}" fill="none"/>`;
    base += `<path d="${BR}" stroke="${P.mark}" stroke-width="3" stroke-dasharray="20 14" fill="none"/><path d="M-20 ${ROADY}H820" stroke="${P.mark}" stroke-width="3" stroke-dasharray="20 14" opacity="${mw ? 1 : .6}"/>`;
    if (o.main) base += label(720, ROADY - 78, o.main);
    if (o.branch) base += label(690, 420, o.branch);
    if (o.code === 'K14') base = bg(46) + decor(47) + `<path d="M-20 ${ROADY}H820" stroke="${P.asph}" stroke-width="96"/><path d="${BR}" stroke="${P.asph}" stroke-width="80" fill="none"/>` + label(690, 420, 'Hazardous goods route') + label(720, ROADY - 78, 'Town centre');
    const big = o.size || 96;
    base += sign(o.signX || 230, 176, o.code, big);
    const EXIT = `M-90 ${ROADY + 16}H420Q560 ${ROADY + 16} 820 ${ROADY + 166}L900 ${ROADY + 212}`;
    const actors = [{ g: o.g || 'car', color: o.g === 'tanker' ? '#c0392b' : P.you, label: o.youLabel || 'You', path: o.takeMain ? `M-90 ${ROADY + 16}H890` : EXIT, keys: [[0, 0], [7.4, 'end']], badges: [{ a: 1.4, b: 6, k: 'info', txt: o.goal || 'Going to the exit' }] }];
    if (!o.takeMain) actors.push({ g: 'truck', color: '#3a7d5c', noLabel: true, path: `M-90 ${ROADY - 20}H890`, keys: [[0.8, 0], [8, 'end']] });
    return { base, actors, caps: o.caps || [[0, 'Read the sign early: destinations and road numbers'], [1.6, o.capMid || 'Find your destination and the lane or direction it shows'], [4.4, 'Move into position in good time and signal']], dur: 8.4 };
  }

  /* TUNNEL family: L13, L16–L19 */
  function tunnel(o) {
    let base = bg(50) + decor(51) + roadH(ROADY, 140, { center: 'dash' });
    base += `<rect x="440" y="${ROADY - 96}" width="380" height="192" fill="#2d3238" opacity=".93"/><rect x="434" y="${ROADY - 96}" width="10" height="192" fill="#8b8f94"/>`;
    for (let i = 0; i < 6; i++) base += `<circle cx="${470 + i * 60}" cy="${ROADY - 76}" r="4" fill="#ffe9a6"/>`;
    if (o.niche) base += `<rect x="610" y="${ROADY + 72}" width="40" height="22" fill="#1f6fd6"/><text x="630" y="${ROADY + 88}" font-size="11" fill="#fff" text-anchor="middle" font-weight="700" font-family="Inter,sans-serif">SOS</text>`;
    if (o.exitDoor) base += `<rect x="560" y="${ROADY + 74}" width="54" height="22" fill="#1f9d55"/><text x="587" y="${ROADY + 89}" font-size="10" fill="#fff" text-anchor="middle" font-weight="700" font-family="Inter,sans-serif">EXIT</text>`;
    base += sign(o.signX || 300, SIGN_Y + 4, o.code, o.size || 64);
    const actors = (o.actors || [{ g: 'car', you: 1 }]).map((a, i) => ({ g: a.g, color: a.you ? P.you : COL[a.g] || '#888', label: a.label ?? (a.you ? 'You' : ''), path: a.path || `M-90 ${ROADY + 30}H890`, keys: a.keys || [[i * 1.5, 0], [i * 1.5 + 6.5, 'end']], badges: a.badges, op: a.op }));
    return { base, actors, caps: o.caps, dur: o.dur || 9 };
  }

  /* HOME ZONE (woonerf) G5/G6 */
  function homeZone(o) {
    let base = bg(52) + houses(20, [10, 100, 190, 280, 370, 460, 550, 640, 730], 80) + houses(360, [10, 100, 190, 520, 610, 700], 70);
    base += surfaceH(ROADY, 220, -10, 810, 'brick') + `<rect x="520" y="${ROADY + 60}" width="140" height="44" fill="#b0705a"/><text x="590" y="${ROADY + 88}" text-anchor="middle" font-weight="800" font-size="18" fill="#fff" font-family="Overpass,sans-serif">P</text>` + tree(300, ROADY + 80, 18) + tree(700, ROADY - 80, 16) + `<rect x="120" y="${ROADY - 100}" width="40" height="30" fill="#7fb6d9"/>`;
    base += sign(o.code === 'G6' ? 480 : 120, 380, o.code, 72);
    const actors = [
      { g: 'car', color: P.you, label: 'You', path: `M-90 ${ROADY + 12}H890`, keys: [[0, 0], [16, 'end']], badges: [{ a: 1.4, b: 14, k: 'wait', txt: 'Walking pace' }] },
      { g: 'child', color: '#e05a7a', label: 'Children playing', path: `M420 ${ROADY - 80}C470 ${ROADY - 20} 520 ${ROADY + 40} 470 ${ROADY + 60}C420 ${ROADY + 70} 380 ${ROADY - 20} 420 ${ROADY - 80}`, keys: [[0, 0], [16, 'end']] },
      { g: 'ped', color: '#7a59b8', label: '', noLabel: true, path: `M820 ${ROADY - 6}H-40`, keys: [[0, 0], [16, 'end']] }
    ];
    return { base, actors, caps: o.caps || [[0, 'You enter a home zone (woonerf)'], [1.6, 'Drive at walking pace, max 15 km/h'], [5, 'Pedestrians and playing children may use the whole street'], [9, 'Park only in marked spaces with a P']], dur: 16, hud: [[0, 15], [16, 15]] };
  }

  /* CHECKPOINT F10 */
  function checkpoint(o) {
    let base = bg(54) + decor(55) + roadH(ROADY, 128) + sign(260, SIGN_Y, o.code, 62, { plate: o.plate || 'POLITIE' }) + rect(520, ROADY + 6, 8, 58, P.mark);
    base += cones(470, W_Y - 30, 1) ;
    const actors = [
      { g: 'officer', at: { x: 560, y: ROADY + 90, r: -90 }, label: 'Officer', noLabel: false },
      { g: 'car', color: P.you, label: 'You', path: EAST, keys: [[0, 0], [2.8, xd(470), 'o'], [6.6, xd(470)], [9.4, 'end', 'i']], badges: [{ a: 2.6, b: 6.4, k: 'stop', txt: 'Stop here' }, { a: 6.4, b: 8.6, k: 'ok', txt: 'Waved through' }] }
    ];
    return { base, actors, caps: [[0, 'A STOP sign at a check (police, customs, toll)'], [2.6, 'Stop and wait. Follow the instructions of the officer'], [6.4, 'Drive on only when you are allowed']], dur: 10, hud: [[0, 50], [2.8, 0], [6.6, 0], [8.6, 30]] };
  }

  /* PARK & RIDE / carpool */
  function transfer(o) {
    let base = bg(56) + decor(57) + roadH(120, 110, { center: 'dash' });
    base += rect(180, 190, 400, 200, '#666c75') + bays(200, 200, 8, 46, 64, {}) + bays(200, 312, 8, 46, 64, {});
    base += sign(160, 186, o.code, 62);
    if (o.mode === 'pr') base += rect(640, 300, 150, 60, '#e0a21a', 'rx="6"') + `<text x="715" y="336" font-size="16" font-weight="800" text-anchor="middle" fill="#fff" font-family="Overpass,sans-serif">BUS / TRAIN</text>`;
    const BAY = `M-90 136H340Q362 136 362 180V230`;
    const actors = [
      { g: 'car', color: P.you, label: 'You', path: BAY, keys: [[0, 0], [3.4, 'end', 'o'], [10, 'end']], badges: [{ a: 3, b: 6, k: 'ok', txt: 'Park here' }] },
      { g: 'ped', color: '#7a59b8', label: '', noLabel: true, path: `M362 252V290H${o.mode === 'pr' ? 650 : 455}V${o.mode === 'pr' ? 330 : 285}`, keys: [[3.6, 0], [6.6, 'end']], op: [[3.5, 0], [3.6, 1], [6.4, 1], [6.8, 0]] }
    ];
    if (o.mode === 'carpool') { base += `<g transform="translate(455,252) rotate(-90)">${G.car('#c8483e')}</g>`; actors.push({ g: 'car', color: '#c8483e', label: 'Shared car', path: `M455 252V136H890`, keys: [[0, 0], [7, 0], [10, 'end', 'i']], op: [[0, 0], [6.9, 0], [7, 1]] }); }
    return { base, actors, caps: o.caps, dur: 10.5 };
  }

  /* hard shoulder / lane layout (L14, L15) */
  function shoulder(o) {
    return lanes({
      n: 3, code: o.code, size: 66, solidLast: true, extraBase: (top, lw, n) => `<rect x="-10" y="${top + 2 * lw + 3}" width="820" height="${lw - 6}" fill="#53585f"/>` + (o.sos ? `<rect x="560" y="${top + 3 * lw + 12}" width="34" height="18" fill="#f07a1a"/><text x="577" y="${top + 3 * lw + 25}" font-size="10" fill="#fff" text-anchor="middle" font-weight="800" font-family="Inter,sans-serif">SOS</text>` : ''),
      actors: [{ you: 1, lane: 1, path: (ly) => `M-90 ${ly(1)}H360Q420 ${ly(1)} 440 ${ly(2)}H560`, keys: [[0, 0], [4, 'end', 'o'], [9, 'end']], badges: [{ a: 3.4, b: 8, k: 'info', txt: 'Breakdown: hard shoulder' }] }, { lane: 0, t0: 0.4, dd: 5 }, { lane: 1, t0: 3, dd: 5, g: 'truck', color: '#3a7d5c' }],
      caps: o.caps, dur: 9
    });
  }

  window.Scenes = { mount, speed, ban, endOf, prio, roundabout, island, turns, oneway, park: parkScene, overtake, narrow, lanes, warn, railX, tramX, zebra, busStop, deadEnd, direction, tunnel, homeZone, checkpoint, transfer, shoulder, P, xd, wd, EAST, WEST, E_Y, W_Y, ROADY, sign, label, houses, roadH, bg, decor };
})();
