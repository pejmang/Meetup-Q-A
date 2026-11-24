/*!
 * Meetup Q&A (ORBii Interact)
 * Copyright (c) 2026 ORBii SAS. All rights reserved.
 * Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE): free for any noncommercial use.
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
fetch(BASE + '/api/info').then(r => r.json()).then(j => { LAN = j.lan || []; }).catch(() => {});
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
    if (p[2] === 'report') return report(code);
    return live(code, p[2] === 'screen' ? 'screen' : p[2] === 'host' ? 'host' : 'guest');
  }
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
    if (e.ended) bits.push(t('home.ended')); else if (!e.open) bits.push(t('home.qClosed'));
    return h('div', { class: `card ev ${e.ended ? 'ended' : ''}` },
      h('div', { class: 'ev-main' }, h('b', {}, e.demo && h('span', { class: 'tag demo' }, t('demo.badge')), ' ', e.title), h('div', { class: 'muted' }, bits.join(' · ')), h('span', { class: 'code' }, e.code)),
      h('div', { class: 'row-actions', style: 'margin:0' },
        !e.ended && h('button', { class: 'btn primary small', onclick: () => go('/e/' + e.code) }, t('home.join')),
        !st.admin && h('button', { class: 'btn small', onclick: () => { st.login = true; st.loginMode = 'host'; st.hostCode = e.code; draw(); document.querySelector('[data-keep="pwd"]')?.focus(); } }, '🎛 ' + t('home.host')),
        st.admin && h('button', { class: 'btn small', onclick: () => { safe('key:' + e.code, e.hostKey); go(`/e/${e.code}/host`); } }, '🎛 ' + t('home.manage')),
        st.admin && h('button', { class: 'btn small', onclick: () => { safe('key:' + e.code, e.hostKey); go(`/e/${e.code}/report`); } }, '📄 ' + t('home.report')),
        st.admin && h('button', { class: 'btn small', onclick: async () => {
          const pw = prompt(t('home.newHostPwPrompt', { title: e.title }), genPw());
          if (pw == null) return;
          const r = await api(`/events/${e.code}/host-password`, { hostPassword: pw });
          safe('key:' + e.code, r.hostKey); toast(t('home.hostPwUpdated')); refresh();
        } }, '🔑 ' + t('home.hostPw')),
        st.admin && h('button', { class: 'btn small', onclick: async () => { await api(`/events/${e.code}/settings`, { key: e.hostKey, ended: !e.ended }); refresh(); } }, e.ended ? t('home.reopen') : t('home.end')),
        st.admin && h('button', { class: 'btn small danger', 'aria-label': t('common.delete'), onclick: async () => { if (confirm(t('home.deleteConfirm', { title: e.title }))) { await api(`/events/${e.code}/settings`, { key: e.hostKey, delete: true }); refresh(); } } }, '🗑')));
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
          ? [h('span', { class: 'role admin' }, t('home.adminSignedIn')), h('button', { class: 'btn small', onclick: () => { safe('adminToken', ''); st.admin = false; refresh(); } }, t('home.signOut'))]
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

    const create = st.admin && h('form', { class: 'card stack', onsubmit: async e => {
      e.preventDefault();
      const pw = st.newPw.trim();
      const r = await api('/events', { title: titleIn.value, moderation: mod.checked, hostPassword: pw });
      safe('key:' + r.code, r.hostKey);
      st.newTitle = ''; st.newPw = genPw(); st.newMod = false;
      alert(t('create.done', { code: r.code, pw }));
      go(`/e/${r.code}/host`);
    } }, h('h2', { style: 'margin:0' }, '➕ ' + t('create.title')), titleIn,
      h('div', { class: 'muted' }, t('create.hostPwHint')), hostPwIn,
      h('label', { class: 'row' }, mod, t('create.moderate')), h('button', { class: 'btn primary' }, t('create.submit')),
      h('div', { class: 'demo-row' }, h('span', { class: 'muted' }, '🎭 ' + t('demo.create')),
        ['en', 'fr'].map(l => h('button', { type: 'button', class: 'btn small', onclick: async () => {
          const pw = st.newPw.trim();
          const r = await api('/events/demo', { lang: l, hostPassword: pw });
          safe('key:' + r.code, r.hostKey); st.newPw = genPw();
          alert(t('demo.done', { code: r.code, pw }));
          go(`/e/${r.code}/host`);
        } }, l === 'en' ? '🇬🇧 English' : '🇫🇷 Français'))));

    document.body.classList.toggle('admin-mode', st.admin);
    $app.replaceChildren(st.admin && h('div', { class: 'mode-banner admin' }, '🔐 ' + t('mode.admin')), h('div', { class: 'wrap narrow' }, top,
      h('div', { class: 'hero' }, h('h1', {}, 'Meetup Q&A'), h('p', { class: 'muted' }, t('home.tagline'))),
      login, create,
      h('h2', {}, t('home.live', { n: liveEv.length })),
      liveEv.length ? h('div', { class: 'stack' }, liveEv.map(eventCard)) : h('p', { class: 'empty' }, st.loaded ? t('home.noLive') : t('common.loading')),
      h('form', { class: 'card row-form', onsubmit: e => { e.preventDefault(); if (codeIn.value.trim()) go('/e/' + codeIn.value.trim().toUpperCase()); } },
        codeIn, h('button', { class: 'btn' }, t('home.joinCode'))),
      st.admin && done.length > 0 && h('div', {}, h('h2', {}, t('home.endedList', { n: done.length })), h('div', { class: 'stack' }, done.map(eventCard)))));
  }
  draw(); refresh();
}

// ---------- Polls (shared by host, participant, screen and report) ----------
const POLL_TYPES = ['choice', 'multi', 'wordcloud', 'rating', 'nps', 'open'];
const TYPE_ICON = { choice: '🔘', multi: '☑️', wordcloud: '☁️', rating: '⭐', nps: '📈', open: '💬' };
const pollQ = p => p.question || t('nps.defaultQ');
const hasAnswered = p => (p.type === 'choice' || p.type === 'multi' || p.type === 'wordcloud') ? p.mine.length > 0
  : (p.type === 'rating' || p.type === 'nps') ? p.mine != null : p.mineCount > 0;
const pct = (n, total) => total ? Math.round(100 * n / total) : 0;
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

function pollResults(p, opts = {}) {
  const { big } = opts;
  if (!p.show) return h('p', { class: 'muted hidden-res' }, '🙈 ' + t('poll.hiddenUntilClose'));
  if (p.type === 'choice' || p.type === 'multi') {
    const total = p.type === 'multi' ? Math.max(1, ...[p.total]) : p.counts.reduce((a, b) => a + b, 0);
    return h('div', {}, p.options.map((o, i) => bar(o, p.counts[i], total, p.mine.includes(i))));
  }
  if (p.type === 'rating') {
    return h('div', {},
      h('div', { class: `score ${big ? 'big' : ''}` }, p.avg != null ? `★ ${p.avg.toFixed(1)}` : '—', h('span', { class: 'muted' }, ' / 5')),
      p.dist.map((n, i) => bar('★'.repeat(i + 1), n, p.total, p.mine === i + 1)).reverse());
  }
  if (p.type === 'nps') {
    const s = p.split || { promoters: 0, passives: 0, detractors: 0 };
    return h('div', {},
      h('div', { class: `score ${big ? 'big' : ''}` }, p.nps != null ? (p.nps > 0 ? '+' : '') + p.nps : '—', h('span', { class: 'muted' }, ' NPS')),
      bar(t('poll.promoters') + ' (9–10)', s.promoters, p.total, p.mine >= 9),
      bar(t('poll.passives') + ' (7–8)', s.passives, p.total, p.mine === 7 || p.mine === 8),
      bar(t('poll.detractors') + ' (0–6)', s.detractors, p.total, p.mine != null && p.mine <= 6));
  }
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
        return p.show
          ? bar(o, p.counts[i], p.type === 'multi' ? p.total : p.counts.reduce((a, b) => a + b, 0), mine, { onclick: () => vote({ option: i }) })
          : h('button', { class: `opt ${mine ? 'mine' : ''}`, onclick: () => vote({ option: i }) }, h('span', {}, h('span', {}, (mine ? '✓ ' : '') + o)));
      }));
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
const niceMax = v => { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };

function activityKpis(s) {
  const eng = s.participants ? Math.round(100 * s.activeUsers / s.participants) : 0;
  const tile = (val, label, sub) => h('div', { class: 'kpi' }, h('b', {}, val), h('span', {}, label), sub && h('small', {}, sub));
  return h('div', { class: 'kpis' },
    tile(s.online, t('act.now')),
    tile(s.peakOnline, t('act.peak'), s.peakOnlineAt ? t('act.at', { time: fmtTime(s.peakOnlineAt) }) : null),
    tile(s.participants, t('act.total')),
    tile(s.activeUsers, t('act.active'), t('act.engagement', { n: eng })),
    tile(s.interactions, t('act.interactions'), s.peak.ts ? t('act.peakAct', { n: s.peak.n, time: fmtTime(s.peak.ts) }) : null));
}

function activityChart(s, opts = {}) {
  const tl = s.timeline || [];
  if (!tl.length) return h('p', { class: 'muted' }, t('act.noData'));
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
    sv('text', { x: Math.min(Math.max(x(pi), padL + 40), W - padR - 40), y: y1(tl[pi].online) - 7, 'text-anchor': 'middle', class: 'ch-lbl', 'font-size': fs }, t('act.peakLbl', { n: tl[pi].online, time: fmtTime(tl[pi].t) }))];
  // Bars: interactions per minute (2px gap between bars, rounded data-end)
  const bw = Math.max(1, Math.min(opts.big ? 18 : 10, iw / n - 2));
  const bars = tl.map((d, i) => d.actions > 0 && sv('rect', { x: x(i) - bw / 2, y: y2(d.actions), width: bw, height: Math.max(1, y2Base - y2(d.actions)), rx: Math.min(2, bw / 2), class: 'ch-bar' }));
  // Time axis: ~5 ticks
  const step = Math.max(1, Math.ceil(n / (opts.big ? 8 : 5)));
  const ticks = tl.map((d, i) => (i % step === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= step / 2) &&
    sv('text', { x: x(i), y: H - 4, 'text-anchor': i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle', class: 'ch-ax', 'font-size': fs }, fmtTime(d.t)));
  const titles = [sv('text', { x: padL, y: top - 5, class: 'ch-ttl', 'font-size': fs }, t('act.people')),
    sv('text', { x: padL, y: top + H1 + gap - 6, class: 'ch-ttl', 'font-size': fs }, t('act.perMin'))];
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
    h('div', { class: 'ch-plot' }, svg, tip));
  const show = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    const vx = px * W / r.width;
    const i = Math.max(0, Math.min(n - 1, Math.round(n === 1 ? 0 : (vx - padL) * (n - 1) / iw)));
    const d = tl[i];
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.replaceChildren(h('b', {}, fmtTime(d.t)),
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
      h('tbody', {}, tl.filter(d => d.online || d.actions).map(d => h('tr', {}, h('td', {}, fmtTime(d.t)), h('td', {}, d.online), h('td', {}, d.active), h('td', {}, d.actions)))))));
  return wrap;
}

// ---------- Event ----------
function live(code, mode) {
  const qs = new URLSearchParams(location.search);
  const key = qs.get('key') || safe('key:' + code) || '';
  if (qs.get('key')) { safe('key:' + code, qs.get('key')); history.replaceState({}, '', location.pathname + (qs.get('view') ? '?view=' + qs.get('view') : '')); }
  if (mode === 'host' && !key) return go('/e/' + code);
  const isHost = mode === 'host';
  const hostParam = isHost ? '&key=' + encodeURIComponent(key) : '';
  const state = {
    data: null, tab: isHost ? 'all' : 'top', draft: '', author: safe('author') || '', anon: safe('anon') === '1',
    sheet: false, tools: wide(), q: '', merging: null, noteEdit: null,
    poll: { type: 'choice', question: '', options: ['', ''], hidden: false }, drafts: {}, view: qs.get('view') === 'polls' ? 'polls' : 'questions',
  };
  if (mode === 'screen') document.body.classList.add('screen');
  if (isHost) document.body.classList.add('host-mode');

  stream = new EventSource(`${BASE}/api/events/${code}/stream?cid=${cid}${hostParam}`);
  stream.onmessage = e => {
    state.data = JSON.parse(e.data);
    if (isHost && !state.data.host) { safe('key:' + code, ''); toast(t('host.expired')); return go('/?host=' + code); }
    render();
  };
  stream.onerror = () => { if (!state.data) { toast(t('err.notFound')); go('/'); } };

  const post = (p, d) => api(`/events/${code}${p}`, { key: isHost ? key : undefined, ...d });
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
      q.highlighted && h('span', { class: 'tag warn' }, '🎤 ' + t('q.onScreen')),
      q.status === 'answered' && h('span', { class: 'tag ok' }, '✓ ' + t('q.answered')),
      q.status === 'pending' && h('span', { class: 'tag' }, '⏳ ' + t('q.pending')),
      q.merged.length > 0 && h('span', { class: 'tag' }, '🔗 ' + t('q.mergedN', { n: q.merged.length })),
    ];
    const voteBtn = h('button', { class: 'vote', 'aria-pressed': String(q.voted), 'aria-label': `${q.voted ? t('q.unvote') : t('q.upvote')} — ${q.votes}`,
      disabled: q.status === 'pending' || mode === 'screen', onclick: () => { q.voted = !q.voted; q.votes += q.voted ? 1 : -1; render(); post(`/questions/${q.id}/vote`, {}); } },
      h('span', { class: 'thumb', 'aria-hidden': 'true' }, '👍'), h('b', {}, q.votes));
    const reacts = q.status === 'pending' ? null : h('div', { class: 'reacts' }, q.reacts.map(r => h('button', { class: 'react', 'aria-pressed': String(r.mine), 'aria-label': `${t('q.react')} ${r.e}`, disabled: mode === 'screen', onclick: () => post(`/questions/${q.id}/react`, { emoji: r.e }) }, r.e, r.n > 0 && h('i', {}, r.n))));
    const note = q.note && !(state.noteEdit && state.noteEdit.id === q.id) && h('div', { class: 'note' }, h('b', {}, '💬 ' + t('q.hostAnswer')), ' ', q.note);
    const merged = q.merged.length > 0 && mode !== 'screen' && h('details', { class: 'merged' }, h('summary', { class: 'muted' }, t('q.showMerged', { n: q.merged.length })),
      h('ul', {}, q.merged.map(m => h('li', {}, m.text, h('span', { class: 'muted' }, ' — ' + (m.author || t('q.anonymous')))))));
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
        q.status !== 'pending' && h('button', { class: 'btn small', onclick: () => act(q.id, 'highlight') }, q.highlighted ? t('q.unscreen') : '🎤 ' + t('q.screen')),
        q.status !== 'pending' && h('button', { class: 'btn small', onclick: () => act(q.id, 'answer') }, q.status === 'answered' ? '↩ ' + t('q.reopen') : '✓ ' + t('q.markAnswered')),
        h('button', { class: 'btn small', onclick: () => { state.noteEdit = { id: q.id, text: q.note }; render(); setTimeout(() => document.querySelector(`[data-keep="note${q.id}"]`)?.focus(), 30); } }, '💬 ' + (q.note ? t('q.editNote') : t('q.addNote'))),
        h('button', { class: 'btn small', onclick: () => act(q.id, 'pin') }, q.pinned ? t('q.unpin') : '📌 ' + t('q.pin')),
        h('button', { class: 'btn small', onclick: () => { state.merging = q.id; render(); toast(t('q.mergePick')); } }, '🔗 ' + t('q.merge')),
        h('button', { class: 'btn small danger', 'aria-label': t('common.delete'), onclick: () => { if (confirm(t('q.deleteConfirm'))) act(q.id, 'delete'); } }, '🗑'));
    }
    const heat = q.votes >= 10 ? 3 : q.votes >= 5 ? 2 : q.votes >= 2 ? 1 : 0;
    return h('article', { class: `card q heat${heat} ${q.highlighted ? 'hl' : ''} ${q.status} ${state.merging === q.id ? 'merging' : ''}` }, voteBtn,
      h('div', { class: 'q-body' }, tags.some(Boolean) && h('div', { class: 'tags' }, tags), h('div', { class: 'q-text' }, q.text),
        h('div', { class: 'muted' }, (q.author || t('q.anonymous')) + (q.mine ? ' ' + t('q.you') : '') + ' · ' + ago(q.ts)), note, noteEditor, merged, reacts, acts));
  }

  // ----- Poll card -----
  function pollCard(p, opts = {}) {
    const done = !isHost && hasAnswered(p);
    const head = h('div', { class: 'poll-h' },
      p.open ? h('span', { class: 'live-dot' }, p.persistent ? t('poll.allEvent') : t('poll.live')) : h('span', { class: 'tag' }, t('poll.closed')),
      h('span', { class: 'tag' }, TYPE_ICON[p.type] + ' ' + t('ptype.' + p.type)),
      p.hidden && h('span', { class: 'tag' }, '🙈 ' + t('poll.hidden')),
      isHost && p.onScreen && h('span', { class: 'tag warn' }, '📺 ' + t('poll.onScreen')),
      h('b', { class: 'poll-q' }, pollQ(p)));
    const participantInput = !isHost && pollInput(p, post, ui);
    const showResults = isHost || !participantInput || !['choice', 'multi'].includes(p.type) || !p.show;
    const results = showResults && pollResults(p, isHost && Array.isArray(p.responses) ? { onRemove: d => post(`/polls/${p.id}/action`, { action: 'removeResponse', ...d }) } : {});
    const footer = h('div', { class: 'poll-foot' },
      done && p.open ? h('span', { class: 'ok-txt' }, '✓ ' + (['wordcloud', 'open'].includes(p.type) ? t('poll.sent') : t('poll.recorded'))) : h('span', {}),
      h('span', { class: 'muted' }, t('poll.responses', { n: p.total })));
    return h('div', { class: `card poll ${p.open ? 'is-open' : ''} ${p.persistent ? 'is-nps' : ''} ${opts.compact ? 'compact' : ''}` }, head,
      p.persistent && !isHost && p.open && h('p', { class: 'muted poll-sub' }, t('nps.sub')),
      participantInput, results, footer,
      isHost && h('div', { class: 'row-actions' },
        h('button', { class: 'btn small', onclick: () => post(`/polls/${p.id}/action`, { action: 'toggle' }) }, p.open ? '⏹ ' + t('poll.close') : '▶ ' + t('poll.reopen')),
        h('button', { class: 'btn small', onclick: () => post(`/polls/${p.id}/action`, { action: 'screen' }) }, p.onScreen ? t('poll.offScreen') : '📺 ' + t('poll.toScreen')),
        p.hidden && p.open && h('button', { class: 'btn small', onclick: () => post(`/polls/${p.id}/action`, { action: 'reveal' }) }, '👁 ' + t('poll.reveal')),
        h('button', { class: 'btn small danger', 'aria-label': t('common.delete'), onclick: () => confirm(t('poll.deleteConfirm')) && post(`/polls/${p.id}/action`, { action: 'delete' }) }, '🗑')));
  }

  // ----- Participant: polls panel -----
  function pollsPanel(d) {
    const liveP = d.polls.filter(p => p.open && !p.persistent);
    const nps = d.polls.find(p => p.persistent);
    const past = d.polls.filter(p => !p.open && !p.persistent);
    return h('div', { class: 'stack' },
      liveP.length ? liveP.map(p => pollCard(p)) : h('div', { class: 'card empty-poll' }, h('div', { class: 'big-emoji' }, '📊'), h('b', {}, t('poll.noneLive')), h('p', { class: 'muted' }, t('poll.noneLiveSub'))),
      nps && pollCard(nps),
      past.length > 0 && h('h2', {}, t('guest.pastPolls', { n: past.length })),
      past.map(p => pollCard(p)));
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
      await post('/questions', { text: state.draft, author: state.author, anon: state.anon });
      state.draft = ''; state.sheet = false; state.tab = 'mine'; render();
      toast(d.moderation ? t('ask.sentModerated') : t('ask.sent'));
    } }, ta, h('div', { class: 'between' }, h('label', { class: 'row' }, anon, t('q.anonymous')), counter), nameIn, h('button', { class: 'btn primary block' }, t('ask.submit')));
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
      h('a', { class: 'btn small', href: csvHref() }, '⬇ ' + t('export.csv')),
      h('a', { class: 'btn small', href: `${BASE}/e/${code}/report`, target: '_blank' }, '📄 ' + t('export.report')));
  }
  // Sidebar box (compact)
  function statsCard(d) {
    const s = d.stats; if (!s || state.tab === 'analytics') return null;
    return h('section', { class: 'card analytics-box' },
      h('div', { class: 'between' }, h('b', {}, '📈 ' + t('an.title')), h('span', { class: 'live-dot' }, t('poll.live'))),
      activityKpis(s),
      activityChart(s, { w: 360 }),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn small primary', onclick: () => { state.tab = 'analytics'; render(); window.scrollTo(0, 0); } }, '📈 ' + t('an.open'))),
      analyticsActions(d));
  }
  // Full-width Analytics tab
  function analyticsPanel(d) {
    const s = d.stats;
    const tile = (val, label) => h('div', { class: 'kpi' }, h('b', {}, val), h('span', {}, label));
    const dur = s.timeline.length ? Math.max(1, s.timeline.length) : 0;
    return h('section', { class: 'analytics-full stack' },
      h('div', { class: 'card stack' },
        h('div', { class: 'between' }, h('h2', { style: 'margin:0' }, '📈 ' + t('an.title')), h('span', { class: 'live-dot' }, t('poll.live'))),
        h('p', { class: 'muted', style: 'margin:0' }, t('an.sub')),
        activityKpis(s),
        activityChart(s, { w: 760, table: true })),
      h('div', { class: 'card stack' },
        h('b', {}, '💬 ' + t('an.content')),
        h('div', { class: 'kpis kpis-6' },
          tile(s.questions, t('stats.questions')), tile(s.answered, t('stats.answered')),
          tile(s.votes, t('stats.votes')), tile(s.reactions, t('stats.reactions')),
          tile(s.pollResponses, t('stats.pollResponses')),
          tile(s.nps !== undefined && s.nps != null ? (s.nps > 0 ? '+' : '') + s.nps : '—', t('stats.nps')),
          tile(dur ? t('an.minutes', { n: dur }) : '—', t('an.duration')),
          tile(s.participants ? (s.interactions / s.participants).toFixed(1) : '—', t('an.perPerson')))),
      h('div', { class: 'card' }, h('b', {}, '⚙️ ' + t('an.actions')), analyticsActions(d)));
  }

  // ----- Participant / host page -----
  function pageView(d) {
    const base = `${shareBase()}/e/${d.code}`;
    const all = d.questions;
    const liveQ = all.filter(q => q.status !== 'pending');
    const pending = all.filter(q => q.status === 'pending');
    const mine = all.filter(q => q.mine);
    const answered = liveQ.filter(q => q.status === 'answered');
    const byVotes = (a, b) => (b.pinned - a.pinned) || (b.votes - a.votes) || (a.ts - b.ts);
    const byNew = (a, b) => b.ts - a.ts;
    const totalVotes = liveQ.reduce((s, q) => s + q.votes, 0);

    const tabs = isHost
      ? [['all', t('tab.all'), all.length], ['pending', t('tab.pending'), pending.length], ['top', t('tab.top'), null], ['new', t('tab.new'), null], ['answered', t('tab.answered'), answered.length], ['analytics', '📈 ' + t('an.tab'), null]]
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
    if (needle) list = list.filter(q => q.text.toLowerCase().includes(needle) || (q.author || '').toLowerCase().includes(needle) || q.merged.some(m => m.text.toLowerCase().includes(needle)));

    const stat = (n, label) => h('div', { class: 'stat' }, h('b', {}, n), h('span', {}, label));
    const header = h('header', { class: 'topbar' }, isHost && h('div', { class: 'mode-banner' }, '🎛 ' + t('mode.host')), h('div', { class: 'topbar-in' },
      h('div', { class: 'title' }, h('span', { class: `role ${isHost ? 'admin' : ''}` }, isHost ? t('role.host') : t('role.participant')), h('h1', {}, d.title), d.demo && h('span', { class: 'tag demo' }, t('demo.badge'))),
      h('div', { class: 'meta' }, h('span', { class: 'online', title: t('stats.online') }, '● ' + d.online), h('span', { class: 'code' }, d.code), langBtn())));

    const stats = h('div', { class: 'stats' },
      stat(liveQ.length, t('stats.questionsL')), stat(totalVotes, t('stats.votesL')), stat(answered.length, t('stats.answeredL')),
      isHost ? stat(pending.length, t('stats.pendingL')) : stat(d.online, t('stats.onlineL')));

    let side;
    if (isHost) {
      side = h('aside', { class: 'side' },
        h('div', { class: 'card invite' }, qrEl(base), h('div', {}, h('div', { class: 'muted' }, t('host.enterCode')), h('div', { class: 'bigcode' }, d.code), h('div', { class: 'muted' }, base.replace(/^https?:\/\//, '')),
          h('button', { class: 'btn small', style: 'margin-top:8px', onclick: () => { navigator.clipboard?.writeText(base); toast(t('host.copied')); } }, '🔗 ' + t('host.copyLink')))),
        statsCard(d),
        h('details', { class: 'card tools', open: state.tools, ontoggle: e => state.tools = e.target.open },
          h('summary', {}, '⚙️ ' + t('host.settings')),
          h('div', { class: 'stack', style: 'margin-top:10px' },
            h('div', { class: 'row-actions' },
              h('a', { class: 'btn small', href: `${BASE}/e/${d.code}/screen`, target: '_blank' }, '📺 ' + t('host.screen'))),
            h('div', { class: 'row-actions' },
              h('button', { class: 'btn small', onclick: () => post('/settings', { open: !d.open }) }, d.open ? '⏸ ' + t('host.closeQ') : '▶ ' + t('host.openQ')),
              h('button', { class: 'btn small', onclick: () => post('/settings', { moderation: !d.moderation }) }, '🛡 ' + (d.moderation ? t('host.modOn') : t('host.modOff'))),
              d.moderation && pending.length > 0 && h('button', { class: 'btn small', onclick: () => post('/settings', { approveAll: true }) }, t('host.approveAll')),
              h('button', { class: 'btn small', onclick: () => { if (d.ended || confirm(t('host.endConfirm'))) post('/settings', { ended: !d.ended }); } }, d.ended ? t('home.reopen') : '🏁 ' + t('host.end'))))),
        h('details', { class: 'card tools', open: state.tools },
          h('summary', {}, '📊 ' + (state.poll.editing ? t('pollf.editTitle') : t('host.newPoll'))), pollForm(d)),
        draftsCard(d),
        d.polls.filter(p => !p.draft).map(p => pollCard(p)));
    } else {
      side = h('aside', { class: 'side' },
        d.open
          ? h('div', { class: 'card ask-side' }, h('h2', { style: 'margin-top:0' }, '✍️ ' + t('ask.title')), askForm(d, 'a'))
          : h('div', { class: 'banner' }, '🔒 ' + (d.ended ? t('guest.ended') : t('guest.closed'))),
        state.view === 'questions' && d.polls.filter(p => p.open).map(p => h('div', { class: 'side-poll' }, pollCard(p))));
    }
    const openPolls = d.polls.filter(p => p.open);
    const todo = openPolls.filter(p => !hasAnswered(p));
    const teaserPoll = todo.find(p => !p.persistent) || todo.find(p => p.persistent);
    const viewSwitch = !isHost && h('div', { class: 'seg', role: 'tablist' },
      h('button', { role: 'tab', 'aria-selected': String(state.view === 'questions'), onclick: () => { state.view = 'questions'; render(); } }, '💬 ' + t('view.questions'), h('i', {}, liveQ.length)),
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
    const main = h('main', { class: 'main' },
      isHost && state.merging && h('div', { class: 'banner' }, '🔗 ' + t('q.mergeBanner'), ' ', h('button', { class: 'btn small', onclick: () => { state.merging = null; render(); } }, t('common.cancel'))),
      !isHost && pending.some(q => q.mine) && h('div', { class: 'banner' }, '⏳ ' + t('guest.pendingMine', { n: pending.filter(q => q.mine).length })),
      viewSwitch, teaser,
      !isHost && state.view === 'polls' ? pollsPanel(d) : [
        h('div', { class: 'toolbar' }, tabBar, state.tab !== 'analytics' && search),
        isHost && state.tab === 'analytics' && d.stats ? analyticsPanel(d) :
        list.length ? list.map((q, i) => qCard(q, state.tab === 'top' && !needle && q.status !== 'answered' ? i : -1)) : h('p', { class: 'empty' }, needle ? t('empty.search') : empty)]);

    const fab = !isHost && d.open && h('button', { class: 'fab', onclick: () => { state.sheet = true; render(); setTimeout(() => document.querySelector('[data-keep="qs"]')?.focus(), 50); } }, '✍️ ' + t('ask.title'));
    const sheet = !isHost && d.open && state.sheet && h('div', { class: 'sheet-bg', onclick: e => { if (e.target === e.currentTarget) { state.sheet = false; render(); } } },
      h('div', { class: 'sheet', role: 'dialog', 'aria-label': t('ask.title') },
        h('div', { class: 'between' }, h('h2', { style: 'margin:0' }, t('ask.title')), h('button', { class: 'btn small', 'aria-label': t('common.close'), onclick: () => { state.sheet = false; render(); } }, '✕')),
        askForm(d, 's')));

    return h('div', {}, header, h('div', { class: `wrap ${isHost ? 'admin' : 'guest'}` }, stats, h('div', { class: 'layout' }, main, side),
      h('p', { class: 'muted foot' }, link('/', '← ' + t('common.home')), ' · ',
        isHost
          ? h('a', { href: BASE + '/e/' + d.code, onclick: e => { e.preventDefault(); safe('key:' + d.code, ''); go('/e/' + d.code); } }, t('host.signOut'))
          : link('/?host=' + d.code, '🎛 ' + t('guest.hostSignIn')))), fab, sheet);
  }

  // ----- Projection screen -----
  function screenView(d) {
    const liveQ = d.questions.filter(q => q.status !== 'pending');
    const hl = liveQ.find(q => q.highlighted);
    const top = [...liveQ].sort((a, b) => (b.pinned - a.pinned) || (b.votes - a.votes)).slice(0, 6);
    const poll = d.polls.find(p => p.id === d.screenPoll) || d.polls.find(p => p.open && !p.persistent);
    const joinUrl = `${shareBase()}/e/${d.code}`;
    let mainBlock;
    if (d.screenPoll === 'activity' && d.stats) {
      mainBlock = h('div', { class: 'screen-act' }, h('h2', {}, '📈 ' + t('act.screenTitle')), activityKpis(d.stats), activityChart(d.stats, { w: 900, big: true }));
    } else if (hl) {
      mainBlock = h('div', {}, h('div', { class: 'big-q' }, '« ' + hl.text + ' »'), h('div', { class: 'muted' }, (hl.author || t('q.anonymous')) + ' · 👍 ' + hl.votes),
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
      h('main', {}, h('h1', {}, d.title), mainBlock),
      h('aside', {}, h('div', { class: 'join-box' }, h('div', { class: 'muted' }, t('screen.joinAt')), h('div', { style: 'font-weight:600;margin:6px 0;overflow-wrap:anywhere' }, joinUrl.replace(/^https?:\/\//, '')),
        qrEl(joinUrl), h('div', { class: 'muted' }, t('screen.code')), h('div', { class: 'c' }, d.code), h('div', { class: 'muted', style: 'margin-top:8px' }, '● ' + t('screen.online', { n: d.online })))));
  }
}

// ---------- Post-event report (print → PDF) ----------
async function report(code) {
  const qk = new URLSearchParams(location.search).get('key');
  if (qk) { safe('key:' + code, qk); history.replaceState({}, '', location.pathname); }
  const key = safe('key:' + code) || '';
  if (!key) return go('/?host=' + code);
  document.body.classList.add('report');
  $app.replaceChildren(h('p', { class: 'empty' }, t('common.loading')));
  let d;
  try {
    const r = await fetch(`${BASE}/api/events/${code}?cid=${cid}&key=${encodeURIComponent(key)}`);
    d = await r.json();
    if (!r.ok || !d.host) throw new Error();
  } catch { toast(t('host.expired')); return go('/?host=' + code); }
  document.title = `${d.title} — ${t('report.title')}`;
  const s = d.stats;
  const liveQ = d.questions.filter(q => q.status !== 'pending').sort((a, b) => b.votes - a.votes || a.ts - b.ts);
  const kpi = (n, l) => h('div', { class: 'stat' }, h('b', {}, n), h('span', {}, l));
  $app.replaceChildren(h('div', { class: 'wrap narrow report-page' },
    h('div', { class: 'row-actions no-print' },
      h('button', { class: 'btn primary', onclick: () => window.print() }, '🖨 ' + t('report.pdf')),
      h('a', { class: 'btn', href: `${BASE}/api/events/${code}/export.csv?key=${encodeURIComponent(key)}&sep=${LANG === 'fr' ? ';' : ','}` }, '⬇ ' + t('export.csv')),
      link(`/e/${code}/host`, '← ' + t('report.back'), { class: 'btn' }), langBtn()),
    h('header', { class: 'report-head' }, h('div', { class: 'muted' }, 'Meetup Q&A · ' + t('report.title')), h('h1', {}, d.title),
      h('div', { class: 'muted' }, `${fmtDate(s.created)}${s.endedAt ? ' → ' + fmtTime(s.endedAt) : ''} · ${t('screen.code')} ${d.code}`)),
    h('h2', {}, t('stats.title')),
    h('div', { class: 'stats report-kpis' }, kpi(s.questions, t('stats.questions')), kpi(s.votes, t('stats.votes')),
      kpi(s.answered, t('stats.answered')), kpi(s.reactions, t('stats.reactions'))),
    h('h2', {}, '📈 ' + t('act.screenTitle')), activityKpis(s), activityChart(s, { w: 720, table: true }),
    s.nps !== undefined && h('div', { class: 'card nps-hl' }, h('div', {}, h('div', { class: 'muted' }, '📈 ' + t('stats.nps')), h('div', { class: 'score' }, s.nps != null ? (s.nps > 0 ? '+' : '') + s.nps : '—')),
      h('div', { class: 'muted' }, t('report.npsBased', { n: s.npsResponses }))),
    h('h2', {}, t('report.questions', { n: liveQ.length })),
    liveQ.length ? h('ol', { class: 'report-q' }, liveQ.map(q => h('li', {},
      h('div', { class: 'between' }, h('b', {}, q.text), h('span', { class: 'votes' }, '👍 ' + q.votes)),
      h('div', { class: 'muted' }, [q.author || t('q.anonymous'), q.status === 'answered' ? '✓ ' + t('q.answered') : null, q.pinned ? '📌 ' + t('q.pinned') : null].filter(Boolean).join(' · ')),
      q.note && h('div', { class: 'note' }, h('b', {}, '💬 ' + t('q.hostAnswer')), ' ', q.note),
      q.merged.length > 0 && h('div', { class: 'muted' }, '🔗 ' + t('q.mergedN', { n: q.merged.length }) + ': ' + q.merged.map(m => '« ' + m.text + ' »').join(' · '))))) : h('p', { class: 'muted' }, t('empty.all')),
    h('h2', {}, t('report.polls', { n: d.polls.filter(p => !p.draft).length })),
    d.polls.some(p => !p.draft) ? d.polls.filter(p => !p.draft).map(p => h('section', { class: 'card poll' }, h('div', { class: 'poll-h' }, h('span', { class: 'tag' }, TYPE_ICON[p.type] + ' ' + t('ptype.' + p.type)), h('b', {}, pollQ(p))),
      pollResults(p), h('div', { class: 'muted', style: 'margin-top:6px' }, t('poll.responses', { n: p.total })))) : h('p', { class: 'muted' }, t('report.noPolls')),
    h('p', { class: 'muted foot' }, t('report.generated', { date: fmtDate(Date.now()) }))));
}

route();
