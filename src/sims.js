/* Simulazio interaktiboak — canvas 2D, koloreak CSS tokenetatik */
(function () {
  const root = document.documentElement;
  const G = 9.81;
  const MONO = "'Questrial', system-ui, sans-serif";
  const SERIF = "'Questrial', system-ui, sans-serif";
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let C = {};
  function tok(n) { return getComputedStyle(root).getPropertyValue(n).trim() || '#888'; }
  function refreshColors() {
    C = {
      ink: tok('--ink'), muted: tok('--muted'), line: tok('--line'), surface: tok('--surface'),
      paper: tok('--paper'), accent: tok('--accent'), grid: tok('--grid'), fill: tok('--sim-fill'),
      v: tok('--c-v'), a: tok('--c-a'), at: tok('--c-at'), an: tok('--c-an'), f: tok('--c-f'),
      water: tok('--c-water')
    };
    sims.forEach(s => s.render());
  }
  const sims = [];
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refreshColors);
  new MutationObserver(refreshColors).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- marrazketa-laguntzaileak ---------- */
  function arrow(ctx, x0, y0, x1, y1, col, label, o = {}) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
    if (L < 1.5) return;
    const ux = dx / L, uy = dy / L, h = Math.min(11, L * 0.45);
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = o.w || 2.4; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * h * 0.7, y1 - uy * h * 0.7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * h - uy * h * 0.45, y1 - uy * h + ux * h * 0.45);
    ctx.lineTo(x1 - ux * h + uy * h * 0.45, y1 - uy * h - ux * h * 0.45);
    ctx.closePath(); ctx.fill();
    if (label) {
      ctx.font = `700 ${o.size || 16}px ${SERIF}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x1 + ux * 13 + (o.lx || 0), y1 + uy * 13 + (o.ly || 0));
    }
    ctx.restore();
  }
  function text(ctx, s, x, y, o = {}) {
    ctx.save();
    ctx.fillStyle = o.col || C.muted;
    ctx.font = `${o.weight || 500} ${o.size || 12}px ${o.serif ? SERIF : MONO}`;
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(s, x, y); ctx.restore();
  }
  function line(ctx, x0, y0, x1, y1, col, w = 1, dash) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
  }
  function dot(ctx, x, y, r, col, stroke) {
    ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
  }
  function spring(ctx, x0, y0, x1, y1, coils, amp, col) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const lead = Math.min(14, L * 0.12);
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + ux * lead, y0 + uy * lead);
    const n = coils * 2, seg = (L - 2 * lead) / n;
    for (let i = 1; i <= n; i++) {
      const s = lead + seg * (i - 0.5), side = i % 2 ? 1 : -1;
      ctx.lineTo(x0 + ux * s - uy * amp * side, y0 + uy * s + ux * amp * side);
    }
    ctx.lineTo(x1 - ux * lead, y1 - uy * lead); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
  }
  function hatch(ctx, x0, y0, x1, y1, col) {
    // azalera finkoa (horma/sabaia) marraztua
    // horizontala bada marrak gorantz (sabaia); bertikala bada ezkerrerantz (horma)
    line(ctx, x0, y0, x1, y1, col, 2);
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), n = Math.max(1, Math.floor(L / 9));
    const vertical = Math.abs(dy) > Math.abs(dx);
    for (let i = 0; i <= n; i++) {
      const x = x0 + dx * i / n, y = y0 + dy * i / n;
      if (vertical) line(ctx, x, y, x - 7, y - 5, col, 1);
      else line(ctx, x, y, x + 5, y - 7, col, 1);
    }
  }
  const fmt = (v, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d).replace('-', '−');

  /* ---------- simulazio-markoa ---------- */
  function createSim(el, cfg) {
    const s = { el, cfg, t: 0, p: {}, playing: !cfg.paused, W: 0, H: 0, visible: false, last: 0, lastOut: 0 };
    el.classList.add('sim');
    const stage = document.createElement('div'); stage.className = 'sim-stage';
    const cv = document.createElement('canvas'); cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', cfg.label || 'Simulazioa');
    stage.append(cv);
    const panel = document.createElement('div'); panel.className = 'sim-panel';
    const ctr = document.createElement('div'); ctr.className = 'sim-controls';
    const btns = document.createElement('div'); btns.className = 'sim-buttons';
    const out = document.createElement('dl'); out.className = 'sim-readouts';
    panel.append(btns, ctr, out);
    el.append(stage, panel);
    s.cv = cv; s.ctx = cv.getContext('2d');

    const playBtn = document.createElement('button');
    playBtn.type = 'button'; playBtn.className = 'btn btn-small';
    const setPlayLabel = () => { playBtn.textContent = s.playing ? '❚❚ Gelditu' : '▶ Martxan jarri'; };
    playBtn.onclick = () => { s.playing = !s.playing; setPlayLabel(); s.last = 0; };
    setPlayLabel();
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button'; resetBtn.className = 'btn btn-small btn-ghost'; resetBtn.textContent = '↺ Hasieratu';
    resetBtn.onclick = () => { s.t = 0; cfg.init(s); s.render(); };
    btns.append(playBtn, resetBtn);
    (cfg.buttons || []).forEach(b => {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-small btn-ghost';
      x.textContent = b.label; x.onclick = () => { b.onClick(s); s.render(); }; btns.append(x);
    });

    (cfg.controls || []).forEach(c => {
      const id = `${el.id}-${c.id}`;
      const lab = document.createElement('label'); lab.className = 'ctl'; lab.htmlFor = id;
      const nm = document.createElement('span'); nm.className = 'ctl-name'; nm.innerHTML = c.label;
      const inp = document.createElement('input'); inp.type = 'range'; inp.id = id;
      inp.min = c.min; inp.max = c.max; inp.step = c.step; inp.value = c.value;
      const o = document.createElement('output'); o.htmlFor = id;
      const show = () => { o.textContent = `${fmt(+inp.value, c.dec ?? 1)} ${c.unit || ''}`; };
      s.p[c.id] = +inp.value; show();
      inp.addEventListener('input', () => {
        s.p[c.id] = +inp.value; show();
        if (cfg.onChange) cfg.onChange(s, c.id); else { s.t = 0; cfg.init(s); }
        s.render();
      });
      lab.append(nm, inp, o); ctr.append(lab);
    });
    (cfg.toggles || []).forEach(c => {
      const id = `${el.id}-${c.id}`;
      const lab = document.createElement('label'); lab.className = 'ctl ctl-toggle'; lab.htmlFor = id;
      const inp = document.createElement('input'); inp.type = 'checkbox'; inp.id = id; inp.checked = !!c.value;
      const nm = document.createElement('span'); nm.innerHTML = c.label;
      s.p[c.id] = inp.checked;
      inp.addEventListener('change', () => {
        s.p[c.id] = inp.checked;
        if (c.reset) { s.t = 0; cfg.init(s); }
        s.render();
      });
      lab.append(inp, nm); ctr.append(lab);
    });
    (cfg.selects || []).forEach(c => {
      const id = `${el.id}-${c.id}`;
      const wrap = document.createElement('div'); wrap.className = 'ctl ctl-seg'; wrap.setAttribute('role', 'radiogroup');
      s.p[c.id] = c.value;
      c.options.forEach(([val, txt]) => {
        const b = document.createElement('button'); b.type = 'button'; b.id = `${id}-${val}`;
        b.textContent = txt; b.className = 'seg'; b.setAttribute('role', 'radio');
        const sync = () => wrap.querySelectorAll('.seg').forEach(x => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
        if (val === c.value) b.setAttribute('aria-checked', 'true'); else b.setAttribute('aria-checked', 'false');
        b.onclick = () => { s.p[c.id] = val; sync(); if (c.reset !== false) { s.t = 0; cfg.init(s); } s.render(); };
        wrap.append(b);
      });
      ctr.append(wrap);
    });

    const outCells = {};
    s.updateOut = () => {
      if (!cfg.readouts) return;
      cfg.readouts(s).forEach(([k, v]) => {
        if (!outCells[k]) {
          const d = document.createElement('div'); d.className = 'ro';
          const dt = document.createElement('dt'); dt.innerHTML = k;
          const dd = document.createElement('dd');
          d.append(dt, dd); out.append(d); outCells[k] = dd;
        }
        if (outCells[k].textContent !== v) outCells[k].textContent = v;
      });
    };

    s.resize = () => {
      const w = stage.clientWidth; if (!w) return;
      const asp = typeof cfg.aspect === 'function' ? cfg.aspect(w) : (cfg.aspect || 0.56);
      const h = Math.round(Math.max(cfg.minH || 220, Math.min(cfg.maxH || 520, w * asp)));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.height = h + 'px';
      s.W = w; s.H = h; s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.render();
    };
    s.render = () => {
      if (!s.W) return;
      const ctx = s.ctx;
      ctx.clearRect(0, 0, s.W, s.H);
      ctx.fillStyle = C.fill; ctx.fillRect(0, 0, s.W, s.H);
      cfg.draw(s, ctx, s.W, s.H);
      s.updateOut();
    };
    s.frame = (now) => {
      if (s.playing && s.visible && !reduceMotion) {
        const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 0;
        s.last = now;
        if (dt > 0) { s.t += dt; cfg.step(s, dt); }
        const ctx = s.ctx;
        ctx.clearRect(0, 0, s.W, s.H); ctx.fillStyle = C.fill; ctx.fillRect(0, 0, s.W, s.H);
        cfg.draw(s, ctx, s.W, s.H);
        if (now - s.lastOut > 120) { s.updateOut(); s.lastOut = now; }
      } else s.last = 0;
    };
    if (reduceMotion) {
      // Mugimendu murriztua: urratsez urrats aurreratzeko botoia
      s.playing = false; setPlayLabel(); playBtn.hidden = true;
      const stepBtn = document.createElement('button'); stepBtn.type = 'button'; stepBtn.className = 'btn btn-small';
      stepBtn.textContent = '⏭ +0,25 s';
      stepBtn.onclick = () => { for (let i = 0; i < 10; i++) { s.t += 0.025; cfg.step(s, 0.025); } s.render(); };
      btns.prepend(stepBtn);
    }
    cfg.init(s);
    new ResizeObserver(s.resize).observe(stage);
    new IntersectionObserver(es => es.forEach(e => { s.visible = e.isIntersecting; s.last = 0; if (s.visible) s.resize(); }),
      { rootMargin: '80px' }).observe(el);
    sims.push(s);
    return s;
  }
  function loop(now) { sims.forEach(s => s.frame(now)); requestAnimationFrame(loop); }

  /* ======================================================================
     1. GAIA — ZINEMATIKA
     ====================================================================== */

  // 1a. Osagai intrintsekoak ibilbide kurbatu batean
  function simIntrinseko(el) {
    const P = u => [Math.cos(u), 0.55 * Math.sin(u) + 0.22 * Math.sin(2 * u)];
    const d1 = u => [-Math.sin(u), 0.55 * Math.cos(u) + 0.44 * Math.cos(2 * u)];
    const d2 = u => [-Math.cos(u), -0.55 * Math.sin(u) - 0.88 * Math.sin(2 * u)];
    const speed = s => {
      const v0 = s.p.v0, t = s.t;
      if (s.p.mode === 'konst') return [v0, 0];
      if (s.p.mode === 'aldakor') return [v0 * (1 + 0.6 * Math.sin(1.4 * t)), v0 * 0.6 * 1.4 * Math.cos(1.4 * t)];
      const tt = t % 6; return [v0 * (0.25 + 0.3 * tt), v0 * 0.3];
    };
    createSim(el, {
      label: 'Partikula bat ibilbide kurbatuan: abiadura, azelerazio tangentziala eta normala',
      aspect: w => (w < 520 ? 0.8 : 0.56),
      controls: [{ id: 'v0', label: '|v|₀', min: 0.3, max: 1.4, step: 0.05, value: 0.7, unit: 'm/s', dec: 2 }],
      selects: [{ id: 'mode', value: 'aldakor', options: [['konst', '|v| konstantea'], ['aldakor', '|v| aldakorra'], ['azeleratu', '|v| hazten']] }],
      toggles: [{ id: 'osc', label: 'Zirkulu osculatzailea (ρ)', value: true }, { id: 'tot', label: 'Azelerazio osoa <i>a</i>', value: true }],
      onChange: () => {},
      init(s) { s.u = 0.3; },
      step(s, dt) {
        const n = 8;
        for (let i = 0; i < n; i++) {
          const [vx, vy] = d1(s.u); s.u += speed(s)[0] / Math.hypot(vx, vy) * dt / n;
        }
      },
      draw(s, ctx, W, H) {
        const sc = Math.min(W / 2.7, H / 1.55), cx = W / 2, cy = H / 2 + 6;
        const X = x => cx + x * sc, Y = y => cy - y * sc;
        // ibilbidea
        ctx.save(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 200; i++) { const [x, y] = P(i / 200 * 2 * Math.PI); i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
        ctx.stroke(); ctx.restore();
        const u = s.u, [x, y] = P(u), [x1, y1] = d1(u), [x2, y2] = d2(u);
        const m1 = Math.hypot(x1, y1), Tx = x1 / m1, Ty = y1 / m1;
        const cr = x1 * y2 - y1 * x2, kap = Math.abs(cr) / m1 ** 3, sg = Math.sign(cr) || 1;
        const Nx = -Ty * sg, Ny = Tx * sg;
        const [v, at] = speed(s), an = v * v * kap, rho = 1 / Math.max(kap, 1e-6);
        s.o = { v, at, an, rho };
        if (s.p.osc && rho < 2.5) {
          const ox = x + Nx * rho, oy = y + Ny * rho;
          ctx.save(); ctx.strokeStyle = C.an; ctx.globalAlpha = 0.45; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(X(ox), Y(oy), rho * sc, 0, 7); ctx.stroke(); ctx.restore();
          line(ctx, X(x), Y(y), X(ox), Y(oy), C.an, 1, [2, 4]);
          dot(ctx, X(ox), Y(oy), 3, C.an);
          text(ctx, 'C', X(ox) + 6, Y(oy) - 6, { col: C.an, serif: true, size: 13 });
        }
        const kv = sc * 0.55, ka = sc * 0.5, px = X(x), py = Y(y);
        arrow(ctx, px, py, px + Tx * v * kv, py - Ty * v * kv, C.v, 'v');
        arrow(ctx, px, py, px + Tx * at * ka, py - Ty * at * ka, C.at, 'aₜ', { ly: 10 });
        arrow(ctx, px, py, px + Nx * an * ka, py - Ny * an * ka, C.an, 'aₙ');
        if (s.p.tot) {
          const axw = Tx * at + Nx * an, ayw = Ty * at + Ny * an;
          arrow(ctx, px, py, px + axw * ka, py - ayw * ka, C.a, 'a', { dash: [5, 4], w: 2 });
          line(ctx, px + Tx * at * ka, py - Ty * at * ka, px + axw * ka, py - ayw * ka, C.muted, 1, [2, 3]);
          line(ctx, px + Nx * an * ka, py - Ny * an * ka, px + axw * ka, py - ayw * ka, C.muted, 1, [2, 3]);
        }
        dot(ctx, px, py, 6, C.ink);
        text(ctx, 'uₜ ∥ v      uₙ → kurbadura-zentrorantz', 12, H - 12, { size: 11 });
      },
      readouts: s => {
        const o = s.o || { v: 0, at: 0, an: 0, rho: 0 };
        return [['|v|', fmt(o.v) + ' m/s'], ['aₜ = d|v|/dt', fmt(o.at) + ' m/s²'], ['aₙ = v²/ρ', fmt(o.an) + ' m/s²'],
          ['ρ', o.rho > 50 ? '∞ (inflexioa)' : fmt(o.rho) + ' m'], ['|a|', fmt(Math.hypot(o.at, o.an)) + ' m/s²']];
      }
    });
  }

  // 1b. Higidura zirkularra
  function simZirkular(el) {
    createSim(el, {
      label: 'Higidura zirkularra: abiadura angeluarra eta azelerazioaren osagaiak',
      aspect: w => (w < 520 ? 0.9 : 0.55),
      controls: [
        { id: 'R', label: 'R', min: 0.5, max: 2, step: 0.1, value: 1.5, unit: 'm' },
        { id: 'w0', label: 'ω₀', min: -2.5, max: 2.5, step: 0.1, value: 1, unit: 'rad/s' },
        { id: 'al', label: 'α', min: -0.8, max: 0.8, step: 0.05, value: 0.2, unit: 'rad/s²', dec: 2 }
      ],
      init(s) { s.th = 0; s.w = s.p.w0; },
      step(s, dt) {
        s.w += s.p.al * dt; s.th += s.w * dt;
        if (s.t > 14 || Math.abs(s.w) > 5) { s.t = 0; s.th = 0; s.w = s.p.w0; }
      },
      draw(s, ctx, W, H) {
        const R = s.p.R, sc = Math.min(W * 0.42, H * 0.42) / 2.1, cx = W < 520 ? W / 2 : W * 0.38, cy = H / 2;
        const r = R * sc;
        ctx.save(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.restore();
        line(ctx, cx - r - 20, cy, cx + r + 30, cy, C.line, 1, [3, 4]);
        text(ctx, 'X', cx + r + 30, cy - 6, { serif: true, size: 13 });
        dot(ctx, cx, cy, 3, C.muted);
        const th = s.th, px = cx + r * Math.cos(th), py = cy - r * Math.sin(th);
        line(ctx, cx, cy, px, py, C.muted, 1.2);
        // angelu-arkua
        ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.beginPath();
        const thm = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        ctx.arc(cx, cy, 26, 0, -thm, true); ctx.stroke(); ctx.restore();
        text(ctx, 'φ', cx + 32 * Math.cos(thm / 2), cy - 32 * Math.sin(thm / 2) + 4, { col: C.accent, serif: true, size: 15 });
        const w = s.w, al = s.p.al, v = w * R, at = al * R, an = w * w * R;
        const Tx = -Math.sin(th), Ty = Math.cos(th);
        const kv = sc * 0.45, ka = sc * 0.45;
        arrow(ctx, px, py, px + Tx * v * kv, py - Ty * v * kv, C.v, 'v');
        arrow(ctx, px, py, px + Tx * at * ka, py - Ty * at * ka, C.at, 'aₜ', { lx: 8 });
        arrow(ctx, px, py, px - Math.cos(th) * an * ka, py + Math.sin(th) * an * ka, C.an, 'aₙ');
        const ax = Tx * at - Math.cos(th) * an, ay = Ty * at - Math.sin(th) * an;
        arrow(ctx, px, py, px + ax * ka, py - ay * ka, C.a, 'a', { dash: [5, 4], w: 2 });
        dot(ctx, px, py, 6, C.ink);
        // ω bektorea (Z ardatza, orrialdetik kanpora/barrura)
        const bx = W < 520 ? 34 : W * 0.78, by = W < 520 ? 34 : H * 0.3;
        ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 12, 0, 7); ctx.stroke(); ctx.restore();
        if (w >= 0) dot(ctx, bx, by, 3.5, C.accent);
        else { line(ctx, bx - 7, by - 7, bx + 7, by + 7, C.accent, 2); line(ctx, bx - 7, by + 7, bx + 7, by - 7, C.accent, 2); }
        text(ctx, w >= 0 ? 'ω ⊙ (+Z)' : 'ω ⊗ (−Z)', bx + 20, by + 4, { col: C.accent, size: 12 });
        if (W >= 520) {
          const lx = W * 0.7, ly = H * 0.5;
          text(ctx, 'φ = φ₀ + ω₀t + ½αt²', lx, ly, { col: C.ink, size: 12 });
          text(ctx, 'ω = ω₀ + αt', lx, ly + 20, { col: C.ink, size: 12 });
          text(ctx, 'v = ωR', lx, ly + 40, { col: C.v, size: 12 });
          text(ctx, 'aₜ = αR', lx, ly + 60, { col: C.at, size: 12 });
          text(ctx, 'aₙ = ω²R = v²/R', lx, ly + 80, { col: C.an, size: 12 });
        }
      },
      readouts: s => {
        const R = s.p.R; return [['t', fmt(s.t, 1) + ' s'], ['φ', fmt(s.th) + ' rad'], ['ω', fmt(s.w) + ' rad/s'],
          ['v = ωR', fmt(s.w * R) + ' m/s'], ['aₜ = αR', fmt(s.p.al * R) + ' m/s²'], ['aₙ = ω²R', fmt(s.w * s.w * R) + ' m/s²']];
      }
    });
  }

  // 1c. Jaurtiketa parabolikoa
  function simJaurtiketa(el) {
    const XM = 110, YM = 62;
    const traj = s => {
      const v0 = s.p.v0, th = s.p.th * Math.PI / 180, h0 = s.p.h0;
      const vx = v0 * Math.cos(th), vy = v0 * Math.sin(th);
      const tf = (vy + Math.sqrt(vy * vy + 2 * G * h0)) / G;
      return { vx, vy, h0, tf, hmax: h0 + vy * vy / (2 * G), xr: vx * tf };
    };
    createSim(el, {
      label: 'Jaurtiketa parabolikoa: ibilbidea eta abiaduraren osagaiak',
      aspect: w => (w < 520 ? 0.75 : 0.52),
      controls: [
        { id: 'v0', label: 'v₀', min: 5, max: 30, step: 0.5, value: 22, unit: 'm/s' },
        { id: 'th', label: 'θ₀', min: 5, max: 85, step: 1, value: 50, unit: '°', dec: 0 },
        { id: 'h0', label: 'h₀', min: 0, max: 15, step: 0.5, value: 0, unit: 'm' }
      ],
      toggles: [{ id: 'intr', label: 'Osagai intrintsekoak (aₜ, aₙ)', value: false }, { id: 'comp', label: 'vₓ eta v_y osagaiak', value: true }],
      init(s) { s.tr = traj(s); s.pause = 0; },
      step(s, dt) {
        if (s.t > s.tr.tf) { s.pause += dt; if (s.pause > 1.4) { s.t = 0; s.pause = 0; } }
      },
      draw(s, ctx, W, H) {
        const padL = 34, padB = 26, sc = Math.min((W - padL - 12) / XM, (H - padB - 12) / YM);
        const X = x => padL + x * sc, Y = y => H - padB - y * sc;
        // sareta
        for (let x = 0; x <= XM; x += 10) { line(ctx, X(x), Y(0), X(x), Y(YM), C.grid, 1); if (x % 20 === 0) text(ctx, x + '', X(x), H - 8, { align: 'center', size: 10 }); }
        for (let y = 0; y <= YM; y += 10) { line(ctx, X(0), Y(y), X(XM), Y(y), C.grid, 1); if (y % 20 === 0) text(ctx, y + '', padL - 6, Y(y) + 4, { align: 'right', size: 10 }); }
        text(ctx, 'x (m)', W - 40, H - 8, { size: 10 }); text(ctx, 'y (m)', 4, 12, { size: 10 });
        line(ctx, X(0), Y(0), X(XM), Y(0), C.ink, 1.5);
        const tr = s.tr, tt = Math.min(s.t, tr.tf);
        // aurreikusitako ibilbidea
        ctx.save(); ctx.strokeStyle = C.muted; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 5]); ctx.lineWidth = 1.2; ctx.beginPath();
        for (let i = 0; i <= 80; i++) { const t = tr.tf * i / 80; const x = tr.vx * t, y = tr.h0 + tr.vy * t - G * t * t / 2; i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
        ctx.stroke(); ctx.restore();
        ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2.2; ctx.beginPath();
        for (let i = 0; i <= 60; i++) { const t = tt * i / 60; const x = tr.vx * t, y = tr.h0 + tr.vy * t - G * t * t / 2; i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
        ctx.stroke(); ctx.restore();
        if (tr.h0 > 0) { ctx.fillStyle = C.line; ctx.fillRect(X(0) - 8, Y(tr.h0), 8, tr.h0 * sc); }
        // altuera maximoa
        const xt = tr.vx * tr.vy / G;
        line(ctx, X(xt), Y(0), X(xt), Y(tr.hmax), C.muted, 1, [2, 4]);
        text(ctx, `h_max = ${fmt(tr.hmax, 1)} m`, X(xt) + 5, Y(tr.hmax) - 8, { size: 10 });
        const x = tr.vx * tt, y = tr.h0 + tr.vy * tt - G * tt * tt / 2, vy = tr.vy - G * tt, vx = tr.vx;
        const px = X(x), py = Y(y), kv = sc * 1.0;
        if (s.p.comp) {
          arrow(ctx, px, py, px + vx * kv, py, C.v, 'vₓ', { dash: [4, 3], w: 1.6, size: 13 });
          arrow(ctx, px, py, px, py - vy * kv, C.v, 'v_y', { dash: [4, 3], w: 1.6, size: 13 });
        }
        arrow(ctx, px, py, px + vx * kv, py - vy * kv, C.v, 'v');
        arrow(ctx, px, py, px, py + G * kv * 1.2, C.a, 'g', { lx: 10 });
        if (s.p.intr) {
          const vm = Math.hypot(vx, vy) || 1, tx = vx / vm, ty = vy / vm;
          const at = -G * ty, an = G * tx; // a = (0,-g)
          const ka = kv * 1.2;
          arrow(ctx, px, py, px + tx * at * ka, py - ty * at * ka, C.at, 'aₜ', { w: 2 });
          // normal unitarioa ibilbidearen konkabitatera (beherantz)
          const nx = ty, ny = -tx;
          arrow(ctx, px, py, px + nx * an * ka, py - ny * an * ka, C.an, 'aₙ', { w: 2 });
        }
        dot(ctx, px, py, 6, C.ink);
        if (s.t >= tr.tf) text(ctx, `irismena: ${fmt(tr.xr, 1)} m`, X(tr.xr) - 4, Y(0) - 10, { align: 'right', col: C.ink, size: 11 });
      },
      readouts: s => {
        const tr = s.tr, tt = Math.min(s.t, tr.tf), vy = tr.vy - G * tt, vm = Math.hypot(tr.vx, vy);
        return [['t', fmt(tt) + ' s'], ['vₓ', fmt(tr.vx) + ' m/s'], ['v_y', fmt(vy) + ' m/s'],
          ['ρ = v³/(g·vₓ)', fmt(vm ** 3 / (G * tr.vx), 1) + ' m'], ['t_hegaldi', fmt(tr.tf) + ' s'], ['x_max', fmt(tr.xr, 1) + ' m']];
      }
    });
  }

  // 1d. Higidura erlatiboa: ibaia zeharkatzen duen txalupa
  function simIbaia(el) {
    const D = 100;
    createSim(el, {
      label: 'Higidura erlatiboa: ibaia zeharkatzen duen txalupa',
      aspect: w => (w < 520 ? 0.85 : 0.55),
      controls: [
        { id: 'vb', label: "|v′| txalupa/ura", min: 1, max: 6, step: 0.1, value: 3, unit: 'm/s' },
        { id: 'ph', label: 'φ (norabidea)', min: 30, max: 150, step: 1, value: 90, unit: '°', dec: 0 },
        { id: 'vr', label: '|V| ura/lurra', min: 0, max: 4, step: 0.1, value: 1.5, unit: 'm/s' }
      ],
      init(s) { s.pause = 0; },
      step(s, dt) {
        s.t += dt * 7; // denbora azkartua
        const tc = D / (s.p.vb * Math.sin(s.p.ph * Math.PI / 180));
        if (s.t > tc) { s.pause += dt; if (s.pause > 1.2) { s.t = 0; s.pause = 0; } }
      },
      draw(s, ctx, W, H) {
        const ph = s.p.ph * Math.PI / 180, vb = s.p.vb, vr = s.p.vr;
        const vx = vr + vb * Math.cos(ph), vy = vb * Math.sin(ph), tc = D / vy;
        const top = 34, bot = H - 34, sc = (bot - top) / D;
        const x0 = W * 0.3;
        ctx.fillStyle = C.water; ctx.fillRect(0, top, W, bot - top);
        // ur-lerroak korrontearekin
        for (let i = 0; i < 9; i++) {
          const yy = top + (i + 0.5) * (bot - top) / 9;
          const off = ((s.t * vr * sc * 0.7 + i * 47) % 80);
          for (let xx = -80 + off; xx < W; xx += 80) line(ctx, xx, yy, xx + 22, yy, C.surface, 1.4);
        }
        line(ctx, 0, top, W, top, C.ink, 2); line(ctx, 0, bot, W, bot, C.ink, 2);
        text(ctx, 'Ertza B', 8, top - 10, { size: 11 }); text(ctx, 'Ertza A', 8, bot + 20, { size: 11 });
        const tt = Math.min(s.t, tc);
        const bx = x0 + vx * tt * sc, by = bot - vy * tt * sc;
        line(ctx, x0, bot, x0 + vx * tc * sc, top, C.a, 1.2, [4, 4]);
        line(ctx, x0, bot, x0, top, C.muted, 1, [2, 5]);
        // txalupa
        ctx.save(); ctx.translate(bx, by); ctx.rotate(-ph + Math.PI / 2);
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.restore();
        const k = 15;
        arrow(ctx, bx, by, bx + vb * Math.cos(ph) * k, by - vy * k, C.v, "v′");
        arrow(ctx, bx + vb * Math.cos(ph) * k, by - vy * k, bx + vx * k, by - vy * k, C.f, 'V', { w: 2 });
        arrow(ctx, bx, by, bx + vx * k, by - vy * k, C.a, 'v', { lx: 6 });
        text(ctx, `deriba = ${fmt(vx * tc, 1)} m`, x0 + vx * tc * sc, top - 10, { align: 'center', col: C.a, size: 11 });
        text(ctx, 'd = 100 m', W - 10, (top + bot) / 2, { align: 'right', size: 11 });
      },
      readouts: s => {
        const ph = s.p.ph * Math.PI / 180, vb = s.p.vb, vr = s.p.vr;
        const vx = vr + vb * Math.cos(ph), vy = vb * Math.sin(ph);
        const zuz = vr < vb ? (180 - Math.acos(vr / vb) * 180 / Math.PI).toFixed(0) + '°' : 'ezinezkoa';
        return [['|v| = |v′ + V|', fmt(Math.hypot(vx, vy)) + ' m/s'], ['t = d/v′_y', fmt(D / vy, 1) + ' s'],
          ['deriba x', fmt(vx * D / vy, 1) + ' m'], ['φ zuzen zeharkatzeko', zuz]];
      }
    });
  }

  /* ======================================================================
     2. GAIA — MEKANIKAREN OINARRIAK
     ====================================================================== */

  // 2a. Plano inklinatua marruskadurarekin
  function simPlanoa(el) {
    createSim(el, {
      label: 'Plano inklinatua: gorputz askearen diagrama eta marruskadura',
      aspect: w => (w < 520 ? 0.8 : 0.55),
      controls: [
        { id: 'th', label: 'θ', min: 0, max: 60, step: 1, value: 30, unit: '°', dec: 0 },
        { id: 'ms', label: 'μₑ (estatikoa)', min: 0, max: 1, step: 0.01, value: 0.5, unit: '', dec: 2 },
        { id: 'mk', label: 'μ_z (zinetikoa)', min: 0, max: 1, step: 0.01, value: 0.3, unit: '', dec: 2 },
        { id: 'm', label: 'm', min: 1, max: 10, step: 0.5, value: 2, unit: 'kg' }
      ],
      toggles: [{ id: 'cmp', label: 'Pisuaren osagaiak', value: true }],
      init(s) { s.x = 0; s.v = 0; s.pause = 0; },
      onChange(s) { s.x = 0; s.v = 0; s.pause = 0; },
      step(s, dt) {
        const th = s.p.th * Math.PI / 180;
        const slides = Math.tan(th) > s.p.ms + 1e-9 || s.v > 0;
        if (slides) {
          const a = G * (Math.sin(th) - s.p.mk * Math.cos(th));
          s.v = Math.max(0, s.v + a * dt); s.x += s.v * dt;
          if (s.x > 1 || (s.v === 0 && a <= 0 && s.x > 0)) { s.pause += dt; if (s.pause > 1) { s.x = 0; s.v = 0; s.pause = 0; } }
        }
      },
      draw(s, ctx, W, H) {
        const th = s.p.th * Math.PI / 180, m = s.p.m, ms = s.p.ms, mk = s.p.mk;
        const L = Math.min(W * 0.78, (H - 40) / Math.max(Math.sin(th), 0.25) * 0.9);
        const ox = W * 0.1, oy = H - 24; // oinarriaren ezkerreko erpina
        const tx = ox + L * Math.cos(th), ty = oy - L * Math.sin(th);
        ctx.fillStyle = C.line; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, oy); ctx.lineTo(tx, ty); ctx.closePath();
        ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
        line(ctx, ox, oy, tx, ty, C.ink, 2); line(ctx, 0, oy, W, oy, C.ink, 1.5);
        ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(ox, oy, 34, -th, 0); ctx.stroke(); ctx.restore();
        text(ctx, 'θ', ox + 42 * Math.cos(th / 2), oy - 42 * Math.sin(th / 2) + 5, { col: C.accent, serif: true, size: 15 });
        // blokea (goitik behera irristatzen)
        const sAlong = (0.82 - 0.62 * Math.min(s.x, 1)) * L;
        const cx = ox + sAlong * Math.cos(th), cy = oy - sAlong * Math.sin(th);
        const bs = 34;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-th);
        ctx.fillStyle = C.surface; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        ctx.fillRect(-bs / 2, -bs, bs, bs); ctx.strokeRect(-bs / 2, -bs, bs, bs);
        ctx.restore();
        const gx = cx - Math.sin(th) * bs / 2, gy = cy - Math.cos(th) * bs / 2; // zentroa
        const kf = 2.2 * Math.min(1, 4 / m) ; // px/N
        const P = m * G, Nn = P * Math.cos(th);
        const slides = Math.tan(th) > ms + 1e-9 || s.v > 0;
        const Fr = slides ? mk * Nn : P * Math.sin(th);
        arrow(ctx, gx, gy, gx, gy + P * kf, C.f, 'mg', { lx: 12 });
        arrow(ctx, gx, gy, gx - Math.sin(th) * Nn * kf, gy - Math.cos(th) * Nn * kf, C.v, 'N');
        arrow(ctx, cx, cy, cx + Math.cos(th) * Fr * kf, cy - Math.sin(th) * Fr * kf, C.a, 'Fᵣ', { ly: -8 });
        if (s.p.cmp) {
          arrow(ctx, gx, gy, gx - Math.cos(th) * P * Math.sin(th) * kf, gy + Math.sin(th) * P * Math.sin(th) * kf, C.f, 'mg sinθ', { dash: [4, 3], w: 1.4, size: 12, ly: 8 });
          arrow(ctx, gx, gy, gx + Math.sin(th) * Nn * kf, gy + Math.cos(th) * Nn * kf, C.f, 'mg cosθ', { dash: [4, 3], w: 1.4, size: 12, lx: 28 });
        }
        text(ctx, slides ? 'IRRISTATZEN' : 'GELDI (marruskadura estatikoa)', W - 12, 20, { align: 'right', col: slides ? C.a : C.at, weight: 700, size: 12 });
      },
      readouts: s => {
        const th = s.p.th * Math.PI / 180, m = s.p.m, P = m * G, Nn = P * Math.cos(th);
        const slides = Math.tan(th) > s.p.ms + 1e-9 || s.v > 0;
        const a = slides ? Math.max(0, G * (Math.sin(th) - s.p.mk * Math.cos(th))) : 0;
        return [['N = mg cosθ', fmt(Nn, 1) + ' N'], ['mg sinθ', fmt(P * Math.sin(th), 1) + ' N'],
          ['Fᵣ', fmt(slides ? s.p.mk * Nn : P * Math.sin(th), 1) + ' N' + (slides ? ' (μ_z N)' : ' (≤ μₑN)')],
          ['a', fmt(a) + ' m/s²'], ['θ_kritikoa = atan μₑ', fmt(Math.atan(s.p.ms) * 180 / Math.PI, 1) + '°']];
      }
    });
  }

  // 2b. Bagoi azeleratuko pendulua — inertzia-indarrak
  function simBagoia(el) {
    const L = 1;
    createSim(el, {
      label: 'Pendulua bagoi azeleratu batean: sistema inertziala eta ez-inertziala',
      aspect: w => (w < 520 ? 0.85 : 0.5),
      controls: [{ id: 'a', label: 'a (bagoia)', min: -6, max: 6, step: 0.1, value: 3, unit: 'm/s²' }],
      selects: [{ id: 'view', value: 'ez', reset: false, options: [['in', 'Behatzaile inertziala (lurra)'], ['ez', 'Behatzaile ez-inertziala (bagoia)']] }],
      onChange() {},
      init(s) { s.th = 0; s.om = 0; s.vel = 0; s.off = 0; },
      step(s, dt) {
        const a = s.p.a, n = 10, h = dt / n;
        for (let i = 0; i < n; i++) {
          const al = -(G * Math.sin(s.th) + a * Math.cos(s.th)) / L - 0.9 * s.om;
          s.om += al * h; s.th += s.om * h;
        }
        s.vel += a * dt; if (Math.abs(s.vel) > 30) s.vel = 0;
        s.off = (s.off + s.vel * dt * 40) % 60;
      },
      draw(s, ctx, W, H) {
        const a = s.p.a, inert = s.p.view === 'in';
        const gy = H - 30, wx = W / 2, ww = Math.min(W * 0.62, 380), wh = Math.min(H * 0.62, 230);
        // lurra
        line(ctx, 0, gy, W, gy, C.ink, 2);
        for (let x = -60 - s.off; x < W + 60; x += 60) line(ctx, x, gy + 4, x - 12, gy + 14, C.muted, 1.2);
        const left = wx - ww / 2, topY = gy - 16 - wh;
        ctx.fillStyle = C.surface; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        ctx.fillRect(left, topY, ww, wh); ctx.strokeRect(left, topY, ww, wh);
        [0.22, 0.78].forEach(f => { dot(ctx, left + ww * f, gy - 9, 9, C.ink); dot(ctx, left + ww * f, gy - 9, 3, C.surface); });
        // bagoiaren azelerazioa
        arrow(ctx, wx - 40, topY - 14, wx - 40 + a * 14, topY - 14, C.a, a ? 'A' : '', { lx: 8 });
        const px = wx, py = topY + 10, Lp = wh * 0.62;
        const bx = px + Lp * Math.sin(s.th), by = py + Lp * Math.cos(s.th);
        hatch(ctx, px - 24, py, px + 24, py, C.ink);
        // oreka-angelua
        const te = Math.atan2(-a, G);
        line(ctx, px, py, px, py + Lp + 16, C.muted, 1, [2, 4]);
        line(ctx, px, py, px + (Lp + 16) * Math.sin(te), py + (Lp + 16) * Math.cos(te), C.accent, 1, [5, 4]);
        line(ctx, px, py, bx, by, C.ink, 1.6);
        const k = 5.2, m = 1;
        const Tm = m * (G * Math.cos(s.th) - a * Math.sin(s.th)) + m * L * s.om * s.om;
        arrow(ctx, bx, by, bx + (px - bx) / Lp * Tm * k, by + (py - by) / Lp * Tm * k, C.v, 'T');
        arrow(ctx, bx, by, bx, by + m * G * k, C.f, 'mg', { lx: 14 });
        if (!inert) arrow(ctx, bx, by, bx - m * a * k, by, C.an, '−mA', { ly: -10 });
        else arrow(ctx, bx, by, bx + m * a * k, by, C.a, 'ΣF = mA', { dash: [4, 3], w: 1.8, ly: -10 });
        dot(ctx, bx, by, 9, C.ink);
        text(ctx, inert ? 'ΣF = T + mg = mA  →  bolak bagoiarekin azeleratzen da'
          : 'T + mg + (−mA) = 0  →  oreka bagoiarekiko', 12, 18, { col: C.ink, size: 11 });
      },
      readouts: s => {
        const a = s.p.a; return [['θ_oreka = atan(A/g)', fmt(Math.atan(Math.abs(a) / G) * 180 / Math.PI, 1) + '°'],
          ['θ (orain)', fmt(Math.abs(s.th) * 180 / Math.PI, 1) + '°'], ['T_oreka = m√(g²+A²)', fmt(Math.hypot(G, a), 2) + ' N (m=1)'],
          ['F_inertzia = −mA', fmt(-a, 1) + ' N']];
      }
    });
  }

  // 2c. Plataforma biragarria — Coriolis
  function simCoriolis(el) {
    const R = 1;
    createSim(el, {
      label: 'Plataforma biragarria: ibilbidea sistema inertzialetik eta biratzen ari den sistematik',
      aspect: w => (w < 560 ? 1.6 : 0.5), maxH: 760,
      controls: [
        { id: 'w', label: 'ω (plataforma)', min: -3, max: 3, step: 0.1, value: 1.5, unit: 'rad/s' },
        { id: 'v', label: "v (jaurtiketa)", min: 0.3, max: 1.5, step: 0.05, value: 0.6, unit: 'm/s', dec: 2 }
      ],
      init(s) { s.ang = 0; s.pause = 0; },
      onChange(s) { s.t = 0; s.pause = 0; },
      step(s, dt) {
        s.ang += s.p.w * dt;
        if (s.t * s.p.v > R) { s.pause += dt; if (s.pause > 1) { s.t = 0; s.pause = 0; } }
      },
      draw(s, ctx, W, H) {
        const stack = W < 560;
        const pw = stack ? W : W / 2, ph = stack ? H / 2 : H;
        const r = Math.min(pw, ph) * 0.36;
        const tt = Math.min(s.t, R / s.p.v), w = s.p.w, v = s.p.v;
        const panels = [
          { cx: pw / 2, cy: ph / 2 + 8, title: 'Inertzia-sistema (kanpotik)', rot: s.ang, inertial: true },
          { cx: stack ? pw / 2 : pw * 1.5, cy: stack ? ph * 1.5 + 8 : ph / 2 + 8, title: "Sistema biragarria (plataforman)", rot: 0, inertial: false }
        ];
        panels.forEach(P => {
          text(ctx, P.title, P.cx, P.cy - r - 22, { align: 'center', col: C.ink, weight: 600, size: 12 });
          ctx.save(); ctx.fillStyle = C.surface; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(P.cx, P.cy, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
          for (let i = 0; i < 8; i++) {
            const a = P.rot + i * Math.PI / 4;
            line(ctx, P.cx, P.cy, P.cx + r * Math.cos(a), P.cy - r * Math.sin(a), C.line, 1);
          }
          // ibilbidea
          ctx.save(); ctx.strokeStyle = C.a; ctx.lineWidth = 2; ctx.beginPath();
          const N = 60;
          for (let i = 0; i <= N; i++) {
            const t = tt * i / N, rr = v * t, ph2 = P.inertial ? 0 : -w * t;
            const x = P.cx + rr * r * Math.cos(ph2), y = P.cy - rr * r * Math.sin(ph2);
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke(); ctx.restore();
          const rr = v * tt, ph2 = P.inertial ? 0 : -w * tt;
          const bx = P.cx + rr * r * Math.cos(ph2), by = P.cy - rr * r * Math.sin(ph2);
          if (!P.inertial && tt > 0.02) {
            // v' = (v, −ω r) koordenatu polarretan; Coriolis = −2 ω × v'
            const er = [Math.cos(ph2), Math.sin(ph2)], ep = [-Math.sin(ph2), Math.cos(ph2)];
            const vr_ = v, vp = -w * rr;
            const vpx = vr_ * er[0] + vp * ep[0], vpy = vr_ * er[1] + vp * ep[1];
            // −2 ω k × v' = −2ω(−vpy, vpx) = (2ω vpy, −2ω vpx)
            const cx_ = 2 * w * vpy, cy_ = -2 * w * vpx;
            const k = r * 0.12;
            arrow(ctx, bx, by, bx + cx_ * k, by - cy_ * k, C.an, 'F_Cor/m', { w: 2, size: 12 });
            arrow(ctx, bx, by, bx + w * w * rr * er[0] * k, by - w * w * rr * er[1] * k, C.f, 'F_zf/m', { w: 2, size: 12, ly: 10 });
          }
          dot(ctx, bx, by, 6, C.ink);
          dot(ctx, P.cx, P.cy, 3, C.muted);
        });
      },
      readouts: s => {
        const tt = Math.min(s.t, R / s.p.v), rr = s.p.v * tt, w = s.p.w;
        const vp = Math.hypot(s.p.v, w * rr);
        return [['r′', fmt(rr) + ' m'], ["|v′|", fmt(vp) + ' m/s'], ['a_Cor = 2ω|v′|', fmt(2 * Math.abs(w) * vp) + ' m/s²'], ['a_zf = ω²r′', fmt(w * w * rr) + ' m/s²']];
      }
    });
  }

  /* ======================================================================
     3. GAIA — DINAMIKA OROKORRA
     ====================================================================== */

  // 3a. Energia potentzialaren kurba eta itzulera-puntuak
  function simEnergia(el) {
    const U = x => 1.2 * (x * x - 1) ** 2 + 0.4 * x;
    const dU = x => 4.8 * x * (x * x - 1) + 0.4;
    const XR = 1.85, YLO = -0.9, YHI = 3.6;
    createSim(el, {
      label: 'Energia potentzialaren kurba: energia mekanikoaren kontserbazioa eta itzulera-puntuak',
      aspect: w => (w < 520 ? 0.85 : 0.5),
      controls: [{ id: 'x0', label: 'x₀ (pausagunetik askatu)', min: -1.75, max: 1.75, step: 0.01, value: -1.6, unit: 'm', dec: 2 }],
      toggles: [{ id: 'fr', label: 'Marruskadura (indar ez-kontserbakorra)', value: false, reset: true }],
      init(s) { s.x = s.p.x0; s.v = 0; s.E0 = U(s.x); },
      step(s, dt) {
        const n = 20, h = dt / n, c = s.p.fr ? 0.35 : 0;
        for (let i = 0; i < n; i++) {
          const a1 = -dU(s.x) - c * s.v;
          const vh = s.v + a1 * h / 2; s.x += vh * h;
          const a2 = -dU(s.x) - c * vh; s.v = vh + a2 * h / 2;
        }
      },
      draw(s, ctx, W, H) {
        const barW = W < 520 ? 90 : 130;
        const pw = W - barW - 20, pl = 36, pt = 14, pb = 26;
        const X = x => pl + (x + XR) / (2 * XR) * (pw - pl), Y = y => pt + (YHI - y) / (YHI - YLO) * (H - pt - pb);
        line(ctx, pl, Y(0), pw, Y(0), C.line, 1);
        line(ctx, X(0), pt, X(0), H - pb, C.line, 1);
        text(ctx, 'x', pw - 8, Y(0) - 6, { serif: true, size: 13 }); text(ctx, 'U(x)', X(0) + 6, pt + 10, { serif: true, size: 13 });
        const E = U(s.x) + s.v * s.v / 2;
        // debekatutako eskualdeak (U > E)
        ctx.save(); ctx.fillStyle = C.a; ctx.globalAlpha = 0.08;
        for (let i = 0; i < 200; i++) { const x = -XR + 2 * XR * i / 200; if (U(x) > E) ctx.fillRect(X(x), pt, (pw - pl) / 200 + 1, H - pt - pb); }
        ctx.restore();
        ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; ctx.beginPath();
        for (let i = 0; i <= 240; i++) { const x = -XR + 2 * XR * i / 240; const y = Math.min(U(x), YHI + 1); i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
        ctx.stroke(); ctx.restore();
        line(ctx, pl, Y(E), pw, Y(E), C.accent, 1.5, [6, 4]);
        text(ctx, 'E', pl + 4, Y(E) - 5, { col: C.accent, serif: true, size: 14, weight: 700 });
        // itzulera-puntuak
        let prev = U(-XR) - E;
        for (let i = 1; i <= 400; i++) {
          const x = -XR + 2 * XR * i / 400, cur = U(x) - E;
          if (prev * cur < 0) { dot(ctx, X(x), Y(E), 4, C.surface, C.accent); }
          prev = cur;
        }
        // partikula
        line(ctx, X(s.x), Y(U(s.x)), X(s.x), Y(E), C.at, 3);
        dot(ctx, X(s.x), Y(U(s.x)), 8, C.ink);
        arrow(ctx, X(s.x), Y(U(s.x)) - 16, X(s.x) - dU(s.x) * 14, Y(U(s.x)) - 16, C.f, 'F = −dU/dx', { size: 11, ly: -10 });
        // barrak
        const bx = W - barW - 4, bw = (barW - 24) / 3, base = Y(0);
        [['E_z', s.v * s.v / 2, C.at], ['E_p', U(s.x), C.f], ['E', E, C.accent]].forEach(([n, val, col], i) => {
          const x = bx + i * (bw + 8), y = Y(Math.max(Math.min(val, YHI), YLO));
          ctx.fillStyle = col; ctx.fillRect(x, Math.min(base, y), bw, Math.abs(base - y));
          text(ctx, n, x + bw / 2, H - 8, { align: 'center', size: 11, col: C.ink });
        });
        line(ctx, bx - 4, base, W - 4, base, C.ink, 1);
        text(ctx, 'E₀', W - 4, Y(s.E0) - 4, { align: 'right', size: 10 });
        line(ctx, bx - 4, Y(s.E0), W - 4, Y(s.E0), C.muted, 1, [2, 3]);
      },
      readouts: s => {
        const Ek = s.v * s.v / 2, Ep = U(s.x);
        return [['x', fmt(s.x) + ' m'], ['v', fmt(s.v) + ' m/s'], ['E_z = ½mv²', fmt(Ek) + ' J'], ['E_p = U(x)', fmt(Ep) + ' J'],
          ['E = E_z + E_p', fmt(Ek + Ep) + ' J'], ['W_ez-kontserb.', fmt(Ek + Ep - s.E0) + ' J']];
      }
    });
  }

  // 3b. Bulkada eta momentu lineala: F(t) grafikoa
  function simBulkada(el) {
    createSim(el, {
      label: 'Bulkada: F(t) kurbaren azpiko azalera = momentu linealaren aldaketa',
      aspect: w => (w < 520 ? 0.8 : 0.45), paused: false,
      controls: [
        { id: 'F', label: 'F_max', min: 50, max: 500, step: 10, value: 300, unit: 'N', dec: 0 },
        { id: 'dt', label: 'Δt (talka)', min: 0.02, max: 0.3, step: 0.01, value: 0.1, unit: 's', dec: 2 },
        { id: 'm', label: 'm', min: 0.2, max: 3, step: 0.1, value: 0.5, unit: 'kg' }
      ],
      init(s) {},
      step(s) { if (s.t > 3.2) s.t = 0; },
      draw(s, ctx, W, H) {
        const Fm = s.p.F, D = s.p.dt, m = s.p.m;
        const F = t => (t > 0 && t < D ? Fm * Math.sin(Math.PI * t / D) : 0);
        const J = 2 * Fm * D / Math.PI;
        const tN = Math.min(s.t / 3, 1) * 0.35; // simulazioaren denbora (s) → 0..0.35 s
        const pl = 44, pr = W - 14, pt = 18, pb = H * 0.55;
        const X = t => pl + t / 0.35 * (pr - pl), Y = f => pb - f / 520 * (pb - pt);
        line(ctx, pl, pb, pr, pb, C.ink, 1.4); line(ctx, pl, pt, pl, pb, C.ink, 1.4);
        text(ctx, 'F (N)', 4, pt + 4, { size: 10 }); text(ctx, 't (s)', pr - 30, pb + 14, { size: 10 });
        for (let f = 100; f <= 500; f += 100) { line(ctx, pl, Y(f), pr, Y(f), C.grid, 1); text(ctx, f + '', pl - 6, Y(f) + 4, { align: 'right', size: 9 }); }
        ctx.save(); ctx.fillStyle = C.at; ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.moveTo(X(0), Y(0));
        const tEnd = Math.min(tN, D);
        for (let i = 0; i <= 60; i++) { const t = tEnd * i / 60; ctx.lineTo(X(t), Y(F(t))); }
        ctx.lineTo(X(tEnd), Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.save(); ctx.strokeStyle = C.f; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 200; i++) { const t = 0.35 * i / 200; i ? ctx.lineTo(X(t), Y(F(t))) : ctx.moveTo(X(t), Y(F(t))); }
        ctx.stroke(); ctx.restore();
        text(ctx, `J = ∫F dt = ${fmt(J, 2)} N·s`, X(D) + 8, Y(Fm * 0.6), { col: C.at, size: 12, weight: 600 });
        // pilota
        const Jt = tN >= D ? J : Fm * D / Math.PI * (1 - Math.cos(Math.PI * tN / D));
        const v = Jt / m, gy = H - 22;
        line(ctx, 0, gy, W, gy, C.ink, 1.5);
        let xb = pl + 20;
        if (tN > D) xb += (tN - D) * v * 40;
        xb = Math.min(xb, W - 20);
        dot(ctx, xb, gy - 12, 12, C.ink);
        if (v > 0) arrow(ctx, xb + 14, gy - 12, xb + 14 + Math.min(v, 30) * 4, gy - 12, C.v, 'v');
        if (F(tN) > 0) arrow(ctx, xb - 60, gy - 12, xb - 14, gy - 12, C.f, 'F', { ly: -10 });
      },
      readouts: s => {
        const J = 2 * s.p.F * s.p.dt / Math.PI;
        return [['J = Δp', fmt(J) + ' N·s'], ['v_f = J/m', fmt(J / s.p.m) + ' m/s'], ['F_batez beste = J/Δt', fmt(J / s.p.dt, 0) + ' N']];
      }
    });
  }

  /* ======================================================================
     4. GAIA — HIGIDURA OSZILAKORRA
     ====================================================================== */

  // 4a. Higidura harmoniko sinplea: malguki horizontala + fasoreak + grafikoak
  function simHHS(el) {
    createSim(el, {
      label: 'Higidura harmoniko sinplea: malgukia, zirkulu erreferentea eta x(t), v(t), a(t) grafikoak',
      // zure apunteen konbentzioa: x = A sin(ω₀t + φ)
      aspect: w => (w < 560 ? 1.25 : 0.6), maxH: 640,
      controls: [
        { id: 'A', label: 'A', min: 0.05, max: 0.3, step: 0.01, value: 0.2, unit: 'm', dec: 2 },
        { id: 'k', label: 'k', min: 5, max: 100, step: 1, value: 20, unit: 'N/m', dec: 0 },
        { id: 'm', label: 'm', min: 0.2, max: 5, step: 0.1, value: 1, unit: 'kg' },
        { id: 'ph', label: 'φ (hasierako fasea)', min: 0, max: 6.28, step: 0.01, value: 0, unit: 'rad', dec: 2 }
      ],
      init(s) {},
      step() {},
      draw(s, ctx, W, H) {
        const A = s.p.A, w = Math.sqrt(s.p.k / s.p.m), ph = s.p.ph, t = s.t;
        const x = A * Math.sin(w * t + ph), v = A * w * Math.cos(w * t + ph);
        const stack = W < 560;
        // goiko zerrenda: malgukia
        const topH = stack ? H * 0.2 : H * 0.3, sc = (W * 0.35) / 0.3, x0 = W * 0.5;
        const gy = topH - 10;
        hatch(ctx, 24, gy - 60, 24, gy, C.ink);
        line(ctx, 24, gy, W - 10, gy, C.ink, 1.5);
        line(ctx, x0, gy - 66, x0, gy + 4, C.muted, 1, [3, 3]);
        text(ctx, 'x = 0', x0, gy + 0 - 68, { align: 'center', size: 10 });
        const bx = x0 + x * sc, bw = 40;
        spring(ctx, 24, gy - 20, bx - bw / 2, gy - 20, 12, 8, C.ink);
        ctx.fillStyle = C.surface; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        ctx.fillRect(bx - bw / 2, gy - 40, bw, 40); ctx.strokeRect(bx - bw / 2, gy - 40, bw, 40);
        arrow(ctx, bx, gy - 48, bx + v * 60, gy - 48, C.v, 'v', { size: 13 });
        arrow(ctx, bx, gy - 20, bx - s.p.k * x * 1.4, gy - 20, C.f, 'F=−kx', { size: 12, ly: 12 });
        // behealdea: fasorea + grafikoak
        const by0 = topH + 14, bh = H - by0 - 8;
        const cr = stack ? Math.min(W * 0.28, bh * 0.16) : Math.min(bh * 0.4, W * 0.14);
        const ccx = stack ? W / 2 : 20 + cr, ccy = stack ? by0 + cr + 4 : by0 + bh / 2;
        ctx.save(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, 7); ctx.stroke(); ctx.restore();
        const ang = w * t + ph - Math.PI / 2, qx = ccx + cr * Math.cos(ang), qy = ccy - cr * Math.sin(ang);
        line(ctx, ccx, ccy, qx, qy, C.accent, 2);
        line(ctx, qx, qy, qx, ccy, C.muted, 1, [2, 3]);
        dot(ctx, qx, qy, 4.5, C.accent); dot(ctx, qx, ccy, 4, C.ink);
        text(ctx, 'ωt+φ', ccx + 6, ccy - 6, { size: 10, col: C.accent });
        // grafikoak
        const gl = stack ? 40 : ccx + cr + 50, gr = W - 12;
        const gt = stack ? ccy + cr + 14 : by0, gh = stack ? (H - gt - 6) : bh;
        const rows = [['x', A, C.ink, tt => A * Math.sin(w * tt + ph)], ['v', A * w, C.v, tt => A * w * Math.cos(w * tt + ph)], ['a', A * w * w, C.a, tt => -A * w * w * Math.sin(w * tt + ph)]];
        const rh = gh / 3, span = 6;
        rows.forEach(([nm, amp, col, f], i) => {
          const cy = gt + rh * i + rh / 2, hh = rh * 0.38;
          line(ctx, gl, cy, gr, cy, C.line, 1);
          text(ctx, nm + '(t)', gl - 6, cy + 4, { align: 'right', col, size: 11, weight: 700 });
          ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath();
          const t0 = Math.max(0, t - span * 0.75);
          for (let j = 0; j <= 160; j++) {
            const tt = t0 + span * j / 160; const px = gl + (gr - gl) * j / 160, py = cy - f(tt) / amp * hh;
            j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.stroke(); ctx.restore();
          const nowx = gl + (gr - gl) * (t - t0) / span;
          line(ctx, nowx, cy - hh - 4, nowx, cy + hh + 4, C.muted, 1, [2, 3]);
          dot(ctx, nowx, cy - f(t) / amp * hh, 3.5, col);
        });
      },
      readouts: s => {
        const A = s.p.A, k = s.p.k, m = s.p.m, w = Math.sqrt(k / m), t = s.t, ph = s.p.ph;
        const x = A * Math.sin(w * t + ph), v = A * w * Math.cos(w * t + ph);
        return [['ω₀ = √(k/m)', fmt(w) + ' rad/s'], ['T = 2π/ω', fmt(2 * Math.PI / w) + ' s'], ['f = 1/T', fmt(w / 2 / Math.PI) + ' Hz'],
          ['x', fmt(x, 3) + ' m'], ['v', fmt(v, 3) + ' m/s'], ['a = −ω²x', fmt(-w * w * x, 2) + ' m/s²'],
          ['E_z = ½mv²', fmt(m * v * v / 2, 3) + ' J'], ['E_p = ½kx²', fmt(k * x * x / 2, 3) + ' J'], ['E = ½kA²', fmt(k * A * A / 2, 3) + ' J']];
      }
    });
  }

  // 4b. Malguki bertikala
  function simBertikala(el) {
    createSim(el, {
      label: 'Malguki bertikala: oreka-posizioa eta oszilazioa haren inguruan',
      aspect: w => (w < 520 ? 1.05 : 0.62), maxH: 560,
      controls: [
        { id: 'm', label: 'm', min: 0.2, max: 2, step: 0.05, value: 0.8, unit: 'kg', dec: 2 },
        { id: 'k', label: 'k', min: 20, max: 200, step: 1, value: 40, unit: 'N/m', dec: 0 },
        { id: 'A', label: 'A', min: 0, max: 0.15, step: 0.01, value: 0.1, unit: 'm', dec: 2 }
      ],
      init(s) {},
      step() {},
      draw(s, ctx, W, H) {
        const m = s.p.m, k = s.p.k, A = s.p.A, w = Math.sqrt(k / m);
        const dl = m * G / k, y = A * Math.cos(w * s.t); // y beherantz positiboa, orekatik
        const l0 = 0.35, top = 22, sc = (H - top - 70) / (l0 + 2 * 9.81 / 20 * 0.55 + 0.15);
        const cx = W < 520 ? W * 0.36 : W * 0.3;
        hatch(ctx, cx - 50, top, cx + 50, top, C.ink);
        const yL0 = top + l0 * sc, yEq = yL0 + dl * sc, yB = yEq + y * sc;
        spring(ctx, cx, top, cx, yB, 14, 11, C.ink);
        const bs = 44;
        ctx.fillStyle = C.surface; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        ctx.fillRect(cx - bs / 2, yB, bs, bs); ctx.strokeRect(cx - bs / 2, yB, bs, bs);
        text(ctx, 'm', cx, yB + bs / 2 + 5, { align: 'center', serif: true, size: 15, col: C.ink });
        const rx = cx + 70;
        line(ctx, cx - 60, yL0, rx + 120, yL0, C.muted, 1, [4, 4]);
        text(ctx, 'l₀ (luzera naturala)', rx + 10, yL0 - 5, { size: 10 });
        line(ctx, cx - 60, yEq, rx + 120, yEq, C.accent, 1.2, [6, 3]);
        text(ctx, 'oreka: kΔl = mg', rx + 10, yEq - 5, { size: 10, col: C.accent });
        // Δl kota
        arrow(ctx, rx, yL0, rx, yEq, C.accent, '', { w: 1.2 }); arrow(ctx, rx, yEq, rx, yL0, C.accent, '', { w: 1.2 });
        text(ctx, 'Δl', rx - 6, (yL0 + yEq) / 2 + 4, { align: 'right', col: C.accent, serif: true, size: 13 });
        if (A > 0) {
          ctx.save(); ctx.fillStyle = C.accent; ctx.globalAlpha = 0.1; ctx.fillRect(cx - 70, yEq - A * sc, 140, 2 * A * sc + bs); ctx.restore();
        }
        const kf = 1.6;
        const Fs = k * (dl + y);
        arrow(ctx, cx + bs / 2 + 10, yB + bs / 2, cx + bs / 2 + 10, yB + bs / 2 - Fs * kf, C.v, 'k(Δl+y)', { size: 12, lx: 30 });
        arrow(ctx, cx - bs / 2 - 10, yB + bs / 2, cx - bs / 2 - 10, yB + bs / 2 + m * G * kf, C.f, 'mg', { size: 13, lx: -14 });
        // y(t) grafikoa eskuinean
        if (W >= 520) {
          const gl = W * 0.62, gr = W - 12, gc = yEq + bs / 2;
          line(ctx, gl, gc, gr, gc, C.line, 1); text(ctx, 'y(t)', gl, top + 14, { size: 11, col: C.ink });
          ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath();
          for (let j = 0; j <= 120; j++) {
            const tt = s.t - 4 + 4 * j / 120; const py = gc + A * Math.cos(w * Math.max(tt, 0)) * sc * (tt < 0 ? 0 : 1);
            const px = gl + (gr - gl) * j / 120; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.stroke(); ctx.restore();
        }
      },
      readouts: s => {
        const m = s.p.m, k = s.p.k, w = Math.sqrt(k / m), y = s.p.A * Math.cos(w * s.t);
        return [['Δl = mg/k', fmt(m * G / k, 3) + ' m'], ['ω = √(k/m)', fmt(w) + ' rad/s'], ['T = 2π√(m/k)', fmt(2 * Math.PI / w) + ' s'],
          ['y (orekatik)', fmt(y, 3) + ' m'], ['ΣF = −ky', fmt(-k * y, 2) + ' N']];
      }
    });
  }

  // 4c. Pendulu sinplea: zehatza vs angelu txikiak
  function simPendulua(el) {
    createSim(el, {
      label: 'Pendulu sinplea: higidura zehatza eta angelu txikiko hurbilketa',
      aspect: w => (w < 520 ? 1.1 : 0.55), maxH: 560,
      controls: [
        { id: 'L', label: 'L', min: 0.2, max: 2, step: 0.05, value: 1, unit: 'm', dec: 2 },
        { id: 'th0', label: 'φ₀', min: 5, max: 85, step: 1, value: 40, unit: '°', dec: 0 }
      ],
      toggles: [{ id: 'lin', label: 'Angelu txikiko hurbilketa (itzala)', value: true }, { id: 'frc', label: 'Indarrak', value: true }],
      init(s) { s.th = s.p.th0 * Math.PI / 180; s.om = 0; },
      step(s, dt) {
        const L = s.p.L, n = 20, h = dt / n;
        for (let i = 0; i < n; i++) {
          const f = (th) => -(G / L) * Math.sin(th);
          const k1t = s.om, k1o = f(s.th);
          const k2t = s.om + k1o * h / 2, k2o = f(s.th + k1t * h / 2);
          const k3t = s.om + k2o * h / 2, k3o = f(s.th + k2t * h / 2);
          const k4t = s.om + k3o * h, k4o = f(s.th + k3t * h);
          s.th += h / 6 * (k1t + 2 * k2t + 2 * k3t + k4t); s.om += h / 6 * (k1o + 2 * k2o + 2 * k3o + k4o);
        }
      },
      draw(s, ctx, W, H) {
        const L = s.p.L, th0 = s.p.th0 * Math.PI / 180, stack = W < 520;
        const pw = stack ? W : W * 0.5;
        const px = pw / 2, py = 26, Lp = Math.min((stack ? H * 0.55 : H - 60) - 30, pw * 0.8) * (L / 2) ** 0.35 * 0.95;
        hatch(ctx, px - 40, py, px + 40, py, C.ink);
        line(ctx, px, py, px, py + Lp + 20, C.muted, 1, [2, 4]);
        if (s.p.lin) {
          const tl = th0 * Math.cos(Math.sqrt(G / L) * s.t);
          const lx = px + Lp * Math.sin(tl), ly = py + Lp * Math.cos(tl);
          ctx.save(); ctx.globalAlpha = 0.35; line(ctx, px, py, lx, ly, C.accent, 1.4); dot(ctx, lx, ly, 11, C.accent); ctx.restore();
        }
        const bx = px + Lp * Math.sin(s.th), by = py + Lp * Math.cos(s.th);
        line(ctx, px, py, bx, by, C.ink, 1.6);
        ctx.save(); ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, 30, Math.PI / 2, Math.PI / 2 - s.th, s.th > 0); ctx.stroke(); ctx.restore();
        text(ctx, 'φ', px + 38 * Math.sin(s.th / 2), py + 38 * Math.cos(s.th / 2) + 4, { serif: true, size: 14, col: C.ink, align: 'center' });
        if (s.p.frc) {
          const k = 4.2, m = 1;
          const Tm = m * G * Math.cos(s.th) + m * L * s.om * s.om;
          arrow(ctx, bx, by, bx + (px - bx) / Lp * Tm * k, by + (py - by) / Lp * Tm * k, C.v, 'T');
          arrow(ctx, bx, by, bx, by + m * G * k, C.f, 'mg', { lx: 14 });
          const ft = -m * G * Math.sin(s.th);
          arrow(ctx, bx, by, bx + Math.cos(s.th) * ft * k, by - Math.sin(s.th) * ft * k, C.at, '−mg sinφ', { size: 12, dash: [4, 3], w: 1.8, ly: 12 });
        }
        dot(ctx, bx, by, 11, C.ink);
        // θ(t) grafikoa
        const gl = stack ? 30 : W * 0.56, gr = W - 12, gt = stack ? H * 0.62 : 30, gb = H - 16, gc = (gt + gb) / 2, hh = (gb - gt) / 2 - 6;
        line(ctx, gl, gc, gr, gc, C.line, 1); text(ctx, 'φ(t)', gl, gt + 2, { size: 11, col: C.ink });
        if (!s.hist || s.t < 0.03) s.hist = [];
        s.hist.push([s.t, s.th]); if (s.hist.length > 900) s.hist.shift();
        const span = 8, t0 = Math.max(0, s.t - span);
        ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.beginPath();
        s.hist.forEach(([tt, th], i) => { if (tt < t0) return; const x = gl + (gr - gl) * (tt - t0) / span, y = gc - th / th0 * hh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke(); ctx.restore();
        if (s.p.lin) {
          ctx.save(); ctx.strokeStyle = C.accent; ctx.globalAlpha = 0.6; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.beginPath();
          for (let j = 0; j <= 160; j++) { const tt = t0 + Math.min(span, s.t - t0) * j / 160; const x = gl + (gr - gl) * (tt - t0) / span, y = gc - Math.cos(Math.sqrt(G / L) * tt) * hh; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.stroke(); ctx.restore();
        }
      },
      readouts: s => {
        const L = s.p.L, th0 = s.p.th0 * Math.PI / 180, T0 = 2 * Math.PI * Math.sqrt(L / G);
        const Tex = T0 * (1 + th0 ** 2 / 16 + 11 * th0 ** 4 / 3072 + 173 * th0 ** 6 / 737280);
        return [['T₀ = 2π√(L/g)', fmt(T0, 3) + ' s'], ['T zehatza', fmt(Tex, 3) + ' s'], ['errorea', fmt((Tex - T0) / Tex * 100, 1) + ' %'],
          ['φ', fmt(s.th * 180 / Math.PI, 1) + '°'], ['sin φ₀ vs φ₀', fmt(Math.sin(th0), 3) + ' / ' + fmt(th0, 3)]];
      }
    });
  }

  const REG = {
    intrintsekoak: simIntrinseko, zirkularra: simZirkular, jaurtiketa: simJaurtiketa, ibaia: simIbaia,
    planoa: simPlanoa, bagoia: simBagoia, coriolis: simCoriolis,
    energia: simEnergia, bulkada: simBulkada,
    hhs: simHHS, bertikala: simBertikala, pendulua: simPendulua
  };
  window.initSims = function () {
    refreshColors();
    document.querySelectorAll('[data-sim]').forEach(el => {
      const f = REG[el.dataset.sim]; if (f && !el.dataset.ready) { el.dataset.ready = '1'; f(el); }
    });
    requestAnimationFrame(loop);
  };
})();
