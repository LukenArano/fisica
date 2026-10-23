/* Nabigazioa, itxura, ariketa ebatziak eta tresna partekatuak (MathJax, biltegia) */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  window.APPSTORE = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* biltegirik gabe ere badabil */ } }
  };
  const store = window.APPSTORE;

  /* ---------- MathJax: deiak segidan, bestela formula batzuk galtzen dira ---------- */
  const pending = [];
  let mjChain = Promise.resolve();
  window.typesetMath = function (el) {
    if (!el) return Promise.resolve();
    if (!(window.MathJax && MathJax.typesetPromise && window.mjReady)) { pending.push(el); return Promise.resolve(); }
    mjChain = mjChain.then(() => MathJax.typesetPromise([el])).catch(err => console.warn('MathJax', err));
    return mjChain;
  };
  window.clearMath = function (el) { if (window.mjReady && MathJax.typesetClear) MathJax.typesetClear([el]); };
  document.addEventListener('mj-ready', () => { pending.splice(0).forEach(window.typesetMath); });

  /* ---------- Itxura (argia/iluna) ---------- */
  const THEMES = ['auto', 'light', 'dark'];
  const ICON = { auto: '◐', light: '☀', dark: '☾' };
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    const b = $('#theme-btn'); if (b) { b.textContent = ICON[t] || ICON.auto; b.setAttribute('aria-label', 'Itxura: ' + ({ auto: 'automatikoa', light: 'argia', dark: 'iluna' })[t]); }
  }
  let theme = store.get('theme', 'auto'); applyTheme(theme);
  $('#theme-btn')?.addEventListener('click', () => { theme = THEMES[(THEMES.indexOf(theme) + 1) % 3]; store.set('theme', theme); applyTheme(theme); });

  /* ---------- Bideratzailea ---------- */
  const views = $$('.view');
  const typesetDone = new Set();
  const NAVMAP = { galderak: 'praktika', kalkuluak: 'praktika', dedukzioak: 'praktika' };
  function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || 'hasiera';
    let view = views.find(v => v.id === h), target = null;
    if (!view) { target = document.getElementById(h); view = target ? target.closest('.view') : views[0]; }
    views.forEach(v => { v.hidden = v !== view; });
    const navId = NAVMAP[view.id] || view.id;
    $$('.nav a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + navId ? 'page' : 'false'));
    $('.nav a[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (!typesetDone.has(view.id)) { typesetDone.add(view.id); window.typesetMath(view); }
    if (window.practiceEnter) window.practiceEnter(view.id);
    requestAnimationFrame(() => { if (target) target.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0); });
  }
  window.addEventListener('hashchange', route);

  /* ---------- Ariketak: urratsez urrats ---------- */
  $$('.prob').forEach(p => {
    const body = $('.prob-body', p), steps = $$('.sol-step', p);
    const bar = document.createElement('div'); bar.className = 'sol-controls';
    const mk = (txt, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-small ' + cls; b.textContent = txt; b.onclick = fn; bar.append(b); return b; };
    const sync = () => {
      const left = steps.filter(s => s.hidden).length;
      next.disabled = left === 0;
      next.textContent = left === steps.length ? 'Ebazpena hasi' : left ? `Hurrengo urratsa (${steps.length - left}/${steps.length})` : 'Ebazpen osoa ikusten';
      hide.hidden = left === steps.length;
    };
    const next = mk('Ebazpena hasi', '', () => { const s = steps.find(x => x.hidden); if (s) s.hidden = false; sync(); });
    mk('Dena erakutsi', 'btn-ghost', () => { steps.forEach(s => { s.hidden = false; }); sync(); });
    const hide = mk('Ezkutatu', 'btn-ghost', () => { steps.forEach(s => { s.hidden = true; }); sync(); });
    body.insertBefore(bar, steps[0] || null);
    sync();
  });
  $$('[data-pf]').forEach(b => b.addEventListener('click', () => {
    $$('[data-pf]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    const f = b.dataset.pf;
    $$('.prob').forEach(p => {
      const src = $('.src', p).textContent;
      p.hidden = !(f === 'all' || (f === 'exam' ? p.dataset.exam === '1' : f === 'book' ? /Liburua/.test(src) : p.dataset.topic === f));
    });
  }));

  window.appStart = function () { if (window.initSims) window.initSims(); route(); };
})();
