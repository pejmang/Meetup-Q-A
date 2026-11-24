/*!
 * Meetup Q&A (ORBii Interact)
 * Copyright (c) 2026 ORBii SAS. All rights reserved.
 * Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE and NOTICE): free for any noncommercial use.
 * Commercial use requires a separate license from ORBii SAS: info@orbii.tech
 * https://polyformproject.org/licenses/noncommercial/1.0.0
 */

// Meetup Q&A v2 — dependency-free server (Node >= 18). Real-time via Server-Sent Events.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { buildDemo } = require('./demo');

// ---------- Configuration ----------
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  console.error('FATAL: the ADMIN_PASSWORD environment variable is required (at least 8 characters). Refusing to start.');
  process.exit(1);
}
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '');           // e.g. "/v2.0" when served under a sub-path
const TRUST_PROXY = process.env.TRUST_PROXY === '1';                       // read client IP from X-Real-IP / X-Forwarded-For
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MIN) || 30;           // writes per minute per IP + device
const LOGIN_LIMIT = Number(process.env.LOGIN_LIMIT_PER_MIN) || 10;         // sign-in attempts per minute per IP
const IP_LIMIT = Number(process.env.IP_LIMIT_PER_MIN) || 600;              // all writes per minute per IP (shared Wi-Fi)
const BACKUP_KEEP = Number(process.env.BACKUP_KEEP) || 14;                 // daily backups kept
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const PUBLIC = path.join(__dirname, 'public');
fs.mkdirSync(DATA_DIR, { recursive: true });
try { fs.writeFileSync(path.join(DATA_DIR, '.write-test'), 'ok'); fs.unlinkSync(path.join(DATA_DIR, '.write-test')); }
catch (e) { console.error(`FATAL: cannot write to DATA_DIR (${DATA_DIR}): ${e.code}. Data would not be saved. Refusing to start.`); process.exit(1); }

// ---------- Auth helpers ----------
const sha = x => crypto.createHash('sha256').update(String(x)).digest();
const adminToken = crypto.createHmac('sha256', ADMIN_PASSWORD).update('meetup-admin').digest('hex');
const okToken = t => typeof t === 'string' && t.length === adminToken.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(adminToken));
const isAdminPw = pw => crypto.timingSafeEqual(sha(pw), sha(ADMIN_PASSWORD));
const hashPw = pw => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(String(pw), salt, 32).toString('hex'); };
const checkPw = (pw, stored) => {
  if (!stored || typeof pw !== 'string') return false;
  const [salt, h] = stored.split(':');
  return crypto.timingSafeEqual(crypto.scryptSync(pw, salt, 32), Buffer.from(h, 'hex'));
};
const delay = ms => new Promise(r => setTimeout(r, ms));

// ---------- Rate limiting (fixed one-minute windows) ----------
const buckets = new Map();
function limited(key, max) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset <= now) { b = { n: 0, reset: now + 60000 }; buckets.set(key, b); }
  return ++b.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k); }, 60000).unref();
function clientIp(req) {
  if (TRUST_PROXY) {
    const h = req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (h) return h;
  }
  return req.socket.remoteAddress || '?';
}

// ---------- Storage + daily backups ----------
let events = {};
try { events = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { events = {}; }
let saveTimer = null;
function writeNow() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(events));
  fs.renameSync(tmp, DATA_FILE);                               // atomic replace: never a half-written file
}
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { writeNow(); } catch (e) { console.error('save failed', e); } }, 300);
}
function backup() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `data-${new Date().toISOString().slice(0, 10)}.json`));
    const files = fs.readdirSync(BACKUP_DIR).filter(f => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const f of files.slice(0, Math.max(0, files.length - BACKUP_KEEP))) fs.unlinkSync(path.join(BACKUP_DIR, f));
  } catch (e) { console.error('backup failed', e); }
}
backup();
setInterval(backup, 6 * 3600 * 1000).unref();                  // refreshes today's snapshot every 6 h
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { clearTimeout(saveTimer); try { writeNow(); } catch {} process.exit(0); });

