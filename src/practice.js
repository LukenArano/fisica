/* Praktika: aukera anitzeko galderak, kalkulu azkarrak (zenbaki aleatorioak) eta dedukzioak ordenatu */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = window.APPSTORE;
  const typeset = el => window.typesetMath(el);
  const clearMath = el => window.clearMath(el);
  const TOPIC = { 1: 'Zinematika', 2: 'Oinarriak', 3: 'Dinamika', 4: 'Oszilazioak' };
  const KIND = { formula: 'Formula', osatu: 'Osatu formula', kontzeptua: 'Kontzeptua', unitatea: 'Unitateak' };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const G = 9.8;
  const rnd = (a, b, step = 1) => { const n = Math.round((b - a) / step); return +(a + step * Math.floor(Math.random() * (n + 1))).toFixed(6); };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  // nt: testuan (0,25); nf: TeX barruan (0{,}25, komaren ondoren tarterik gabe)
  const nt = x => (Math.abs(x) >= 1000 ? x.toFixed(0) : +x.toPrecision(3) + '').replace('.', ',').replace('-', '−');
  const nf = x => nt(x).replace(',', '{,}');
  const rad = d => d * Math.PI / 180;

  /* ====================== 1. GALDERAK ====================== */
  const QB = window.QBANK || [];
  let stats = store.get('q-stats', {}); // id → {ok, ko}
  let qTopic = 'all', qKind = 'all', qMode = 'mix';
  let deck = [], pos = 0, session = [];
  function qId(i) { return 'q' + i; }
  function buildQDeck() {
    let ids = QB.map((q, i) => i).filter(i => (qTopic === 'all' || String(QB[i].t) === qTopic) && (qKind === 'all' || QB[i].k === qKind));
    if (qMode === 'wrong') ids = ids.filter(i => { const s = stats[qId(i)]; return s && s.last === 0; });
    if (qMode === 'new') ids = ids.filter(i => !stats[qId(i)]);
    deck = shuffle(ids).slice(0, 15);
    pos = 0; session = deck.map(() => null);
    renderQ();
  }
  function renderQ() {
    const card = $('#q-card'); if (!card) return;
    clearMath(card);
    renderDots();
    if (!deck.length) {
      card.removeAttribute('data-t');
      card.innerHTML = `<div class="done-card"><b class="big">Ez dago galderarik</b><p>${qMode === 'wrong' ? 'Ez duzu oker egindako galderarik iragazki honekin. Primeran!' : 'Aldatu iragazkiak.'}</p></div>`;
      return;
    }
    if (pos >= deck.length) {
      const ok = session.filter(x => x === 1).length;
      card.removeAttribute('data-t');
      card.innerHTML = `<div class="done-card"><b class="big">${ok} / ${deck.length}</b><p>${ok === deck.length ? 'Dena ondo! 🎉' : ok >= deck.length * 0.7 ? 'Oso ondo. Errepasatu okerrak.' : 'Jarraitu praktikatzen: okerrak «Okerrak bakarrik» moduan berriro agertuko dira.'}</p><div class="filter-row" style="justify-content:center"><button type="button" class="btn" id="q-again">Beste 15 galdera</button><button type="button" class="btn btn-ghost" id="q-wrong">Okerrak errepasatu</button></div></div>`;
      $('#q-again').onclick = buildQDeck;
      $('#q-wrong').onclick = () => { setMode('wrong'); buildQDeck(); };
      updateStats();
      return;
    }
    const i = deck[pos], q = QB[i];
    // 3–5 aukera: batzuetan distraktore bat kentzen da
    const nd = q.d.length >= 3 && Math.random() < 0.35 ? q.d.length - 1 : q.d.length;
    const opts = shuffle([{ h: q.a, ok: true }, ...shuffle(q.d.slice()).slice(0, nd).map(h => ({ h, ok: false }))]);
    card.setAttribute('data-t', q.t);
    card.innerHTML = `<div class="q-top"><span class="pill">${q.t}. gaia · ${TOPIC[q.t]}</span><span>${KIND[q.k] || ''} · ${pos + 1}/${deck.length}</span></div>
      <div class="q-text">${q.q}</div><div class="opts"></div><div class="explain" hidden></div>
      <div class="q-nav"><span class="score" id="q-score"></span><button type="button" class="btn" id="q-next" hidden>Hurrengoa →</button></div>`;
    const box = $('.opts', card), ex = $('.explain', card);
    opts.forEach((o, j) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt';
      b.innerHTML = `<span class="l">${'ABCDE'[j]}</span><span>${o.h}</span>`;
      b.onclick = () => {
        $$('.opt', box).forEach((x, k) => { x.disabled = true; if (opts[k].ok) x.classList.add('right'); });
        if (!o.ok) b.classList.add('wrong');
        const s = stats[qId(i)] || { ok: 0, ko: 0 };
        if (o.ok) s.ok++; else s.ko++;
        s.last = o.ok ? 1 : 0; stats[qId(i)] = s; store.set('q-stats', stats);
        session[pos] = o.ok ? 1 : 0;
        ex.innerHTML = `<b>${o.ok ? '✓ Zuzena.' : '✗ Ez da zuzena.'}</b> ${q.e}`; ex.hidden = false; typeset(ex);
        $('#q-next').hidden = false; $('#q-next').focus();
        renderDots(); updateStats();
      };
      box.append(b);
    });
    $('#q-next').onclick = () => { pos++; renderQ(); };
    typeset(card);
  }
  function renderDots() {
    const d = $('#q-dots'); if (!d) return;
    d.innerHTML = deck.map((_, k) => `<i class="${session[k] === 1 ? 'ok' : session[k] === 0 ? 'ko' : ''}${k === pos ? ' cur' : ''}"></i>`).join('');
  }
  function setMode(m) { qMode = m; $$('[data-qm]').forEach(b => b.setAttribute('aria-pressed', b.dataset.qm === m ? 'true' : 'false')); }
  $$('[data-qt]').forEach(b => b.addEventListener('click', () => { qTopic = b.dataset.qt; $$('[data-qt]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); buildQDeck(); }));
  $$('[data-qk]').forEach(b => b.addEventListener('click', () => { qKind = b.dataset.qk; $$('[data-qk]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); buildQDeck(); }));
  $$('[data-qm]').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.qm); buildQDeck(); }));
  $('#q-reset-yes')?.addEventListener('click', () => { stats = {}; store.set('q-stats', stats); calcOk = 0; store.set('c-ok', 0); ordDone = {}; store.set('d-done', {}); $('#q-confirm').hidden = true; updateStats(); buildQDeck(); });
  $('#q-reset')?.addEventListener('click', () => { $('#q-confirm').hidden = false; });
  $('#q-reset-no')?.addEventListener('click', () => { $('#q-confirm').hidden = true; });

  /* ====================== 2. KALKULU AZKARRAK ====================== */
  const CALC = [
    { t: 1, gen() { const v0 = rnd(2, 15), a = rnd(1, 5, 0.5), t = rnd(2, 8); return {
      q: R`Auto batek $v_0=${v0}$ m/s darama eta $a=${nf(a)}$ m/s² azelerazioa hartzen du. Zenbat metro egiten ditu $t=${t}$ s-tan?`, ans: v0 * t + 0.5 * a * t * t, unit: 'm',
      sol: R`$x=v_0t+\tfrac12at^2=${v0}\cdot${t}+\tfrac12\cdot${nf(a)}\cdot${t}^2$` }; } },
    { t: 1, gen() { const v = rnd(10, 30), a = rnd(2, 8); return {
      q: R`Auto bat $${v}$ m/s-ra doa eta $${a}$ m/s²-ko dezelerazioz balaztatzen du. Zenbat metrotan gelditzen da?`, ans: v * v / (2 * a), unit: 'm',
      sol: R`$v^2-v_0^2=2a\Delta x$ → $\Delta x=\dfrac{v_0^2}{2a}=\dfrac{${v}^2}{2\cdot${a}}$` }; } },
    { t: 1, gen() { const n = pick([60, 90, 120, 300, 600, 1200]), R0 = rnd(0.1, 0.6, 0.05); const w = n * 2 * Math.PI / 60; return {
      q: R`Gurpil batek $${n}$ bira/min egiten ditu eta $R=${nf(R0)}$ m. Zein da ertzeko puntuaren abiadura lineala?`, ans: w * R0, unit: 'm/s',
      sol: R`$\omega=\dfrac{2\pi\cdot${n}}{60}=${nf(w)}$ rad/s; $v=R\omega$` }; } },
    { t: 1, gen() { const v = rnd(5, 25), R0 = rnd(10, 100, 5); return {
      q: R`Auto bat $${v}$ m/s-ra doa $R=${R0}$ m-ko kurba batean (modulu konstantea). Zein da azelerazio normala?`, ans: v * v / R0, unit: 'm/s²',
      sol: R`$a_n=\dfrac{v^2}{\rho}=\dfrac{${v}^2}{${R0}}$` }; } },
    { t: 1, gen() { const v = rnd(4, 12), rho = rnd(5, 40, 5), at = rnd(1, 4, 0.5); return {
      q: R`Partikula batek $v=${v}$ m/s, $\rho=${rho}$ m eta $a_t=${nf(at)}$ m/s² ditu. Zein da azelerazio osoaren modulua?`, ans: Math.hypot(at, v * v / rho), unit: 'm/s²',
      sol: R`$a_n=v^2/\rho=${nf(v * v / rho)}$; $|a|=\sqrt{a_t^2+a_n^2}$` }; } },
    { t: 1, gen() { const al = rnd(1, 5, 0.5), t = rnd(2, 10); return {
      q: R`Disko bat geldiunetik hasten da $\alpha=${nf(al)}$ rad/s²-rekin. Zenbat bira ematen ditu $${t}$ s-tan?`, ans: 0.5 * al * t * t / (2 * Math.PI), unit: 'bira',
      sol: R`$\Delta\varphi=\tfrac12\alpha t^2=${nf(0.5 * al * t * t)}$ rad; birak $=\Delta\varphi/2\pi$` }; } },
    { t: 1, gen() { const v0 = rnd(10, 30), th = pick([30, 37, 45, 53, 60]); return {
      q: R`Proiektil bat $v_0=${v0}$ m/s eta $\theta=${th}°$-rekin jaurtitzen da lurretik. Zein altuera maximora iristen da? ($g=9{,}8$)`, ans: (v0 * Math.sin(rad(th))) ** 2 / (2 * G), unit: 'm',
      sol: R`Goian $v_y=0$: $h_{max}=\dfrac{(v_0\sin\theta)^2}{2g}$` }; } },
    { t: 1, gen() { const v0 = rnd(10, 30), th = pick([15, 30, 37, 45, 53, 60, 75]); return {
      q: R`Proiektil bat $v_0=${v0}$ m/s eta $\theta=${th}°$-rekin jaurtitzen da lurretik. Zein da irismena? ($g=9{,}8$)`, ans: v0 * v0 * Math.sin(rad(2 * th)) / G, unit: 'm',
      sol: R`$y=0$ → $t=\dfrac{2v_{0y}}{g}$; $x_{max}=v_{0x}t=\dfrac{v_0^2\sin2\theta}{g}$` }; } },
    { t: 1, gen() { const vb = rnd(2, 5, 0.5), V = rnd(1, 3, 0.5), d = rnd(40, 120, 10); return {
      q: R`Txalupa batek $${nf(vb)}$ m/s-ko abiadura du urarekiko eta ibaia perpendikularki zeharkatzen du. Urak $V=${nf(V)}$ m/s darama eta ibaia $${d}$ m-koa da. Zenbat metro jaisten da korronteak?`, ans: V * d / vb, unit: 'm',
      sol: R`$t=d/v'=${nf(d / vb)}$ s; deriba $=V\,t$` }; } },
    { t: 2, gen() { const th = pick([20, 25, 30, 35, 40, 45]), mu = rnd(0.05, 0.3, 0.05); return {
      q: R`Bloke bat $${th}°$-ko maldan behera irristatzen da, $\mu_d=${nf(mu)}$. Zein da azelerazioa? ($g=9{,}8$)`, ans: G * (Math.sin(rad(th)) - mu * Math.cos(rad(th))), unit: 'm/s²',
      sol: R`$a=g(\sin\theta-\mu_d\cos\theta)$` }; } },
    { t: 2, gen() { const m = rnd(2, 20), mu = rnd(0.2, 0.6, 0.05); return {
      q: R`$${m}$ kg-ko kutxa bat lurrean dago, $\mu_s=${nf(mu)}$. Zein indar horizontal minimo behar da mugitzen hasteko? ($g=9{,}8$)`, ans: mu * m * G, unit: 'N',
      sol: R`Atalasean $F_r=\mu_sN=\mu_smg$` }; } },
    { t: 2, gen() { const m = rnd(500, 1500, 100), v = rnd(10, 30), R0 = rnd(50, 200, 10); return {
      q: R`$${m}$ kg-ko auto bat $${v}$ m/s-ra doa $${R0}$ m-ko kurban. Zein indar zentripetu behar du?`, ans: m * v * v / R0, unit: 'N',
      sol: R`$F_{zent}=m\dfrac{v^2}{R}$` }; } },
    { t: 2, gen() { const m = rnd(50, 90, 5), A = rnd(1, 4, 0.5), up = Math.random() < 0.5; return {
      q: R`$${m}$ kg-ko pertsona bat igogailuan dago, igogailua $A=${nf(A)}$ m/s²-z ${up ? 'gorantz' : 'beherantz'} azeleratzen ari da. Zenbat markatzen du balantzak (N)? ($g=9{,}8$)`, ans: m * (G + (up ? A : -A)), unit: 'N',
      sol: R`$N=m(g${up ? '+' : '-'}A)$` }; } },
    { t: 2, gen() { const A = rnd(1, 6, 0.5); return {
      q: R`Bagoi bat $A=${nf(A)}$ m/s²-z azeleratzen da. Sabaiko penduluak zein angelu osatzen du bertikalarekin? ($g=9{,}8$)`, ans: Math.atan(A / G) * 180 / Math.PI, unit: '°',
      sol: R`Bagoitik: $-m\vec A$ inertzia-indarra → $\tan\theta=A/g$` }; } },
    { t: 2, gen() { const m1 = rnd(2, 8), m2 = rnd(1, 5); if (m1 === m2) return this.gen(); return {
      q: R`Atwood-en makina: $m_1=${m1}$ kg eta $m_2=${m2}$ kg. Zein da azelerazioaren modulua? ($g=9{,}8$)`, ans: Math.abs(m1 - m2) / (m1 + m2) * G, unit: 'm/s²',
      sol: R`Newton gorputz bakoitzari eta batu: $a=\dfrac{|m_1-m_2|}{m_1+m_2}g$` }; } },
    { t: 3, gen() { const m = rnd(10, 50, 5) / 1000, v = rnd(200, 600, 50), M = rnd(1, 5, 0.5); return {
      q: R`$${nf(m * 1000)}$ g-ko bala bat $${v}$ m/s-ra $${nf(M)}$ kg-ko bloke geldi batean itsasten da. Zein da multzoaren abiadura?`, ans: m * v / (m + M), unit: 'm/s',
      sol: R`$\vec p$ kontserbatu: $mv=(m+M)V$` }; } },
    { t: 3, gen() { const h = rnd(1, 20); return {
      q: R`Objektu bat $${h}$ m-ko altueratik erortzen uzten da, marruskadurarik gabe. Zein abiaduraz iristen da lurrera? ($g=9{,}8$)`, ans: Math.sqrt(2 * G * h), unit: 'm/s',
      sol: R`$\Delta E_{mek}=0$: $mgh=\tfrac12mv^2$ → $v=\sqrt{2gh}$` }; } },
    { t: 3, gen() { const v = rnd(4, 20), mu = rnd(0.1, 0.5, 0.05); return {
      q: R`Bloke bat $${v}$ m/s-ra irristatzen da plano horizontalean, $\mu_d=${nf(mu)}$. Zenbat metro egiten ditu gelditu arte? ($g=9{,}8$)`, ans: v * v / (2 * mu * G), unit: 'm',
      sol: R`$W_{ez\text{-}konts}=\Delta E_z$: $-\mu_dmg\,d=-\tfrac12mv^2$` }; } },
    { t: 3, gen() { const m = rnd(0.1, 2, 0.1), v = rnd(1, 10), k = rnd(100, 2000, 100); return {
      q: R`$${nf(m)}$ kg-ko bloke batek $${v}$ m/s-ra malguki bat jotzen du ($k=${k}$ N/m). Zenbat konprimatzen da? (cm-tan)`, ans: v * Math.sqrt(m / k) * 100, unit: 'cm',
      sol: R`$\tfrac12mv^2=\tfrac12kx^2$ → $x=v\sqrt{m/k}$` }; } },
    { t: 3, gen() { const F = rnd(50, 500, 10), v = rnd(2, 20); return {
      q: R`Motor batek $${F}$ N-eko indarra egiten du, abiaduraren norabidean, $${v}$ m/s-ra. Zein da potentzia?`, ans: F * v, unit: 'W',
      sol: R`$P=\vec F\cdot\vec v$` }; } },
    { t: 3, gen() { const F = rnd(10, 100, 5), d = rnd(2, 20), th = pick([0, 30, 37, 45, 60]); return {
      q: R`$${F}$ N-eko indar konstanteak $${th}°$ osatzen du desplazamenduarekin, $${d}$ m-tan. Zein da bere lana?`, ans: F * d * Math.cos(rad(th)), unit: 'J',
      sol: R`$W=\vec F\cdot\vec d=Fd\cos\theta$` }; } },
    { t: 3, gen() { const R0 = rnd(0.5, 5, 0.5); return {
      q: R`Partikula batek $R=${nf(R0)}$ m-ko kizkur bertikala osorik egin behar du. Zein abiadura minimo behar du behean? ($g=9{,}8$)`, ans: Math.sqrt(5 * G * R0), unit: 'm/s',
      sol: R`Goian $N=0$: $v_{goi}^2=gR$; energiaz $v_{be}^2=v_{goi}^2+4gR=5gR$` }; } },
    { t: 3, gen() { const m = rnd(0.1, 2, 0.1), v = rnd(1, 10), r = rnd(0.2, 2, 0.1); return {
      q: R`$${nf(m)}$ kg-ko partikula batek $r=${nf(r)}$ m-ko zirkulua egiten du $${v}$ m/s-ra. Zein da bere momentu angeluarra zentroarekiko?`, ans: m * v * r, unit: 'kg·m²/s',
      sol: R`$\vec r\perp\vec p$: $L_0=r\,m\,v$` }; } },
    { t: 4, gen() { const k = rnd(10, 400, 10), m = rnd(0.2, 5, 0.1); return {
      q: R`$m=${nf(m)}$ kg-ko masa bat $k=${k}$ N/m-ko malguki bati lotuta dago. Zein da oszilazioen periodoa?`, ans: 2 * Math.PI * Math.sqrt(m / k), unit: 's',
      sol: R`$\omega_0=\sqrt{k/m}=${nf(Math.sqrt(k / m))}$ rad/s; $T=2\pi/\omega_0$` }; } },
    { t: 4, gen() { const L = rnd(0.2, 3, 0.1); return {
      q: R`Pendulu sinple baten luzera $L=${nf(L)}$ m da. Zein da periodoa (angelu txikiak)? ($g=9{,}8$)`, ans: 2 * Math.PI * Math.sqrt(L / G), unit: 's',
      sol: R`$T=2\pi\sqrt{L/g}$` }; } },
    { t: 4, gen() { const A = rnd(2, 20) / 100, k = rnd(20, 400, 20), m = rnd(0.5, 4, 0.5); return {
      q: R`HHS: $A=${nf(A * 100)}$ cm, $k=${k}$ N/m eta $m=${nf(m)}$ kg. Zein da abiadura maximoa?`, ans: A * Math.sqrt(k / m), unit: 'm/s',
      sol: R`$v_{max}=A\omega_0=A\sqrt{k/m}$ (oreka-puntuan)` }; } },
    { t: 4, gen() { const A = rnd(2, 20) / 100, k = rnd(20, 400, 20); return {
      q: R`Malguki bat ($k=${k}$ N/m) $A=${nf(A * 100)}$ cm-ko anplitudez oszilatzen ari da. Zein da energia mekanikoa?`, ans: 0.5 * k * A * A, unit: 'J',
      sol: R`$E_{mek}=\tfrac12kA^2$ (A metrotan!)` }; } },
    { t: 4, gen() { const m = rnd(0.1, 2, 0.1), k = rnd(20, 200, 10); return {
      q: R`$${nf(m)}$ kg-ko masa bat $k=${k}$ N/m-ko malguki bertikal batetik zintzilik dago. Zenbat luzatzen da orekan? (cm-tan, $g=9{,}8$)`, ans: m * G / k * 100, unit: 'cm',
      sol: R`$k\Delta l=mg$ → $\Delta l=mg/k$` }; } },
    { t: 4, gen() { const w = rnd(1, 5), x0 = rnd(1, 10) / 100, v0 = rnd(5, 40) / 100; return {
      q: R`HHS: $\omega_0=${w}$ rad/s, $x_0=${nf(x0 * 100)}$ cm eta $\dot x_0=${nf(v0 * 100)}$ cm/s. Zein da anplitudea? (cm-tan)`, ans: Math.sqrt(x0 * x0 + (v0 / w) ** 2) * 100, unit: 'cm',
      sol: R`$A=\dfrac{\sqrt{\dot x_0^2+\omega_0^2x_0^2}}{\omega_0}$` }; } },
    { t: 4, gen() { const A = rnd(4, 20); return {
      q: R`HHS batean $A=${A}$ cm. Zein elongaziotan dira berdinak $E_z$ eta $E_p$? (cm-tan, positiboa)`, ans: A / Math.SQRT2, unit: 'cm',
      sol: R`$\tfrac12kx^2=\tfrac12\cdot\tfrac12kA^2$ → $x=A/\sqrt2$` }; } }
  ];
  let cTopic = 'all', cur = null, calcOk = store.get('c-ok', 0), cStreak = 0;
  function newCalc() {
    const pool = CALC.filter(c => cTopic === 'all' || String(c.t) === cTopic);
    const c = pick(pool); cur = Object.assign({ t: c.t }, c.gen.call(c));
    const card = $('#c-card'); clearMath(card);
    card.setAttribute('data-t', cur.t);
    card.innerHTML = `<div class="q-top"><span class="pill">${cur.t}. gaia · ${TOPIC[cur.t]}</span><span>Zuzenak: ${calcOk} · Segidan: ${cStreak}</span></div>
      <div class="q-text">${cur.q}</div>
      <form class="calc-input" id="c-form" autocomplete="off"><input id="c-in" inputmode="decimal" aria-label="Zure emaitza" placeholder="emaitza"><span class="calc-unit">${cur.unit}</span><button class="btn" type="submit">Zuzendu</button><button class="btn btn-ghost" type="button" id="c-show">Ebazpena ikusi</button></form>
      <div class="feedback" id="c-fb" hidden></div>
      <div class="q-nav"><span></span><button type="button" class="btn" id="c-next" hidden>Beste bat →</button></div>`;
    $('#c-form').onsubmit = e => { e.preventDefault(); check(false); };
    $('#c-show').onclick = () => check(true);
    $('#c-next').onclick = newCalc;
    typeset(card);
  }
  function check(reveal) {
    const fb = $('#c-fb'), raw = $('#c-in').value.trim().replace(',', '.').replace('−', '-');
    const val = parseFloat(raw), ans = cur.ans;
    const ok = !reveal && isFinite(val) && Math.abs(val - ans) <= Math.max(0.02 * Math.abs(ans), 0.005);
    if (!reveal && !isFinite(val)) { fb.className = 'feedback ko'; fb.hidden = false; fb.textContent = 'Idatzi zenbaki bat (koma edo puntua erabil dezakezu).'; return; }
    if (ok) { calcOk++; cStreak++; store.set('c-ok', calcOk); } else cStreak = 0;
    fb.className = 'feedback ' + (ok ? 'ok' : 'ko'); fb.hidden = false;
    fb.innerHTML = `<b>${ok ? '✓ Zuzena!' : reveal ? 'Ebazpena:' : '✗ Ez da zuzena.'}</b> Emaitza: <b>${nt(ans)} ${cur.unit}</b><br>${cur.sol}`;
    typeset(fb);
    $('#c-next').hidden = false;
    $$('#c-form button[type=submit], #c-show').forEach(b => { b.disabled = true; });
    updateStats();
  }
  $$('[data-ct]').forEach(b => b.addEventListener('click', () => { cTopic = b.dataset.ct; $$('[data-ct]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); newCalc(); }));

  /* ====================== 3. DEDUKZIOAK ORDENATU ====================== */
  const DV = window.DERIV || [];
  let dIdx = 0, order = [], ordDone = store.get('d-done', {});
  function renderDerivList() {
    const list = $('#d-pick'); if (!list) return;
    list.innerHTML = DV.map((d, i) => `<button type="button" class="chip" data-t="${d.t}" data-di="${i}" aria-pressed="${i === dIdx}">${ordDone[i] ? '✓ ' : ''}${d.code} · ${d.title}</button>`).join('');
    $$('[data-di]', list).forEach(b => b.onclick = () => { dIdx = +b.dataset.di; newOrder(); });
  }
  function newOrder() {
    const d = DV[dIdx];
    order = shuffle(d.steps.map((s, i) => i));
    if (order.every((v, i) => v === i)) order.reverse();
    renderDerivList(); renderOrder(false);
  }
  function renderOrder(checked) {
    const d = DV[dIdx], card = $('#d-card'); clearMath(card);
    card.setAttribute('data-t', d.t);
    card.innerHTML = `<div class="q-top"><span class="pill">Teoria ${d.code}</span><span>${d.steps.length} urrats</span></div>
      <div class="q-text">${d.title}: jarri urratsak ordenan</div>
      <ol class="ord-list">${order.map((si, p) => `<li class="ord-item${checked ? (si === p ? ' right' : ' wrong') : ''}"><span class="pos">${p + 1}</span><span class="txt">${d.steps[si]}</span>
        <span class="mv"><button type="button" data-up="${p}" aria-label="Gora" ${p === 0 ? 'disabled' : ''}>▲</button><button type="button" data-dn="${p}" aria-label="Behera" ${p === order.length - 1 ? 'disabled' : ''}>▼</button></span></li>`).join('')}</ol>
      <div class="feedback" id="d-fb" hidden></div>
      <div class="q-nav"><button type="button" class="btn btn-ghost" id="d-shuffle">Berriro nahastu</button><button type="button" class="btn" id="d-check">Egiaztatu</button></div>`;
    $$('[data-up]', card).forEach(b => b.onclick = () => { const p = +b.dataset.up; [order[p - 1], order[p]] = [order[p], order[p - 1]]; renderOrder(false); });
    $$('[data-dn]', card).forEach(b => b.onclick = () => { const p = +b.dataset.dn; [order[p + 1], order[p]] = [order[p], order[p + 1]]; renderOrder(false); });
    $('#d-shuffle').onclick = newOrder;
    $('#d-check').onclick = () => {
      const good = order.filter((si, p) => si === p).length, all = good === order.length;
      renderOrder(true);
      const fb = $('#d-fb'); fb.hidden = false; fb.className = 'feedback ' + (all ? 'ok' : 'ko');
      fb.innerHTML = all ? `<b>✓ Primeran!</b> Dedukzioa ondo ordenatuta. Orain idatzi paperean liburua begiratu gabe.` : `<b>${good}/${order.length} urrats bere lekuan.</b> Gorriak mugitu eta egiaztatu berriro.`;
      if (all) { ordDone[dIdx] = 1; store.set('d-done', ordDone); renderDerivList(); updateStats(); }
    };
    typeset(card);
  }

  /* ====================== estatistikak ====================== */
  function updateStats() {
    const okQ = Object.values(stats).filter(s => s.last === 1).length;
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('stat-q', okQ); set('stat-c', calcOk); set('stat-d', `${Object.keys(ordDone).length}/${DV.length}`);
    set('q-total', `${okQ} / ${QB.length} galdera ondo erantzunda (azken saiakeran)`);
    [1, 2, 3, 4].forEach(t => {
      const ids = QB.map((q, i) => i).filter(i => QB[i].t === t);
      const k = ids.filter(i => (stats[qId(i)] || {}).last === 1).length;
      const bar = document.querySelector(`[data-prog="${t}"]`); if (bar) bar.style.width = (100 * k / ids.length) + '%';
    });
  }

  let started = { galderak: false, kalkuluak: false, dedukzioak: false };
  window.practiceEnter = function (view) {
    if (started[view] !== false) return;
    started[view] = true;
    if (view === 'galderak') buildQDeck();
    if (view === 'kalkuluak') newCalc();
    if (view === 'dedukzioak') newOrder();
  };
  updateStats();
})();
