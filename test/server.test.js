/*!
 * Meetup Q&A (ORBii Interact)
 * Copyright (c) 2026 ORBii SAS. All rights reserved.
 * Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE and NOTICE): free for any noncommercial use.
 * Commercial use requires a separate license from ORBii SAS: info@orbii.tech
 * https://polyformproject.org/licenses/noncommercial/1.0.0
 */

// Run with: npm test   (Node >= 18, no dependencies)
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SERVER = path.join(__dirname, '..', 'server.js');
const ADMIN = 'test-admin-pw';
const PORT = 3900 + Math.floor(Math.random() * 90);
const B = `http://127.0.0.1:${PORT}/v2.0/api`;
let proc, dataDir;
// Fake Google: our own RSA key and JWKS endpoint, to test ID-token verification end to end
const crypto = require('node:crypto');
const { privateKey: gKey, publicKey: gPub } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const GJWK = { ...gPub.export({ format: 'jwk' }), kid: 'test-kid', alg: 'RS256', use: 'sig' };
const CERTS_PORT = PORT + 100;
let certsServer;
function googleToken(claims, { key = gKey, kid = 'test-kid' } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = enc({ alg: 'RS256', kid, typ: 'JWT' });
  const body = enc({ iss: 'https://accounts.google.com', aud: 'test-client', sub: '123', email_verified: true, name: 'Alice Martin', iat: now, exp: now + 3600, ...claims });
  return `${head}.${body}.${crypto.sign('RSA-SHA256', Buffer.from(head + '.' + body), key).toString('base64url')}`;
}

const post = async (p, body, headers = {}) => { const r = await fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const get = async p => { const r = await fetch(B + p); return { status: r.status, body: r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text() }; };

function start(env) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [SERVER], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, BASE_PATH: '/v2.0', ADMIN_PASSWORD: ADMIN, LOGIN_LIMIT_PER_MIN: '100', GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CERTS_URL: `http://127.0.0.1:${CERTS_PORT}/certs`, ...env } });
    p.stdout.on('data', d => { if (String(d).includes('ready')) resolve(p); });
    p.on('exit', c => reject(new Error('server exited ' + c)));
  });
}
const stop = p => new Promise(r => { p.on('exit', r); p.kill('SIGTERM'); });

before(async () => {
  certsServer = require('node:http').createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' }); r.end(JSON.stringify({ keys: [GJWK] })); });
  await new Promise(r => certsServer.listen(CERTS_PORT, '127.0.0.1', r));
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-test-')); proc = await start({});
});
after(async () => { if (certsServer) certsServer.close(); if (proc) await stop(proc); fs.rmSync(dataDir, { recursive: true, force: true }); });

test('0.1 refuses to start without ADMIN_PASSWORD', () => {
  const r = spawnSync(process.execPath, [SERVER], { env: { ...process.env, ADMIN_PASSWORD: '', PORT: '0' }, timeout: 5000 });
  assert.notEqual(r.status, 0);
  assert.match(String(r.stderr), /ADMIN_PASSWORD/);
});

test('refuses to start when DATA_DIR is not writable', { skip: process.getuid && process.getuid() === 0 ? 'running as root' : false }, () => {
  const ro = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-ro-')); fs.chmodSync(ro, 0o500);
  const r = spawnSync(process.execPath, [SERVER], { env: { ...process.env, ADMIN_PASSWORD: ADMIN, DATA_DIR: ro, PORT: '0' }, timeout: 5000 });
  fs.chmodSync(ro, 0o700); fs.rmSync(ro, { recursive: true, force: true });
  assert.notEqual(r.status, 0);
  assert.match(String(r.stderr), /cannot write/);
});

let token, code, hostKey;
test('admin login + event creation with host password', async () => {
  assert.equal((await post('/login', { password: 'wrong' })).status, 401);
  token = (await post('/login', { password: ADMIN })).body.token;
  assert.ok(token);
  assert.equal((await post('/events', { token, title: 'T' })).status, 400);
  const r = await post('/events', { token, title: 'Test event', hostPassword: 'host1234' });
  assert.equal(r.status, 200);
  ({ code, hostKey } = r.body);
  const h = await post(`/events/${code}/host-login`, { password: 'host1234' });
  await post(`/events/${code}/settings`, { token, company: 'ACME Corp' });
  assert.equal((await get('/events')).body.events.find(e => e.code === code).company, 'ACME Corp', 'company shown in the public list (find your space)');
  assert.equal(h.body.hostKey, hostKey);
});