const uid = () => crypto.randomBytes(5).toString('hex');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  let c;
  do { c = Array.from({ length: 5 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join(''); } while (events[c]);
  return c;
}
function lanUrls() {
  return Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => `http://${i.address}:${PORT}${BASE}`);
}

// ---------- Activity tracking (stats) ----------
// Per-minute timeline: o = max people connected at the same time, a = interactions, u = devices that interacted.
const MIN = 60 * 1000;
const minuteOf = ts => Math.floor(ts / MIN) * MIN;
function slot(ev) {
  ev.tl = ev.tl || {};
  const m = minuteOf(Date.now());
  return ev.tl[m] = ev.tl[m] || { o: 0, a: 0, u: [] };
}
function track(ev, cid) {                                       // an interaction: question, vote, reaction, poll answer
  const s = slot(ev);
  s.a++;
  if (cid && !s.u.includes(cid)) s.u.push(cid);
  ev.actives = ev.actives || [];
  if (cid && !ev.actives.includes(cid) && ev.actives.length < 20000) ev.actives.push(cid);
}
function sampleOnline(ev) {
  const online = onlineCount(ev.code);
  const s = slot(ev);
  if (online > s.o) s.o = online;
  if (online > (ev.peakOnline || 0)) { ev.peakOnline = online; ev.peakOnlineAt = Date.now(); return true; }
  return false;
}
const onlineCount = code => new Set([...clients.values()].filter(c => c.code === code).map(c => c.cid || Math.random())).size;

// ---------- Views by role ----------
const EMOJIS = ['❤️', '🔥', '💡', '👏'];
const POLL_TYPES = ['choice', 'multi', 'wordcloud', 'rating', 'nps', 'open'];
// Event-long NPS: open for the whole meetup, not closed by other polls, results hidden from participants until closed.
// An empty question means "use the default, translated question" on the client.
const newNps = () => ({ id: uid(), type: 'nps', question: '', open: true, hidden: true, persistent: true, responses: {}, created: Date.now() });

function pollView(p, isHost, cid, ev) {
  const show = isHost || !p.hidden || !p.open;                  // hidden results are revealed when the poll closes
  const v = { id: p.id, type: p.type, question: p.question, open: p.open, hidden: !!p.hidden, show, total: 0, draft: !!p.draft,
    persistent: !!p.persistent, onScreen: !!ev && ev.screenPoll === p.id };
  if (p.type === 'choice' || p.type === 'multi') {
    v.options = p.options.map(o => o.label);
    v.counts = show ? p.options.map(o => o.voters.length) : null;
    v.mine = p.options.map((o, i) => o.voters.includes(cid) ? i : -1).filter(i => i >= 0);
    v.total = new Set(p.options.flatMap(o => o.voters)).size;
  } else if (p.type === 'rating' || p.type === 'nps') {
    const vals = Object.values(p.responses || {});
    const max = p.type === 'rating' ? 5 : 10, min = p.type === 'rating' ? 1 : 0;
    v.total = vals.length; v.min = min; v.max = max;
    v.mine = (p.responses || {})[cid] ?? null;
    if (show) {
      v.dist = Array.from({ length: max - min + 1 }, (_, i) => vals.filter(x => x === i + min).length);
      v.avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      if (p.type === 'nps' && vals.length) {
        const pro = vals.filter(x => x >= 9).length, det = vals.filter(x => x <= 6).length;
        v.nps = Math.round(100 * (pro - det) / vals.length);
        v.split = { promoters: pro, passives: vals.length - pro - det, detractors: det };
      }
    }
  } else if (p.type === 'wordcloud') {
    const list = p.responses || [];
    v.total = new Set(list.map(r => r.cid)).size;
    v.mine = list.filter(r => r.cid === cid).map(r => r.word);
    if (show) {
      const counts = {};
      for (const r of list) { const k = r.word.toLowerCase(); counts[k] = (counts[k] || 0) + 1; }
      v.words = Object.entries(counts).map(([w, n]) => ({ w, n })).sort((a, b) => b.n - a.n).slice(0, 80);
    }
  } else if (p.type === 'open') {
    const list = p.responses || [];
    v.total = list.length;
    v.mineCount = list.filter(r => r.cid === cid).length;
    if (show) v.responses = list.slice(-200).reverse().map(r => ({ id: r.id, text: r.text, ts: r.ts, mine: r.cid === cid }));
  }
  return v;
}

