/*!
 * Meetup Q&A (ORBii Interact)
 * Copyright (c) 2026 ORBii SAS. All rights reserved.
 * Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE and NOTICE): free for any noncommercial use.
 * Commercial use requires a separate license from ORBii SAS: info@orbii.tech
 * https://polyformproject.org/licenses/noncommercial/1.0.0
 */

// Meetup Q&A v2 — client (vanilla JS, no dependencies)
'use strict';
const $app = document.getElementById('app');
const BASE = (document.querySelector('meta[name="base-path"]')?.content || '').replace(/\/+$/, '');
const NS = BASE ? BASE + '|' : '';   // v1 and v2 share the origin: keep their browser storage apart
const safe = (k, v) => { try { return v === undefined ? localStorage.getItem(NS + k) : localStorage.setItem(NS + k, v); } catch { return null; } };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const cid = safe('cid') || (() => { const v = uuid(); safe('cid', v); return v; })();

// ---------- i18n ----------
let LANG = safe('lang') || ((navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en');
function t(key, vars) {
  let s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(v);
  return s;
}
function setLang(l) { LANG = l; safe('lang', l); document.documentElement.lang = l; route(); }
document.documentElement.lang = LANG;
const langBtn = () => h('button', { class: 'btn small lang', 'aria-label': t('lang.switch'), onclick: () => setLang(LANG === 'fr' ? 'en' : 'fr') }, LANG === 'fr' ? 'EN' : 'FR');

let LAN = [];
let INFO = {};
const infoReady = fetch(BASE + '/api/info').then(r => r.json()).then(j => { LAN = j.lan || []; INFO = j; return j; }).catch(() => ({}));
// Share URL: if the admin is on localhost, phones cannot reach it -> use LAN address
const shareBase = () => (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && LAN[0]) || (location.origin + BASE);
function qrEl(text) {
  const box = h('div', { class: 'qr', role: 'img', 'aria-label': t('qr.label') });
  try { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch { return null; }
  return box;
}
const wide = () => matchMedia('(min-width: 900px)').matches;
const genPw = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
const fieldStyle = 'width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);font-size:16px';

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
// Copyright years: first publication year, extended automatically ('2026', then '2026–2027', '2026–2028'…)
const COPYRIGHT_SINCE = 2026;
const copyrightYears = () => { const y = new Date().getFullYear(); return y > COPYRIGHT_SINCE ? `${COPYRIGHT_SINCE}–${y}` : String(COPYRIGHT_SINCE); };
// Discreet brand signature, as most SaaS tools do ("Powered by …")
const brandFooter = () => h('footer', { class: 'brand-foot' },
  h('span', {}, `© ${copyrightYears()} ORBii SAS`), h('span', { 'aria-hidden': 'true' }, ' · '),
  h('a', { href: 'https://orbii.tech', target: '_blank', rel: 'noopener' }, 'Powered by ', h('b', {}, 'ORBii'), ', ', h('span', { class: 'nowrap' }, 'Smart Tools for a Connected World')),
  h('span', { 'aria-hidden': 'true' }, ' · '), h('a', { href: BASE + '/terms', onclick: e => { e.preventDefault(); go('/terms'); } }, t('reg.termsLink')));
// ----- Modal dialog (replaces browser alert() popups) -----
function openModal(content, { label } = {}) {
  const prev = document.activeElement;
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); prev && prev.focus && prev.focus(); };
  const onKey = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {                                   // keep the keyboard focus inside the dialog
      const f = [...box.querySelectorAll('button, a[href], input, select, textarea')].filter(x => !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': label || '' },
    h('button', { class: 'modal-x', 'aria-label': t('common.close'), onclick: () => close() }, '✕'), content(close));
  const bg = h('div', { class: 'modal-bg', onclick: e => { if (e.target === bg) close(); } }, box);
  document.body.append(bg);
  document.addEventListener('keydown', onKey);
  setTimeout(() => (box.querySelector('[data-autofocus]') || box.querySelector('button.btn')).focus(), 30);
  return close;
}
function copyBtn(text, label) {
  return h('button', { type: 'button', class: 'btn small copy', onclick: e => { navigator.clipboard?.writeText(text); const b = e.currentTarget; b.textContent = '✓ ' + t('host.copied'); setTimeout(() => { b.textContent = '📋 ' + (label || t('modal.copy')); }, 1600); } }, '📋 ' + (label || t('modal.copy')));
}
function createdModal({ code, hostKey, hostPassword, title, demo }) {
  const guestUrl = `${shareBase()}/e/${code}`, hostUrl = `${shareBase()}/e/${code}/host`;
  const all = `${title}\n${t('screen.code')}: ${code}\n${t('login.hostPw')}: ${hostPassword}\n${t('reg.guestLink')}: ${guestUrl}\n${t('reg.hostLink')}: ${hostUrl}`;
  openModal(close => h('div', { class: 'created' },
    h('div', { class: 'created-head' }, h('div', { class: 'created-burst', 'aria-hidden': 'true' }, demo ? '🎭' : '🎉'),
      h('h2', {}, demo ? t('modal.demoCreated') : t('modal.created')), h('p', { class: 'muted' }, title)),
    h('div', { class: 'created-grid' },
      h('div', { class: 'created-code' }, h('span', { class: 'muted' }, t('screen.code')), h('b', {}, code), qrEl(guestUrl)),
      h('div', { class: 'stack' },
        h('div', { class: 'created-pw' }, h('span', { class: 'muted' }, '🔑 ' + t('login.hostPw')),
          h('div', { class: 'between' }, h('code', {}, hostPassword), copyBtn(hostPassword)),
          h('small', {}, '⚠️ ' + t('modal.pwOnce'))),
        h('div', { class: 'created-link' }, h('span', { class: 'muted' }, '👥 ' + t('reg.guestLink')), h('div', { class: 'between' }, h('a', { href: guestUrl, target: '_blank' }, guestUrl.replace(/^https?:\/\//, '')), copyBtn(guestUrl))),
        h('div', { class: 'created-link' }, h('span', { class: 'muted' }, '🎛 ' + t('reg.hostLink')), h('div', { class: 'between' }, h('a', { href: hostUrl, target: '_blank' }, hostUrl.replace(/^https?:\/\//, '')), copyBtn(hostUrl))))),
    h('div', { class: 'row-actions created-actions' },
      h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { close(); safe('key:' + code, hostKey); go(`/e/${code}/host`); } }, '🎛 ' + t('reg.openHost')),
      copyBtn(all, t('reg.copyAll')),
      h('button', { class: 'btn', onclick: () => close() }, t('common.close')))), { label: t('modal.created') });
}
let toastT;
function toast(msg) {
  const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2800);
}
async function api(path, data) {
  const r = await fetch(BASE + '/api' + path, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid, token: safe('adminToken') || undefined, ...data }) } : undefined);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { toast(t(j.error || 'err.generic')); throw new Error(j.error); }
  return j;
}
function ago(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return t('time.now');
  if (m < 60) return t('time.min', { n: m });
  const hh = Math.round(m / 60);
  return hh < 24 ? t('time.h', { n: hh }) : t('time.d', { n: Math.round(hh / 24) });
}
const fmtDate = ts => ts ? new Date(ts).toLocaleString(LANG === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' }) : '';
const loc = () => LANG === 'fr' ? 'fr-FR' : 'en-GB';
const fmtDay = ts => new Date(ts).toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDayTime = ts => new Date(ts).toLocaleString(loc(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const isMultiDay = s => !!s.range && s.range.end - s.range.start >= 20 * 3600000;
const resLabel = r => r < 60 ? `${r} min` : r < 1440 ? `${r / 60} h` : (LANG === 'fr' ? `${r / 1440} j` : `${r / 1440} d`);
const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString(LANG === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

// ---------- Routing ----------
let stream = null;
const appPath = () => location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) || '/' : location.pathname;
function route() {
  if (stream) { stream.close(); stream = null; }
  document.body.classList.remove('screen', 'report', 'host-mode', 'admin-mode');
  const p = appPath().split('/').filter(Boolean);
  if (p[0] === 'e' && p[1]) {
    const code = p[1].toUpperCase();
    if (p[2] === 'report') { history.replaceState({}, '', `${BASE}/e/${code}/host`); return live(code, 'host'); }   // export is CSV only
    return live(code, p[2] === 'screen' ? 'screen' : p[2] === 'host' ? 'host' : 'guest');
  }
  if (p[0] === 'register') return registerPage();
  if (p[0] === 'terms') return termsPage();
  home();
}
function go(path) { history.pushState({}, '', BASE + path); route(); }
window.addEventListener('popstate', route);
const link = (path, label, attrs = {}) => h('a', { href: BASE + path, onclick: e => { if (attrs.target) return; e.preventDefault(); go(path); }, ...attrs }, label);

// ---------- Home ----------
let homeTimer = null;
function home() {
  document.title = 'Meetup Q&A';
  clearInterval(homeTimer);
  const hostParam = new URLSearchParams(location.search).get('host');
  const st = { events: [], admin: false, login: !!hostParam, loginMode: 'host', hostCode: (hostParam || '').toUpperCase(), loaded: false, newTitle: '', newPw: genPw(), newMod: false };
  const token = () => safe('adminToken') || '';
  const onHome = () => appPath() === '/';

  async function refresh() {
    try {
      const r = await fetch(BASE + '/api/events?token=' + encodeURIComponent(token())).then(x => x.json());
      st.events = r.events || []; st.admin = !!r.admin; st.loaded = true;
      if (token() && !st.admin) safe('adminToken', ''); // stale token (password changed)
    } catch {}
    if (onHome()) draw();
  }
  homeTimer = setInterval(() => { if (!onHome()) clearInterval(homeTimer); else if (!document.querySelector('[data-keep]:focus')) refresh(); }, 8000);

  function eventCard(e) {
    const bits = [t('home.stats', { q: e.questions, o: e.online })];
    if (st.admin && e.pending) bits.push('⏳ ' + t('home.toModerate', { n: e.pending }));
    if (st.admin && !e.hasHostPassword) bits.push('⚠ ' + t('home.noHostPw'));
    if (st.admin && e.owner) bits.push('👤 ' + e.owner.email);
    if (e.ended) bits.push(t('home.ended')); else if (!e.open) bits.push(t('home.qClosed'));
    return h('div', { class: `card ev ${e.ended ? 'ended' : ''}` },
      h('div', { class: 'ev-main' }, h('b', {}, e.demo && h('span', { class: 'tag demo' }, t('demo.badge')), ' ', e.title), h('div', { class: 'muted' }, bits.join(' · ')), h('span', { class: 'code' }, e.code)),
      h('div', { class: 'row-actions', style: 'margin:0' },
        !e.ended && h('button', { class: 'btn primary small', onclick: () => go('/e/' + e.code) }, t('home.join')),
        !st.admin && h('button', { class: 'btn small', onclick: () => { st.login = true; st.loginMode = 'host'; st.hostCode = e.code; draw(); document.querySelector('[data-keep="pwd"]')?.focus(); } }, '🎛 ' + t('home.host')),
        st.admin && h('button', { class: 'btn small', onclick: () => { safe('key:' + e.code, e.hostKey); go(`/e/${e.code}/host`); } }, '🎛 ' + t('home.manage')),
        st.admin && h('a', { class: 'btn small', href: `${BASE}/api/events/${e.code}/export.csv?key=${encodeURIComponent(e.hostKey)}&sep=${LANG === 'fr' ? ';' : ','}` }, '⬇ CSV'),
        st.admin && e.publicDemo && h('button', { class: 'btn small', onclick: async () => { if (confirm(t('demo.resetConfirm'))) { await api(`/events/${e.code}/demo-reset`, {}); toast('↺ ' + t('demo.resetDone')); refresh(); } } }, '↺ ' + t('demo.reset')),
        st.admin && h('button', { class: 'btn small', onclick: async () => {
          const pw = prompt(t('home.newHostPwPrompt', { title: e.title }), genPw());
          if (pw == null) return;
          const r = await api(`/events/${e.code}/host-password`, { hostPassword: pw });
          safe('key:' + e.code, r.hostKey); toast(t('home.hostPwUpdated')); refresh();
        } }, '🔑 ' + t('home.hostPw')),
        st.admin && h('button', { class: 'btn small', onclick: async () => { await api(`/events/${e.code}/settings`, { key: e.hostKey, ended: !e.ended }); refresh(); } }, e.ended ? t('home.reopen') : t('home.end')),
        st.admin && h('button', { class: 'btn small danger', 'aria-label': t('common.delete'), onclick: async () => { if (confirm(t('home.deleteConfirm', { title: e.title }))) { await api(`/events/${e.code}/settings`, { key: e.hostKey, delete: true }); refresh(); } } }, '🗑')));
  }

  // Front door for visitors: join with a code, try the demo, open source, get a space
  function landing() {
    const code = h('input', { type: 'text', 'data-keep': 'lcode', placeholder: t('home.codePh'), maxlength: 5, 'aria-label': t('home.codeLabel'), autocapitalize: 'characters', autocomplete: 'off' });
    const demos = INFO.demos || [];
    const requestHref = `mailto:info@orbii.tech?subject=${encodeURIComponent(t('land.mailSubject'))}&body=${encodeURIComponent(t('land.mailBody'))}`;
    const card = (icon, title, text, actions) => h('article', { class: 'land-card' }, h('div', { class: 'land-ic', 'aria-hidden': 'true' }, icon), h('h3', {}, title), h('p', {}, text), h('div', { class: 'land-act' }, actions));
    return h('section', { class: 'landing' },
      h('div', { class: 'land-hero' },
        h('h1', {}, 'Meetup Q&A'), h('p', { class: 'land-tag' }, t('land.tagline')),
        h('form', { class: 'land-join', onsubmit: e => { e.preventDefault(); if (code.value.trim()) go('/e/' + code.value.trim().toUpperCase()); } },
          code, h('button', { class: 'btn primary' }, t('land.join'))),
        h('ul', { class: 'land-feats' }, ['💬 ' + t('land.f1'), '📊 ' + t('land.f2'), '📈 ' + t('land.f3'), '🗓 ' + t('land.f4')].map(x => h('li', {}, x)))),
      h('div', { class: 'land-cards' },
        demos.length > 0 && card('🎭', t('land.demoT'), t('land.demoP'), [
          demos.map(dm => h('div', { class: 'land-demo' }, h('b', {}, dm.title),
            h('div', { class: 'land-act' }, h('a', { class: 'btn primary small', href: dm.url + '/host' }, '🎛 ' + t('land.demoHost')), h('a', { class: 'btn small', href: dm.url }, '👥 ' + t('land.demoGuest'))))),
          h('div', { class: 'muted land-pw' }, t('land.demoPw'), ' ', h('code', {}, 'demo20272028'))]),
        card('⭐', t('land.ossT'), t('land.ossP'), [
          h('a', { class: 'btn small', href: 'https://github.com/pejmang/Meetup-Q-A', target: '_blank', rel: 'noopener' }, t('land.ossBtn')),
          h('div', { class: 'muted' }, 'PolyForm Noncommercial 1.0.0')]),
        card('✨', t('land.spaceT'), t('land.spaceP'), [
          INFO.googleClientId ? h('button', { class: 'btn primary small', onclick: () => go('/register') }, t('reg.cta'))
            : h('a', { class: 'btn primary small', href: requestHref }, t('land.request')),
          h('div', { class: 'muted' }, t('land.spaceNote'))])));
  }

  function draw() {
    const codeIn = h('input', { type: 'text', placeholder: t('home.codePh'), maxlength: 5, 'aria-label': t('home.codeLabel'), autocapitalize: 'characters' });
    const liveEv = st.events.filter(e => !e.ended), done = st.events.filter(e => e.ended);
    const pwLabel = st.loginMode === 'admin' ? t('login.adminPw') : t('login.hostPw');
    const pwd = h('input', { type: 'password', 'data-keep': 'pwd', placeholder: pwLabel, 'aria-label': pwLabel, autocomplete: 'current-password', style: fieldStyle });
    const hostCodeIn = h('input', { type: 'text', 'data-keep': 'hcode', placeholder: t('home.codePh'), 'aria-label': t('home.codeLabel'), maxlength: 5, autocapitalize: 'characters', value: st.hostCode, style: fieldStyle, oninput: e => st.hostCode = e.target.value });
    const titleIn = h('input', { type: 'text', 'data-keep': 'ntitle', placeholder: t('create.titlePh'), maxlength: 80, 'aria-label': t('create.titleLabel'), value: st.newTitle, oninput: e => st.newTitle = e.target.value });
    const hostPwIn = h('input', { type: 'text', 'data-keep': 'npw', placeholder: t('create.hostPwPh'), maxlength: 64, 'aria-label': t('create.hostPwLabel'), autocomplete: 'off', value: st.newPw, oninput: e => st.newPw = e.target.value });
    const mod = h('input', { type: 'checkbox', checked: st.newMod, onchange: e => st.newMod = e.target.checked });

    const top = h('div', { class: 'between hometop' }, BASE ? h('span', { class: 'tag beta' }, 'staging ' + BASE.slice(1)) : h('span', {}),
      h('div', { class: 'between' },
        st.admin
          ? [h('span', { class: 'role admin' }, t('home.adminSignedIn')), h('button', { class: 'btn small', onclick: () => { st.pwForm = !st.pwForm; draw(); document.querySelector('[data-keep="apw0"]')?.focus(); } }, '🔑 ' + t('apw.button')), h('button', { class: 'btn small', onclick: () => { safe('adminToken', ''); st.admin = false; refresh(); } }, t('home.signOut'))]
          : h('button', { class: 'btn small', onclick: () => { st.login = !st.login; draw(); document.querySelector('[data-keep="pwd"]')?.focus(); } }, '🔐 ' + t('home.signIn')),
        langBtn()));

    const login = !st.admin && st.login && h('form', { class: 'card stack', onsubmit: async e => {
      e.preventDefault();
      try {
        if (st.loginMode === 'admin') {
          const r = await api('/login', { password: pwd.value }); safe('adminToken', r.token); st.login = false; refresh();
        } else {
          const c = hostCodeIn.value.trim().toUpperCase();
          if (!c) { toast(t('login.enterCode')); return hostCodeIn.focus(); }
          const r = await api(`/events/${c}/host-login`, { password: pwd.value });
          safe('key:' + c, r.hostKey); go(`/e/${c}/host`);
        }
      } catch { pwd.select(); }
    } },
      h('div', { class: 'tabs', role: 'tablist' }, [['host', '🎛 ' + t('login.tabHost')], ['admin', '🔐 ' + t('login.tabAdmin')]].map(([k, label]) =>
        h('button', { type: 'button', class: 'tab', role: 'tab', 'aria-selected': String(st.loginMode === k), onclick: () => { st.loginMode = k; draw(); document.querySelector('[data-keep="pwd"]')?.focus(); } }, label))),
      h('div', { class: 'muted' }, st.loginMode === 'admin' ? t('login.adminHint') : t('login.hostHint')),
      st.loginMode === 'host' && hostCodeIn, pwd, h('button', { class: 'btn primary' }, t('login.submit')));

    const pwIn = (k, ph, ac) => h('input', { type: 'password', 'data-keep': k, placeholder: ph, 'aria-label': ph, autocomplete: ac, style: fieldStyle });
    const [cur, nw, cf] = [pwIn('apw0', t('apw.current'), 'current-password'), pwIn('apw1', t('apw.new'), 'new-password'), pwIn('apw2', t('apw.confirm'), 'new-password')];
    const pwCard = st.admin && st.pwForm && h('form', { class: 'card stack pw-card', onsubmit: async e => {
      e.preventDefault();
      if (nw.value.length < 8) { toast(t('err.adminPwLength')); return nw.focus(); }
      if (nw.value !== cf.value) { toast(t('apw.mismatch')); return cf.select(); }
      try {
        const r = await api('/admin-password', { current: cur.value, next: nw.value });
        safe('adminToken', r.token); st.pwForm = false; toast('✔ ' + t('apw.done')); draw();
      } catch { cur.select(); }
    } }, h('h2', { style: 'margin:0' }, '🔑 ' + t('apw.title')), h('p', { class: 'muted', style: 'margin:0' }, t('apw.hint')), cur, nw, cf,
      h('div', { class: 'row-actions', style: 'margin:0' }, h('button', { class: 'btn primary' }, t('apw.submit')), h('button', { type: 'button', class: 'btn', onclick: () => { st.pwForm = false; draw(); } }, t('common.cancel'))));

    const create = st.admin && h('form', { class: 'card stack', onsubmit: async e => {
      e.preventDefault();
      const pw = st.newPw.trim();
      const title = titleIn.value.trim();
      const r = await api('/events', { title, moderation: mod.checked, hostPassword: pw });
      safe('key:' + r.code, r.hostKey);
      st.newTitle = ''; st.newPw = genPw(); st.newMod = false;
      refresh();
      createdModal({ code: r.code, hostKey: r.hostKey, hostPassword: pw, title });
    } }, h('h2', { style: 'margin:0' }, '➕ ' + t('create.title')), titleIn,
      h('div', { class: 'muted' }, t('create.hostPwHint')), hostPwIn,
      h('label', { class: 'row' }, mod, t('create.moderate')), h('button', { class: 'btn primary' }, t('create.submit')),
      h('div', { class: 'demo-row' }, h('span', { class: 'muted' }, '🎭 ' + t('demo.create')),
        [['en', 1], ['fr', 1], ['en', 3], ['en', 1, 'townhall']].map(([l, days, scenario]) => h('button', { type: 'button', class: 'btn small', onclick: async () => {
          const pw = st.newPw.trim();
          const r = await api('/events/demo', { lang: l, hostPassword: pw, days, scenario });
          safe('key:' + r.code, r.hostKey); st.newPw = genPw();
          refresh();
          createdModal({ code: r.code, hostKey: r.hostKey, hostPassword: pw, title: t('demo.modalTitle'), demo: true });
        } }, scenario === 'townhall' ? '🏢 Townhall · 1,200' : (l === 'en' ? '🇬🇧 English' : '🇫🇷 Français') + (days > 1 ? ' · ' + t('demo.days', { n: days }) : '')))));

    document.body.classList.toggle('admin-mode', st.admin);
    $app.replaceChildren(...[st.admin && h('div', { class: 'mode-banner admin' }, '🔐 ' + t('mode.admin'))].filter(Boolean), h('div', { class: 'wrap narrow' }, top,
      st.admin ? h('div', { class: 'hero' }, h('h1', {}, 'Meetup Q&A'), h('p', { class: 'muted' }, t('home.tagline'))) : landing(),
      login, pwCard, create,
      h('h2', {}, t('home.live', { n: liveEv.length })),
      liveEv.length ? h('div', { class: 'stack' }, liveEv.map(eventCard)) : h('p', { class: 'empty' }, st.loaded ? t('home.noLive') : t('common.loading')),
      st.admin && h('form', { class: 'card row-form', onsubmit: e => { e.preventDefault(); if (codeIn.value.trim()) go('/e/' + codeIn.value.trim().toUpperCase()); } },
        codeIn, h('button', { class: 'btn' }, t('home.joinCode'))),
      st.admin && done.length > 0 && h('div', {}, h('h2', {}, t('home.endedList', { n: done.length })), h('div', { class: 'stack' }, done.map(eventCard))), brandFooter()));
  }
  draw(); refresh(); infoReady.then(() => { if (onHome()) draw(); });
}

// ---------- Self-service registration ----------
function registerPage() {
  document.title = t('reg.title') + ' — Meetup Q&A';
  const st = { cred: null, who: null, title: '', moderate: false, accept: false, done: null, busy: false };
  const decode = jwt => { try { return JSON.parse(decodeURIComponent(escape(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return null; } };
  const isPro = email => { const d = String(email || '').toLowerCase().split('@')[1] || ''; return !!d && !(INFO.freeDomains || []).includes(d); };   // freeDomains is empty unless REQUIRE_PRO_EMAIL=1
  function googleButton(el) {
    const init = () => {
      window.google.accounts.id.initialize({ client_id: INFO.googleClientId, callback: r => { st.cred = r.credential; st.who = decode(r.credential); draw(); }, ux_mode: 'popup' });
      window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: LANG });
    };
    if (window.google && window.google.accounts) return init();
    if (!document.getElementById('gsi')) document.head.append(h('script', { id: 'gsi', src: 'https://accounts.google.com/gsi/client', async: true, onload: () => init() }));
    else document.getElementById('gsi').addEventListener('load', init);
  }
  function draw() {
    const wrap = h('div', { class: 'wrap narrow reg' },
      h('div', { class: 'between hometop' }, link('/', '← ' + t('common.home')), langBtn()),
      h('div', { class: 'hero' }, h('h1', {}, '✨ ' + t('reg.title')), h('p', { class: 'muted' }, t('reg.sub'))));
    if (!INFO.googleClientId) { wrap.append(h('div', { class: 'card' }, '🔒 ' + t('reg.closed')), brandFooter()); return $app.replaceChildren(wrap); }
    if (st.done) {
      const hostUrl = `${shareBase()}/e/${st.done.code}/host`, guestUrl = `${shareBase()}/e/${st.done.code}`;
      const copyAll = `${t('reg.doneTitle')}\n${t('screen.code')}: ${st.done.code}\n${t('login.hostPw')}: ${st.done.hostPassword}\n${t('reg.hostLink')}: ${hostUrl}\n${t('reg.guestLink')}: ${guestUrl}`;
      wrap.append(h('div', { class: 'card stack reg-done' },
        h('h2', { style: 'margin:0' }, '🎉 ' + t('reg.doneTitle')),
        h('div', { class: 'kv' }, h('span', { class: 'muted' }, t('screen.code')), h('b', { class: 'bigcode' }, st.done.code)),
        h('div', { class: 'kv' }, h('span', { class: 'muted' }, t('login.hostPw')), h('b', { class: 'pw' }, st.done.hostPassword)),
        h('div', { class: 'banner' }, '⚠️ ' + t('reg.savePw')),
        h('div', { class: 'muted' }, t('reg.hostLink') + ' : ', h('a', { href: hostUrl }, hostUrl)),
        h('div', { class: 'muted' }, t('reg.guestLink') + ' : ', h('a', { href: guestUrl }, guestUrl)),
        h('div', { class: 'row-actions' },
          h('button', { class: 'btn primary', onclick: () => { safe('key:' + st.done.code, st.done.hostKey); go(`/e/${st.done.code}/host`); } }, '🎛 ' + t('reg.openHost')),
          h('button', { class: 'btn', onclick: () => { navigator.clipboard?.writeText(copyAll); toast(t('host.copied')); } }, '📋 ' + t('reg.copyAll')))));
      wrap.append(brandFooter()); return $app.replaceChildren(wrap);
    }
    // Step 1: Google sign-in
    const step1 = h('div', { class: 'card stack' }, h('b', {}, '1. ' + t('reg.step1')), h('p', { class: 'muted', style: 'margin:0' }, t('reg.step1Hint')));
    const pro = st.who && isPro(st.who.email);
    if (st.who) step1.append(h('div', { class: `reg-who ${pro ? 'ok' : 'ko'}` }, pro ? '✅ ' : '⛔ ', h('b', {}, st.who.name || ''), ' ', h('span', {}, st.who.email),
      !pro && h('div', {}, t('reg.notPro'))));
    if (!st.who || !pro) { const gb = h('div', { class: 'gbtn' }); step1.append(gb); setTimeout(() => googleButton(gb), 0); }
    wrap.append(step1);
    // Step 2: space details + terms
    if (st.who && pro) {
      const titleIn = h('input', { type: 'text', 'data-keep': 'rt', maxlength: 80, placeholder: t('create.titlePh'), 'aria-label': t('create.titleLabel'), value: st.title, oninput: e => st.title = e.target.value });
      wrap.append(h('form', { class: 'card stack', onsubmit: async e => {
        e.preventDefault();
        if (!st.accept) return toast(t('err.regTerms'));
        st.busy = true; draw();
        try {
          const r = await api('/register', { credential: st.cred, title: st.title, moderation: st.moderate, acceptTerms: st.accept, termsVersion: INFO.termsVersion });
          st.done = r; safe('key:' + r.code, r.hostKey);
        } catch (err) { if (/regToken|regEmailUnverified/.test(String(err && err.message))) { st.who = null; st.cred = null; } }   // sign in again
        st.busy = false; draw();
      } },
        h('b', {}, '2. ' + t('reg.step2')), titleIn,
        h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: st.moderate, onchange: e => st.moderate = e.target.checked }), t('create.moderate')),
        h('label', { class: 'row reg-terms' }, h('input', { type: 'checkbox', checked: st.accept, required: true, onchange: e => st.accept = e.target.checked }),
          h('span', {}, t('reg.accept1'), ' ', h('a', { href: BASE + '/terms', target: '_blank' }, t('reg.termsLink')), ' ', t('reg.accept2'))),
        h('div', { class: 'muted' }, t('reg.limit', { n: INFO.maxSpaces || 3 })),
        h('button', { class: 'btn primary', disabled: st.busy }, st.busy ? t('common.loading') : '✨ ' + t('reg.submit'))));
    }
    wrap.append(brandFooter());
    $app.replaceChildren(wrap);
  }
  draw();
  infoReady.then(draw);
}

function termsPage() {
  const T = (window.TERMS || {})[LANG] || (window.TERMS || {}).en;
  document.title = T.title + ' — Meetup Q&A';
  $app.replaceChildren(h('div', { class: 'wrap narrow terms' },
    h('div', { class: 'between hometop' }, link('/', '← ' + t('common.home')), langBtn()),
    h('h1', { style: 'margin:18px 0 4px' }, T.title), h('p', { class: 'muted' }, T.updated),
    T.sections.map(([hd, txt]) => h('section', {}, h('h2', {}, hd), h('p', {}, txt))),
    brandFooter()));
  window.scrollTo(0, 0);
}

// ---------- Polls (shared by host, participant, screen and report) ----------
const POLL_TYPES = ['choice', 'multi', 'wordcloud', 'rating', 'nps', 'open'];
const REACT_KEYS = { '❤️': 'love', '🔥': 'hot', '💡': 'insight', '👏': 'applause' };
const TYPE_ICON = { choice: '🔘', multi: '☑️', wordcloud: '☁️', rating: '⭐', nps: '📈', open: '💬' };
const pollQ = p => p.question || t('nps.defaultQ');
const hasAnswered = p => (p.type === 'choice' || p.type === 'multi' || p.type === 'wordcloud') ? p.mine.length > 0
  : (p.type === 'rating' || p.type === 'nps') ? p.mine != null : p.mineCount > 0;
const pct = (n, total) => total ? Math.round(100 * n / total) : 0;
const pct1 = (n, total) => total ? Math.round(1000 * n / total) / 10 : 0;          // 43.5 — rounding no longer adds up to 99 %
const fmtPct = (n, total) => { const v = pct1(n, total); return (Number.isInteger(v) ? v : v.toLocaleString(LANG === 'fr' ? 'fr-FR' : 'en-GB', { minimumFractionDigits: 1 })) + (LANG === 'fr' ? ' %' : '%'); };
const bar = (label, n, total, mine, attrs = {}) => h(attrs.onclick ? 'button' : 'div', { class: `opt ${mine ? 'mine' : ''}`, ...attrs },
  h('div', { class: 'bar', style: `width:${pct(n, total)}%` }),
  h('span', {}, h('span', {}, (mine ? '✓ ' : '') + label), n != null && h('span', {}, `${pct(n, total)}% · ${n}`)));

function wordCloud(words, big) {
  if (!words || !words.length) return h('p', { class: 'muted' }, t('poll.noAnswers'));
  const max = words[0].n, min = words[words.length - 1].n;
  const palette = ['var(--brand)', 'var(--accent)', '#12a05c', '#e0452b', '#7b5cd6', '#1f9bb5'];
  const shuffled = words.map((w, i) => ({ ...w, i })).sort((a, b) => ((a.i * 7919) % 13) - ((b.i * 7919) % 13));
  return h('div', { class: `cloud ${big ? 'big' : ''}` }, shuffled.map(w => {
    const r = max === min ? 0.6 : (w.n - min) / (max - min);
    return h('span', { style: `font-size:${(big ? 1.1 : 0.85) + r * (big ? 3.4 : 1.6)}rem;color:${palette[w.i % palette.length]};font-weight:${r > 0.5 ? 800 : 600}`, title: `${w.w} · ${w.n}` }, w.w);
  }));
}

// ----- Smart result views -----
// Choice / multiple choice: the leading option is emphasised (🏆 + strong fill), the others stay quiet.
function choiceBars(p, onVote) {
  const total = p.type === 'multi' ? Math.max(1, p.total) : Math.max(1, p.counts.reduce((a, b) => a + b, 0));
  const max = Math.max(...p.counts);
  return h('div', { class: 'cbars' }, p.options.map((o, i) => {
    const n = p.counts[i], pc = pct1(n, total), lead = n > 0 && n === max, mine = p.mine.includes(i);
    return h(onVote ? 'button' : 'div', { class: `cbar ${lead ? 'lead' : ''} ${mine ? 'mine' : ''}`, ...(onVote ? { onclick: () => onVote(i) } : {}) },
      h('div', { class: 'cbar-fill', style: `width:${pc}%` }),
      h('span', { class: 'cbar-l' }, (mine ? '✓ ' : '') + o, lead && h('span', { class: 'cbar-lead', 'aria-label': t('poll.leading') }, ' 🏆')),
      h('span', { class: 'cbar-v' }, h('b', {}, fmtPct(n, total)), h('small', {}, ' · ' + n)));
  }), p.type === 'multi' && h('div', { class: 'muted cbar-note' }, t('poll.multiNote')));
}

// Rating: stars filled to the tenth + distribution on a sequential gold ramp
function ratingView(p, big) {
  const avg = p.avg ?? 0;
  return h('div', { class: `rating-v ${big ? 'big' : ''}` },
    h('div', { class: 'rating-top' },
      h('div', { class: 'rating-avg' }, p.avg != null ? avg.toFixed(1) : '—'),
      h('div', {}, h('div', { class: 'stars-meter', role: 'img', 'aria-label': `${avg.toFixed(1)} / 5` }, h('span', { class: 'sm-bg' }, '★★★★★'), h('span', { class: 'sm-fg', style: `width:${avg / 5 * 100}%` }, '★★★★★')),
        h('div', { class: 'muted' }, t('poll.responses', { n: p.total })))),
    h('div', { class: 'rating-dist' }, [5, 4, 3, 2, 1].map(v => {
      const n = p.dist[v - 1];
      return h('div', { class: `rd-row ${p.mine === v ? 'mine' : ''}` }, h('span', { class: 'rd-k' }, v + '★'),
        h('div', { class: 'rd-track' }, h('div', { class: `rd-fill r${v}`, style: `width:${pct(n, p.total)}%` })), h('span', { class: 'rd-v' }, fmtPct(n, p.total)));
    })));
}

// NPS: gauge -100…+100 with a verdict, 100% split bar and the 0–10 distribution, coloured by group
const npsVerdict = n => n == null ? null : n >= 70 ? ['excellent', t('nps.excellent')] : n >= 30 ? ['great', t('nps.great')] : n >= 0 ? ['good', t('nps.good')] : ['low', t('nps.low')];
function npsGauge(score, big) {
  const W = 260, H = 150, cx = 130, cy = 128, R = 98, sw = 18;
  const ang = v => Math.PI * (1 - (v + 100) / 200);                 // -100 → left, +100 → right
  const pt = (v, r = R) => [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))];
  const arc = (a, b, cls) => { const [x1, y1] = pt(a), [x2, y2] = pt(b); return sv('path', { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`, class: `g-z ${cls}`, 'stroke-width': sw }); };
  const v = score == null ? null : Math.max(-100, Math.min(100, score));
  const verdict = npsVerdict(score);
  const marker = v != null && (() => { const [x, y] = pt(v); return [sv('circle', { cx: x, cy: y, r: sw / 2 + 5, class: 'g-mark' }), sv('circle', { cx: x, cy: y, r: 4, class: 'g-mark-dot' })]; })();
  const lbl = (val, anchor) => { const [x, y] = pt(val, R); return sv('text', { x: x + (anchor === 'start' ? -sw / 2 : anchor === 'end' ? sw / 2 : 0), y: val === 0 ? y - sw / 2 - 6 : y + 16, 'text-anchor': anchor, class: 'g-tick' }, val > 0 ? '+' + val : String(val)); };
  return h('div', { class: `nps-gauge ${big ? 'big' : ''}` },
    sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `NPS ${score ?? '—'}${verdict ? ' — ' + verdict[1] : ''}` },
      arc(-100, -1, 'z-low'), arc(1, 29, 'z-good'), arc(31, 69, 'z-great'), arc(71, 100, 'z-exc'),
      lbl(-100, 'start'), lbl(0, 'middle'), lbl(100, 'end'), marker),
    h('div', { class: 'g-center' }, h('div', { class: 'g-score' }, score == null ? '—' : (score > 0 ? '+' : '') + score), h('div', { class: 'g-unit' }, 'NPS'),
      verdict && h('div', { class: `g-verdict v-${verdict[0]}` }, verdict[1])));
}
function npsView(p, big) {
  const s = p.split || { promoters: 0, passives: 0, detractors: 0 };
  const tot = Math.max(1, p.total);
  const seg = (cls, n, emoji, label) => n > 0 && h('div', { class: `ns-seg ${cls}`, style: `flex:${n}`, title: `${label}: ${n} (${fmtPct(n, tot)})` }, pct(n, tot) >= 12 ? `${emoji} ${fmtPct(n, tot)}` : '');
  const maxD = Math.max(1, ...(p.dist || [1]));
  return h('div', { class: `nps-v ${big ? 'big' : ''}` },
    npsGauge(p.nps, big),
    h('div', { class: 'ns-bar', role: 'img', 'aria-label': `${t('poll.detractors')} ${pct(s.detractors, tot)}%, ${t('poll.passives')} ${pct(s.passives, tot)}%, ${t('poll.promoters')} ${pct(s.promoters, tot)}%` },
      seg('det', s.detractors, '😞', t('poll.detractors')), seg('pas', s.passives, '😐', t('poll.passives')), seg('pro', s.promoters, '😍', t('poll.promoters'))),
    h('div', { class: 'ns-legend' },
      h('span', {}, h('i', { class: 'sw det' }), `${t('poll.detractors')} 0–6 · ${s.detractors}`),
      h('span', {}, h('i', { class: 'sw pas' }), `${t('poll.passives')} 7–8 · ${s.passives}`),
      h('span', {}, h('i', { class: 'sw pro' }), `${t('poll.promoters')} 9–10 · ${s.promoters}`)),
    p.dist && h('div', { class: 'ns-dist', role: 'img', 'aria-label': t('nps.distribution') }, p.dist.map((n, v) =>
      h('div', { class: `nd-col ${p.mine === v ? 'mine' : ''}`, title: `${v}: ${n}` },
        h('div', { class: 'nd-track' }, h('div', { class: `nd-bar ${v <= 6 ? 'det' : v <= 8 ? 'pas' : 'pro'}`, style: `height:${Math.max(n ? 6 : 0, 100 * n / maxD)}%` })),
        h('span', {}, String(v))))));
}

function pollResults(p, opts = {}) {
  const { big } = opts;
  if (!p.show) return h('p', { class: 'muted hidden-res' }, '🙈 ' + t('poll.hiddenUntilClose'));
  if (p.type === 'choice' || p.type === 'multi') return choiceBars(p);
  if (p.type === 'rating') return ratingView(p, big);
  if (p.type === 'nps') return npsView(p, big);
  if (p.type === 'wordcloud') return wordCloud(p.words, big);
  if (p.type === 'open') {
    const list = (p.responses || []).slice(0, big ? 12 : 50);
    if (!list.length) return h('p', { class: 'muted' }, t('poll.noAnswers'));
    return h('div', { class: `answers ${big ? 'big' : ''}` }, list.map(r => h('div', { class: `answer ${r.mine ? 'mine' : ''}` }, r.text,
      opts.onRemove && h('button', { class: 'x', 'aria-label': t('common.delete'), onclick: () => opts.onRemove({ rid: r.id }) }, '✕'))));
  }
  return null;
}

function pollInput(p, post, ui) {
  if (!p.open) return null;
  const vote = async d => { const first = !hasAnswered(p); await post(`/polls/${p.id}/vote`, d); if (first) toast('✓ ' + t('poll.thanks')); };
  if (p.type === 'choice' || p.type === 'multi') {
    return h('div', {}, p.type === 'multi' && h('div', { class: 'muted' }, t('poll.multiHint')),
      p.options.map((o, i) => {
        const mine = p.mine.includes(i);
        return h('button', { class: `opt ${mine ? 'mine' : ''}`, onclick: () => vote({ option: i }) }, h('span', {}, h('span', {}, (mine ? '✓ ' : '') + o)));
      }).filter(() => !p.show), p.show && choiceBars(p, i => vote({ option: i })));
  }
  if (p.type === 'rating') {
    return h('div', { class: 'stars', role: 'radiogroup', 'aria-label': pollQ(p) }, [1, 2, 3, 4, 5].map(v =>
      h('button', { class: `star ${p.mine != null && v <= p.mine ? 'on' : ''}`, role: 'radio', 'aria-checked': String(p.mine === v), 'aria-label': `${v}/5`, onclick: () => vote({ value: v }) }, '★')));
  }
  if (p.type === 'nps') {
    return h('div', {}, h('div', { class: 'nps', role: 'radiogroup', 'aria-label': pollQ(p) }, Array.from({ length: 11 }, (_, v) =>
      h('button', { class: `nps-b ${p.mine === v ? 'on' : ''} ${v <= 6 ? 'd' : v <= 8 ? 'p' : 'pr'}`, role: 'radio', 'aria-checked': String(p.mine === v), onclick: () => vote({ value: v }) }, String(v)))),
      h('div', { class: 'between muted nps-legend' }, h('span', {}, t('poll.npsLow')), h('span', {}, t('poll.npsHigh'))));
  }
  if (p.type === 'wordcloud' || p.type === 'open') {
    const used = p.type === 'wordcloud' ? p.mine.length : p.mineCount;
    if (used >= 3) return h('p', { class: 'muted' }, '✓ ' + t('poll.limitReached'));
    const k = 'pi' + p.id;
    const inp = h(p.type === 'open' ? 'textarea' : 'input', { type: 'text', 'data-keep': k, rows: 2, maxlength: p.type === 'open' ? 200 : 25,
      placeholder: p.type === 'open' ? t('poll.openPh') : t('poll.wordPh'), value: ui.drafts[k] || '', oninput: e => ui.drafts[k] = e.target.value });
    return h('form', { class: 'stack', onsubmit: async e => {
      e.preventDefault();
      const text = (ui.drafts[k] || '').trim(); if (!text) return;
      await vote({ text }); ui.drafts[k] = ''; ui.rerender();
    } }, inp, h('div', { class: 'between' }, h('span', { class: 'muted' }, t('poll.remaining', { n: 3 - used })), h('button', { class: 'btn primary small' }, t('poll.send'))),
      p.type === 'wordcloud' && p.mine.length > 0 && h('div', { class: 'muted' }, t('poll.yourWords') + ' ' + p.mine.join(', ')));
  }
  return null;
}

// ---------- Live activity chart ----------
// Two panels sharing one time axis (never two y-scales on one chart):
//   1. People: connected at the same time (area) and active participants (line) — same unit
//   2. Interactions per minute (bars)
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) el.setAttribute(k, v);
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
const niceMax = v => { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return [1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(x => n <= x) * p; };   // 1,152 → 1,200 (not 2,000)

function activityKpis(s) {
  const eng = s.participants ? Math.round(100 * s.activeUsers / s.participants) : 0;
  const tile = (val, label, sub) => h('div', { class: 'kpi' }, h('b', {}, val), h('span', {}, label), sub && h('small', {}, sub));
  return h('div', { class: 'kpis' },
    tile(s.online, t('act.now')),
    tile(s.peakOnline, t('act.peak'), s.peakOnlineAt ? t('act.at', { time: isMultiDay(s) ? fmtDayTime(s.peakOnlineAt) : fmtTime(s.peakOnlineAt) }) : null),
    tile(s.participants, t('act.total')),
    tile(s.activeUsers, t('act.active'), t('act.engagement', { n: eng })),
    tile(s.interactions, t('act.interactions'), s.peak.ts ? t('act.peakAct', { n: s.peak.n, time: isMultiDay(s) ? fmtDayTime(s.peak.ts) : fmtTime(s.peak.ts) }) : null));
}

function activityChart(s, opts = {}) {
  // Long events: 'recent' = last 2 hours per minute (live), 'all' = whole event at the automatic resolution
  const useRecent = opts.range === 'recent' && s.recent;
  const tl = (useRecent ? s.recent : s.timeline) || [];
  const res = useRecent ? 1 : (s.resolution || 1);
  if (!tl.length) return h('p', { class: 'muted' }, t('act.noData'));
  const multiDay = tl.length > 1 && tl[tl.length - 1].t - tl[0].t >= 20 * 3600000;
  const tick = ts => multiDay ? (res >= 1440 ? fmtDay(ts) : fmtDayTime(ts)) : fmtTime(ts);
  const when = ts => multiDay ? fmtDayTime(ts) : fmtTime(ts);
  const W = opts.w || 360, padL = 30, padR = 12, H1 = opts.big ? 220 : 120, H2 = opts.big ? 90 : 52, gap = 22, axisH = 18, top = 16;
  const H = top + H1 + gap + H2 + axisH;
  const n = tl.length, iw = W - padL - padR;
  const x = i => padL + (n === 1 ? iw / 2 : i * iw / (n - 1));
  const maxP = niceMax(Math.max(1, ...tl.map(d => Math.max(d.online, d.active))));
  const maxA = niceMax(Math.max(1, ...tl.map(d => d.actions)));
  const y1 = v => top + H1 - (v / maxP) * H1;
  const y2Base = top + H1 + gap + H2, y2 = v => y2Base - (v / maxA) * H2;
  const fs = opts.big ? 14 : 10;
  const grid = [0, 0.5, 1].map(f => [sv('line', { x1: padL, x2: W - padR, y1: y1(maxP * f), y2: y1(maxP * f), class: 'ch-grid' }),
    sv('text', { x: padL - 6, y: y1(maxP * f) + 3, 'text-anchor': 'end', class: 'ch-ax', 'font-size': fs }, String(Math.round(maxP * f)))]);
  const grid2 = [sv('line', { x1: padL, x2: W - padR, y1: y2Base, y2: y2Base, class: 'ch-grid' }),
    sv('text', { x: padL - 6, y: y2(maxA) + 3, 'text-anchor': 'end', class: 'ch-ax', 'font-size': fs }, String(maxA))];
  const pts = (key, yf) => tl.map((d, i) => `${x(i).toFixed(1)},${yf(d[key]).toFixed(1)}`).join(' ');
  const area = n > 1 ? sv('polygon', { points: `${x(0)},${y1(0)} ${pts('online', y1)} ${x(n - 1)},${y1(0)}`, class: 'ch-area' }) : null;
  const lineO = n > 1 ? sv('polyline', { points: pts('online', y1), class: 'ch-online' }) : sv('circle', { cx: x(0), cy: y1(tl[0].online), r: 4, class: 'ch-dot-o' });
  const lineA = n > 1 ? sv('polyline', { points: pts('active', y1), class: 'ch-active' }) : sv('circle', { cx: x(0), cy: y1(tl[0].active), r: 4, class: 'ch-dot-a' });
  // Peak marker (max people connected at once)
  let pi = 0; tl.forEach((d, i) => { if (d.online > tl[pi].online) pi = i; });
  const pk = tl[pi].online > 0 && [sv('circle', { cx: x(pi), cy: y1(tl[pi].online), r: opts.big ? 6 : 4, class: 'ch-peak' }),
    sv('text', { x: Math.min(Math.max(x(pi), padL + 40), W - padR - 40), y: y1(tl[pi].online) - 7, 'text-anchor': 'middle', class: 'ch-lbl', 'font-size': fs }, t('act.peakLbl', { n: tl[pi].online, time: when(tl[pi].t) }))];
  // Bars: interactions per minute (2px gap between bars, rounded data-end)
  const bw = Math.max(1, Math.min(opts.big ? 18 : 10, iw / n - 2));
  const bars = tl.map((d, i) => d.actions > 0 && sv('rect', { x: x(i) - bw / 2, y: y2(d.actions), width: bw, height: Math.max(1, y2Base - y2(d.actions)), rx: Math.min(2, bw / 2), class: 'ch-bar' }));
  // Time axis: ~5 ticks
  const step = Math.max(1, Math.ceil(n / (multiDay ? (opts.big ? 6 : 3) : (opts.big ? 8 : 5))));
  const ticks = tl.map((d, i) => (i % step === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= step / 2) &&
    sv('text', { x: x(i), y: H - 4, 'text-anchor': i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle', class: 'ch-ax', 'font-size': fs }, tick(d.t)));
  const titles = [sv('text', { x: padL, y: top - 5, class: 'ch-ttl', 'font-size': fs }, t('act.people')),
    sv('text', { x: padL, y: top + H1 + gap - 6, class: 'ch-ttl', 'font-size': fs }, res === 1 ? t('act.perMin') : t('act.perRes', { res: resLabel(res) }))];
  // Hover: crosshair + tooltip
  const cross = sv('line', { y1: top, y2: y2Base, class: 'ch-cross', visibility: 'hidden' });
  const tip = h('div', { class: 'ch-tip', hidden: true });
  const hit = sv('rect', { x: padL, y: top, width: iw, height: y2Base - top, fill: 'transparent' });
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ch-svg', role: 'img', 'aria-label': t('act.aria', { peak: s.peakOnline, active: s.activeUsers, total: s.participants }) },
    grid, grid2, area, lineO, lineA, bars, pk, titles, ticks, cross, hit);
  const wrap = h('div', { class: `ch ${opts.big ? 'big' : ''}` },
    h('div', { class: 'ch-legend' },
      h('span', {}, h('i', { class: 'sw sw-o' }), t('act.lgOnline')),
      h('span', {}, h('i', { class: 'sw sw-a' }), t('act.lgActive')),
      h('span', {}, h('i', { class: 'sw sw-b' }), t('act.lgActions'))),
    h('div', { class: 'ch-plot' }, svg, tip),
    h('div', { class: 'muted ch-scale' }, useRecent ? t('act.scaleRecent') : t('act.scale', { res: resLabel(res), from: when(tl[0].t), to: when(tl[tl.length - 1].t) })));
  const show = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    const vx = px * W / r.width;
    const i = Math.max(0, Math.min(n - 1, Math.round(n === 1 ? 0 : (vx - padL) * (n - 1) / iw)));
    const d = tl[i];
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.replaceChildren(h('b', {}, when(d.t) + (res > 1 ? ' (+' + resLabel(res) + ')' : '')),
      h('div', {}, h('i', { class: 'sw sw-o' }), t('act.lgOnline') + ' : ' + d.online),
      h('div', {}, h('i', { class: 'sw sw-a' }), t('act.lgActive') + ' : ' + d.active),
      h('div', {}, h('i', { class: 'sw sw-b' }), t('act.lgActions') + ' : ' + d.actions));
    const left = x(i) * r.width / W;
    tip.style.left = Math.min(Math.max(0, left + 12), r.width - 170) + 'px';
  };
  const hide = () => { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  hit.addEventListener('mousemove', show); hit.addEventListener('touchstart', show, { passive: true }); hit.addEventListener('touchmove', show, { passive: true });
  hit.addEventListener('mouseleave', hide);
  if (opts.table) wrap.append(h('details', { class: 'ch-table' }, h('summary', { class: 'muted' }, t('act.table')),
    h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, t('act.time')), h('th', {}, t('act.lgOnline')), h('th', {}, t('act.lgActive')), h('th', {}, t('act.lgActions')))),
      h('tbody', {}, tl.filter(d => d.online || d.actions).map(d => h('tr', {}, h('td', {}, when(d.t)), h('td', {}, d.online), h('td', {}, d.active), h('td', {}, d.actions)))))));
  return wrap;
}

// ---------- Event ----------
function live(code, mode) {
  const qs = new URLSearchParams(location.search);
  const key = qs.get('key') || safe('key:' + code) || '';
  if (qs.get('key')) { safe('key:' + code, qs.get('key')); history.replaceState({}, '', location.pathname + (qs.get('view') ? '?view=' + qs.get('view') : '')); }
  if (mode === 'host' && !key) return go('/?host=' + code);   // not signed in: open the host sign-in with this code filled in
  const isHost = mode === 'host';
  const hostParam = isHost ? '&key=' + encodeURIComponent(key) : '';
  const state = {
    data: null, tab: isHost ? 'all' : 'top', draft: '', author: safe('author') || '', anon: safe('anon') === '1',
    sheet: false, tools: wide(), q: '', merging: null, noteEdit: null,
    poll: { type: 'choice', question: '', options: ['', ''], hidden: false }, drafts: {}, view: ['polls', 'agenda'].includes(qs.get('view')) ? qs.get('view') : 'questions',
    sessionFilter: 'all', askSession: undefined, sessEdit: { id: null, title: '', speaker: '', startTime: '', duration: '', description: '' },
  };
  if (mode === 'screen') document.body.classList.add('screen');
  if (isHost) document.body.classList.add('host-mode');

  stream = new EventSource(`${BASE}/api/events/${code}/stream?cid=${cid}${hostParam}${mode === 'screen' ? '&screen=1' : ''}`);
  stream.onmessage = e => {
    const prevHl = state.data && (state.data.questions.find(q => q.highlighted) || {}).id;
    state.data = JSON.parse(e.data);
    const nowHl = (state.data.questions.find(q => q.highlighted) || {}).id;
    if (prevHl && prevHl !== nowHl) { state.leaving = prevHl; clearTimeout(state.leavingT); state.leavingT = setTimeout(() => { state.leaving = null; render(); }, 700); }
    if (isHost && !state.data.host) { safe('key:' + code, ''); toast(t('host.expired')); return go('/?host=' + code); }
    render();
  };
  stream.onerror = () => { if (!state.data) { toast(t('err.notFound')); go('/'); } };

  const post = (p, d) => api(`/events/${code}${p}`, { key: isHost ? key : undefined, ...d });
  // Agenda helpers (an event without sessions behaves exactly as before)
  const sessList = () => (state.data && state.data.sessions) || [];
  const sessById = id => sessList().find(x => x.id === id);
  const liveSess = () => sessList().find(x => x.status === 'live');
  const sessLabel = x => x.title + (x.speaker ? ' — ' + x.speaker : '');
  const askTarget = () => state.askSession === undefined ? (liveSess()?.id || '') : (sessById(state.askSession) ? state.askSession : '');
  const act = (id, action, extra) => post(`/questions/${id}/action`, { action, ...extra });
  const ui = { drafts: state.drafts, rerender: () => render() };

  function render() {
    const d = state.data; if (!d) return;
    document.title = d.title + ' — Q&A';
    const y = window.scrollY;
    const a = document.activeElement;
    const keep = a && a.dataset && a.dataset.keep ? { id: a.dataset.keep, s: a.selectionStart, e: a.selectionEnd } : null;
    $app.replaceChildren(mode === 'screen' ? screenView(d) : pageView(d));
    window.scrollTo(0, y);
    if (keep) { const el = document.querySelector(`[data-keep="${keep.id}"]`); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch {} } }
  }

  // ----- Question card -----
  function qCard(q, rank = -1) {
    const medal = ['🥇', '🥈', '🥉'][rank];
    const tags = [
      medal && h('span', { class: 'tag rank' }, medal + ' Top ' + (rank + 1)),
      q.pinned && h('span', { class: 'tag warn' }, '📌 ' + t('q.pinned')),
      q.highlighted && h('span', { class: 'tag onscreen' }, '🎤 ' + t('q.onScreenBadge')),
      q.status === 'answered' && h('span', { class: 'tag ok' }, '✓ ' + t('q.answered')),
      q.status === 'pending' && h('span', { class: 'tag' }, '⏳ ' + t('q.pending')),
      q.sessionId && sessById(q.sessionId) && h('span', { class: 'tag sess' }, '🎤 ' + sessById(q.sessionId).title),
      q.merged.length > 0 && h('span', { class: `tag ${q.mergedMine && !isHost ? 'warn' : ''}` }, '🔗 ' + (q.mergedMine && !isHost ? t('q.mergedTag') : t('q.mergedN', { n: q.merged.length }))),
    ];
    const voteBtn = h('button', { class: 'vote', 'aria-pressed': String(q.voted), 'aria-label': `${q.voted ? t('q.unvote') : t('q.upvote')} — ${q.votes}`,
      disabled: q.status === 'pending' || mode === 'screen', onclick: () => { q.voted = !q.voted; q.votes += q.voted ? 1 : -1; render(); post(`/questions/${q.id}/vote`, {}); } },
      h('span', { class: 'thumb', 'aria-hidden': 'true' }, '👍'), h('b', {}, q.votes));
    const reacts = q.status === 'pending' ? null : h('div', { class: 'reacts' }, q.reacts.map(r => h('button', { class: 'react', 'aria-pressed': String(r.mine), title: t('react.' + REACT_KEYS[r.e]), 'aria-label': `${t('react.' + REACT_KEYS[r.e])} (${r.n})`, disabled: mode === 'screen', onclick: () => post(`/questions/${q.id}/react`, { emoji: r.e }) }, r.e, r.n > 0 && h('i', {}, r.n))));
    const note = q.note && !(state.noteEdit && state.noteEdit.id === q.id) && h('div', { class: 'note' }, h('b', {}, '💬 ' + t('q.hostAnswer')), ' ', q.note);
    const merged = q.merged.length > 0 && mode !== 'screen' && h('details', { class: 'merged' }, h('summary', { class: 'muted' }, t('q.showMerged', { n: q.merged.length })),
      h('ul', {}, q.merged.map(m => h('li', {}, m.text, h('span', { class: 'muted' }, ' — ' + (m.author || t('q.anonymous')) + (m.mine ? ' ' + t('q.you') : ''))))));
    let noteEditor = null;
    if (isHost && state.noteEdit && state.noteEdit.id === q.id) {
      noteEditor = h('form', { class: 'stack note-edit', onsubmit: async e => { e.preventDefault(); await act(q.id, 'note', { note: state.noteEdit.text }); state.noteEdit = null; render(); } },
        h('textarea', { 'data-keep': 'note' + q.id, rows: 3, maxlength: 1000, placeholder: t('q.notePh'), value: state.noteEdit.text, oninput: e => state.noteEdit.text = e.target.value }),
        h('div', { class: 'row-actions', style: 'margin:0' }, h('button', { class: 'btn small primary' }, t('common.save')), h('button', { type: 'button', class: 'btn small', onclick: () => { state.noteEdit = null; render(); } }, t('common.cancel'))));
    }
    let acts = null;
    if (isHost && state.merging) {
      acts = state.merging === q.id
        ? h('div', { class: 'row-actions' }, h('span', { class: 'tag warn' }, t('q.mergeSource')), h('button', { class: 'btn small', onclick: () => { state.merging = null; render(); } }, t('common.cancel')))
        : h('div', { class: 'row-actions' }, h('button', { class: 'btn small primary', onclick: async () => { const src = state.merging; state.merging = null; await act(src, 'merge', { into: q.id }); toast(t('q.mergedToast')); } }, '⤵ ' + t('q.mergeHere')));
    } else if (isHost) {
      acts = h('div', { class: 'row-actions' },
        q.status === 'pending' && h('button', { class: 'btn small primary', onclick: () => act(q.id, 'approve') }, '✔ ' + t('q.approve')),
        q.status !== 'pending' && h('button', { class: `btn small ${q.highlighted ? 'primary screen-on' : ''}`, 'aria-pressed': String(!!q.highlighted), onclick: () => act(q.id, 'highlight') }, q.highlighted ? '✕ ' + t('q.unscreen') : '🎤 ' + t('q.screen')),
        q.status !== 'pending' && h('button', { class: 'btn small', onclick: () => act(q.id, 'answer') }, q.status === 'answered' ? '↩ ' + t('q.reopen') : '✓ ' + t('q.markAnswered')),
        h('button', { class: 'btn small', onclick: () => { state.noteEdit = { id: q.id, text: q.note }; render(); setTimeout(() => document.querySelector(`[data-keep="note${q.id}"]`)?.focus(), 30); } }, '💬 ' + (q.note ? t('q.editNote') : t('q.addNote'))),
        h('button', { class: 'btn small', onclick: () => act(q.id, 'pin') }, q.pinned ? t('q.unpin') : '📌 ' + t('q.pin')),
        h('button', { class: 'btn small', onclick: () => { state.merging = q.id; render(); toast(t('q.mergePick')); } }, '🔗 ' + t('q.merge')),
        sessList().length > 0 && h('select', { class: 'move-sel', 'aria-label': t('ag.moveTo'), title: t('ag.moveTo'), onchange: async e => { await act(q.id, 'move', { sessionId: e.target.value || null }); toast(t('ag.moved')); } },
          h('option', { value: '', selected: !q.sessionId }, '🗓 ' + t('ag.whole')), sessList().map(x => h('option', { value: x.id, selected: q.sessionId === x.id }, '🎤 ' + sessLabel(x)))),
        h('button', { class: 'btn small danger', 'aria-label': t('common.delete'), onclick: () => { if (confirm(t('q.deleteConfirm'))) act(q.id, 'delete'); } }, '🗑'));
    }
    const heat = q.votes >= 10 ? 3 : q.votes >= 5 ? 2 : q.votes >= 2 ? 1 : 0;
    return h('article', { class: `card q heat${heat} ${q.highlighted ? 'hl' : ''} ${state.leaving === q.id && !q.highlighted ? 'hl-out' : ''} ${q.status} ${state.merging === q.id ? 'merging' : ''}` }, voteBtn,
      h('div', { class: 'q-body' }, tags.some(Boolean) && h('div', { class: 'tags' }, tags), h('div', { class: 'q-text' }, q.text),
        h('div', { class: 'muted' }, (q.author || t('q.anonymous')) + (q.mine ? ' ' + t('q.you') : '') + ' · ' + ago(q.ts)),
        !isHost && mode !== 'screen' && q.mergedMine && h('div', { class: 'merged-notice' }, '🔗 ', h('b', {}, t('q.mergedYours')), ' ',
          q.merged.filter(m => m.mine).map(m => '« ' + m.text + ' »').join(' · '), h('div', { class: 'muted' }, t('q.mergedYoursSub'))),
        note, noteEditor, merged, reacts, acts));
  }

  // ----- Poll card -----
  function pollCard(p, opts = {}) {
    const done = !isHost && hasAnswered(p);
    const head = h('div', { class: 'poll-h' },
      p.open ? h('span', { class: 'live-dot' }, p.persistent ? t('poll.allEvent') : t('poll.live')) : h('span', { class: 'tag' }, t('poll.closed')),
      h('span', { class: 'tag' }, TYPE_ICON[p.type] + ' ' + t('ptype.' + p.type)),
      p.hidden && (isHost || !p.show) && h('span', { class: 'tag' }, '🙈 ' + t('poll.hidden')),
      isHost && p.onScreen && h('span', { class: 'tag warn' }, '📺 ' + t('poll.onScreen')),
      h('b', { class: 'poll-q' }, pollQ(p)));
    const participantInput = !isHost && pollInput(p, post, ui);
    const showResults = isHost || !participantInput || !['choice', 'multi'].includes(p.type) || !p.show;
    const results = showResults && pollResults(p, isHost && Array.isArray(p.responses) ? { onRemove: d => post(`/polls/${p.id}/action`, { action: 'removeResponse', ...d }) } : {});
    const footer = h('div', { class: 'poll-foot' },
      done && p.open ? h('span', { class: 'ok-txt' }, '✓ ' + (['wordcloud', 'open'].includes(p.type) ? t('poll.sent') : t('poll.recorded'))) : h('span', {}),
      h('span', { class: 'muted' }, t('poll.responses', { n: p.total })));
    return h('div', { class: `card poll ${p.open ? 'is-open' : ''} ${p.persistent ? 'is-nps' : ''} ${opts.compact ? 'compact' : ''}` }, head,
      p.persistent && !isHost && p.open && h('p', { class: 'muted poll-sub' }, done ? '🎉 ' + t('nps.thanks') : t('nps.sub')),
      participantInput, results, footer,
      isHost && h('div', { class: 'row-actions' },
        h('button', { class: 'btn small', onclick: () => post(`/polls/${p.id}/action`, { action: 'toggle' }) }, p.open ? '⏹ ' + t('poll.close') : '▶ ' + t('poll.reopen')),
        h('button', { class: 'btn small', onclick: () => post(`/polls/${p.id}/action`, { action: 'screen' }) }, p.onScreen ? t('poll.offScreen') : '📺 ' + t('poll.toScreen')),
        p.hidden && p.open && h('button', { class: 'btn small', onclick: () => post(`/polls/${p.id}/action`, { action: 'reveal' }) }, '👁 ' + t('poll.reveal')),
        h('button', { class: 'btn small danger', 'aria-label': t('common.delete'), onclick: () => confirm(t('poll.deleteConfirm')) && post(`/polls/${p.id}/action`, { action: 'delete' }) }, '🗑')));
  }

  // ----- Participant: analytics unlocked after rating the event NPS -----
  function guestAnalytics(d) {
    if (isHost || !d.stats) return null;
    return h('section', { class: 'card analytics-box guest-an' },
      h('div', { class: 'between' }, h('b', {}, '📈 ' + t('an.title')), h('span', { class: 'live-dot' }, t('poll.live'))),
      h('p', { class: 'muted', style: 'margin:0' }, t('an.guestSub')),
      activityKpis(d.stats),
      activityChart(d.stats, { w: 360, range: 'recent' }));
  }

  // ----- Participant: polls panel -----
  function pollsPanel(d) {
    const liveP = d.polls.filter(p => p.open && !p.persistent);
    const nps = d.polls.find(p => p.persistent);
    const past = d.polls.filter(p => !p.open && !p.persistent);
    return h('div', { class: 'stack' },
      liveP.length ? liveP.map(p => pollCard(p)) : h('div', { class: 'card empty-poll' }, h('div', { class: 'big-emoji' }, '📊'), h('b', {}, t('poll.noneLive')), h('p', { class: 'muted' }, t('poll.noneLiveSub'))),
      nps && pollCard(nps),
      guestAnalytics(d),
      past.length > 0 && h('details', { class: 'card past-polls', open: state.pastOpen, ontoggle: e => state.pastOpen = e.target.open },
        h('summary', {}, '🗂 ' + t('guest.pastPolls', { n: past.length })),
        h('div', { class: 'stack', style: 'margin-top:10px' }, past.map(p => pollCard(p)))));
  }

  // ----- Question form -----
  function askForm(d, k) {
    const ta = h('textarea', { 'data-keep': 'q' + k, maxlength: 280, rows: 3, placeholder: t('ask.ph'), 'aria-label': t('ask.label'), value: state.draft,
      oninput: e => { state.draft = e.target.value; counter.textContent = `${state.draft.length}/280`; } });
    const counter = h('span', { class: 'muted' }, `${state.draft.length}/280`);
    const nameIn = h('input', { type: 'text', 'data-keep': 'n' + k, placeholder: t('ask.namePh'), maxlength: 40, 'aria-label': t('ask.nameLabel'), value: state.author, disabled: state.anon,
      oninput: e => { state.author = e.target.value; safe('author', state.author); } });
    const anon = h('input', { type: 'checkbox', checked: state.anon, onchange: e => { state.anon = e.target.checked; safe('anon', state.anon ? '1' : '0'); nameIn.disabled = state.anon; } });
    return h('form', { class: 'stack', onsubmit: async e => {
      e.preventDefault();
      if (state.draft.trim().length < 3) return toast(t('err.short'));
      await post('/questions', { text: state.draft, author: state.author, anon: state.anon, sessionId: sessList().length ? (askTarget() || null) : null });
      state.draft = ''; state.sheet = false; state.tab = 'mine'; render();
      toast(d.moderation ? t('ask.sentModerated') : t('ask.sent'));
    } }, sessList().length > 0 && h('label', { class: 'ask-to' }, h('span', { class: 'muted' }, t('ask.to')),
        h('select', { 'data-keep': 'as' + k, onchange: e => { state.askSession = e.target.value; } },
          h('option', { value: '', selected: askTarget() === '' }, '🗓 ' + t('ag.whole')),
          sessList().map(x => h('option', { value: x.id, selected: askTarget() === x.id }, (x.status === 'live' ? '🔴 ' : '🎤 ') + sessLabel(x))))),
      ta, h('div', { class: 'between' }, h('label', { class: 'row' }, anon, t('q.anonymous')), counter), nameIn, h('button', { class: 'btn primary block' }, t('ask.submit')));
  }

  // ----- Host: new poll form -----
  function pollForm(d) {
    const P = state.poll;
    const needsOptions = P.type === 'choice' || P.type === 'multi';
    const hasNps = d.polls.some(p => p.persistent);
    const setOpt = (i, v) => { P.options[i] = v; };
    const presets = [[t('preset.yes'), t('preset.no')], [t('preset.yes'), t('preset.no'), t('preset.dontKnow')], ['A', 'B', 'C', 'D']];
    return h('div', { class: 'stack', style: 'margin-top:10px' },
      P.editing && h('div', { class: 'banner' }, '✏️ ' + t('pollf.editing')),
      h('div', { class: 'type-grid', role: 'radiogroup', 'aria-label': t('pollf.type') }, POLL_TYPES.map(ty =>
        h('button', { type: 'button', class: 'type-card', role: 'radio', 'aria-checked': String(P.type === ty), onclick: () => { P.type = ty; render(); } },
          h('span', { class: 'ti' }, TYPE_ICON[ty]), h('b', {}, t('ptype.' + ty)), h('span', { class: 'muted' }, t('pdesc.' + ty))))),
      h('input', { type: 'text', 'data-keep': 'pq', placeholder: t('pollf.questionPh.' + P.type), maxlength: 140, 'aria-label': t('pollf.question'), value: P.question, oninput: e => P.question = e.target.value }),
      needsOptions && h('div', { class: 'stack opts-edit' },
        P.options.map((o, i) => h('div', { class: 'opt-row' },
          h('span', { class: 'opt-n' }, String(i + 1)),
          h('input', { type: 'text', 'data-keep': 'po' + i, maxlength: 60, placeholder: t('pollf.option', { n: i + 1 }), 'aria-label': t('pollf.option', { n: i + 1 }), value: o, oninput: e => setOpt(i, e.target.value),
            onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); if (P.options.length < 8) { P.options.push(''); render(); setTimeout(() => document.querySelector(`[data-keep="po${P.options.length - 1}"]`)?.focus(), 20); } } } }),
          P.options.length > 2 && h('button', { type: 'button', class: 'btn small', 'aria-label': t('common.delete'), onclick: () => { P.options.splice(i, 1); render(); } }, '✕'))),
        h('div', { class: 'row-actions', style: 'margin:0' },
          P.options.length < 8 && h('button', { type: 'button', class: 'btn small', onclick: () => { P.options.push(''); render(); } }, '＋ ' + t('pollf.addOption')),
          presets.map(pr => h('button', { type: 'button', class: 'btn small chip', onclick: () => { P.options = [...pr]; render(); } }, pr.join(' / '))))),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: P.hidden, onchange: e => P.hidden = e.target.checked }), t('pollf.hidden')),
      (() => {
        const payload = () => ({ type: P.type, question: P.question, options: needsOptions ? P.options : [], hidden: P.hidden });
        const reset = () => { state.poll = { type: P.type, question: '', options: ['', ''], hidden: false }; render(); };
        if (P.editing) {
          const id = P.editing;
          return h('div', { class: 'row-actions', style: 'margin:0' },
            h('button', { class: 'btn primary', onclick: async () => { await post(`/polls/${id}/action`, { action: 'edit', ...payload() }); toast('💾 ' + t('pollf.saved')); reset(); } }, '💾 ' + t('pollf.saveChanges')),
            h('button', { class: 'btn', onclick: async () => { await post(`/polls/${id}/action`, { action: 'edit', ...payload() }); await post(`/polls/${id}/action`, { action: 'launch' }); toast('🚀 ' + t('pollf.launched')); reset(); } }, '🚀 ' + t('pollf.saveLaunch')),
            h('button', { class: 'btn', onclick: reset }, t('common.cancel')));
        }
        return h('div', { class: 'row-actions', style: 'margin:0' },
          h('button', { class: 'btn primary', onclick: async () => { await post('/polls', payload()); toast('🚀 ' + t('pollf.launched')); reset(); } }, '🚀 ' + t('pollf.publish')),
          h('button', { class: 'btn', onclick: async () => { await post('/polls', { ...payload(), draft: true }); toast('💾 ' + t('pollf.drafted')); reset(); } }, '💾 ' + t('pollf.saveDraft')));
      })(),
      !hasNps && h('button', { class: 'btn small', onclick: () => post('/polls', { persistent: true }) }, '📈 ' + t('pollf.addNps')));
  }

  // ----- Host: polls prepared in advance -----
  function draftsCard(d) {
    const drafts = d.polls.filter(p => p.draft);
    if (!drafts.length) return null;
    return h('div', { class: 'card drafts' },
      h('div', { class: 'between' }, h('b', {}, '📋 ' + t('drafts.title', { n: drafts.length })), h('span', { class: 'muted' }, t('drafts.hint'))),
      h('ol', { class: 'draft-list' }, drafts.map(p => h('li', { class: state.poll.editing === p.id ? 'editing' : '' },
        h('div', { class: 'draft-main' }, h('span', { class: 'tag' }, TYPE_ICON[p.type] + ' ' + t('ptype.' + p.type)), p.hidden && h('span', { class: 'tag' }, '🙈'),
          h('div', { class: 'draft-q' }, pollQ(p)), p.options && h('div', { class: 'muted' }, p.options.join(' · '))),
        h('div', { class: 'row-actions', style: 'margin:6px 0 0' },
          h('button', { class: 'btn small primary', onclick: async () => { await post(`/polls/${p.id}/action`, { action: 'launch' }); toast('🚀 ' + t('pollf.launched')); } }, '▶ ' + t('drafts.launch')),
          h('button', { class: 'btn small', onclick: () => { state.poll = { type: p.type, question: p.question, options: p.options ? [...p.options] : ['', ''], hidden: p.hidden, editing: p.id }; state.tools = true; render(); document.querySelector('[data-keep="pq"]')?.focus(); } }, '✏️ ' + t('drafts.edit')),
          h('button', { class: 'btn small danger', 'aria-label': t('common.delete'), onclick: () => confirm(t('poll.deleteConfirm')) && post(`/polls/${p.id}/action`, { action: 'delete' }) }, '🗑'))))));
  }

  // ----- Host: stats + exports -----
  const csvHref = () => `${BASE}/api/events/${code}/export.csv?key=${encodeURIComponent(key)}&sep=${LANG === 'fr' ? ';' : ','}`;
  function analyticsActions(d) {
    const onScreen = d.screenPoll === 'activity';
    return h('div', { class: 'row-actions' },
      h('button', { class: `btn small ${onScreen ? 'primary' : ''}`, onclick: () => post('/settings', { screenActivity: !onScreen }) }, onScreen ? t('act.offScreen') : '📺 ' + t('act.toScreen')),
      h('a', { class: 'btn small', href: csvHref() }, '⬇ ' + t('export.csv')));
  }
  // Sidebar box (compact)
  function statsCard(d) {
    const s = d.stats; if (!s || state.tab === 'analytics') return null;
    return h('section', { class: 'card analytics-box' },
      h('div', { class: 'between' }, h('b', {}, '📈 ' + t('an.title')), h('span', { class: 'live-dot' }, t('poll.live'))),
      activityKpis(s),
      activityChart(s, { w: 360, range: 'recent' }),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn small primary', onclick: () => { state.tab = 'analytics'; render(); window.scrollTo(0, 0); } }, '📈 ' + t('an.open'))),
      analyticsActions(d));
  }
  // Full-width Analytics tab
  function analyticsPanel(d) {
    const s = d.stats;
    const tile = (val, label) => h('div', { class: 'kpi' }, h('b', {}, val), h('span', {}, label));
    const mins = s.range ? Math.round((s.range.end - s.range.start) / 60000) + 1 : 0;
    const dur = !mins ? '—' : mins < 120 ? `${mins} min` : mins < 2880 ? `${Math.round(mins / 60)} h` : `${Math.floor(mins / 1440)} ${LANG === 'fr' ? 'j' : 'd'} ${Math.round((mins % 1440) / 60)} h`;
    return h('section', { class: 'analytics-full stack' },
      h('div', { class: 'card stack' },
        h('div', { class: 'between' }, h('h2', { style: 'margin:0' }, '📈 ' + t('an.title')), h('span', { class: 'live-dot' }, t('poll.live'))),
        h('p', { class: 'muted', style: 'margin:0' }, t('an.sub', { res: resLabel(s.resolution || 1) })),
        activityKpis(s),
        s.recent && h('div', { class: 'seg seg-sm', role: 'tablist' }, [['all', t('act.rangeAll')], ['recent', t('act.rangeRecent')]].map(([k, l]) =>
          h('button', { role: 'tab', 'aria-selected': String((state.anRange || 'all') === k), onclick: () => { state.anRange = k; render(); } }, l))),
        activityChart(s, { w: 760, table: true, range: state.anRange || 'all' })),
      h('div', { class: 'card stack' },
        h('b', {}, '💬 ' + t('an.content')),
        h('div', { class: 'kpis kpis-6' },
          tile(s.questions, t('stats.questions')), tile(s.answered, t('stats.answered')),
          tile(s.votes, t('stats.votes')), tile(s.reactions, t('stats.reactions')),
          tile(s.pollResponses, t('stats.pollResponses')),
          tile(s.nps !== undefined && s.nps != null ? (s.nps > 0 ? '+' : '') + s.nps : '—', t('stats.nps')),
          tile(dur, t('an.duration')),
          tile(s.participants ? (s.interactions / s.participants).toFixed(1) : '—', t('an.perPerson')))),
      h('div', { class: 'card' }, h('b', {}, '⚙️ ' + t('an.actions')), analyticsActions(d)));
  }

  // ----- Agenda: participant view -----
  function agendaPanel(d) {
    const ss = sessList();
    return h('div', { class: 'stack agenda' }, ss.map(x => {
      const nq = d.questions.filter(q => q.sessionId === x.id && q.status !== 'pending').length;
      return h('article', { class: `card sess-card s-${x.status}` },
        h('div', { class: 'sess-time' }, h('b', {}, x.startTime || '—'), x.duration && h('small', {}, x.duration + ' min')),
        h('div', { class: 'sess-main' },
          h('div', { class: 'tags' }, x.status === 'live' ? h('span', { class: 'live-dot' }, t('ag.now')) : h('span', { class: 'tag' }, x.status === 'done' ? '✓ ' + t('ag.done') : t('ag.upcoming'))),
          h('b', { class: 'sess-title' }, x.title), x.speaker && h('div', { class: 'muted' }, '🎤 ' + x.speaker),
          x.description && h('p', { class: 'sess-desc' }, x.description),
          h('div', { class: 'row-actions' },
            d.open && x.status !== 'done' && h('button', { class: 'btn small primary', onclick: () => {
              state.askSession = x.id; state.view = 'questions';
              if (wide()) { render(); document.querySelector('[data-keep="qa"]')?.focus(); } else { state.sheet = true; render(); setTimeout(() => document.querySelector('[data-keep="qs"]')?.focus(), 50); }
            } }, '✍️ ' + t('ag.ask')),
            h('button', { class: 'btn small', onclick: () => { state.sessionFilter = x.id; state.view = 'questions'; render(); window.scrollTo(0, 0); } }, '💬 ' + t('ag.seeQ', { n: nq })))));
    }));
  }

  // ----- Agenda: host editor -----
  function agendaEditor(d) {
    const ss = sessList(), E = state.sessEdit;
    const field = (k, attrs) => h(attrs.tag || 'input', { 'data-keep': 'se-' + k, value: E[k] ?? '', oninput: e => { E[k] = e.target.value; }, ...attrs, tag: null });
    const reset = () => { state.sessEdit = { id: null, title: '', speaker: '', startTime: '', duration: '', description: '' }; render(); };
    const sAct = (action, extra) => post('/sessions', { action, ...extra });
    const form = h('form', { class: 'card stack sess-form', onsubmit: async e => {
      e.preventDefault();
      const payload = { title: E.title, speaker: E.speaker, startTime: E.startTime, duration: E.duration === '' ? null : Number(E.duration), description: E.description };
      await sAct(E.id ? 'update' : 'create', E.id ? { id: E.id, ...payload } : payload);
      toast('✔ ' + (E.id ? t('ag.saved') : t('ag.added'))); reset();
    } },
      h('div', { class: 'between' }, h('b', {}, E.id ? '✏️ ' + t('ag.editTitle') : '➕ ' + t('ag.add')), h('span', { class: 'muted' }, t('ag.count', { n: ss.length }))),
      field('title', { type: 'text', maxlength: 100, placeholder: t('ag.titlePh'), 'aria-label': t('ag.titleL'), required: true }),
      field('speaker', { type: 'text', maxlength: 100, placeholder: t('ag.speakerPh'), 'aria-label': t('ag.speakerPh') }),
      h('div', { class: 'sess-row' },
        h('label', {}, h('span', { class: 'muted' }, t('ag.start')), field('startTime', { type: 'time' })),
        h('label', {}, h('span', { class: 'muted' }, t('ag.duration')), field('duration', { type: 'number', min: 1, max: 1440, inputmode: 'numeric', placeholder: '20' }))),
      field('description', { tag: 'textarea', rows: 2, maxlength: 300, placeholder: t('ag.descPh'), 'aria-label': t('ag.descPh') }),
      h('div', { class: 'row-actions', style: 'margin:0' },
        h('button', { class: 'btn primary', disabled: !E.id && ss.length >= 20 }, E.id ? '💾 ' + t('ag.save') : '➕ ' + t('ag.add')),
        E.id && h('button', { type: 'button', class: 'btn', onclick: reset }, t('common.cancel'))));
    const list = ss.length ? h('ol', { class: 'sess-list' }, ss.map((x, i) => h('li', { class: `s-${x.status} ${E.id === x.id ? 'editing' : ''}` },
      h('div', { class: 'sess-li-main' },
        h('div', {}, x.status === 'live' ? h('span', { class: 'live-dot' }, t('ag.now')) : h('span', { class: 'tag' }, x.status === 'done' ? '✓ ' + t('ag.done') : t('ag.upcoming')),
          ' ', h('span', { class: 'muted' }, [x.startTime, x.duration && x.duration + ' min'].filter(Boolean).join(' · '))),
        h('b', {}, x.title), x.speaker && h('div', { class: 'muted' }, '🎤 ' + x.speaker),
        h('div', { class: 'muted' }, t('ag.seeQ', { n: d.questions.filter(q => q.sessionId === x.id).length }))),
      h('div', { class: 'row-actions', style: 'margin:6px 0 0' },
        x.status !== 'live' && h('button', { class: 'btn small primary', onclick: () => sAct('status', { id: x.id, status: 'live' }) }, '▶ ' + t('ag.goLive')),
        x.status === 'live' && h('button', { class: 'btn small', onclick: () => sAct('status', { id: x.id, status: 'done' }) }, '✓ ' + t('ag.markDone')),
        x.status === 'done' && h('button', { class: 'btn small', onclick: () => sAct('status', { id: x.id, status: 'upcoming' }) }, '↺ ' + t('ag.reset')),
        h('button', { class: 'btn small', 'aria-label': t('ag.up'), title: t('ag.up'), disabled: i === 0, onclick: () => sAct('move', { id: x.id, dir: -1 }) }, '↑'),
        h('button', { class: 'btn small', 'aria-label': t('ag.down'), title: t('ag.down'), disabled: i === ss.length - 1, onclick: () => sAct('move', { id: x.id, dir: 1 }) }, '↓'),
        h('button', { class: 'btn small', onclick: () => { state.sessEdit = { id: x.id, title: x.title, speaker: x.speaker || '', startTime: x.startTime || '', duration: x.duration ?? '', description: x.description || '' }; render(); document.querySelector('[data-keep="se-title"]')?.focus(); } }, '✏️ ' + t('ag.edit')),
        h('button', { class: 'btn small danger', 'aria-label': t('common.delete'), onclick: () => confirm(t('ag.deleteConfirm', { title: x.title })) && sAct('delete', { id: x.id }) }, '🗑'))))) : h('p', { class: 'empty' }, t('ag.empty'));
    return h('section', { class: 'stack agenda-editor' }, form,
      ss.length > 0 && h('label', { class: 'row card' }, h('input', { type: 'checkbox', checked: !!d.screenSessionOnly, onchange: e => post('/settings', { screenSessionOnly: e.target.checked }) }), '📺 ' + t('ag.screenOnly')),
      list);
  }

  // ----- Participant / host page -----
  function pageView(d) {
    const base = `${shareBase()}/e/${d.code}`;
    const all = d.questions;
    const liveQ = all.filter(q => q.status !== 'pending');
    const pending = all.filter(q => q.status === 'pending');
    const mine = all.filter(q => q.mine || q.mergedMine);   // a merged question still belongs to its asker
    const answered = liveQ.filter(q => q.status === 'answered');
    const byVotes = (a, b) => (b.pinned - a.pinned) || (b.votes - a.votes) || (a.ts - b.ts);
    const byNew = (a, b) => b.ts - a.ts;
    const totalVotes = liveQ.reduce((s, q) => s + q.votes, 0);
    // 'Top 1/2/3' always goes to the most-voted questions, whatever is pinned
    const medalIds = [...liveQ].filter(q => q.votes > 0).sort((a, b) => (b.votes - a.votes) || (a.ts - b.ts)).slice(0, 3).map(q => q.id);
    const medalRank = id => medalIds.indexOf(id);
    const sessions = sessList();
    if (!sessions.length || (state.sessionFilter !== 'all' && state.sessionFilter !== 'general' && !sessById(state.sessionFilter))) state.sessionFilter = 'all';
    const inScope = q => state.sessionFilter === 'all' || (state.sessionFilter === 'general' ? !q.sessionId : q.sessionId === state.sessionFilter);
    const scopedQ = liveQ.filter(inScope);

    const tabs = isHost
      ? [['all', t('tab.all'), all.length], ['pending', t('tab.pending'), pending.length], ['top', t('tab.top'), null], ['new', t('tab.new'), null], ['answered', t('tab.answered'), answered.length], ['agenda', '🗓 ' + t('ag.tab'), sessions.length], ['analytics', '📈 ' + t('an.tab'), null]]
      : [['top', '🔥 ' + t('tab.top'), null], ['new', '🕒 ' + t('tab.new'), null], ['mine', t('tab.mine'), mine.length], ['answered', t('tab.answered'), answered.length]];
    if (!tabs.some(x => x[0] === state.tab)) state.tab = tabs[0][0];

    const needle = state.q.trim().toLowerCase();
    let list;
    switch (state.tab) {
      case 'all': list = [...all].sort((a, b) => (b.status === 'pending') - (a.status === 'pending') || (a.status === 'answered') - (b.status === 'answered') || byVotes(a, b)); break;
      case 'pending': list = pending.sort(byNew); break;
      case 'new': list = [...liveQ].sort(byNew); break;
      case 'mine': list = [...mine].sort(byNew); break;
      case 'answered': list = answered.sort(byVotes); break;
      default: list = [...liveQ].sort(byVotes);   // Popular keeps answered questions: the final ranking stays visible
    }
    list = list.filter(inScope);
    if (needle) list = list.filter(q => q.text.toLowerCase().includes(needle) || (q.author || '').toLowerCase().includes(needle) || q.merged.some(m => m.text.toLowerCase().includes(needle)));

    const stat = (n, label) => h('div', { class: 'stat' }, h('b', {}, n), h('span', {}, label));
    const header = h('header', { class: 'topbar' }, isHost && h('div', { class: 'mode-banner' }, '🎛 ' + t('mode.host')), h('div', { class: 'topbar-in' },
      h('div', { class: 'title' }, h('span', { class: `role ${isHost ? 'admin' : ''}` }, isHost ? t('role.host') : t('role.participant')), h('h1', {}, d.title), d.demo && h('span', { class: 'tag demo' }, t('demo.badge'))),
      h('div', { class: 'meta' }, h('span', { class: 'online', title: t('stats.online') }, '● ' + d.online), h('span', { class: 'code' }, d.code), langBtn())));

    const stats = h('div', { class: 'stats' },
      stat(scopedQ.length, t('stats.questionsL')), stat(scopedQ.reduce((a, q) => a + q.votes, 0), t('stats.qVotesL')),
      stat(d.polls.filter(p => !p.draft).reduce((a, p) => a + p.total, 0), t('stats.pollAnswersL')),
      isHost ? stat(pending.length, t('stats.pendingL')) : stat(d.online, t('stats.onlineL')));

    let side;
    if (isHost) {
      side = h('aside', { class: 'side' },
        h('div', { class: 'card invite' }, qrEl(base), h('div', {}, h('div', { class: 'muted' }, t('host.enterCode')), h('div', { class: 'bigcode' }, d.code), h('div', { class: 'muted' }, base.replace(/^https?:\/\//, '')),
          h('div', { class: 'row-actions', style: 'margin-top:8px' },
            h('button', { class: 'btn small', onclick: () => { navigator.clipboard?.writeText(base); toast(t('host.copied')); } }, '🔗 ' + t('host.copyLink')),
            h('button', { class: 'btn small', title: t('host.coHostHint'), onclick: () => { navigator.clipboard?.writeText(`${shareBase()}/?host=${d.code}`); toast(t('host.coHostCopied')); } }, '🎛 ' + t('host.coHost'))))),
        statsCard(d),
        h('details', { class: 'card tools', open: state.tools, ontoggle: e => state.tools = e.target.open },
          h('summary', {}, '⚙️ ' + t('host.settings')),
          h('div', { class: 'stack', style: 'margin-top:10px' },
            h('div', { class: 'row-actions' },
              h('a', { class: 'btn small', href: `${BASE}/e/${d.code}/screen`, target: '_blank' }, '📺 ' + t('host.screen'))),
            h('div', { class: 'row-actions' },
              h('button', { class: 'btn small', disabled: !!d.publicDemo, title: d.publicDemo ? t('demo.locked') : null, onclick: () => post('/settings', { open: !d.open }) }, d.open ? '⏸ ' + t('host.closeQ') : '▶ ' + t('host.openQ')),
              h('button', { class: 'btn small', disabled: !!d.publicDemo, title: d.publicDemo ? t('demo.locked') : null, onclick: () => post('/settings', { moderation: !d.moderation }) }, '🛡 ' + (d.moderation ? t('host.modOn') : t('host.modOff'))),
              d.moderation && pending.length > 0 && h('button', { class: 'btn small', onclick: () => post('/settings', { approveAll: true }) }, t('host.approveAll')),
              h('button', { class: 'btn small', disabled: !!d.publicDemo, title: d.publicDemo ? t('demo.locked') : null, onclick: () => { if (d.ended || confirm(t('host.endConfirm'))) post('/settings', { ended: !d.ended }); } }, d.ended ? t('home.reopen') : '🏁 ' + t('host.end'))),
            d.publicDemo && h('div', { class: 'muted' }, '🔒 ' + t('demo.locked')))),
        h('details', { class: 'card tools', open: state.tools },
          h('summary', {}, '📊 ' + (state.poll.editing ? t('pollf.editTitle') : t('host.newPoll'))), pollForm(d)),
        draftsCard(d),
        d.polls.filter(p => !p.draft).map(p => pollCard(p)));
    } else {
      side = h('aside', { class: 'side' },
        d.open
          ? h('div', { class: 'card ask-side' }, h('h2', { style: 'margin-top:0' }, '✍️ ' + t('ask.title')), askForm(d, 'a'))
          : h('div', { class: 'banner' }, '🔒 ' + (d.ended ? t('guest.ended') : t('guest.closed'))),
        state.view === 'questions' && d.polls.filter(p => p.open).map(p => h('div', { class: 'side-poll' }, pollCard(p))),
        state.view === 'questions' && d.stats && h('div', { class: 'side-poll' }, guestAnalytics(d)));
    }
    const openPolls = d.polls.filter(p => p.open);
    const todo = openPolls.filter(p => !hasAnswered(p));
    const teaserPoll = todo.find(p => !p.persistent) || todo.find(p => p.persistent);
    if (!sessions.length && state.view === 'agenda') state.view = 'questions';
    const viewSwitch = !isHost && h('div', { class: 'seg', role: 'tablist', style: `grid-template-columns:repeat(${sessions.length ? 3 : 2},1fr)` },
      h('button', { role: 'tab', 'aria-selected': String(state.view === 'questions'), onclick: () => { state.view = 'questions'; render(); } }, '💬 ' + t('view.questions'), h('i', {}, liveQ.length)),
      sessions.length > 0 && h('button', { role: 'tab', 'aria-selected': String(state.view === 'agenda'), onclick: () => { state.view = 'agenda'; render(); } }, '🗓 ' + t('ag.tab'),
        liveSess() ? h('i', { class: 'dot' }, '●') : h('i', {}, sessions.length)),
      h('button', { role: 'tab', 'aria-selected': String(state.view === 'polls'), onclick: () => { state.view = 'polls'; render(); } }, '📊 ' + t('view.polls'),
        todo.length ? h('i', { class: 'dot' }, todo.length) : h('i', {}, d.polls.length)));
    const teaser = !isHost && state.view === 'questions' && teaserPoll && h('button', { class: 'poll-teaser', onclick: () => { state.view = 'polls'; render(); window.scrollTo(0, 0); } },
      h('span', { class: 'live-dot' }, teaserPoll.persistent ? t('poll.allEvent') : t('poll.live')),
      h('span', { class: 'pt-q' }, (teaserPoll.persistent ? '📈 ' : TYPE_ICON[teaserPoll.type] + ' ') + pollQ(teaserPoll)),
      h('span', { class: 'pt-cta' }, t('poll.answer') + ' →'));

    const search = h('input', { type: 'search', class: 'search', 'data-keep': 'search', placeholder: '🔍 ' + t('search.ph'), 'aria-label': t('search.label'), value: state.q, oninput: e => { state.q = e.target.value; render(); } });
    const tabBar = h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, label, n]) =>
      h('button', { class: 'tab', role: 'tab', 'aria-selected': String(state.tab === k), onclick: () => { state.tab = k; render(); } }, label, n != null && h('i', {}, n))));

    const empty = { all: t('empty.all'), pending: t('empty.pending'), mine: t('empty.mine'), answered: t('empty.answered') }[state.tab] || t('empty.top');
    const demoMins = d.publicDemo && d.demoResetAt ? Math.max(1, Math.ceil((d.demoResetAt - Date.now()) / 60000)) : null;
    const demoBanner = d.publicDemo && h('div', { class: 'demo-banner' }, '🎭 ', h('b', {}, t('demo.bannerTitle')), ' ',
      t('demo.bannerText', { every: d.demoResetMin || 30, n: demoMins ?? '—' }));
    const main = h('main', { class: `main ${d.questions.some(q => q.highlighted) ? 'has-hl' : ''}` },
      demoBanner,
      isHost && state.merging && h('div', { class: 'banner' }, '🔗 ' + t('q.mergeBanner'), ' ', h('button', { class: 'btn small', onclick: () => { state.merging = null; render(); } }, t('common.cancel'))),
      !isHost && pending.some(q => q.mine) && h('div', { class: 'banner' }, '⏳ ' + t('guest.pendingMine', { n: pending.filter(q => q.mine).length })),
      viewSwitch, teaser,
      liveSess() && (isHost ? !['agenda', 'analytics'].includes(state.tab) : state.view === 'questions') && h('div', { class: 'now-banner' },
        h('span', { class: 'live-dot' }, t('ag.now')), h('span', { class: 'nb-t' }, sessLabel(liveSess())),
        !isHost && d.open && h('button', { class: 'btn small', onclick: () => { state.askSession = liveSess().id; if (wide()) document.querySelector('[data-keep="qa"]')?.focus(); else { state.sheet = true; render(); setTimeout(() => document.querySelector('[data-keep="qs"]')?.focus(), 50); } } }, '✍️ ' + t('ag.askShort'))),
      !isHost && state.view === 'polls' ? pollsPanel(d) : !isHost && state.view === 'agenda' ? agendaPanel(d) : isHost && state.tab === 'agenda' ? [h('div', { class: 'toolbar' }, tabBar), agendaEditor(d)] : [
        h('div', { class: 'toolbar' }, tabBar, state.tab !== 'analytics' && search),
        state.tab !== 'analytics' && sessions.length > 0 && h('div', { class: 'sess-filter' }, h('span', { class: 'muted' }, '🗓'),
          h('select', { 'data-keep': 'sf', 'aria-label': t('ag.filter'), onchange: e => { state.sessionFilter = e.target.value; render(); } },
            h('option', { value: 'all', selected: state.sessionFilter === 'all' }, t('ag.filterAll')),
            h('option', { value: 'general', selected: state.sessionFilter === 'general' }, t('ag.filterGeneral')),
            sessions.map(x => h('option', { value: x.id, selected: state.sessionFilter === x.id }, (x.status === 'live' ? '🔴 ' : '🎤 ') + sessLabel(x)))),
          state.sessionFilter !== 'all' && h('span', { class: 'muted' }, t('ag.filterNote'))),
        state.tab !== 'analytics' && list.length > 0 && h('div', { class: 'react-legend muted' }, Object.entries(REACT_KEYS).map(([e, k]) => h('span', {}, e + ' ' + t('react.' + k)))),
        isHost && state.tab === 'analytics' && d.stats ? analyticsPanel(d) :
        list.length ? list.map(q => qCard(q, state.tab === 'top' && !needle ? medalRank(q.id) : -1)) : h('p', { class: 'empty' }, needle ? t('empty.search') : empty)]);

    const fab = !isHost && d.open && h('button', { class: 'fab', onclick: () => { state.sheet = true; render(); setTimeout(() => document.querySelector('[data-keep="qs"]')?.focus(), 50); } }, '✍️ ' + t('ask.title'));
    const sheet = !isHost && d.open && state.sheet && h('div', { class: 'sheet-bg', onclick: e => { if (e.target === e.currentTarget) { state.sheet = false; render(); } } },
      h('div', { class: 'sheet', role: 'dialog', 'aria-label': t('ask.title') },
        h('div', { class: 'between' }, h('h2', { style: 'margin:0' }, t('ask.title')), h('button', { class: 'btn small', 'aria-label': t('common.close'), onclick: () => { state.sheet = false; render(); } }, '✕')),
        askForm(d, 's')));

    return h('div', {}, header, h('div', { class: `wrap ${isHost ? 'admin' : 'guest'}` }, stats, h('div', { class: 'layout' }, main, side),
      h('p', { class: 'muted foot' }, link('/', '← ' + t('common.home')), ' · ',
        isHost
          ? h('a', { href: BASE + '/e/' + d.code, onclick: e => { e.preventDefault(); safe('key:' + d.code, ''); go('/e/' + d.code); } }, t('host.signOut'))
          : link('/?host=' + d.code, '🎛 ' + t('guest.hostSignIn'))), brandFooter()), fab, sheet);
  }

  // ----- Projection screen -----
  function screenView(d) {
    const liveQ = d.questions.filter(q => q.status !== 'pending');
    const hl = liveQ.find(q => q.highlighted);
    const nowS = (d.sessions || []).find(x => x.status === 'live');
    const top = [...liveQ].filter(q => !(d.screenSessionOnly && nowS) || q.sessionId === nowS.id).sort((a, b) => (b.pinned - a.pinned) || (b.votes - a.votes)).slice(0, 6);
    const poll = d.polls.find(p => p.id === d.screenPoll) || d.polls.find(p => p.open && !p.persistent);
    const joinUrl = `${shareBase()}/e/${d.code}`;
    let mainBlock;
    if (d.screenPoll === 'activity' && d.stats) {
      mainBlock = h('div', { class: 'screen-act' }, h('h2', {}, '📈 ' + t('act.screenTitle')), activityKpis(d.stats), activityChart(d.stats, { w: 900, big: true, range: 'recent' }));
    } else if (hl) {
      mainBlock = h('div', { class: 'stage-card', key: hl.id }, h('div', { class: 'stage-badge' }, '🎤 ' + t('q.onScreenBadge')), h('div', { class: 'big-q' }, '« ' + hl.text + ' »'), h('div', { class: 'muted stage-meta' }, (hl.author || t('q.anonymous')) + ' · 👍 ' + hl.votes),
        hl.note && h('div', { class: 'note big' }, '💬 ' + hl.note));
    } else if (poll) {
      mainBlock = h('div', { class: 'screen-poll' }, h('div', { class: 'tags' }, h('span', { class: 'tag ok' }, TYPE_ICON[poll.type] + ' ' + t('ptype.' + poll.type))),
        h('div', { class: 'big-q', style: 'margin:2vh 0' }, pollQ(poll)), pollResults(poll, { big: true }),
        h('div', { class: 'muted', style: 'margin-top:12px' }, t('poll.responses', { n: poll.total })));
    } else {
      mainBlock = h('div', { class: 'screen-list' }, h('h2', {}, t('screen.top')),
        top.length ? top.map((q, i) => qCard(q, q.status === 'answered' ? -1 : i)) : h('p', { class: 'muted' }, t('screen.waiting')));
    }
    return h('div', { class: 'screen-wrap' },
      h('main', {}, h('h1', {}, d.title),
        nowS && h('div', { class: 'screen-now' }, h('span', { class: 'live-dot' }, t('ag.now')), h('b', {}, nowS.title), nowS.speaker && h('span', { class: 'muted' }, '🎤 ' + nowS.speaker)),
        mainBlock),
      h('aside', {}, h('div', { class: 'join-box' }, h('div', { class: 'muted' }, t('screen.joinAt')), h('div', { style: 'font-weight:600;margin:6px 0;overflow-wrap:anywhere' }, joinUrl.replace(/^https?:\/\//, '')),
        qrEl(joinUrl), h('div', { class: 'muted' }, t('screen.code')), h('div', { class: 'c' }, d.code), h('div', { class: 'muted', style: 'margin-top:8px' }, '● ' + t('screen.online', { n: d.online })),
        h('div', { class: 'screen-brand' }, 'Powered by ', h('b', {}, 'ORBii'), h('br'), h('span', {}, 'Smart Tools for a Connected World')))));
  }
}

route();