test('0.4 Popular keeps answered questions; 1.3 note; 1.4 merge adds votes', async () => {
  const a = await post(`/events/${code}/questions`, { cid: 'u1', text: 'What about pricing?' });
  assert.equal(a.status, 200);
  await post(`/events/${code}/questions`, { cid: 'u2', text: 'How much does it cost?' });
  let v = (await get(`/events/${code}?key=${hostKey}`)).body;
  const [q1, q2] = v.questions;
  await post(`/events/${code}/questions/${q1.id}/vote`, { cid: 'u3' });
  await post(`/events/${code}/questions/${q2.id}/vote`, { cid: 'u3' });          // same device on both: counted once after merge
  await post(`/events/${code}/questions/${q2.id}/vote`, { cid: 'u4' });
  await post(`/events/${code}/questions/${q1.id}/action`, { key: hostKey, action: 'note', note: 'See the pricing page' });
  await post(`/events/${code}/questions/${q1.id}/action`, { key: hostKey, action: 'answer' });
  const m = await post(`/events/${code}/questions/${q2.id}/action`, { key: hostKey, action: 'merge', into: q1.id });
  assert.equal(m.status, 200);
  v = (await get(`/events/${code}?cid=u9`)).body;
  assert.equal(v.questions.length, 1);
  const q = v.questions[0];
  assert.equal(q.votes, 4);                       // u1, u3, u2, u4
  assert.equal(q.merged.length, 1);
  assert.equal(q.note, 'See the pricing page');
  assert.equal(q.status, 'answered');             // still returned to participants (client keeps it in Popular)
  const asker = (await get(`/events/${code}?cid=u2`)).body.questions[0];   // u2 asked the duplicate
  assert.equal(asker.mergedMine, true, 'the asker of a merged question can still find it');
  assert.equal(asker.merged[0].mine, true);
  assert.equal(asker.voted, true, 'their vote carried over');
  assert.equal(q.mergedMine, false);
});

test('2.x poll types: multi, hidden results, rating, nps, wordcloud, open', async () => {
  const P = `/events/${code}/polls`;
  assert.equal((await post(P, { key: hostKey, type: 'multi', question: 'Q?', options: ['A'] })).status, 400);
  await post(P, { key: hostKey, type: 'multi', question: 'Pick', options: ['A', 'B', 'C'], hidden: true });
  let v = (await get(`/events/${code}?cid=u1`)).body;
  const multi = v.polls[0];
  await post(`${P}/${multi.id}/vote`, { cid: 'u1', option: 0 });
  await post(`${P}/${multi.id}/vote`, { cid: 'u1', option: 2 });
  v = (await get(`/events/${code}?cid=u1`)).body;
  assert.equal(v.polls[0].counts, null, 'hidden for participants while open');
  assert.deepEqual(v.polls[0].mine, [0, 2]);
  v = (await get(`/events/${code}?key=${hostKey}`)).body;
  assert.deepEqual(v.polls[0].counts, [1, 0, 1], 'host always sees results');
  await post(`${P}/${multi.id}/action`, { key: hostKey, action: 'toggle' });   // close → revealed
  v = (await get(`/events/${code}?cid=u2`)).body;
  assert.deepEqual(v.polls[0].counts, [1, 0, 1]);

  await post(P, { key: hostKey, type: 'nps', question: 'Recommend?' });
  const nps = (await get(`/events/${code}?cid=u1`)).body.polls[0];
  for (const [c, val] of [['a', 10], ['b', 9], ['c', 7], ['d', 3]]) assert.equal((await post(`${P}/${nps.id}/vote`, { cid: c, value: val })).status, 200);
  assert.equal((await post(`${P}/${nps.id}/vote`, { cid: 'e', value: 11 })).status, 400);
  assert.equal((await get(`/events/${code}?cid=x`)).body.polls[0].nps, 25);    // (2 - 1) / 4

  await post(P, { key: hostKey, type: 'rating', question: 'Rate' });
  const rating = (await get(`/events/${code}?cid=x`)).body.polls[0];
  await post(`${P}/${rating.id}/vote`, { cid: 'a', value: 5 });
  await post(`${P}/${rating.id}/vote`, { cid: 'b', value: 3 });
  assert.equal((await get(`/events/${code}?cid=x`)).body.polls[0].avg, 4);

  await post(P, { key: hostKey, type: 'wordcloud', question: 'One word' });
  const wc = (await get(`/events/${code}?cid=x`)).body.polls[0];
  for (const w of ['AI', 'ai', 'Data']) await post(`${P}/${wc.id}/vote`, { cid: 'a', text: w });
  assert.equal((await post(`${P}/${wc.id}/vote`, { cid: 'a', text: 'more' })).status, 400, 'max 3 per device');
  assert.deepEqual((await get(`/events/${code}?cid=x`)).body.polls[0].words[0], { w: 'ai', n: 2 });

  await post(P, { key: hostKey, type: 'open', question: 'Feedback?' });
  const open = (await get(`/events/${code}?cid=x`)).body.polls[0];
  await post(`${P}/${open.id}/vote`, { cid: 'a', text: 'Great session' });
  assert.equal((await get(`/events/${code}?cid=x`)).body.polls[0].responses[0].text, 'Great session');
});

