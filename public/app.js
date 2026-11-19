// Meetup Q&A — client (vanilla JS, no dependencies)
const $app = document.getElementById('app');
const safe = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch { return null; } };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const cid = safe('cid') || (() => { const v = uuid(); safe('cid', v); return v; })();
let LAN = [];
fetch('/api/info').then(r => r.json()).then(j => { LAN = j.lan || []; }).catch(() => {});
// Share URL: if the admin is on localhost, phones cannot reach it -> use LAN address
const shareBase = () => (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && LAN[0]) || location.origin;
function qrEl(text) {
  const box = h('div', { class: 'qr', role: 'img', 'aria-label': 'QR code to join' });
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
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
let toastT;
function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800);
}
async function api(path, data) {
  const r = await fetch('/api' + path, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid, token: safe('adminToken') || undefined, ...data }) } : undefined);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { toast(j.error || 'Error'); throw new Error(j.error); }
  return j;
}
function ago(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const hh = Math.round(m / 60);
  return hh < 24 ? `${hh} h ago` : `${Math.round(hh / 24)} d ago`;
}

// ---------- Routing ----------
let stream = null;
function route() {
  if (stream) { stream.close(); stream = null; }
  document.body.classList.remove('screen');
  const p = location.pathname.split('/').filter(Boolean);
  if (p[0] === 'e' && p[1]) {
    const code = p[1].toUpperCase();
    return live(code, p[2] === 'screen' ? 'screen' : p[2] === 'host' ? 'host' : 'guest');
  }
  home();
}
function go(path) { history.pushState({}, '', path); route(); }
window.addEventListener('popstate', route);

