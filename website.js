/*!
 * Meetup Q&A (ORBii Interact)
 * Copyright (c) 2026 ORBii SAS. All rights reserved.
 * Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE and NOTICE): free for any noncommercial use.
 * Commercial use requires a separate license from ORBii SAS: info@orbii.tech
 * https://polyformproject.org/licenses/noncommercial/1.0.0
 */

// Public website: complete HTML pages rendered by the server (readable without JavaScript by search engines
// and AI assistants), one address per page and per language. Texts are in website/{fr,en}/*.html.
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'website');
const REPO = 'https://github.com/pejmang/Meetup-Q-A';
const NAV = { home: 'accueil', features: 'fonctionnalites', 'use-cases': 'cas-usage', demo: 'demo', 'open-source': 'open-source', offers: 'offres' };
const ROUTES = {
  fr: { home: '/', features: '/fonctionnalites', 'use-cases': '/cas-usage', demo: '/demo', 'open-source': '/open-source', offers: '/offres' },
  en: { home: '/en', features: '/en/features', 'use-cases': '/en/use-cases', demo: '/en/demo', 'open-source': '/en/open-source', offers: '/en/offers' }
};
const BY_PATH = new Map(Object.entries(ROUTES).flatMap(([lang, pages]) => Object.entries(pages).map(([page, p]) => [p, { lang, page }])));