test('event-long NPS: created by default, stays open when other polls launch, one per event, can go on screen', async () => {
  let v = (await get(`/events/${code}?key=${hostKey}`)).body;
  const nps = v.polls.find(p => p.persistent);
  assert.ok(nps, 'created with the event');
  assert.equal(nps.type, 'nps');
  assert.equal(nps.open, true, 'still open after 6 other polls were launched');
  assert.equal((await post(`/events/${code}/polls`, { key: hostKey, persistent: true })).status, 400);
  assert.equal((await post(`/events/${code}/polls/${nps.id}/vote`, { cid: 'n1', value: 9 })).status, 200);
  assert.equal((await post(`/events/${code}/polls/${nps.id}/vote`, { cid: 'n1', value: 4 })).status, 200, 'vote can be changed');
  const guest = (await get(`/events/${code}?cid=n1`)).body.polls.find(p => p.persistent);
  assert.equal(guest.mine, 4);
  assert.notEqual(guest.dist, undefined, 'a participant who rated sees the NPS results');
  const fresh = (await get(`/events/${code}?cid=never-rated`)).body;
  assert.equal(fresh.polls.find(p => p.persistent).dist, undefined, 'hidden for participants who have not rated');
  assert.equal(fresh.stats, undefined, 'no analytics before rating');
  assert.ok((await get(`/events/${code}?cid=n1`)).body.stats, 'analytics unlocked after rating');
  await post(`/events/${code}/polls/${nps.id}/action`, { key: hostKey, action: 'screen' });
  v = (await get(`/events/${code}?key=${hostKey}`)).body;
  assert.equal(v.screenPoll, nps.id);
  assert.equal(v.stats.npsResponses, 1);
  assert.equal(v.stats.nps, -100);
  const sse = await fetch(`http://127.0.0.1:${PORT}/v2.0/api/events/${code}/stream?cid=scr&screen=1`);
  const reader = sse.body.getReader(); const chunk = new TextDecoder().decode((await reader.read()).value); reader.cancel();
  const first = chunk.split('\n\n')[0].replace(/^data: /, '');   // the stream may deliver several messages at once
  const onScreen = JSON.parse(first).polls.find(p => p.persistent);
  assert.notEqual(onScreen.dist, undefined, 'the projection screen shows the results of the poll the host put on screen');
});