// ---------- Home ----------
let homeTimer = null;
function home() {
  document.title = 'Meetup Q&A';
  clearInterval(homeTimer);
  const hostParam = new URLSearchParams(location.search).get('host');
  const st = { events: [], admin: false, login: !!hostParam, loginMode: 'host', hostCode: (hostParam || '').toUpperCase(), loaded: false, newTitle: '', newPw: genPw(), newMod: false };
  const token = () => safe('adminToken') || '';

  async function refresh() {
    try {
      const r = await fetch('/api/events?token=' + encodeURIComponent(token())).then(x => x.json());
      st.events = r.events || []; st.admin = !!r.admin; st.loaded = true;
      if (token() && !st.admin) safe('adminToken', ''); // stale token (password changed)
    } catch {}
    if (location.pathname === '/') draw();
  }
  homeTimer = setInterval(() => { if (location.pathname !== '/') clearInterval(homeTimer); else if (!document.querySelector('[data-keep]:focus')) refresh(); }, 8000);

  function eventCard(e) {
    const stats = h('div', { class: 'muted' }, `${e.questions} question(s) · ● ${e.online} online` + (st.admin && e.pending ? ` · ⏳ ${e.pending} to moderate` : '') + (st.admin && !e.hasHostPassword ? ' · ⚠ no host password' : '') + (e.ended ? ' · ended' : !e.open ? ' · questions closed' : ''));
    return h('div', { class: `card ev ${e.ended ? 'ended' : ''}` },
      h('div', { class: 'ev-main' }, h('b', {}, e.title), stats, h('span', { class: 'code' }, e.code)),
      h('div', { class: 'row-actions', style: 'margin:0' },
        !e.ended && h('button', { class: 'btn primary small', onclick: () => go('/e/' + e.code) }, 'Join'),
        !st.admin && h('button', { class: 'btn small', onclick: () => { st.login = true; st.loginMode = 'host'; st.hostCode = e.code; draw(); document.querySelector('[data-keep="pwd"]')?.focus(); } }, '🎛 Host'),
        st.admin && h('button', { class: 'btn small', onclick: () => { safe('key:' + e.code, e.hostKey); go(`/e/${e.code}/host`); } }, '🎛 Manage'),
        st.admin && h('button', { class: 'btn small', onclick: async () => {
          const pw = prompt(`New host password for "${e.title}" (4–64 characters).\nCurrent hosts will be signed out.`, genPw());
          if (pw == null) return;
          const r = await api(`/events/${e.code}/host-password`, { hostPassword: pw });
          safe('key:' + e.code, r.hostKey); toast('Host password updated'); refresh();
        } }, '🔑 Host password'),
        st.admin && h('button', { class: 'btn small', onclick: async () => { await api(`/events/${e.code}/settings`, { key: e.hostKey, ended: !e.ended }); refresh(); } }, e.ended ? 'Reopen' : 'End'),
        st.admin && h('button', { class: 'btn small danger', onclick: async () => { if (confirm(`Permanently delete "${e.title}" and all its questions?`)) { await api(`/events/${e.code}/settings`, { key: e.hostKey, delete: true }); refresh(); } } }, '🗑')));
  }

  function draw() {
    const codeIn = h('input', { type: 'text', placeholder: 'Code (e.g. K7M2P)', maxlength: 5, 'aria-label': 'Event code', autocapitalize: 'characters' });
    const live = st.events.filter(e => !e.ended), done = st.events.filter(e => e.ended);
    const pwLabel = st.loginMode === 'admin' ? 'Admin password' : 'Host password';
    const pwd = h('input', { type: 'password', 'data-keep': 'pwd', placeholder: pwLabel, 'aria-label': pwLabel, autocomplete: 'current-password', style: fieldStyle });
    const hostCodeIn = h('input', { type: 'text', 'data-keep': 'hcode', placeholder: 'Event code (e.g. K7M2P)', 'aria-label': 'Event code', maxlength: 5, autocapitalize: 'characters', value: st.hostCode, style: fieldStyle, oninput: e => st.hostCode = e.target.value });
    const titleIn = h('input', { type: 'text', 'data-keep': 'ntitle', placeholder: 'e.g. Data & AI Meetup — December', maxlength: 80, 'aria-label': 'Event title', value: st.newTitle, oninput: e => st.newTitle = e.target.value });
    const hostPwIn = h('input', { type: 'text', 'data-keep': 'npw', placeholder: 'Host password (4–64 characters)', maxlength: 64, 'aria-label': 'Host password for this event', autocomplete: 'off', value: st.newPw, oninput: e => st.newPw = e.target.value });
    const mod = h('input', { type: 'checkbox', checked: st.newMod, onchange: e => st.newMod = e.target.checked });

    const top = h('div', { class: 'between hometop' }, h('span', {}),
      st.admin
        ? h('div', { class: 'between' }, h('span', { class: 'role admin' }, 'ADMIN SIGNED IN'), h('button', { class: 'btn small', onclick: () => { safe('adminToken', ''); st.admin = false; refresh(); } }, 'Sign out'))
        : h('button', { class: 'btn small', onclick: () => { st.login = !st.login; draw(); document.querySelector('[data-keep="pwd"]')?.focus(); } }, '🔐 Host / Admin sign-in'));

    const login = !st.admin && st.login && h('form', { class: 'card stack', onsubmit: async e => {
      e.preventDefault();
      try {
        if (st.loginMode === 'admin') {
          const r = await api('/login', { password: pwd.value }); safe('adminToken', r.token); st.login = false; refresh();
        } else {
          const c = hostCodeIn.value.trim().toUpperCase();
          if (!c) { toast('Enter the event code'); return hostCodeIn.focus(); }
          const r = await api(`/events/${c}/host-login`, { password: pwd.value });
          safe('key:' + c, r.hostKey); go(`/e/${c}/host`);
        }
      } catch { pwd.select(); }
    } },
      h('div', { class: 'tabs', role: 'tablist' }, [['host', '🎛 Event host'], ['admin', '🔐 Administrator']].map(([k, label]) =>
        h('button', { type: 'button', class: 'tab', role: 'tab', 'aria-selected': String(st.loginMode === k), onclick: () => { st.loginMode = k; draw(); document.querySelector('[data-keep="pwd"]')?.focus(); } }, label))),
      h('div', { class: 'muted' }, st.loginMode === 'admin' ? 'Manage all events.' : 'Manage one event with its host password.'),
      st.loginMode === 'host' && hostCodeIn, pwd, h('button', { class: 'btn primary' }, 'Sign in'));

    const create = st.admin && h('form', { class: 'card stack', onsubmit: async e => {
      e.preventDefault();
      const pw = st.newPw.trim();
      const r = await api('/events', { title: titleIn.value, moderation: mod.checked, hostPassword: pw });
      safe('key:' + r.code, r.hostKey);
      st.newTitle = ''; st.newPw = genPw(); st.newMod = false;
      alert(`Event created.\n\nCode: ${r.code}\nHost password: ${pw}\n\nShare the code and password with the event host.`);
      go(`/e/${r.code}/host`);
    } }, h('h2', { style: 'margin:0' }, '➕ New event'), titleIn,
      h('div', { class: 'muted' }, 'Host password for this event — share it with the event host'), hostPwIn,
      h('label', { class: 'row' }, mod, 'Moderate questions before publishing'), h('button', { class: 'btn primary' }, 'Create event'));

    $app.replaceChildren(h('div', { class: 'wrap narrow' }, top,
      h('div', { class: 'hero' }, h('h1', {}, 'Meetup Q&A'), h('p', { class: 'muted' }, 'Ask questions, upvote the best ones, answer polls — live.')),
      login, create,
      h('h2', {}, `Live events (${live.length})`),
      live.length ? h('div', { class: 'stack' }, live.map(eventCard)) : h('p', { class: 'empty' }, st.loaded ? 'No live events right now.' : 'Loading…'),
      h('form', { class: 'card row-form', onsubmit: e => { e.preventDefault(); if (codeIn.value.trim()) go('/e/' + codeIn.value.trim().toUpperCase()); } },
        codeIn, h('button', { class: 'btn' }, 'Join with a code')),
      st.admin && done.length > 0 && h('div', {}, h('h2', {}, `Ended (${done.length})`), h('div', { class: 'stack' }, done.map(eventCard)))));
  }
  draw(); refresh();
}