function statsView(ev) {
  const live = ev.questions.filter(q => q.status !== 'pending');
  // Continuous per-minute series (gaps = nobody connected / no interaction), last 12 hours at most
  const keys = Object.keys(ev.tl || {}).map(Number).sort((a, b) => a - b);
  const timeline = [];
  if (keys.length) {
    const end = Math.max(keys[keys.length - 1], ev.ended ? 0 : minuteOf(Date.now()));
    for (let m = Math.max(keys[0], end - 719 * MIN); m <= end; m += MIN) {
      const x = ev.tl[m];
      timeline.push({ t: m, online: x ? x.o : 0, actions: x ? x.a : 0, active: x ? x.u.length : 0 });
    }
  }
  const peakA = timeline.reduce((m, x) => (x.actions > m.n ? { t: x.t, n: x.actions } : m), { t: null, n: 0 });
  const pollResponses = ev.polls.reduce((s, p) => s + pollView(p, true, '').total, 0);
  return {
    participants: new Set([...(ev.participants || []), ...(ev.actives || [])]).size, peakOnline: ev.peakOnline || 0, peakOnlineAt: ev.peakOnlineAt || null,
    online: onlineCount(ev.code), activeUsers: (ev.actives || []).length,
    interactions: Object.values(ev.tl || {}).reduce((a, x) => a + x.a, 0),
    questions: live.length, answered: live.filter(q => q.status === 'answered').length,
    votes: live.reduce((s, q) => s + q.voters.length, 0),
    reactions: live.reduce((s, q) => s + Object.values(q.reacts || {}).reduce((a, r) => a + r.length, 0), 0),
    polls: ev.polls.filter(p => !p.draft).length, pollResponses,
    ...(() => { const n = ev.polls.find(p => p.persistent); if (!n) return {}; const v = pollView(n, true, ''); return { nps: v.nps ?? null, npsResponses: v.total }; })(),
    peak: { ts: peakA.t, n: peakA.n }, timeline,
    created: ev.created, endedAt: ev.endedAt || null,
  };
}

function view(ev, isHost, cid) {
  const questions = ev.questions
    .filter(q => isHost || q.status !== 'pending' || q.cid === cid || (q.merged || []).some(m => m.cid === cid))
    .map(q => ({
      id: q.id, text: q.text, author: q.anon ? null : q.author, status: q.status,
      pinned: q.pinned, highlighted: q.highlighted, ts: q.ts, note: q.note || '',
      merged: (q.merged || []).map(m => ({ text: m.text, author: m.author, mine: !!cid && m.cid === cid })),
      mergedMine: !!cid && (q.merged || []).some(m => m.cid === cid),
      votes: q.voters.length, voted: q.voters.includes(cid), mine: q.cid === cid,
      reacts: EMOJIS.map(e => ({ e, n: (q.reacts?.[e] || []).length, mine: (q.reacts?.[e] || []).includes(cid) })),
    }));
  return {
    code: ev.code, title: ev.title, open: ev.open, moderation: ev.moderation, host: isHost, ended: !!ev.ended, demo: !!ev.demo,
    created: ev.created, online: onlineCount(ev.code), questions, screenPoll: ev.screenPoll || null,
    polls: ev.polls.filter(p => isHost || !p.draft).map(p => pollView(p, isHost, cid, ev)),
    ...(isHost || ev.screenPoll === 'activity' ? { stats: statsView(ev) } : {}),
  };
}

// ---------- Real-time ----------
const clients = new Map(); // res -> { code, host, cid }
function broadcast(code) {
  const ev = events[code];
  if (!ev) return;
  if (sampleOnline(ev)) save();
  for (const [res, c] of clients) {
    if (c.code !== code) continue;
    res.write(`data: ${JSON.stringify(view(ev, c.host, c.cid))}\n\n`);
  }
}
setInterval(() => { for (const res of clients.keys()) res.write(': ping\n\n'); }, 25000).unref();
// Every 30 s: sample who is connected (so the live chart moves even when nobody interacts) and push fresh stats
setInterval(() => { for (const code of new Set([...clients.values()].map(c => c.code))) broadcast(code); save(); }, 30000).unref();