test('prepared polls: hidden from participants, editable, launched in one click', async () => {
  const P = `/events/${code}/polls`;
  await post(P, { key: hostKey, type: 'choice', question: 'Draft Q', options: ['A', 'B'], draft: true });
  let host = (await get(`/events/${code}?key=${hostKey}`)).body;
  const draft = host.polls.find(p => p.draft);
  assert.ok(draft && draft.open === false);
  const openBefore = host.polls.find(p => p.open && !p.persistent && !p.draft);
  assert.ok(openBefore, 'creating a draft does not close the live poll');
  assert.equal((await get(`/events/${code}?cid=g`)).body.polls.some(p => p.id === draft.id), false, 'invisible to participants');
  assert.equal((await post(`${P}/${draft.id}/vote`, { cid: 'g', option: 0 })).status, 400, 'cannot vote on a draft');
  assert.equal((await post(`${P}/${draft.id}/action`, { key: hostKey, action: 'edit', type: 'multi', question: 'Edited', options: ['X', 'Y', 'Z'] })).status, 200);
  assert.equal((await post(`${P}/${draft.id}/action`, { key: hostKey, action: 'launch' })).status, 200);
  host = (await get(`/events/${code}?key=${hostKey}`)).body;
  const launched = host.polls[0];
  assert.equal(launched.id, draft.id);
  assert.deepEqual([launched.question, launched.type, launched.open, launched.draft], ['Edited', 'multi', true, false]);
  assert.equal(host.polls.filter(p => p.open && !p.persistent).length, 1, 'previous live poll closed');
  assert.ok(host.polls.find(p => p.persistent).open, 'event NPS stays open');
  assert.equal((await post(`${P}/${draft.id}/action`, { key: hostKey, action: 'launch' })).status, 400, 'launch only once');
});

test('simulated demo event: admin only, complete and consistent', async () => {
  assert.equal((await post('/events/demo', { lang: 'en', hostPassword: 'demo1234' })).status, 401);
  const r = await post('/events/demo', { token, lang: 'en', hostPassword: 'demo1234' });
  assert.equal(r.status, 200);
  const v = (await get(`/events/${r.body.code}?key=${r.body.hostKey}`)).body;
  assert.equal(v.demo, true);
  assert.match(v.title, /simulated/);
  assert.ok(v.questions.length >= 9);
  assert.deepEqual([...new Set(v.polls.map(p => p.type))].sort(), ['choice', 'multi', 'nps', 'open', 'rating', 'wordcloud']);
  assert.ok(v.polls.some(p => p.draft) && v.polls.some(p => p.persistent && p.open) && v.polls.some(p => p.open && !p.persistent));
  const s = v.stats;
  assert.ok(s.timeline.length >= 120 && s.peakOnline > 50);
  assert.ok(s.activeUsers <= s.participants, 'active participants never exceed connected people');
  assert.ok(s.nps > 0);
  assert.equal((await post(`/events/${r.body.code}/host-login`, { password: 'demo1234' })).body.hostKey, r.body.hostKey);
  const dk = r.body.hostKey, dc = r.body.code;
  // an ordinary demo behaves like any event: no reset, nothing locked
  assert.equal(v.publicDemo, undefined);
  assert.equal((await post(`/events/${dc}/settings`, { key: dk, moderation: true })).status, 200);
  await post(`/events/${dc}/settings`, { key: dk, moderation: false });
  assert.equal((await post(`/events/${dc}/demo-reset`, { token })).status, 400, 'only listed public demos can be reset');
  // listed in DEMO_RESET_EVENTS: public demo with automatic reset and locked settings
  await stop(proc); proc = await start({ DEMO_RESET_EVENTS: dc });
  const pv = (await get(`/events/${dc}?key=${dk}`)).body;
  assert.equal(pv.publicDemo, true);
  assert.ok(pv.demoResetAt > Date.now(), 'shows its next reset time');
  assert.equal((await post(`/events/${dc}/settings`, { key: dk, ended: true })).status, 403, 'host cannot end the public demo');
  assert.equal((await post(`/events/${dc}/settings`, { key: dk, open: false })).status, 403, 'host cannot close questions');
  await post(`/events/${dc}/questions/${pv.questions[0].id}/action`, { key: dk, action: 'delete' });
  assert.equal((await get(`/events/${dc}?key=${dk}`)).body.questions.length, pv.questions.length - 1, 'visitors can still try moderation');
  assert.equal((await post(`/events/${dc}/demo-reset`, { key: dk })).status, 403, 'only the admin resets on demand');
  assert.equal((await post(`/events/${dc}/demo-reset`, { token })).status, 200);
  const reset = (await get(`/events/${dc}?key=${dk}`)).body;
  assert.equal(reset.questions.length, pv.questions.length, 'content restored');
  assert.equal(reset.sessions.length, 3, 'agenda restored');
  assert.equal(reset.title, pv.title, 'title unchanged by repeated resets');
  await post(`/events/${dc}/demo-reset`, { token });
  assert.equal((await get(`/events/${dc}?key=${dk}`)).body.title, pv.title);
  assert.equal((await post(`/events/${dc}/host-login`, { password: 'demo1234' })).body.hostKey, dk, 'same code and host password after reset');
  await stop(proc); proc = await start({});
  assert.equal((await post(`/events/${r.body.code}/settings`, { token, delete: true })).status, 200);
});