// ---------- Event ----------
function live(code, mode) {
  const qs = new URLSearchParams(location.search);
  const key = qs.get('key') || safe('key:' + code) || '';
  if (qs.get('key')) safe('key:' + code, qs.get('key'));
  if (mode === 'host' && !key) return go('/e/' + code);
  const isHost = mode === 'host';
  const hostParam = isHost ? '&key=' + encodeURIComponent(key) : '';
  const state = {
    data: null, tab: isHost ? 'all' : 'top', draft: '', author: safe('author') || '', anon: safe('anon') === '1',
    sheet: false, tools: wide(), pq: '', po: '', q: '',
  };
  if (mode === 'screen') document.body.classList.add('screen');

  stream = new EventSource(`/api/events/${code}/stream?cid=${cid}${hostParam}`);
  stream.onmessage = e => {
    state.data = JSON.parse(e.data);
    if (isHost && !state.data.host) { safe('key:' + code, ''); toast('Host access expired — please sign in again'); return go('/?host=' + code); }
    render();
  };
  stream.onerror = () => { if (!state.data) { toast('Event not found'); go('/'); } };

  const post = (p, d) => api(`/events/${code}${p}`, { key: isHost ? key : undefined, ...d });
  const act = (id, action) => post(`/questions/${id}/action`, { action });
  const rerender = () => render();

  function render() {
    const d = state.data; if (!d) return;
    document.title = d.title + ' — Q&A';
    const y = window.scrollY;
    const a = document.activeElement;
    const keep = a && a.dataset && a.dataset.keep ? { id: a.dataset.keep, s: a.selectionStart, e: a.selectionEnd } : null;
    $app.replaceChildren(mode === 'screen' ? screenView(d) : pageView(d));
    window.scrollTo(0, y);
    if (keep) { const t = document.querySelector(`[data-keep="${keep.id}"]`); if (t) { t.focus(); try { t.setSelectionRange(keep.s, keep.e); } catch {} } }
  }

  // ----- Cards -----
  function qCard(q, rank = -1) {
    const medal = ['🥇', '🥈', '🥉'][rank];
    const tags = [
      medal && h('span', { class: 'tag rank' }, medal + ' Top ' + (rank + 1)),
      q.pinned && h('span', { class: 'tag warn' }, '📌 Pinned'),
      q.highlighted && h('span', { class: 'tag warn' }, '🎤 On screen'),
      q.status === 'answered' && h('span', { class: 'tag ok' }, '✓ Answered'),
      q.status === 'pending' && h('span', { class: 'tag' }, '⏳ Awaiting approval'),
    ];
    const voteBtn = h('button', { class: 'vote', 'aria-pressed': String(q.voted), 'aria-label': `${q.voted ? 'Remove my vote' : 'Upvote'} — ${q.votes} vote(s)`,
      disabled: q.status === 'pending' || mode === 'screen', onclick: () => { q.voted = !q.voted; q.votes += q.voted ? 1 : -1; render(); post(`/questions/${q.id}/vote`, {}); } },
      h('span', { class: 'thumb', 'aria-hidden': 'true' }, '👍'), h('b', {}, q.votes));
    const reacts = q.status === 'pending' ? null : h('div', { class: 'reacts' }, q.reacts.map(r => h('button', { class: 'react', 'aria-pressed': String(r.mine), 'aria-label': `React ${r.e}`, disabled: mode === 'screen', onclick: () => post(`/questions/${q.id}/react`, { emoji: r.e }) }, r.e, r.n > 0 && h('i', {}, r.n))));
    const acts = isHost ? h('div', { class: 'row-actions' },
      q.status === 'pending' && h('button', { class: 'btn small primary', onclick: () => act(q.id, 'approve') }, '✔ Approve'),
      q.status !== 'pending' && h('button', { class: 'btn small', onclick: () => act(q.id, 'highlight') }, q.highlighted ? 'Remove from screen' : '🎤 Show on screen'),
      q.status !== 'pending' && h('button', { class: 'btn small', onclick: () => act(q.id, 'answer') }, q.status === 'answered' ? '↩ Reopen' : '✓ Mark answered'),
      h('button', { class: 'btn small', onclick: () => act(q.id, 'pin') }, q.pinned ? 'Unpin' : '📌 Pin'),
      h('button', { class: 'btn small danger', onclick: () => { if (confirm('Delete this question?')) act(q.id, 'delete'); } }, '🗑')) : null;
    const heat = q.votes >= 10 ? 3 : q.votes >= 5 ? 2 : q.votes >= 2 ? 1 : 0;
    return h('article', { class: `card q heat${heat} ${q.highlighted ? 'hl' : ''} ${q.status}` }, voteBtn,
      h('div', { class: 'q-body' }, tags.some(Boolean) && h('div', { class: 'tags' }, tags), h('div', { class: 'q-text' }, q.text),
        h('div', { class: 'muted' }, (q.author || 'Anonymous') + (q.mine ? ' (you)' : '') + ' · ' + ago(q.ts)), reacts, acts));
  }

  function pollCard(p) {
    const total = p.counts.reduce((a, b) => a + b, 0);
    return h('div', { class: 'card' },
      h('div', { class: 'poll-h' }, h('span', { class: `tag ${p.open ? 'ok' : ''}` }, p.open ? 'Open' : 'Closed'), h('b', {}, p.question)),
      p.options.map((label, i) => {
        const pct = total ? Math.round(100 * p.counts[i] / total) : 0;
        return h('button', { class: `opt ${p.myVote === i ? 'mine' : ''}`, disabled: !p.open || mode === 'screen', onclick: () => post(`/polls/${p.id}/vote`, { option: i }) },
          h('div', { class: 'bar', style: `width:${pct}%` }), h('span', {}, h('span', {}, (p.myVote === i ? '✓ ' : '') + label), h('span', {}, `${pct}% · ${p.counts[i]}`)));
      }),
      h('div', { class: 'muted', style: 'margin-top:6px' }, `${total} vote(s)`),
      isHost && h('div', { class: 'row-actions' },
        h('button', { class: 'btn small', onclick: () => post(`/polls/${p.id}/action`, { action: 'toggle' }) }, p.open ? 'Close' : 'Reopen'),
        h('button', { class: 'btn small danger', onclick: () => confirm('Delete this poll?') && post(`/polls/${p.id}/action`, { action: 'delete' }) }, 'Delete')));
  }

  // ----- Question form -----
  function askForm(d, k) {
    const ta = h('textarea', { 'data-keep': 'q' + k, maxlength: 280, rows: 3, placeholder: 'What is your question?', 'aria-label': 'Your question', value: state.draft,
      oninput: e => { state.draft = e.target.value; counter.textContent = `${state.draft.length}/280`; } });
    const counter = h('span', { class: 'muted' }, `${state.draft.length}/280`);
    const nameIn = h('input', { type: 'text', 'data-keep': 'n' + k, placeholder: 'Your name (optional)', maxlength: 40, 'aria-label': 'Your name', value: state.author, disabled: state.anon,
      oninput: e => { state.author = e.target.value; safe('author', state.author); } });
    const anon = h('input', { type: 'checkbox', checked: state.anon, onchange: e => { state.anon = e.target.checked; safe('anon', state.anon ? '1' : '0'); nameIn.disabled = state.anon; } });
    return h('form', { class: 'stack', onsubmit: async e => {
      e.preventDefault();
      if (state.draft.trim().length < 3) return toast('Question is too short');
      await post('/questions', { text: state.draft, author: state.author, anon: state.anon });
      state.draft = ''; state.sheet = false; state.tab = 'mine'; rerender();
      toast(d.moderation ? 'Sent — awaiting approval' : 'Question posted ✔');
    } }, ta, h('div', { class: 'between' }, h('label', { class: 'row' }, anon, 'Anonymous'), counter), nameIn, h('button', { class: 'btn primary block' }, 'Send my question'));
  }

  // ----- Participant / admin page -----
  function pageView(d) {
    const base = `${shareBase()}/e/${d.code}`;
    const all = d.questions;
    const live = all.filter(q => q.status !== 'pending');
    const pending = all.filter(q => q.status === 'pending');
    const mine = all.filter(q => q.mine);
    const byVotes = (a, b) => (b.pinned - a.pinned) || (b.votes - a.votes) || (a.ts - b.ts);
    const byNew = (a, b) => b.ts - a.ts;
    const totalVotes = live.reduce((s, q) => s + q.votes, 0);

    const tabs = isHost
      ? [['all', 'All', all.length], ['pending', 'To moderate', pending.length], ['top', 'Popular', null], ['new', 'Recent', null], ['answered', 'Answered', live.filter(q => q.status === 'answered').length]]
      : [['top', '🔥 Popular', null], ['new', '🕒 Recent', null], ['mine', 'My questions', mine.length], ['answered', 'Answered', live.filter(q => q.status === 'answered').length]];
    if (!tabs.some(t => t[0] === state.tab)) state.tab = tabs[0][0];

    const needle = state.q.trim().toLowerCase();
    let list;
    switch (state.tab) {
      case 'all': list = [...all].sort((a, b) => (b.status === 'pending') - (a.status === 'pending') || (a.status === 'answered') - (b.status === 'answered') || byVotes(a, b)); break;
      case 'pending': list = pending.sort(byNew); break;
      case 'new': list = [...live].sort(byNew); break;
      case 'mine': list = [...mine].sort(byNew); break;
      case 'answered': list = live.filter(q => q.status === 'answered').sort(byVotes); break;
      default: list = live.filter(q => q.status !== 'answered').sort(byVotes);
    }
    if (needle) list = list.filter(q => q.text.toLowerCase().includes(needle) || (q.author || '').toLowerCase().includes(needle));

    const stat = (n, label) => h('div', { class: 'stat' }, h('b', {}, n), h('span', {}, label));
    const header = h('header', { class: 'topbar' }, h('div', { class: 'topbar-in' },
      h('div', { class: 'title' }, h('span', { class: `role ${isHost ? 'admin' : ''}` }, isHost ? 'HOST' : 'PARTICIPANT'), h('h1', {}, d.title)),
      h('div', { class: 'meta' }, h('span', { class: 'online', title: 'People online' }, '● ' + d.online), h('span', { class: 'code' }, d.code))));

    const stats = h('div', { class: 'stats' },
      stat(live.length, 'questions'), stat(totalVotes, 'votes'), stat(live.filter(q => q.status === 'answered').length, 'answered'),
      isHost ? stat(pending.length, 'to moderate') : stat(d.online, 'online'));

    // Sidebar
    let side;
    if (isHost) {
      const qIn = h('input', { type: 'text', 'data-keep': 'pq', placeholder: 'Poll question', maxlength: 140, 'aria-label': 'Poll question', value: state.pq, oninput: e => state.pq = e.target.value });
      const oIn = h('textarea', { 'data-keep': 'po', rows: 3, placeholder: 'One option per line (2 to 8)', 'aria-label': 'Options', value: state.po, oninput: e => state.po = e.target.value });
      side = h('aside', { class: 'side' },
        h('div', { class: 'card invite' }, qrEl(base), h('div', {}, h('div', { class: 'muted' }, 'Enter code'), h('div', { class: 'bigcode' }, d.code), h('div', { class: 'muted' }, base.replace(/^https?:\/\//, '')),
          h('button', { class: 'btn small', style: 'margin-top:8px', onclick: () => { navigator.clipboard?.writeText(base); toast('Link copied'); } }, '🔗 Copy link'))),
        h('details', { class: 'card tools', open: state.tools, ontoggle: e => state.tools = e.target.open },
          h('summary', {}, '⚙️ Settings & sharing'),
          h('div', { class: 'stack', style: 'margin-top:10px' },
            h('div', { class: 'share' }, h('div', { class: 'muted' }, 'Participant link'), h('b', {}, base)),
            h('div', { class: 'row-actions' },
              h('button', { class: 'btn small', onclick: () => { navigator.clipboard?.writeText(base); toast('Link copied'); } }, '🔗 Copy'),
              h('a', { class: 'btn small', href: `/e/${d.code}/screen`, target: '_blank' }, '📺 Projection screen')),
            h('div', { class: 'row-actions' },
              h('button', { class: 'btn small', onclick: () => post('/settings', { open: !d.open }) }, d.open ? '⏸ Close questions' : '▶ Reopen questions'),
              h('button', { class: 'btn small', onclick: () => post('/settings', { moderation: !d.moderation }) }, d.moderation ? '🛡 Moderation ON' : '🛡 Moderation OFF'),
              d.moderation && pending.length > 0 && h('button', { class: 'btn small', onclick: () => post('/settings', { approveAll: true }) }, 'Approve all')))),
        h('details', { class: 'card tools', open: state.tools },
          h('summary', {}, '📊 New poll'),
          h('div', { class: 'stack', style: 'margin-top:10px' }, qIn, oIn,
            h('button', { class: 'btn primary small', onclick: async () => { await post('/polls', { question: state.pq, options: state.po.split('\n') }); state.pq = state.po = ''; rerender(); } }, 'Publish poll'))),
        d.polls.map(pollCard));
    } else {
      side = h('aside', { class: 'side' },
        d.open
          ? h('div', { class: 'card ask-side' }, h('h2', { style: 'margin-top:0' }, '✍️ Ask a question'), askForm(d, 'a'))
          : h('div', { class: 'banner' }, '🔒 Questions are closed.'),
        d.polls.map(pollCard));
    }

    const search = h('input', { type: 'search', class: 'search', 'data-keep': 'search', placeholder: '🔍 Search…', 'aria-label': 'Search questions', value: state.q, oninput: e => { state.q = e.target.value; render(); } });
    const tabBar = h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, label, n]) =>
      h('button', { class: 'tab', role: 'tab', 'aria-selected': String(state.tab === k), onclick: () => { state.tab = k; render(); } }, label, n != null && h('i', {}, n))));

    const empty = { all: 'No questions yet.', pending: 'Nothing to moderate 🎉', mine: 'You haven\'t asked any questions yet.', answered: 'No answered questions.' }[state.tab] || 'No questions yet. Be the first!';
    const main = h('main', { class: 'main' },
      !isHost && pending.some(q => q.mine) && h('div', { class: 'banner' }, `⏳ ${pending.filter(q => q.mine).length} of your questions are awaiting host approval.`),
      h('div', { class: 'toolbar' }, tabBar, search),
      list.length ? list.map((q, i) => qCard(q, state.tab === 'top' && !needle ? i : -1)) : h('p', { class: 'empty' }, needle ? 'No results.' : empty));

    const fab = !isHost && d.open && h('button', { class: 'fab', onclick: () => { state.sheet = true; render(); setTimeout(() => document.querySelector('[data-keep="qs"]')?.focus(), 50); } }, '✍️ Ask a question');
    const sheet = !isHost && d.open && state.sheet && h('div', { class: 'sheet-bg', onclick: e => { if (e.target === e.currentTarget) { state.sheet = false; render(); } } },
      h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Ask a question' },
        h('div', { class: 'between' }, h('h2', { style: 'margin:0' }, 'Ask a question'), h('button', { class: 'btn small', onclick: () => { state.sheet = false; render(); } }, '✕')),
        askForm(d, 's')));

    return h('div', {}, header, h('div', { class: `wrap ${isHost ? 'admin' : 'guest'}` }, stats, h('div', { class: 'layout' }, main, side),
      h('p', { class: 'muted foot' }, h('a', { href: '/', onclick: e => { e.preventDefault(); go('/'); } }, '← Home'), ' · ',
        isHost
          ? h('a', { href: '/e/' + d.code, onclick: e => { e.preventDefault(); safe('key:' + d.code, ''); go('/e/' + d.code); } }, 'Sign out of host mode')
          : h('a', { href: '/?host=' + d.code, onclick: e => { e.preventDefault(); go('/?host=' + d.code); } }, '🎛 Host sign-in'))), fab, sheet);
  }

  // ----- Projection screen -----
  function screenView(d) {
    const live = d.questions.filter(q => q.status !== 'pending');
    const hl = live.find(q => q.highlighted);
    const top = live.filter(q => q.status !== 'answered').sort((a, b) => (b.pinned - a.pinned) || (b.votes - a.votes)).slice(0, 6);
    const poll = d.polls.find(p => p.open) || d.polls[0];
    return h('div', { class: 'screen-wrap' },
      h('main', {}, h('h1', {}, d.title),
        hl ? h('div', {}, h('div', { class: 'big-q' }, '« ' + hl.text + ' »'), h('div', { class: 'muted' }, (hl.author || 'Anonymous') + ' · ▲ ' + hl.votes))
           : h('div', { class: 'screen-list' }, h('h2', {}, 'Top questions'),
               top.length ? top.map((q, i) => qCard(q, i)) : h('p', { class: 'muted' }, 'Waiting for questions…')),
        poll && h('div', { style: 'margin-top:3vh' }, h('h2', {}, 'Poll'), pollCard(poll))),
      h('aside', {}, h('div', { class: 'join-box' }, h('div', { class: 'muted' }, 'Join at'), h('div', { style: 'font-weight:600;margin:6px 0' }, `${shareBase().replace(/^https?:\/\//, '')}/e/${d.code}`), qrEl(`${shareBase()}/e/${d.code}`), h('div', { class: 'muted' }, 'Code'), h('div', { class: 'c' }, d.code), h('div', { class: 'muted', style: 'margin-top:8px' }, '● ' + d.online + ' online'))));
  }
}

route();