const META = {
  fr: {
    home: ['ORBii Interact — Engagez votre audience. Révélez l’intelligence collective.', 'Q&A en direct, votes, sondages, modération et statistiques pour vos réunions, conférences et événements : préparez, animez et suivez les échanges avec ORBii Interact.'],
    features: ['Fonctionnalités : Q&A, sondages, modération — ORBii Interact', 'Questions et votes, sondages et réactions, modération, projection et statistiques : les fonctionnalités d’ORBii Interact avant, pendant et après votre événement.'],
    'use-cases': ['Cas d’usage : town halls, meetups, conférences — ORBii Interact', 'Town halls, communication interne, conférences, ateliers, meetups et formations : comment engager vos participants avec ORBii Interact.'],
    demo: ['Démo interactive — ORBii Interact', 'Essayez ORBii Interact : démo en ligne avec agenda, questions, sondages et statistiques, en vue animateur ou participant.'],
    'open-source': ['Community & Open Source — ORBii Interact', 'Le code d’ORBii Interact est public sur GitHub (licence PolyForm Noncommercial) : consultation, auto-hébergement non commercial et projet d’édition communautaire.'],
    offers: ['Offres & déploiement — ORBii Interact', 'Les parcours ORBii Interact : produit en ligne, auto-hébergement, formules commerciales en préparation et besoins des entreprises.']
  },
  en: {
    home: ['ORBii Interact — Engage your audience. Unlock collective intelligence.', 'Live Q&A, voting, polls, moderation and analytics for meetings, conferences and events: prepare, run and follow up on discussions with ORBii Interact.'],
    features: ['Features: Q&A, polls, moderation — ORBii Interact', 'Questions and voting, polls and reactions, moderation, big screen and analytics: ORBii Interact features before, during and after your event.'],
    'use-cases': ['Use cases: town halls, meetups, conferences — ORBii Interact', 'Town halls, internal communications, conferences, workshops, meetups and training: how to engage participants with ORBii Interact.'],
    demo: ['Interactive demo — ORBii Interact', 'Try ORBii Interact: a live demo with agenda, questions, polls and analytics, as host or participant.'],
    'open-source': ['Community & Open Source — ORBii Interact', 'ORBii Interact code is public on GitHub (PolyForm Noncommercial licence): read it, self-host it for noncommercial use, and follow the community edition project.'],
    offers: ['Plans & deployment — ORBii Interact', 'ORBii Interact paths: online product, self-hosting, commercial plans in preparation and company needs.']
  }
};
const TEXT = {
  fr: { demoCode: 'Code de démonstration', join: 'Rejoindre', demoT: 'Tester la démo', demoP: 'Des événements simulés avec agenda, questions, sondages et analytics en direct — testez tout.', host: 'Vue animateur', guest: 'Vue participant', pw: 'Mot de passe animateur :', my: 'Mes espaces', mailSubject: 'Demande d’espace événement', mailBody: 'Bonjour, je souhaite un espace pour mon événement.' },
  en: { demoCode: 'Demo code', join: 'Join', demoT: 'Try the live demo', demoP: 'Simulated events with agenda, questions, polls and live analytics — try everything.', host: 'Host view', guest: 'Participant view', pw: 'Host password:', my: 'My spaces', mailSubject: 'Event space request', mailBody: 'Hello, I would like a space for my event.' }
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cache = new Map();
const read = file => { if (!cache.has(file)) cache.set(file, fs.readFileSync(path.join(DIR, file), 'utf8')); return cache.get(file); };
const fill = (tpl, vars) => tpl.replace(/\{\{([A-Za-z:-]+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

// Public address of the site, used for canonical links, the sitemap and llms.txt
function siteUrl(req, ctx) {
  if (ctx.siteUrl) return ctx.siteUrl.replace(/\/+$/, '');
  const host = /^[a-z0-9.-]+(:\d+)?$/i.test(req.headers.host || '') ? req.headers.host : 'localhost';
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0] === 'https' ? 'https' : 'http';
  return `${proto}://${host}${ctx.base}`;
}

// The demo code is only displayed when that event exists on this site (a demo may be hosted elsewhere)
function demoCode(lang, ctx) {
  const code = ctx.demos.map(d => d.url.match(/\/e\/([A-Za-z0-9]+)\/?$/)?.[1]?.toUpperCase()).find(c => c && ctx.hasEvent(c));
  return code ? `<div><small>${TEXT[lang].demoCode}</small><div class="mk-codeblock">${esc(code)}</div></div>` : '';
}
function liveDemos(lang, ctx) {
  const x = TEXT[lang];
  if (!ctx.demos.length) return '';
  return `<div class="mk-livedemos"><h2 class="mk-livetitle">${x.demoT}</h2><p>${x.demoP}</p>${ctx.demos.map(d =>
    `<div class="mk-livedemo"><b>${esc(d.title)}</b><div class="mk-btnrow"><a class="mk-btn mk-dark" href="${esc(d.url)}/host">${x.host}</a><a class="mk-btn mk-outline" href="${esc(d.url)}">${x.guest}</a></div></div>`).join('')}<p style="margin:10px 0 0">${x.pw} <code>demo20272028</code></p></div>`;
}

function jsonLd(lang, url, home) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': 'https://orbii.tech/#org', name: 'ORBii SAS', url: 'https://orbii.tech', email: 'info@orbii.tech' },
    { '@type': 'SoftwareApplication', name: 'ORBii Interact', url: home, description: META[lang].home[1], applicationCategory: 'BusinessApplication', operatingSystem: 'Web', inLanguage: ['fr', 'en'], publisher: { '@id': 'https://orbii.tech/#org' }, license: 'https://polyformproject.org/licenses/noncommercial/1.0.0', sameAs: [REPO] },
    { '@type': 'WebPage', url, name: META[lang].home[0], inLanguage: lang }
  ] }).replace(/</g, '\\u003c');
}