test('admin can change the admin password; old password and old sessions stop working', async () => {
  assert.equal((await post('/admin-password', { token, current: 'wrong', next: 'new-admin-pw-1' })).status, 401);
  assert.equal((await post('/admin-password', { token, current: ADMIN, next: 'short' })).status, 400);
  const r = await post('/admin-password', { token, current: ADMIN, next: 'new-admin-pw-1' });
  assert.equal(r.status, 200);
  assert.equal((await get(`/events?token=${token}`)).body.admin, false, 'old session signed out');
  assert.equal((await post('/login', { password: ADMIN })).status, 401, 'old password refused');
  const t2 = (await post('/login', { password: 'new-admin-pw-1' })).body.token;
  assert.equal(t2, r.body.token);
  assert.equal((await get(`/events?token=${t2}`)).body.admin, true);
  // put it back so the other tests keep using ADMIN
  assert.equal((await post('/admin-password', { token: t2, current: 'new-admin-pw-1', next: ADMIN })).status, 200);
  token = (await post('/login', { password: ADMIN })).body.token;
});

test('agenda: sessions CRUD, one live at a time, max 20, questions per session, move, delete keeps questions', async () => {
  const S = `/events/${code}/sessions`, Q = `/events/${code}/questions`;
  let v = (await get(`/events/${code}?cid=x`)).body;
  assert.deepEqual(v.sessions, [], 'an event without sessions shows an empty agenda');
  assert.equal((await post(S, { cid: 'x', action: 'create', title: 'Keynote' })).status, 403, 'host only');
  assert.equal((await post(S, { key: hostKey, action: 'create', title: 'AB' })).status, 400, 'title 3-100');
  assert.equal((await post(S, { key: hostKey, action: 'create', title: 'Keynote', startTime: '25:00' })).status, 400, 'time HH:MM');
  for (const [title, speaker, startTime, duration] of [['Keynote', 'Sarah', '18:30', 20], ['Agents in production', 'Karim', '18:50', 25], ['Panel', '', '', null]])
    assert.equal((await post(S, { key: hostKey, action: 'create', title, speaker, startTime, duration })).status, 200);
  v = (await get(`/events/${code}?cid=x`)).body;
  const [k, a, p] = v.sessions;
  assert.deepEqual(v.sessions.map(x => [x.title, x.order, x.status]), [['Keynote', 0, 'upcoming'], ['Agents in production', 1, 'upcoming'], ['Panel', 2, 'upcoming']]);
  await post(S, { key: hostKey, action: 'move', id: p.id, dir: -1 });
  assert.deepEqual((await get(`/events/${code}?cid=x`)).body.sessions.map(x => x.title), ['Keynote', 'Panel', 'Agents in production'], 'reorder');
  await post(S, { key: hostKey, action: 'status', id: k.id, status: 'live' });
  await post(S, { key: hostKey, action: 'status', id: a.id, status: 'live' });
  v = (await get(`/events/${code}?cid=x`)).body;
  assert.equal(v.sessions.filter(x => x.status === 'live').length, 1, 'only one live session');
  assert.equal(v.sessions.find(x => x.id === k.id).status, 'done');
  // questions per session
  assert.equal((await post(Q, { cid: 's1', text: 'Question for a ghost session', sessionId: 'nope' })).status, 400, 'sessionId must belong to the event');
  assert.equal((await post(Q, { cid: 's1', text: 'How do agents handle errors?', sessionId: a.id })).status, 200);
  const qa = (await get(`/events/${code}?cid=s1`)).body.questions.find(q => q.text.startsWith('How do agents'));
  assert.equal(qa.sessionId, a.id);
  await post(`${Q}/${qa.id}/vote`, { cid: 's2' });
  await post(`${Q}/${qa.id}/action`, { key: hostKey, action: 'pin' });
  assert.equal((await post(`${Q}/${qa.id}/action`, { key: hostKey, action: 'move', sessionId: k.id })).status, 200);
  let moved = (await get(`/events/${code}?cid=s1`)).body.questions.find(q => q.id === qa.id);
  assert.deepEqual([moved.sessionId, moved.votes, moved.pinned], [k.id, 2, true], 'moving keeps votes and pin');
  // deleting a session keeps its questions (back to the whole meetup)
  await post(S, { key: hostKey, action: 'delete', id: k.id });
  v = (await get(`/events/${code}?cid=s1`)).body;
  assert.equal(v.sessions.length, 2);
  assert.equal(v.questions.find(q => q.id === qa.id).sessionId, null);
  assert.deepEqual(v.sessions.map(x => x.order), [0, 1], 'orders reindexed');
  // limit: 20 sessions, the 21st is refused
  for (let i = v.sessions.length; i < 20; i++) assert.equal((await post(S, { key: hostKey, action: 'create', title: `Session ${i + 1}` })).status, 200);
  assert.equal((await post(S, { key: hostKey, action: 'create', title: 'One too many' })).status, 400);
  // screen setting
  await post(`/events/${code}/settings`, { key: hostKey, screenSessionOnly: true });
  assert.equal((await get(`/events/${code}?cid=x`)).body.screenSessionOnly, true);
  // clean up for the next tests
  for (const x of (await get(`/events/${code}?cid=x`)).body.sessions) await post(S, { key: hostKey, action: 'delete', id: x.id });
  await post(`${Q}/${qa.id}/action`, { key: hostKey, action: 'delete' });
});

