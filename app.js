(function () {
  const SIGNS = window.SIGNS, CATS = window.CATS;
  const byCode = Object.fromEntries(SIGNS.map(s => [s.code, s]));
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const img = c => `signs/${c}.webp`;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- storage (per-viewer convenience only) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('rvv:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('rvv:' + k, JSON.stringify(v)); } catch (e) { } }
  };
  let learned = new Set(store.get('learned', []));
  let filterCat = null, query = '', current = SIGNS[0].code, mode = 'learn', ctl = null;

  /* ---------- catalogue ---------- */
  function renderChips() {
    $('#chips').innerHTML = `<button class="chip" data-c="" aria-pressed="${!filterCat}">All</button>` + CATS.map(c => `<button class="chip" data-c="${c.id}" aria-pressed="${filterCat === c.id}" title="${esc(c.full)}"><b>${c.id}</b>${esc(c.name)}</button>`).join('');
  }
  function matches(s) {
    if (filterCat && s.cat !== filterCat) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.mean.toLowerCase().includes(q);
  }
  function renderCatalog() {
    let html = '';
    CATS.forEach(c => {
      const list = SIGNS.filter(s => s.cat === c.id && matches(s));
      if (!list.length) return;
      const done = list.filter(s => learned.has(s.code)).length;
      html += `<section class="cat"><h3><span class="plate">${c.id}</span>${esc(c.full)}<span class="n">${done}/${list.length}</span></h3><p>${esc(c.shape)}</p><div class="grid">` +
        list.map(s => `<button class="tile" data-code="${s.code}" aria-current="${s.code === current}" title="${esc(s.code + ' · ' + s.name)}"><img src="${img(s.code)}" alt="" loading="lazy"><span>${s.code}</span>${learned.has(s.code) ? '<i class="dot" aria-label="learned"></i>' : ''}</button>`).join('') + '</div></section>';
    });
    $('#catalog').innerHTML = html || `<p class="empty-search">No sign matches “${esc(query)}”. Try a word like “parking”, “bicycle” or a code like “J27”.</p>`;
  }
  function updateProgress() {
    const n = learned.size;
    $('#progTxt').textContent = `${n}/${SIGNS.length}`;
    $('#progBar').style.width = (n / SIGNS.length * 100) + '%';
  }

  /* ---------- learn view ---------- */
  function visibleList() { const l = SIGNS.filter(matches); return l.length ? l : SIGNS; }
  function neighbours(code) {
    const l = visibleList(); let i = l.findIndex(s => s.code === code); if (i < 0) i = 0;
    return [l[(i - 1 + l.length) % l.length], l[(i + 1) % l.length]];
  }
  function showSign(code, push = true) {
    if (!byCode[code]) code = SIGNS[0].code;
    current = code; mode = 'learn'; setModeButtons();
    const s = byCode[code], cat = CATS.find(c => c.id === s.cat);
    const [prev, next] = neighbours(code);
    if (ctl) ctl.destroy(); ctl = null;
    $('#main').innerHTML = `<div class="wrap">
      <section class="hero" aria-labelledby="signTitle">
        <div class="signbox"><img src="${img(code)}" alt="Road sign ${esc(code)}: ${esc(s.name)}"></div>
        <div>
          <div class="meta"><span class="plate">${esc(code)}</span><span class="catname">${esc(cat.full)}</span></div>
          <h2 id="signTitle">${esc(s.name)}</h2>
          <p class="mean">${esc(s.mean)}</p>
          <button class="learned-btn" id="learnBtn" aria-pressed="${learned.has(code)}"><span class="box"></span><span>${learned.has(code) ? 'Learned' : 'Mark as learned'}</span> <span class="kbd">L</span></button>
        </div>
      </section>
      <section class="example" aria-label="Visual example">
        <div class="ex-head"><h3>See it on the road</h3><span class="hint">Top-down view. You drive the blue car.</span>
          <div class="ctl"><button id="playBtn" class="primary" aria-label="Pause"></button><button id="restartBtn" aria-label="Restart">↺</button><button id="rateBtn" aria-label="Playback speed">1×</button></div></div>
        <div class="stage"><div id="scene" style="width:100%;height:100%"></div></div>
        <div class="timeline"><i id="tl"></i></div>
        <div class="steps" id="steps"></div>
      </section>
      <section class="facts">
        <div class="card"><h3>What you do</h3><ul class="todo">${s.todo.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <div class="card tipcard"><h3>Good to know</h3>${s.tip ? `<p class="tip">${esc(s.tip)}</p>` : `<p class="tip none">Nothing special: follow the sign as shown.</p>`}</div>
      </section>
      <nav class="pager" aria-label="Previous and next sign">
        <button id="prevBtn"><img src="${img(prev.code)}" alt=""><span class="txt"><small>← ${esc(prev.code)}</small><span class="t">${esc(prev.name)}</span></span></button>
        <button id="nextBtn"><span class="txt"><small>${esc(next.code)} →</small><span class="t">${esc(next.name)}</span></span><img src="${img(next.code)}" alt=""></button>
      </nav>
    </div>`;
    $('#prevBtn').onclick = () => go(prev.code);
    $('#nextBtn').onclick = () => go(next.code);
    $('#learnBtn').onclick = toggleLearned;
    mountScene(s);
    document.querySelectorAll('.tile').forEach(t => t.setAttribute('aria-current', t.dataset.code === code));
    const tile = document.querySelector(`.tile[data-code="${CSS.escape(code)}"]`);
    if (tile && !isMobile()) tile.scrollIntoView({ block: 'nearest' });
    if (push && location.hash !== '#' + code) history.replaceState(null, '', '#' + code);
    document.title = `${code} · ${s.name} · Dutch Road Signs Trainer`;
    store.set('last', code);
  }
  function mountScene(s) {
    let spec;
    try { spec = s.scene(); } catch (e) { console.error(e); spec = null; }
    const host = $('#scene');
    if (!spec) { host.innerHTML = '<p style="padding:20px">Example unavailable.</p>'; return; }
    const caps = (spec.caps || []).slice().sort((a, b) => a[0] - b[0]);
    $('#steps').innerHTML = caps.map((c, i) => `<button data-t="${c[0]}"><b>${i + 1}</b><span>${esc(c[1])}</span></button>`).join('');
    let lastIdx = -1;
    const playBtn = $('#playBtn');
    const setPlay = p => { playBtn.innerHTML = p ? '❚❚ Pause' : '▶ Play'; playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play'); };
    ctl = window.Scenes.mount(host, Object.assign({ alt: `${s.code}: ${s.name}` }, spec), {
      onState: setPlay,
      onTime: t => {
        $('#tl').style.width = (t / spec.dur * 100) + '%';
        let idx = 0; caps.forEach((c, i) => { if (t >= c[0]) idx = i; });
        if (idx !== lastIdx && caps.length) {
          lastIdx = idx;
          document.querySelectorAll('#steps button').forEach((b, i) => b.setAttribute('aria-current', i === idx));
        }
      }
    });
    setPlay(false);
    ctl.seek(0);
    document.querySelectorAll('#steps button').forEach(b => b.onclick = () => { ctl.seek(+b.dataset.t + .05); if (!ctl.playing) ctl.seek(+b.dataset.t + .9); });
    playBtn.onclick = () => ctl.playing ? ctl.pause() : ctl.play();
    $('#restartBtn').onclick = () => { ctl.seek(0); ctl.play(); };
    const rates = [1, .5, 2]; let ri = 0;
    $('#rateBtn').onclick = e => { ri = (ri + 1) % rates.length; ctl.rate = rates[ri]; e.currentTarget.textContent = rates[ri] + '×'; };
    if (!reduced) ctl.play(); else ctl.seek(Math.min(spec.dur - .1, (caps[1] || caps[0] || [1])[0] + .8));
  }
  function toggleLearned() {
    if (learned.has(current)) learned.delete(current); else learned.add(current);
    store.set('learned', [...learned]);
    const b = $('#learnBtn'); if (b) { b.setAttribute('aria-pressed', learned.has(current)); b.querySelector('span:nth-child(2)').textContent = learned.has(current) ? 'Learned' : 'Mark as learned'; }
    updateProgress(); renderCatalog();
  }
  function go(code) { closeRail(); showSign(code); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }

  /* ---------- quiz ---------- */
  let quiz = null;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function quizSetup() {
    mode = 'quiz'; setModeButtons(); if (ctl) ctl.destroy(); ctl = null;
    if (location.hash !== '#quiz') history.replaceState(null, '', '#quiz');
    document.title = 'Quiz · Dutch Road Signs Trainer';
    const pick = store.get('quizCats', []);
    $('#main').innerHTML = `<div class="quiz"><div class="qcard qsetup">
      <h2>Test yourself</h2>
      <p>10 questions. Sometimes you see a sign and pick its meaning, sometimes you read a meaning and pick the sign. Wrong answers come with an explanation.</p>
      <div><h3 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-bottom:8px">Categories</h3>
      <div class="seg" id="qcats"><button class="chip" data-c="" aria-pressed="${!pick.length}">All signs</button>${CATS.map(c => `<button class="chip" data-c="${c.id}" aria-pressed="${pick.includes(c.id)}"><b>${c.id}</b>${esc(c.name)}</button>`).join('')}</div></div>
      <div class="seg"><button class="btn primary" id="qStart">Start quiz</button>${learned.size >= 4 ? `<button class="btn" id="qLearned">Only signs I marked learned (${learned.size})</button>` : ''}</div>
    </div></div>`;
    let sel = new Set(pick);
    $('#qcats').onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const c = b.dataset.c; if (!c) sel.clear(); else sel.has(c) ? sel.delete(c) : sel.add(c);
      document.querySelectorAll('#qcats .chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.c ? sel.has(x.dataset.c) : !sel.size));
      store.set('quizCats', [...sel]);
    };
    $('#qStart').onclick = () => startQuiz(SIGNS.filter(s => !sel.size || sel.has(s.cat)));
    const ql = $('#qLearned'); if (ql) ql.onclick = () => startQuiz(SIGNS.filter(s => learned.has(s.code)));
  }
  function startQuiz(pool) {
    if (pool.length < 4) pool = SIGNS;
    const qs = shuffle(pool).slice(0, Math.min(10, pool.length)).map((s, i) => {
      const same = shuffle(SIGNS.filter(x => x.cat === s.cat && x.code !== s.code && x.name !== s.name));
      const other = shuffle(SIGNS.filter(x => x.cat !== s.cat));
      const wrong = same.concat(other).slice(0, 3);
      return { s, type: i % 2 ? 'pickSign' : 'pickName', opts: shuffle([s].concat(wrong)), answer: null };
    });
    quiz = { qs, i: 0 };
    renderQuestion();
  }
  function renderQuestion() {
    const q = quiz.qs[quiz.i];
    const dots = quiz.qs.map((x, i) => `<i class="${i === quiz.i ? 'cur' : x.answer == null ? '' : x.answer === x.s.code ? 'ok' : 'bad'}"></i>`).join('');
    let body;
    if (q.type === 'pickName') {
      body = `<div class="qprompt">What does this sign mean?</div><div class="qsign"><img src="${img(q.s.code)}" alt="Road sign to identify"></div>
        <div class="opts">${q.opts.map((o, k) => `<button class="opt" data-code="${o.code}"><span class="k">${k + 1}</span><span>${esc(o.name)}</span></button>`).join('')}</div>`;
    } else {
      body = `<div class="qprompt">Which sign means: “${esc(q.s.name)}”?</div>
        <div class="opts imgs">${q.opts.map((o, k) => `<button class="opt img" data-code="${o.code}" aria-label="Option ${k + 1}"><span class="k">${k + 1}</span><img src="${img(o.code)}" alt=""></button>`).join('')}</div>`;
    }
    $('#main').innerHTML = `<div class="quiz"><div class="qcard"><div class="qtop"><span class="count">Question ${quiz.i + 1} of ${quiz.qs.length}</span><span class="qdots">${dots}</span></div>${body}<div id="fb"></div></div></div>`;
    document.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(b.dataset.code));
  }
  function answer(code) {
    const q = quiz.qs[quiz.i]; if (q.answer != null) return;
    q.answer = code; const ok = code === q.s.code;
    document.querySelectorAll('.opt').forEach(b => { b.disabled = true; if (b.dataset.code === q.s.code) b.classList.add('right'); else if (b.dataset.code === code) b.classList.add('wrong'); });
    const last = quiz.i === quiz.qs.length - 1;
    $('#fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}" role="status"><strong>${ok ? 'Correct' : 'Not quite'}: ${esc(q.s.code)} · ${esc(q.s.name)}</strong><span>${esc(q.s.mean)}</span>
      <div class="row"><button class="btn primary" id="qNext">${last ? 'See result' : 'Next question'} <span class="kbd" style="color:inherit;border-color:#fff6">↵</span></button><button class="btn" id="qSee">See it on the road</button></div></div>`;
    $('#qNext').onclick = nextQ; $('#qSee').onclick = () => go(q.s.code);
    $('#qNext').focus({ preventScroll: true });
    document.querySelectorAll('.qdots i')[quiz.i].className = ok ? 'ok' : 'bad';
  }
  function nextQ() {
    if (quiz.i < quiz.qs.length - 1) { quiz.i++; renderQuestion(); return; }
    const right = quiz.qs.filter(q => q.answer === q.s.code).length, miss = quiz.qs.filter(q => q.answer !== q.s.code);
    const msg = right === quiz.qs.length ? 'Perfect score. Ready for the road.' : right >= quiz.qs.length * .7 ? 'Good work. Review the ones you missed.' : 'Keep practising: open the signs you missed and watch their examples.';
    $('#main').innerHTML = `<div class="quiz"><div class="qcard result"><span class="catname" style="letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--ink-3);font-size:12.5px">Your score</span><div class="score">${right}<span style="color:var(--ink-3);font-size:32px">/${quiz.qs.length}</span></div><p style="margin:0;color:var(--ink-2)">${msg}</p>
      ${miss.length ? `<div class="misses">${miss.map(q => `<div class="miss" role="button" tabindex="0" data-code="${q.s.code}"><img src="${img(q.s.code)}" alt=""><div><b>${esc(q.s.code)}</b> · ${esc(q.s.name)}</div></div>`).join('')}</div>` : ''}
      <div class="seg" style="justify-content:center;margin-top:8px"><button class="btn primary" id="qAgain">New quiz</button><button class="btn" id="qBack">Back to learning</button></div></div></div>`;
    document.querySelectorAll('.miss').forEach(m => { m.onclick = () => go(m.dataset.code); m.onkeydown = e => { if (e.key === 'Enter') go(m.dataset.code); }; });
    $('#qAgain').onclick = quizSetup; $('#qBack').onclick = () => go(current);
  }

  /* ---------- shell ---------- */
  function setModeButtons() { $('#mLearn').setAttribute('aria-pressed', mode === 'learn'); $('#mQuiz').setAttribute('aria-pressed', mode === 'quiz'); }
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  function closeRail() { document.body.classList.remove('rail-open'); }
  $('#browseBtn').onclick = () => document.body.classList.toggle('rail-open');
  $('#scrim').onclick = closeRail;
  $('#mLearn').onclick = () => go(current);
  $('#mQuiz').onclick = quizSetup;
  $('#chips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; filterCat = b.dataset.c || null; renderChips(); renderCatalog(); if (filterCat && byCode[current].cat !== filterCat && mode === 'learn') showSign(SIGNS.find(s => s.cat === filterCat).code); };
  $('#catalog').onclick = e => { const t = e.target.closest('.tile'); if (t) go(t.dataset.code); };
  $('#q').oninput = e => { query = e.target.value.trim(); renderCatalog(); };
  $('#q').onkeydown = e => { if (e.key === 'Enter') { const f = SIGNS.find(matches); if (f) go(f.code); } };
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (mode === 'quiz' && quiz) {
      const q = quiz.qs[quiz.i];
      if (q && q.answer == null && /^[1-4]$/.test(e.key)) { const b = document.querySelectorAll('.opt')[+e.key - 1]; if (b) b.click(); }
      else if (q && q.answer != null && e.key === 'Enter' && !e.target.matches('button')) { e.preventDefault(); nextQ(); }
      return;
    }
    if (mode !== 'learn') return;
    const [prev, next] = neighbours(current);
    if (e.key === 'ArrowRight') { e.preventDefault(); go(next.code); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(prev.code); }
    else if (e.key.toLowerCase() === 'l') toggleLearned();
    else if (e.key === ' ' && ctl && !e.target.matches('button')) { e.preventDefault(); ctl.playing ? ctl.pause() : ctl.play(); }
  });
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === 'quiz') { quizSetup(); return; }
    const c = Object.keys(byCode).find(k => k.toLowerCase() === h.toLowerCase());
    showSign(c || store.get('last', SIGNS[0].code), !!c);
  }
  window.addEventListener('hashchange', route);
  renderChips(); renderCatalog(); updateProgress(); route();
})();