// ---------- CSV export ----------
function csv(ev, sep) {
  const cell = v => { const s = String(v ?? ''); return /[",;\n\r]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s; };
  const row = a => a.map(cell).join(sep);
  const iso = ts => ts ? new Date(ts).toISOString().replace('T', ' ').slice(0, 16) : '';
  const out = [row(['Event', ev.title]), row(['Code', ev.code]), row(['Created (UTC)', iso(ev.created)]), ''];
  const st = statsView(ev);
  out.push(row(['Participants (connected)', st.participants]), row(['Active participants', st.activeUsers]), row(['Interactions', st.interactions]), row(['Peak online', st.peakOnline]), row(['Peak online at (UTC)', iso(st.peakOnlineAt)]), row(['Questions', st.questions]), row(['Votes', st.votes]), row(['Poll responses', st.pollResponses]), '');
  out.push(row(['Rank', 'Question', 'Author', 'Votes', 'Status', 'Pinned', 'Host note', 'Merged questions', ...EMOJIS, 'Asked at (UTC)']));
  const qs = ev.questions.filter(q => q.status !== 'pending').sort((a, b) => b.voters.length - a.voters.length || a.ts - b.ts);
  qs.forEach((q, i) => out.push(row([i + 1, q.text, q.anon ? 'Anonymous' : q.author, q.voters.length, q.status, q.pinned ? 'yes' : '', q.note || '',
    (q.merged || []).map(m => m.text).join(' | '), ...EMOJIS.map(e => (q.reacts?.[e] || []).length), iso(q.ts)])));
  out.push('', row(['Poll', 'Type', 'Answer', 'Count']));
  for (let p of ev.polls) {
    if (p.draft) continue;
    const v = pollView(p, true, '');
    if (p.persistent) p = { ...p, question: 'Event NPS' };
    if (v.options) v.options.forEach((o, i) => out.push(row([p.question, p.type, o, v.counts[i]])));
    else if (v.dist) { v.dist.forEach((n, i) => out.push(row([p.question, p.type, i + v.min, n]))); out.push(row([p.question, p.type, p.type === 'nps' ? 'NPS' : 'Average', p.type === 'nps' ? v.nps ?? '' : v.avg?.toFixed(2) ?? ''])); }
    else if (v.words) v.words.forEach(w => out.push(row([p.question, p.type, w.w, w.n])));
    else if (v.responses) v.responses.forEach(r => out.push(row([p.question, p.type, r.text, 1])));
  }
  return '﻿' + out.join('\r\n');
}

// ---------- HTTP helpers ----------
function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', ch => { d += ch; if (d.length > 20000) { reject(new Error('too big')); req.destroy(); } });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
  });
}
const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const lastAsk = new Map(); // anti-flood: 1 question / 4 s per device
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
let indexHtml = null;
function serveIndex(res) {
  if (!indexHtml) indexHtml = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8').replace(/__BASE__/g, BASE);
  res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
  res.end(indexHtml);
}