test('self-service registration: Google sign-in verified server-side, any verified account, terms required, 3 spaces max', async () => {
  const info = (await get('/info')).body;
  assert.equal(info.googleClientId, 'test-client');
  const reg = (credential, extra = {}) => post('/register', { credential, title: 'Team meetup', acceptTerms: true, termsVersion: info.termsVersion, ...extra });
  const gm = await reg(googleToken({ email: 'bob@gmail.com', sub: 'gm' }));
  assert.equal(gm.status, 200, 'any verified Google account (Gmail included) can register by default');
  await post(`/events/${gm.body.code}/settings`, { token, delete: true });
  assert.equal((await reg(googleToken({ email: 'alice@acme.io', aud: 'someone-else' }))).status, 401, 'token for another app refused');
  assert.equal((await reg(googleToken({ email: 'alice@acme.io', exp: 1000 }))).status, 401, 'expired token refused');
  assert.equal((await reg(googleToken({ email: 'alice@acme.io', email_verified: false }))).body.error, 'err.regEmailUnverified');
  const forged = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  assert.equal((await reg(googleToken({ email: 'alice@acme.io' }, { key: forged }))).status, 401, 'forged signature refused');
  assert.equal((await reg(googleToken({ email: 'alice@acme.io' }), { acceptTerms: false })).body.error, 'err.regTerms', 'terms must be accepted');
  const ok = await reg(googleToken({ email: 'Alice@ACME.io' }));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.email, 'alice@acme.io');
  assert.ok(ok.body.hostPassword.length >= 10, 'random host password generated');
  assert.equal((await post(`/events/${ok.body.code}/host-login`, { password: ok.body.hostPassword })).body.hostKey, ok.body.hostKey);
  const ev = (await get(`/events/${ok.body.code}?key=${ok.body.hostKey}`)).body;
  assert.ok(ev.polls.some(p => p.persistent), 'event NPS created');
  const admin = (await get(`/events?token=${token}`)).body.events.find(e => e.code === ok.body.code);
  assert.equal(admin.owner.email, 'alice@acme.io', 'admin sees the owner');
  assert.equal((await get('/events')).body.events.find(e => e.code === ok.body.code).owner, undefined, 'owner hidden from the public list');
  await reg(googleToken({ email: 'alice@acme.io' })); await reg(googleToken({ email: 'alice@acme.io' }));
  assert.equal((await reg(googleToken({ email: 'alice@acme.io' }))).body.error, 'err.regMax', 'max 3 active spaces per organiser');
  // organisers access their spaces with Google (no password) and can generate a new host password
  const mine = await post('/my-spaces', { credential: googleToken({ email: 'alice@acme.io' }) });
  assert.equal(mine.status, 200);
  assert.equal(mine.body.spaces.length, 3, 'lists only the spaces of this Google account');
  assert.ok(mine.body.spaces[0].hostKey, 'gives host access without the password');
  assert.equal((await post('/my-spaces', { credential: googleToken({ email: 'eve@other.io', sub: 'eve' }) })).body.spaces.length, 0, 'another account sees nothing');
  assert.equal((await post('/my-spaces', { credential: googleToken({ email: 'alice@acme.io' }, { key: forged }) })).status, 401, 'forged token refused');
  const sp = mine.body.spaces.find(x => x.code === ok.body.code);
  assert.equal((await post('/my-password', { credential: googleToken({ email: 'eve@other.io', sub: 'eve' }), code: sp.code })).status, 403, 'not the owner');
  const np = await post('/my-password', { credential: googleToken({ email: 'alice@acme.io' }), code: sp.code });
  assert.equal(np.status, 200);
  assert.equal((await post(`/events/${sp.code}/host-login`, { password: ok.body.hostPassword })).status, 401, 'old host password no longer works');
  assert.equal((await post(`/events/${sp.code}/host-login`, { password: np.body.hostPassword })).body.hostKey, np.body.hostKey, 'new password works');
  for (const e of (await get(`/events?token=${token}`)).body.events.filter(e => e.owner)) await post(`/events/${e.code}/settings`, { token, delete: true });
});

