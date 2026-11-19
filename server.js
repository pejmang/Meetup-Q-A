// Meetup Q&A — dependency-free server (Node >= 18). Real-time via Server-Sent Events.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
function lanUrls() {
  return Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => `http://${i.address}:${PORT}`);
}

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin2027';
const adminToken = crypto.createHmac('sha256', ADMIN_PASSWORD).update('meetup-admin').digest('hex');
const okToken = t => typeof t === 'string' && t.length === adminToken.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(adminToken));
const sha = x => crypto.createHash('sha256').update(String(x)).digest();
// Per-event host passwords (scrypt, salted)
const hashPw = pw => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(String(pw), salt, 32).toString('hex'); };
const checkPw = (pw, stored) => {
  if (!stored || typeof pw !== 'string') return false;
  const [salt, h] = stored.split(':');
  return crypto.timingSafeEqual(crypto.scryptSync(pw, salt, 32), Buffer.from(h, 'hex'));
};
const isAdminPw = pw => crypto.timingSafeEqual(sha(pw), sha(ADMIN_PASSWORD));
const delay = ms => new Promise(r => setTimeout(r, ms));
const DATA_DIR = process.env.DATA_DIR || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const PUBLIC = path.join(__dirname, 'public');

// ---------- Storage ----------
let events = {};
try { events = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { events = {}; }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DATA_FILE, JSON.stringify(events), () => {}), 300);
}
const uid = () => crypto.randomBytes(5).toString('hex');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  let c;
  do { c = Array.from({ length: 5 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join(''); } while (events[c]);
  return c;
}

const EMOJIS = ['❤️', '🔥', '💡', '👏'];
// ---------- Role-based views ----------
function view(ev, isHost, cid) {
  const questions = ev.questions
    .filter(q => isHost || q.status !== 'pending' || q.cid === cid)
    .map(q => ({
      id: q.id, text: q.text, author: q.anon ? null : q.author, status: q.status,
      pinned: q.pinned, highlighted: q.highlighted, ts: q.ts,
      votes: q.voters.length, voted: q.voters.includes(cid), mine: q.cid === cid,
      reacts: EMOJIS.map(e => ({ e, n: (q.reacts?.[e] || []).length, mine: (q.reacts?.[e] || []).includes(cid) })),
    }));
  const polls = ev.polls.map(p => ({
    id: p.id, question: p.question, open: p.open, options: p.options.map(o => o.label),
    counts: p.options.map(o => o.voters.length),
    myVote: p.options.findIndex(o => o.voters.includes(cid)),
  }));
  const online = new Set([...clients.values()].filter(c => c.code === ev.code).map(c => c.cid || Math.random())).size;
  return { code: ev.code, title: ev.title, open: ev.open, moderation: ev.moderation, host: isHost, ended: !!ev.ended, online, questions, polls };
}

// ---------- Real-time ----------
const clients = new Map(); // res -> { code, host, cid }
function broadcast(code) {
  const ev = events[code];
  if (!ev) return;
  for (const [res, c] of clients) {
    if (c.code !== code) continue;
    res.write(`data: ${JSON.stringify(view(ev, c.host, c.cid))}\n\n`);
  }
}
setInterval(() => { for (const res of clients.keys()) res.write(': ping\n\n'); }, 25000);

// ---------- HTTP helpers ----------
function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
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

// Simple anti-flood: 1 question / 4 s per device
const lastAsk = new Map();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);
  if (url.pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');

  if (parts[0] === 'api') {
    try {
      if (req.method === 'GET' && parts[1] === 'info') return json(res, 200, { lan: lanUrls() });
      if (req.method === 'POST' && parts[1] === 'login') {
        const b = await body(req);
        if (isAdminPw(b.password)) return json(res, 200, { token: adminToken });
        await delay(700);
        return json(res, 401, { error: 'Incorrect password' });
      }
      // Event list (public; admin also receives host keys)
      if (req.method === 'GET' && parts.length === 2 && parts[1] === 'events') {
        const admin = okToken(url.searchParams.get('token'));
        const list = Object.values(events).filter(e => admin || !e.ended).sort((a, b) => b.created - a.created).map(e => ({
          code: e.code, title: e.title, open: e.open, ended: !!e.ended, created: e.created,
          questions: e.questions.filter(q => q.status !== 'pending').length,
          online: new Set([...clients.values()].filter(c => c.code === e.code).map(c => c.cid)).size,
          ...(admin ? { hostKey: e.hostKey, hasHostPassword: !!e.hostPass, pending: e.questions.filter(q => q.status === 'pending').length } : {}),
        }));
        return json(res, 200, { events: list, admin });
      }
      // Event creation (signed-in admin only)
      if (req.method === 'POST' && parts.length === 2 && parts[1] === 'events') {
        const b = await body(req);
        if (!okToken(b.token)) return json(res, 401, { error: 'Host sign-in required' });
        const title = clean(b.title, 80);
        if (!title) return json(res, 400, { error: 'Title required' });
        const hostPassword = String(b.hostPassword || '').trim();
        if (hostPassword.length < 4 || hostPassword.length > 64) return json(res, 400, { error: 'Host password must be 4 to 64 characters' });
        const code = newCode();
        const hostKey = crypto.randomBytes(12).toString('hex');
        events[code] = { code, title, hostKey, hostPass: hashPw(hostPassword), open: true, moderation: !!b.moderation, questions: [], polls: [], created: Date.now() };
        save();
        return json(res, 200, { code, hostKey });
      }

      const code = (parts[2] || '').toUpperCase();
      const ev = events[code];
      if (parts[1] !== 'events' || !ev) return json(res, 404, { error: 'Event not found' });
      const cid = clean(url.searchParams.get('cid'), 40);
      const isHost = url.searchParams.get('key') === ev.hostKey;

      if (req.method === 'GET' && parts.length === 3) return json(res, 200, view(ev, isHost, cid));

      if (req.method === 'GET' && parts[3] === 'stream') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(`data: ${JSON.stringify(view(ev, isHost, cid))}\n\n`);
        clients.set(res, { code, host: isHost, cid });
        broadcast(code);
        req.on('close', () => { clients.delete(res); broadcast(code); });
        return;
      }

      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      const b = await body(req);
      const bcid = clean(b.cid, 40);
      const hostOk = b.key === ev.hostKey;
      const adminOk = okToken(b.token);

      // Host sign-in for this event (event password, or the admin password)
      if (parts[3] === 'host-login') {
        if (checkPw(b.password, ev.hostPass) || isAdminPw(b.password) || adminOk) return json(res, 200, { hostKey: ev.hostKey });
        await delay(700);
        return json(res, 401, { error: 'Incorrect host password' });
      }
      // Set / reset the host password (admin only). Rotates the host key: current hosts are signed out.
      if (parts[3] === 'host-password') {
        if (!adminOk) return json(res, 403, { error: 'Admin only' });
        const pw = String(b.hostPassword || '').trim();
        if (pw.length < 4 || pw.length > 64) return json(res, 400, { error: 'Host password must be 4 to 64 characters' });
        ev.hostPass = hashPw(pw);
        ev.hostKey = crypto.randomBytes(12).toString('hex');
        for (const [r, c] of clients) if (c.code === code && c.host) { r.end(); clients.delete(r); }
        save();
        return json(res, 200, { ok: true, hostKey: ev.hostKey });
      }

      // Ask a question
      if (parts[3] === 'questions' && parts.length === 4) {
        if (!ev.open && !hostOk) return json(res, 403, { error: 'Questions are closed' });
        const text = clean(b.text, 280);
        if (text.length < 3 || !bcid) return json(res, 400, { error: 'Question is too short' });
        if (Date.now() - (lastAsk.get(bcid) || 0) < 4000) return json(res, 429, { error: 'Slow down, try again in a few seconds' });
        lastAsk.set(bcid, Date.now());
        ev.questions.push({
          id: uid(), text, author: clean(b.author, 40) || 'Anonymous', anon: !!b.anon || !clean(b.author, 40),
          cid: bcid, ts: Date.now(), voters: [bcid], status: ev.moderation ? 'pending' : 'live',
          pinned: false, highlighted: false,
        });
      }
      // Upvote a question
      else if (parts[3] === 'questions' && parts[5] === 'vote') {
        const q = ev.questions.find(x => x.id === parts[4]);
        if (!q || q.status === 'pending' || !bcid) return json(res, 404, { error: 'Question introuvable' });
        const i = q.voters.indexOf(bcid);
        if (i >= 0) q.voters.splice(i, 1); else q.voters.push(bcid);
      }
      // Emoji reaction
      else if (parts[3] === 'questions' && parts[5] === 'react') {
        const q = ev.questions.find(x => x.id === parts[4]);
        if (!q || q.status === 'pending' || !bcid || !EMOJIS.includes(b.emoji)) return json(res, 400, { error: 'Reaction not allowed' });
        q.reacts = q.reacts || {};
        const arr = q.reacts[b.emoji] = q.reacts[b.emoji] || [];
        const i = arr.indexOf(bcid);
        if (i >= 0) arr.splice(i, 1); else arr.push(bcid);
      }
      // Host actions on a question
      else if (parts[3] === 'questions' && parts[5] === 'action') {
        if (!hostOk) return json(res, 403, { error: 'Host only' });
        const q = ev.questions.find(x => x.id === parts[4]);
        if (!q) return json(res, 404, { error: 'Question introuvable' });
        switch (b.action) {
          case 'approve': q.status = 'live'; break;
          case 'answer': q.status = q.status === 'answered' ? 'live' : 'answered'; q.highlighted = false; break;
          case 'pin': q.pinned = !q.pinned; break;
          case 'highlight': { const v = !q.highlighted; ev.questions.forEach(x => x.highlighted = false); q.highlighted = v; break; }
          case 'delete': ev.questions = ev.questions.filter(x => x !== q); break;
          default: return json(res, 400, { error: 'Unknown action' });
        }
      }
      // Settings
      else if (parts[3] === 'settings') {
        if (!hostOk) return json(res, 403, { error: 'Host only' });
        if (b.delete) {
          if (!adminOk) return json(res, 403, { error: 'Only the admin can delete an event' });
          for (const [r, c] of clients) if (c.code === code) { r.end(); clients.delete(r); }
          delete events[code]; save();
          return json(res, 200, { ok: true });
        }
        if (typeof b.ended === 'boolean') { ev.ended = b.ended; if (b.ended) ev.open = false; }
        if (typeof b.open === 'boolean') { ev.open = b.open; if (b.open) ev.ended = false; }
        if (typeof b.moderation === 'boolean') ev.moderation = b.moderation;
        if (b.approveAll) ev.questions.forEach(q => { if (q.status === 'pending') q.status = 'live'; });
      }
      // Polls
      else if (parts[3] === 'polls' && parts.length === 4) {
        if (!hostOk) return json(res, 403, { error: 'Host only' });
        const question = clean(b.question, 140);
        const opts = (Array.isArray(b.options) ? b.options : []).map(o => clean(o, 60)).filter(Boolean).slice(0, 8);
        if (!question || opts.length < 2) return json(res, 400, { error: 'A question and at least 2 options are required' });
        ev.polls.forEach(p => p.open = false);
        ev.polls.unshift({ id: uid(), question, open: true, options: opts.map(label => ({ label, voters: [] })) });
      }
      else if (parts[3] === 'polls' && parts[5] === 'vote') {
        const p = ev.polls.find(x => x.id === parts[4]);
        const n = Number(b.option);
        if (!p || !p.open || !bcid || !p.options[n]) return json(res, 400, { error: 'Vote not allowed' });
        p.options.forEach(o => { o.voters = o.voters.filter(v => v !== bcid); });
        p.options[n].voters.push(bcid);
      }
      else if (parts[3] === 'polls' && parts[5] === 'action') {
        if (!hostOk) return json(res, 403, { error: 'Host only' });
        const p = ev.polls.find(x => x.id === parts[4]);
        if (!p) return json(res, 404, { error: 'Poll not found' });
        if (b.action === 'toggle') { if (!p.open) ev.polls.forEach(x => x.open = false); p.open = !p.open; }
        else if (b.action === 'delete') ev.polls = ev.polls.filter(x => x !== p);
      }
      else return json(res, 404, { error: 'Unknown route' });

      save();
      broadcast(code);
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, 400, { error: 'Invalid request' });
    }
  }

  // Static files (SPA: everything else returns index.html)
  let file = path.join(PUBLIC, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => console.log(`Meetup Q&A ready:\n  Host: http://localhost:${PORT}  (admin password: ${process.env.ADMIN_PASSWORD ? 'set via ADMIN_PASSWORD' : 'default — change it with ADMIN_PASSWORD=...'})\n  Phones (same Wi-Fi): ${lanUrls().join(', ') || 'no network detected'}`));