function page(req, ctx, lang, name) {
  const B = ctx.base, x = TEXT[lang], other = lang === 'fr' ? 'en' : 'fr';
  const root = siteUrl(req, ctx);
  const abs = (l, n) => root + ROUTES[l][n];
  const [title, description] = META[lang][name];
  const links = Object.fromEntries(Object.entries(ROUTES[lang]).map(([n, p]) => ['url:' + n, B + p]));
  const vars = {
    ...links, base: B, page: NAV[name], years: ctx.years,
    otherUrl: B + ROUTES[other][name], otherLang: other, otherLabel: other.toUpperCase(),
    createHref: ctx.googleClientId ? B + '/register' : `mailto:info@orbii.tech?subject=${encodeURIComponent(x.mailSubject)}&amp;body=${encodeURIComponent(x.mailBody)}`,
    mySpaces: ctx.googleClientId ? `<a href="${B}/my">${x.my}</a>` : '',
    demoCode: demoCode(lang, ctx), liveDemos: liveDemos(lang, ctx)
  };
  const content = fill(read(`${lang}/${name}.html`), vars);
  const body = fill(read(`${lang}/layout.html`), { ...vars, content })
    .replace(`data-nav="${NAV[name]}"`, `data-nav="${NAV[name]}" class="mk-active" aria-current="page"`);
  return `<!doctype html>
<!--
  Meetup Q&A (ORBii Interact)
  Copyright (c) 2026 ORBii SAS. All rights reserved.
  Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE and NOTICE): free for any noncommercial use.
  Commercial use requires a separate license from ORBii SAS: info@orbii.tech
  https://polyformproject.org/licenses/noncommercial/1.0.0
-->
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="base-path" content="${B}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${ctx.noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${abs(lang, name)}">
<link rel="alternate" hreflang="fr" href="${abs('fr', name)}">
<link rel="alternate" hreflang="en" href="${abs('en', name)}">
<link rel="alternate" hreflang="x-default" href="${abs('en', name)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ORBii Interact">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(lang, name)}">
<meta property="og:locale" content="${lang === 'fr' ? 'fr_FR' : 'en_GB'}">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">${jsonLd(lang, abs(lang, name), abs(lang, 'home'))}</script>
<link rel="icon" href="${B}/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${B}/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="${B}/apple-touch-icon.png">
<meta name="theme-color" content="#142640">
<meta name="author" content="ORBii SAS">
<meta name="copyright" content="© ${ctx.years} ORBii SAS">
<link rel="stylesheet" href="${B}/style.css">
<link rel="stylesheet" href="${B}/site.css">
<noscript><style>.mk .mk-navlinks{display:flex!important;flex-direction:row!important;flex-wrap:wrap;position:static!important}.mk .mk-nav .mk-actions .mk-menu{display:none!important}.mk .mk-nav,.mk .mk-nav .mk-wrap{position:static;height:auto;flex-wrap:wrap}</style></noscript>
</head>
<body>
<div id="app"><div class="mk" data-lang="${lang}">
${body}
</div></div>
<div id="toast" role="status" aria-live="polite"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js" defer></script>
<script src="${B}/i18n.js"></script>
<script src="${B}/terms.js"></script>
<script src="${B}/site.js"></script>
<script src="${B}/app.js"></script>
</body>
</html>
`;
}

function sitemap(root) {
  const urls = Object.keys(ROUTES.fr).flatMap(name => ['fr', 'en'].map(lang =>
    `<url><loc>${root}${ROUTES[lang][name]}</loc>${['fr', 'en'].map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${root}${ROUTES[l][name]}"/>`).join('')}</url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

// Returns true when the request was for the public website
function handle(req, res, pathname, search, ctx) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const send = (type, text) => {
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', ...(ctx.noindex ? { 'X-Robots-Tag': 'noindex' } : {}) });
    res.end(req.method === 'HEAD' ? undefined : text);
    return true;
  };
  if (pathname.length > 1 && pathname.endsWith('/') && BY_PATH.has(pathname.slice(0, -1))) {
    res.writeHead(301, { Location: ctx.base + pathname.slice(0, -1) + search }); res.end(); return true;
  }
  const route = BY_PATH.get(pathname);
  if (route) return send('text/html; charset=utf-8', page(req, ctx, route.lang, route.page));
  const root = siteUrl(req, ctx);
  if (pathname === '/robots.txt') return send('text/plain; charset=utf-8', `User-agent: *\nAllow: /\nDisallow: ${ctx.base}/api/\n\nSitemap: ${root}/sitemap.xml\n`);
  if (pathname === '/sitemap.xml') return send('application/xml; charset=utf-8', sitemap(root));
  if (pathname === '/llms.txt') return send('text/plain; charset=utf-8', fill(read('llms.txt'), { 'url': root }));
  return false;
}

module.exports = { handle };