test('1.1 CSV export (host only) and 1.5 stats', async () => {
  assert.equal((await get(`/events/${code}/export.csv`)).status, 403);
  const r = await get(`/events/${code}/export.csv?key=${hostKey}&sep=;`);
  assert.equal(r.status, 200);
  assert.match(r.body, /What about pricing\?/);
  assert.match(r.body, /Rank;Question;Session;Author;Votes/);
  const s = (await get(`/events/${code}?key=${hostKey}`)).body.stats;
  assert.equal(s.questions, 1);
  assert.ok(s.votes >= 4);
  assert.ok(s.pollResponses > 0);
  assert.ok(s.timeline.length >= 1 && s.peak.n > 0);
});

test('0.2 rate limit: more than 30 writes per minute from one device returns 429', async () => {
  const v = (await get(`/events/${code}?cid=r`)).body;
  const qid = v.questions[0].id;
  let last;
  for (let i = 0; i < 31; i++) last = await post(`/events/${code}/questions/${qid}/vote`, { cid: 'spammer' });
  assert.equal(last.status, 429);
  assert.equal((await post(`/events/${code}/questions/${qid}/vote`, { cid: 'someone-else' })).status, 200, 'other devices are not blocked');
});

test('permissions: host cannot delete or change password; admin can', async () => {
  assert.equal((await post(`/events/${code}/settings`, { key: hostKey, delete: true })).status, 403);
  assert.equal((await post(`/events/${code}/host-password`, { key: hostKey, hostPassword: 'xxxx' })).status, 403);
});

test('0.3 daily backup is written and restorable', async () => {
  await new Promise(r => setTimeout(r, 500));                    // let the debounced save flush
  await stop(proc);                                              // SIGTERM flushes data.json
  proc = await start({});                                         // restart → backup() snapshots data.json
  const files = fs.readdirSync(path.join(dataDir, 'backups'));
  assert.equal(files.length, 1);
  const snap = path.join(dataDir, 'backups', files[0]);
  await stop(proc);
  fs.writeFileSync(path.join(dataDir, 'data.json'), '{}');       // simulate data loss
  fs.copyFileSync(snap, path.join(dataDir, 'data.json'));        // restore procedure
  proc = await start({});
  const v = (await get(`/events/${code}?cid=x`)).body;
  assert.equal(v.title, 'Test event');
  assert.equal(v.questions.length, 1);
});