// ---------- Router ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let pathname = url.pathname;
  if (BASE) {
    if (pathname === BASE) { res.writeHead(301, { Location: BASE + '/' + url.search }); return res.end(); }
    if (pathname.startsWith(BASE + '/')) pathname = pathname.slice(BASE.length);
  }
  const parts = pathname.split('/').filter(Boolean);
  if (pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');

  if (parts[0] === 'api') {
    try {
      const ip = clientIp(req);
      if (req.method === 'POST' && limited('ip:' + ip, IP_LIMIT)) return json(res, 429, { error: 'err.rate' });
      if (req.method === 'GET' && parts[1] === 'info') return json(res, 200, { lan: lanUrls() });
      if (req.method === 'POST' && parts[1] === 'login') {
        if (limited('login:' + ip, LOGIN_LIMIT)) return json(res, 429, { error: 'err.rate' });
        const b = await body(req);
        if (isAdminPw(b.password)) return json(res, 200, { token: adminToken });
        await delay(700);
        return json(res, 401, { error: 'err.password' });
      }
      // Event list (public; admin also receives host keys)
      if (req.method === 'GET' && parts.length === 2 && parts[1] === 'events') {
        const admin = okToken(url.searchParams.get('token'));
        const list = Object.values(events).filter(e => admin || !e.ended).sort((a, b) => b.created - a.created).map(e => ({
          code: e.code, title: e.title, open: e.open, ended: !!e.ended, created: e.created, demo: !!e.demo,
          questions: e.questions.filter(q => q.status !== 'pending').length,
          online: onlineCount(e.code),
          ...(admin ? { hostKey: e.hostKey, hasHostPassword: !!e.hostPass, pending: e.questions.filter(q => q.status === 'pending').length } : {}),
        }));
        return json(res, 200, { events: list, admin });
      }
      // Simulated demo event (admin only): fully fictional content, recreated on demand
      if (req.method === 'POST' && parts.length === 3 && parts[1] === 'events' && parts[2] === 'demo') {
        const b = await body(req);
        if (!okToken(b.token)) return json(res, 401, { error: 'err.adminRequired' });
        const hostPassword = String(b.hostPassword || '').trim();
        if (hostPassword.length < 4 || hostPassword.length > 64) return json(res, 400, { error: 'err.hostPw' });
        const code = newCode();
        const hostKey = crypto.randomBytes(12).toString('hex');
        events[code] = buildDemo({ lang: b.lang === 'fr' ? 'fr' : 'en', code, hostKey, hostPass: hashPw(hostPassword), uid });
        save();
        return json(res, 200, { code, hostKey });
      }
      // Event creation (signed-in admin only)
      if (req.method === 'POST' && parts.length === 2 && parts[1] === 'events') {
        const b = await body(req);
        if (!okToken(b.token)) return json(res, 401, { error: 'err.adminRequired' });
        const title = clean(b.title, 80);
        if (!title) return json(res, 400, { error: 'err.title' });
        const hostPassword = String(b.hostPassword || '').trim();
        if (hostPassword.length < 4 || hostPassword.length > 64) return json(res, 400, { error: 'err.hostPw' });
        const code = newCode();
        const hostKey = crypto.randomBytes(12).toString('hex');
        events[code] = { code, title, hostKey, hostPass: hashPw(hostPassword), open: true, moderation: !!b.moderation,
          questions: [], polls: [], created: Date.now(), participants: [], peakOnline: 0, activity: {} };
        if (b.nps !== false) events[code].polls.push(newNps());
        save();
        return json(res, 200, { code, hostKey });
      }

      const code = (parts[2] || '').toUpperCase();
      const ev = events[code];
      if (parts[1] !== 'events' || !ev) return json(res, 404, { error: 'err.notFound' });
      const cid = clean(url.searchParams.get('cid'), 40);
      const isHost = url.searchParams.get('key') === ev.hostKey || okToken(url.searchParams.get('token'));

      if (req.method === 'GET' && parts.length === 3) return json(res, 200, view(ev, isHost, cid));

      if (req.method === 'GET' && parts[3] === 'export.csv') {
        if (!isHost) return json(res, 403, { error: 'err.hostOnly' });
        const sep = url.searchParams.get('sep') === ';' ? ';' : ',';
        const name = `${ev.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'event'}-${ev.code}.csv`;
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' });
        return res.end(csv(ev, sep));
      }

      if (req.method === 'GET' && parts[3] === 'stream') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(`data: ${JSON.stringify(view(ev, isHost, cid))}\n\n`);
        clients.set(res, { code, host: isHost, cid });
        if (cid && !isHost) {
          ev.participants = ev.participants || [];
          if (!ev.participants.includes(cid) && ev.participants.length < 20000) { ev.participants.push(cid); save(); }
        }
        broadcast(code);
        req.on('close', () => { clients.delete(res); broadcast(code); });
        return;
      }

      if (req.method !== 'POST') return json(res, 405, { error: 'err.method' });
      const b = await body(req);
      const bcid = clean(b.cid, 40);
      const hostOk = b.key === ev.hostKey;
      const adminOk = okToken(b.token);

      // Host sign-in for this event (event password, or the admin password)
      if (parts[3] === 'host-login') {
        if (limited('login:' + ip, LOGIN_LIMIT)) return json(res, 429, { error: 'err.rate' });
        if (checkPw(b.password, ev.hostPass) || isAdminPw(b.password) || adminOk) return json(res, 200, { hostKey: ev.hostKey });
        await delay(700);
        return json(res, 401, { error: 'err.hostPassword' });
      }
      // Set / reset the host password (admin only). Rotates the host key: current hosts are signed out.
      if (parts[3] === 'host-password') {
        if (!adminOk) return json(res, 403, { error: 'err.adminOnly' });
        const pw = String(b.hostPassword || '').trim();
        if (pw.length < 4 || pw.length > 64) return json(res, 400, { error: 'err.hostPw' });
        ev.hostPass = hashPw(pw);
        ev.hostKey = crypto.randomBytes(12).toString('hex');
        for (const [r, c] of clients) if (c.code === code && c.host) { r.end(); clients.delete(r); }
        save();
        return json(res, 200, { ok: true, hostKey: ev.hostKey });
      }

      // Per-device write limit (participants only; hosts are trusted)
      if (!hostOk && !adminOk && limited(`w:${ip}:${bcid}`, RATE_LIMIT)) return json(res, 429, { error: 'err.rate' });

      // Ask a question
      if (parts[3] === 'questions' && parts.length === 4) {
        if (!ev.open && !hostOk) return json(res, 403, { error: 'err.closed' });
        const text = clean(b.text, 280);
        if (text.length < 3 || !bcid) return json(res, 400, { error: 'err.short' });
        if (Date.now() - (lastAsk.get(bcid) || 0) < 4000) return json(res, 429, { error: 'err.slow' });
        lastAsk.set(bcid, Date.now());
        ev.questions.push({
          id: uid(), text, author: clean(b.author, 40) || 'Anonymous', anon: !!b.anon || !clean(b.author, 40),
          cid: bcid, ts: Date.now(), voters: [bcid], status: ev.moderation ? 'pending' : 'live',
          pinned: false, highlighted: false, note: '', merged: [],
        });
        track(ev, bcid);
      }
      // Upvote a question
      else if (parts[3] === 'questions' && parts[5] === 'vote') {
        const q = ev.questions.find(x => x.id === parts[4]);
        if (!q || q.status === 'pending' || !bcid) return json(res, 404, { error: 'err.qNotFound' });
        const i = q.voters.indexOf(bcid);
        if (i >= 0) q.voters.splice(i, 1); else { q.voters.push(bcid); track(ev, bcid); }
      }
      // Emoji reaction
      else if (parts[3] === 'questions' && parts[5] === 'react') {
        const q = ev.questions.find(x => x.id === parts[4]);
        if (!q || q.status === 'pending' || !bcid || !EMOJIS.includes(b.emoji)) return json(res, 400, { error: 'err.react' });
        q.reacts = q.reacts || {};
        const arr = q.reacts[b.emoji] = q.reacts[b.emoji] || [];
        const i = arr.indexOf(bcid);
        if (i >= 0) arr.splice(i, 1); else { arr.push(bcid); track(ev, bcid); }
      }
      // Host actions on a question
      else if (parts[3] === 'questions' && parts[5] === 'action') {
        if (!hostOk) return json(res, 403, { error: 'err.hostOnly' });
        const q = ev.questions.find(x => x.id === parts[4]);
        if (!q) return json(res, 404, { error: 'err.qNotFound' });
        switch (b.action) {
          case 'approve': q.status = 'live'; break;
          case 'answer': q.status = q.status === 'answered' ? 'live' : 'answered'; q.highlighted = false; break;
          case 'pin': q.pinned = !q.pinned; break;
          case 'highlight': { const v = !q.highlighted; ev.questions.forEach(x => x.highlighted = false); q.highlighted = v; break; }
          case 'delete': ev.questions = ev.questions.filter(x => x !== q); break;
          case 'note': q.note = String(b.note || '').trim().slice(0, 1000); break;
          case 'merge': {
            // Merge q (duplicate) into target: votes and reactions are combined, without double-counting a device.
            const t = ev.questions.find(x => x.id === b.into);
            if (!t || t === q) return json(res, 400, { error: 'err.merge' });
            t.voters = [...new Set([...t.voters, ...q.voters])];
            t.reacts = t.reacts || {};
            for (const [e, arr] of Object.entries(q.reacts || {})) t.reacts[e] = [...new Set([...(t.reacts[e] || []), ...arr])];
            t.merged = [...(t.merged || []), { text: q.text, author: q.anon ? null : q.author, cid: q.cid, ts: q.ts }, ...(q.merged || [])];   // keep the asker so they can still find it
            if (q.pinned) t.pinned = true;
            if (q.note && !t.note) t.note = q.note;
            if (t.status === 'pending' && q.status !== 'pending') t.status = q.status;
            ev.questions = ev.questions.filter(x => x !== q);
            break;
          }
          default: return json(res, 400, { error: 'err.action' });
        }
      }
      // Settings
      else if (parts[3] === 'settings') {
        if (!hostOk && !adminOk) return json(res, 403, { error: 'err.hostOnly' });
        if (b.delete) {
          if (!adminOk) return json(res, 403, { error: 'err.deleteAdmin' });
          for (const [r, c] of clients) if (c.code === code) { r.end(); clients.delete(r); }
          delete events[code]; save();
          return json(res, 200, { ok: true });
        }
        if (typeof b.ended === 'boolean') { ev.ended = b.ended; if (b.ended) { ev.open = false; ev.endedAt = Date.now(); } else ev.endedAt = null; }
        if (typeof b.open === 'boolean') { ev.open = b.open; if (b.open) { ev.ended = false; ev.endedAt = null; } }
        if (typeof b.moderation === 'boolean') ev.moderation = b.moderation;
        if (typeof b.screenActivity === 'boolean') ev.screenPoll = b.screenActivity ? 'activity' : null;
        if (b.approveAll) ev.questions.forEach(q => { if (q.status === 'pending') q.status = 'live'; });
      }
      // Polls: create
      else if (parts[3] === 'polls' && parts.length === 4) {
        if (!hostOk) return json(res, 403, { error: 'err.hostOnly' });
        if (b.persistent) {                                     // the event-long NPS (one per event)
          if (ev.polls.some(p => p.persistent)) return json(res, 400, { error: 'err.npsExists' });
          ev.polls.push(newNps());
          save(); broadcast(code); return json(res, 200, { ok: true });
        }
        const type = POLL_TYPES.includes(b.type) ? b.type : 'choice';
        const question = clean(b.question, 140);
        const opts = (Array.isArray(b.options) ? b.options : []).map(o => clean(o, 60)).filter(Boolean).slice(0, 8);
        if (!question || ((type === 'choice' || type === 'multi') && opts.length < 2)) return json(res, 400, { error: 'err.pollInvalid' });
        const poll = { id: uid(), type, question, open: !b.draft, hidden: !!b.hidden, created: Date.now() };
        if (type === 'choice' || type === 'multi') poll.options = opts.map(label => ({ label, voters: [] }));
        else poll.responses = (type === 'rating' || type === 'nps') ? {} : [];
        if (b.draft) {                                          // prepared in advance: invisible to participants until launched
          poll.draft = true;
          const at = ev.polls.findIndex(p => p.persistent);
          if (at < 0) ev.polls.push(poll); else ev.polls.splice(at, 0, poll);
        } else {
          ev.polls.forEach(p => { if (!p.persistent) p.open = false; });
          ev.polls.unshift(poll);
        }
      }
      // Polls: respond
      else if (parts[3] === 'polls' && parts[5] === 'vote') {
        const p = ev.polls.find(x => x.id === parts[4]);
        if (!p || !p.open || !bcid) return json(res, 400, { error: 'err.vote' });
        if (p.type === 'choice' || p.type === 'multi' || !p.type) {
          const n = Number(b.option);
          if (!p.options[n]) return json(res, 400, { error: 'err.vote' });
          const o = p.options[n], had = o.voters.includes(bcid);
          if (p.type !== 'multi') { p.options.forEach(x => { x.voters = x.voters.filter(v => v !== bcid); }); o.voters.push(bcid); }
          else if (had) o.voters = o.voters.filter(v => v !== bcid); else o.voters.push(bcid);
        } else if (p.type === 'rating' || p.type === 'nps') {
          const v = Number(b.value), min = p.type === 'rating' ? 1 : 0, max = p.type === 'rating' ? 5 : 10;
          if (!Number.isInteger(v) || v < min || v > max) return json(res, 400, { error: 'err.vote' });
          p.responses[bcid] = v;
        } else if (p.type === 'wordcloud') {
          const word = clean(b.text, 25).replace(/[^\p{L}\p{N}' \-]/gu, '').trim();
          if (!word) return json(res, 400, { error: 'err.vote' });
          if (p.responses.filter(r => r.cid === bcid).length >= 3) return json(res, 400, { error: 'err.limit3' });
          p.responses.push({ cid: bcid, word, ts: Date.now() });
        } else if (p.type === 'open') {
          const text = clean(b.text, 200);
          if (text.length < 2) return json(res, 400, { error: 'err.short' });
          if (p.responses.filter(r => r.cid === bcid).length >= 3) return json(res, 400, { error: 'err.limit3' });
          p.responses.push({ id: uid(), cid: bcid, text, ts: Date.now() });
        }
        track(ev, bcid);
      }
      // Polls: host actions
      else if (parts[3] === 'polls' && parts[5] === 'action') {
        if (!hostOk) return json(res, 403, { error: 'err.hostOnly' });
        const p = ev.polls.find(x => x.id === parts[4]);
        if (!p) return json(res, 404, { error: 'err.pollNotFound' });
        if ((b.action === 'toggle' || b.action === 'screen') && p.draft) return json(res, 400, { error: 'err.action' });
        if (b.action === 'toggle') { if (!p.open && !p.persistent) ev.polls.forEach(x => { if (!x.persistent) x.open = false; }); p.open = !p.open; }
        else if (b.action === 'launch') {
          if (!p.draft) return json(res, 400, { error: 'err.action' });
          ev.polls.forEach(x => { if (!x.persistent && !x.draft) x.open = false; });
          p.draft = false; p.open = true; p.created = Date.now();
          ev.polls = [p, ...ev.polls.filter(x => x !== p)];
        }
        else if (b.action === 'edit') {
          if (!p.draft) return json(res, 400, { error: 'err.action' });
          const question = clean(b.question, 140);
          const type = POLL_TYPES.includes(b.type) ? b.type : p.type;
          const opts = (Array.isArray(b.options) ? b.options : []).map(o => clean(o, 60)).filter(Boolean).slice(0, 8);
          if (!question || ((type === 'choice' || type === 'multi') && opts.length < 2)) return json(res, 400, { error: 'err.pollInvalid' });
          p.type = type; p.question = question; p.hidden = !!b.hidden;
          if (type === 'choice' || type === 'multi') { p.options = opts.map(label => ({ label, voters: [] })); delete p.responses; }
          else { delete p.options; p.responses = (type === 'rating' || type === 'nps') ? {} : []; }
        }
        else if (b.action === 'reveal') p.hidden = !p.hidden;
        else if (b.action === 'screen') ev.screenPoll = ev.screenPoll === p.id ? null : p.id;
        else if (b.action === 'delete') { ev.polls = ev.polls.filter(x => x !== p); if (ev.screenPoll === p.id) ev.screenPoll = null; }
        else if (b.action === 'removeResponse' && Array.isArray(p.responses)) {
          p.responses = p.responses.filter(r => !(b.rid && r.id === b.rid) && !(b.word && r.word && r.word.toLowerCase() === String(b.word).toLowerCase()));
        }
        else return json(res, 400, { error: 'err.action' });
      }
      else return json(res, 404, { error: 'err.route' });

      save();
      broadcast(code);
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, 400, { error: 'err.invalid' });
    }
  }

  // Static files (SPA: everything else returns index.html)
  const rel = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(PUBLIC, rel);
  if (rel === '/' || rel === '/index.html' || !file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return serveIndex(res);
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
});

// Upgrade v1 data in place (polls without a type are single-choice polls)
for (const ev of Object.values(events)) for (const p of ev.polls || []) if (!p.type) p.type = 'choice';

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => console.log(`Meetup Q&A v2 ready on port ${PORT}${BASE ? ` (base path ${BASE})` : ''}`));
}
module.exports = { server };
