/*!
 * Meetup Q&A (ORBii Interact)
 * Copyright (c) 2026 ORBii SAS. All rights reserved.
 * Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE and NOTICE): free for any noncommercial use.
 * Commercial use requires a separate license from ORBii SAS: info@orbii.tech
 * https://polyformproject.org/licenses/noncommercial/1.0.0
 */

// Self-service registration: "Sign in with Google" ID tokens verified server-side (RS256, Google public keys),
// professional e-mail addresses only. No dependency: Node's crypto verifies the JWT signature.
'use strict';
const crypto = require('crypto');

const GOOGLE_CERTS_URL = process.env.GOOGLE_CERTS_URL || 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

// Free / consumer mailbox providers: not accepted to create a space (professional addresses only)
const FREE_DOMAINS = new Set(`gmail.com googlemail.com yahoo.com yahoo.fr ymail.com rocketmail.com hotmail.com hotmail.fr
  outlook.com outlook.fr live.com live.fr msn.com icloud.com me.com mac.com aol.com aol.fr gmx.com gmx.fr gmx.de gmx.net
  web.de mail.com protonmail.com proton.me pm.me tutanota.com tuta.io yandex.com yandex.ru mail.ru inbox.ru bk.ru list.ru
  zoho.com zohomail.com free.fr orange.fr wanadoo.fr sfr.fr neuf.fr laposte.net bbox.fr numericable.fr club-internet.fr
  aliceadsl.fr libertysurf.fr cegetel.net voila.fr hotmail.co.uk yahoo.co.uk btinternet.com sky.com virginmedia.com
  t-online.de qq.com 163.com 126.com sina.com naver.com hanmail.net seznam.cz wp.pl o2.pl interia.pl libero.it virgilio.it
  tiscali.it alice.it hushmail.com fastmail.com mailinator.com guerrillamail.com 10minutemail.com yopmail.com`.split(/\s+/).filter(Boolean));
const emailDomain = email => String(email || '').toLowerCase().split('@')[1] || '';
const isProEmail = email => { const d = emailDomain(email); return !!d && d.includes('.') && !FREE_DOMAINS.has(d); };

let certs = { keys: [], expires: 0 };
async function googleKeys(force) {
  if (!force && certs.expires > Date.now() && certs.keys.length) return certs.keys;
  const r = await fetch(GOOGLE_CERTS_URL);
  if (!r.ok) throw new Error('certs ' + r.status);
  const maxAge = Number((/max-age=(\d+)/.exec(r.headers.get('cache-control') || '') || [])[1]) || 3600;
  certs = { keys: (await r.json()).keys || [], expires: Date.now() + maxAge * 1000 };
  return certs.keys;
}
const b64json = s => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

// Returns the verified identity or throws an Error whose message is an i18n error key
async function verifyGoogleIdToken(token, clientId) {
  if (!clientId) throw new Error('err.regDisabled');
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('err.regToken');
  let header, payload;
  try { header = b64json(parts[0]); payload = b64json(parts[1]); } catch { throw new Error('err.regToken'); }
  if (header.alg !== 'RS256') throw new Error('err.regToken');
  let jwk = (await googleKeys()).find(k => k.kid === header.kid);
  if (!jwk) jwk = (await googleKeys(true)).find(k => k.kid === header.kid);          // keys rotate
  if (!jwk) throw new Error('err.regToken');
  const ok = crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), crypto.createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'));
  if (!ok) throw new Error('err.regToken');
  const now = Math.floor(Date.now() / 1000);
  if (!ISSUERS.includes(payload.iss) || payload.aud !== clientId || !(payload.exp > now - 60)) throw new Error('err.regToken');
  if (payload.email_verified !== true && payload.email_verified !== 'true') throw new Error('err.regEmailUnverified');
  return { sub: String(payload.sub), email: String(payload.email).toLowerCase(), name: String(payload.name || ''), domain: emailDomain(payload.email), hd: payload.hd || null };
}

module.exports = { verifyGoogleIdToken, isProEmail, emailDomain, FREE_DOMAINS: [...FREE_DOMAINS] };