test('timeline scale adapts to the event length (minutes → days)', () => {
  // the server module refuses to load without ADMIN_PASSWORD, so load it in a child with env set
  const out = spawnSync(process.execPath, ['-e', `
    const { aggregate, pickResolution } = require(${JSON.stringify(SERVER)});
    const MIN = 60000, start = Date.UTC(2026, 10, 24, 8, 0), tl = {};
    for (let d = 0; d < 3; d++) for (let m = 0; m < 600; m += 7) tl[start + d * 86400000 + m * MIN] = { o: 10 + d, a: 2, u: ['a' + d, 'b'] };
    const keys = Object.keys(tl).map(Number).sort((a, b) => a - b);
    const end = keys[keys.length - 1];
    const r = pickResolution(end - start + MIN);
    const s = aggregate(tl, keys, start, end, r);
    console.log(JSON.stringify({ r, n: s.length, max: Math.max(...s.map(x => x.online)), sum: s.reduce((a, x) => a + x.actions, 0), keys: keys.length,
      short: pickResolution(90 * MIN), day: pickResolution(10 * 3600000), month: pickResolution(90 * 86400000) }));
    process.exit(0);`], { env: { ...process.env, ADMIN_PASSWORD: ADMIN, DATA_DIR: dataDir, PORT: '0' }, encoding: 'utf8' });
  const j = JSON.parse(out.stdout.trim().split('\n').pop());
  assert.equal(j.short, 1);
  assert.equal(j.day, 5);
  assert.equal(j.month, 1440, 'a 3-month event is shown per day');
  assert.equal(j.r, 15, 'an event spread over 3 days (~58 h) is shown in 15-minute steps');
  assert.ok(j.n <= 240);
  assert.equal(j.max, 12, 'peak is preserved (max)');
  assert.equal(j.sum, j.keys * 2, 'interactions are preserved (sum)');
});

test('base path: index is served with the base injected', async () => {
  const r = await fetch(`http://127.0.0.1:${PORT}/v2.0/e/${code}`);
  const html = await r.text();
  assert.match(html, /<meta name="base-path" content="\/v2.0">/);
  assert.match(html, /src="\/v2.0\/app.js"/);
  const y = new Date().getFullYear();
  assert.ok(html.includes(`content="© ${y > 2026 ? `2026–${y}` : '2026'} ORBii SAS"`), 'copyright years follow the current year');
});

test('website: complete HTML per page and language, readable without JavaScript', async () => {
  const at = p => fetch(`http://127.0.0.1:${PORT}/v2.0${p}`, { redirect: 'manual' });
  for (const [p, lang, h1] of [['/', 'fr', 'Engage your audience.'], ['/fonctionnalites', 'fr', 'De la préparation au suivi'], ['/cas-usage', 'fr', 'Chaque audience'], ['/demo', 'fr', 'À vous de jouer.'],
    ['/en', 'en', 'Engage your audience.'], ['/en/features', 'en', 'From preparation to follow-up'], ['/en/use-cases', 'en', 'Every audience'], ['/en/demo', 'en', 'Your turn.']]) {
    const r = await at(p), html = await r.text();
    assert.equal(r.status, 200, p);
    assert.ok(html.includes(`<html lang="${lang}">`), p + ' language');
    assert.equal(html.match(/<h1[ >]/g).length, 1, p + ' has one h1');
    assert.ok(html.includes(h1), p + ' content');
    assert.ok(html.includes(`<link rel="canonical" href="http://127.0.0.1:${PORT}/v2.0${p}">`), p + ' canonical');
    assert.doesNotMatch(html, /\{\{/, p + ' has no unfilled placeholder');
    JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
    assert.equal(r.headers.get('x-robots-tag'), null, p + ' is indexable');
  }
  const slash = await at('/en/');
  assert.equal(slash.status, 301);
  assert.equal(slash.headers.get('location'), '/v2.0/en');
  assert.match(await (await at('/robots.txt')).text(), /Sitemap: .*\/v2\.0\/sitemap\.xml/);
  assert.equal((await (await at('/sitemap.xml')).text()).match(/<loc>/g).length, 8);
  const llms = await at('/llms.txt');
  assert.match(llms.headers.get('content-type'), /text\/plain/);
  assert.match(await llms.text(), /# ORBii Interact/);
  assert.equal((await at('/e/ABCDE')).headers.get('x-robots-tag'), 'noindex', 'event screens are not indexed');
});
