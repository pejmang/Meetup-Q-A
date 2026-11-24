/*!
 * Meetup Q&A (ORBii Interact)
 * Copyright (c) 2026 ORBii SAS. All rights reserved.
 * Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE and NOTICE): free for any noncommercial use.
 * Commercial use requires a separate license from ORBii SAS: info@orbii.tech
 * https://polyformproject.org/licenses/noncommercial/1.0.0
 */

// Builds a fully simulated demo event (questions, votes, polls of every type, event NPS,
// 2 hours of minute-by-minute audience data). Everything is fictional and labelled as such.
'use strict';

const CONTENT = {
  en: {
    title: 'Demo — AI & Data Meetup (simulated)',
    names: ['Sarah', 'Karim', 'Emma', 'Lucas', 'Priya', 'Tom', 'Aisha', 'Noah'],
    questions: [
      ['How do you keep company data sovereign when using generative AI?', 'Sarah', 'We host in France, encrypt everything, and AI features are opt-in per event.'],
      ['What budget should we plan for a first AI proof of concept?', null, 'Usually 3 to 6 weeks of work; start with one measurable use case.'],
      ['Which use cases should an SME prioritise first?', 'Karim', null],
      ['How do you train business teams to use AI tools safely?', 'Emma', null],
      ['Are AI agents ready for production?', 'Lucas', null],
      ['How do you measure the ROI of an AI project?', null, null],
      ['What about GDPR when prompts contain personal data?', 'Priya', 'Anonymise before sending and keep a processing register.'],
      ['Open-source or proprietary models: how do you choose?', 'Tom', null],
      ['How long until the first results?', null, null],
    ],
    duplicate: ['How much does an AI project cost for a small company?', 'Aisha', 1],
    sessions: [['Welcome & keynote: AI in 2027', 'Sarah Martin', 20, 'Where generative AI really creates value, and where it does not.'], ['AI agents in production', 'Karim Benali', 25, 'Lessons learned from three real deployments.'], ['Panel: data sovereignty & GDPR', 'Priya Shah, Tom Leroy', 30, 'Hosting, contracts and compliance for European companies.']],
    polls: {
      choice: ['Which industry are you in?', ['Industry', 'Services', 'Public sector', 'Retail']],
      multi: ['Which AI tools do you use at work?', ['ChatGPT', 'Claude', 'Copilot', 'Mistral', 'None yet']],
      wordcloud: ['AI in one word?', ['Innovation', 'Productivity', 'Data', 'Trust', 'Risk', 'Future', 'Ethics', 'Sovereignty', 'Automation', 'Agents', 'Speed', 'Learning']],
      rating: 'How would you rate this talk?',
      open: ['What topic for the next meetup?', ['AI agents in production', 'GDPR and LLMs', 'SME case studies', 'MLOps on a budget', 'AI for customer support', 'Evaluating LLM quality']],
      live: ['Ready for a short break?', ['Yes', 'No', 'In 15 minutes']],
      draft: ['What should we cover in 2027?', ['AI agents', 'Data governance', 'MLOps', 'Responsible AI']],
    },
  },
  fr: {
    title: 'Démo — Meetup Data & IA (simulé)',
    names: ['Sarah', 'Karim', 'Emma', 'Lucas', 'Priya', 'Tom', 'Aïcha', 'Noé'],
    questions: [
      ['Comment garantir la souveraineté des données avec l\'IA générative ?', 'Sarah', 'Hébergement en France, chiffrement, et IA activable par événement.'],
      ['Quel budget prévoir pour un premier POC IA ?', null, 'En général 3 à 6 semaines ; commencez par un cas d\'usage mesurable.'],
      ['Quels cas d\'usage prioriser pour une PME ?', 'Karim', null],
      ['Comment former les équipes métier à l\'IA en toute sécurité ?', 'Emma', null],
      ['Les agents IA sont-ils prêts pour la production ?', 'Lucas', null],
      ['Comment mesurer le ROI d\'un projet IA ?', null, null],
      ['Et le RGPD quand les prompts contiennent des données personnelles ?', 'Priya', 'Anonymiser avant envoi et tenir un registre des traitements.'],
      ['Modèles open source ou propriétaires : comment choisir ?', 'Tom', null],
      ['Combien de temps avant les premiers résultats ?', null, null],
    ],
    duplicate: ['Combien coûte un projet IA pour une petite entreprise ?', 'Aïcha', 1],
    sessions: [['Accueil & keynote : l\'IA en 2027', 'Sarah Martin', 20, 'Où l\'IA générative crée vraiment de la valeur, et où elle n\'en crée pas.'], ['Les agents IA en production', 'Karim Benali', 25, 'Retours d\'expérience de trois déploiements réels.'], ['Table ronde : souveraineté des données & RGPD', 'Priya Shah, Tom Leroy', 30, 'Hébergement, contrats et conformité pour les entreprises européennes.']],
    polls: {
      choice: ['Votre secteur ?', ['Industrie', 'Services', 'Secteur public', 'Commerce']],
      multi: ['Quels outils IA utilisez-vous ?', ['ChatGPT', 'Claude', 'Copilot', 'Mistral', 'Aucun']],
      wordcloud: ['L\'IA en un mot ?', ['Innovation', 'Productivité', 'Données', 'Confiance', 'Risque', 'Avenir', 'Éthique', 'Souveraineté', 'Automatisation', 'Agents', 'Vitesse', 'Apprentissage']],
      rating: 'Comment notez-vous cette intervention ?',
      open: ['Un sujet pour le prochain meetup ?', ['Agents IA en production', 'RGPD et LLM', 'Retours d\'expérience PME', 'MLOps à petit budget', 'IA et service client', 'Évaluer la qualité des LLM']],
      live: ['On fait une petite pause ?', ['Oui', 'Non', 'Dans 15 min']],
      draft: ['Quels sujets pour 2027 ?', ['Agents IA', 'Gouvernance des données', 'MLOps', 'IA responsable']],
    },
  },
};

function buildDemo({ lang, code, hostKey, hostPass, uid, days = 1 }) {
  const C = CONTENT[lang] || CONTENT.en;
  let seed = 20261124;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const MIN = 60000, now = Math.floor(Date.now() / MIN) * MIN, start = now - 120 * MIN;
  const people = Array.from({ length: 84 }, (_, i) => `demo-${i + 1}`);
  const engaged = people.slice(0, 55);                         // ~65% of the audience interacts, like a real meetup
  const sample = (n, from = engaged) => { const s = new Set(); while (s.size < Math.min(n, from.length)) s.add(pick(from)); return [...s]; };
  const at = minute => start + minute * MIN + Math.floor(rnd() * 50000);

  // Questions (votes weighted so the ranking looks natural)
  const weights = [31, 26, 22, 17, 14, 11, 9, 6, 3];
  const questions = C.questions.map(([text, author, note], i) => {
    const voters = sample(weights[i]);
    const q = { id: uid(), text, author: author || 'Anonymous', anon: !author, cid: voters[0], ts: at(8 + i * 9), voters,
      status: note ? 'answered' : 'live', pinned: i === 2, highlighted: false, note: note || '', merged: [], reacts: {} };
    for (const e of ['❤️', '🔥', '💡', '👏']) if (rnd() < 0.7) q.reacts[e] = sample(Math.floor(rnd() * 9) + 1);
    return q;
  });
  const [dt, da, into] = C.duplicate;
  const target = questions[into];
  target.merged.push({ text: dt, author: da });
  target.voters = [...new Set([...target.voters, ...sample(5)])];

  // Agenda: 3 sessions (keynote done, agents live, panel upcoming); questions spread across them
  const t0 = new Date(start), hh = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  let off = 10;
  const sessions = C.sessions.map(([title, speaker, duration, description], i) => {
    const sstart = new Date(t0.getTime() + off * MIN); off += duration + 10;
    return { id: uid(), title, speaker, startTime: hh(sstart), duration, description, order: i, status: i === 0 ? 'done' : i === 1 ? 'live' : 'upcoming' };
  });
  const sessionOf = [0, null, null, 1, 1, null, 2, 2, null];
  questions.forEach((q, i) => { q.sessionId = sessionOf[i] == null ? null : sessions[sessionOf[i]].id; });

  // Polls: closed history, one live poll, one prepared (draft), and the event NPS
  const P = C.polls, polls = [];
  const choice = (q, opts, n, type, created, open) => {
    const o = opts.map(label => ({ label, voters: [] }));
    for (const v of sample(n)) {
      if (type === 'multi') o.forEach((x, k) => { if (rnd() < (k === 1 ? 0.65 : k === 0 ? 0.55 : 0.3)) x.voters.push(v); });
      else o[Math.min(opts.length - 1, Math.floor(Math.pow(rnd(), 1.6) * opts.length))].voters.push(v);
    }
    return { id: uid(), type, question: q, open, hidden: false, created, options: o };
  };
  polls.push(choice(P.live[0], P.live[1], 23, 'choice', at(112), true));
  const words = []; for (const v of sample(58)) for (let k = 0; k < 1 + Math.floor(rnd() * 2); k++) words.push({ cid: v, word: P.wordcloud[1][Math.min(P.wordcloud[1].length - 1, Math.floor(Math.pow(rnd(), 1.8) * P.wordcloud[1].length))], ts: at(70) });
  polls.push({ id: uid(), type: 'wordcloud', question: P.wordcloud[0], open: false, hidden: false, created: at(68), responses: words });
  polls.push({ id: uid(), type: 'open', question: P.open[0], open: false, hidden: false, created: at(95),
    responses: P.open[1].map((text, i) => ({ id: uid(), cid: people[i * 7], text, ts: at(96 + i) })) });
  const ratings = {}; for (const v of sample(47)) ratings[v] = [5, 5, 5, 4, 4, 4, 4, 3, 3, 2][Math.floor(rnd() * 10)];
  polls.push({ id: uid(), type: 'rating', question: P.rating, open: false, hidden: false, created: at(88), responses: ratings });
  polls.push(choice(P.multi[0], P.multi[1], 61, 'multi', at(40), false));
  polls.push(choice(P.choice[0], P.choice[1], 66, 'choice', at(15), false));
  polls.push({ ...choice(P.draft[0], P.draft[1], 0, 'choice', now, false), draft: true });
  const nps = {}; for (const v of sample(52)) nps[v] = [10, 10, 9, 9, 9, 8, 8, 7, 6, 5, 10, 9][Math.floor(rnd() * 12)];
  polls.push({ id: uid(), type: 'nps', question: '', open: true, hidden: true, persistent: true, responses: nps, created: start });

  const tl = {}, actives = new Set();
  let peak = 0, peakAt = start;
  if (days > 1) {
    // Multi-day event: sessions from 09:00 to 18:00 each day, busiest on day 2, ending now
    const DAY = 86400000, today9 = Math.floor(now / DAY) * DAY + 9 * 3600000 - (now % DAY < 9 * 3600000 ? DAY : 0);
    for (let d = 0; d < days; d++) {
      const day0 = today9 - (days - 1 - d) * DAY, boost = d === 1 ? 1.25 : 1;
      for (let m = 0; m <= 540; m++) {
        const t0 = day0 + m * MIN; if (t0 > now) break;
        const o = Math.max(3, Math.round(boost * (8 + 50 * Math.min(1, m / 40) - 25 * Math.exp(-(((m - 225) / 30) ** 2)) + 18 * Math.exp(-(((m - 390) / 25) ** 2)) - Math.max(0, m - 480) * 0.8) + rnd() * 4 - 2));
        const a = Math.max(0, Math.round(boost * (1 + 8 * Math.exp(-(((m - 390) / 20) ** 2)) + 4 * Math.exp(-(((m - 120) / 15) ** 2))) + rnd() * 2 - 0.5));
        const u = sample(Math.min(a, o)); u.forEach(x => actives.add(x));
        tl[t0] = { o, a, u };
        if (o > peak) { peak = o; peakAt = t0; }
      }
    }
  }
  // Minute-by-minute audience: arrivals, plateau, Q&A peak around minute 75, slow departure
  for (let m = 0; m <= 120 && days <= 1; m++) {
    const o = Math.max(4, Math.round(10 + 54 * Math.min(1, m / 22) + 16 * Math.exp(-(((m - 75) / 8) ** 2)) - Math.max(0, m - 100) * 1.5 + (rnd() * 4 - 2)));
    const a = Math.max(0, Math.round(2 + 12 * Math.exp(-(((m - 75) / 6) ** 2)) + 6 * Math.exp(-(((m - 40) / 4) ** 2)) + 4 * Math.exp(-(((m - 15) / 3) ** 2)) + rnd() * 3 - 1));
    const u = sample(Math.min(a, o));
    u.forEach(x => actives.add(x));
    tl[start + m * MIN] = { o, a, u };
    if (o > peak) { peak = o; peakAt = start + m * MIN; }
  }
  for (const q of questions) q.voters.forEach(v => actives.add(v));

  const title = days > 1 ? C.title.replace(/\(/, `(${days} ${lang === 'fr' ? 'jours' : 'days'}, `) : C.title;   // never mutate the shared template
  return { code, title, hostKey, hostPass, open: true, moderation: false, demo: true, lang,
    sessions, questions, polls, created: days > 1 ? Math.min(...Object.keys(tl).map(Number)) : start, participants: people.slice(0, Math.max(peak + 8, 0)), actives: [...actives].filter(x => people.includes(x)),
    peakOnline: peak, peakOnlineAt: peakAt, tl };
}

module.exports = { buildDemo };

// ---------- Scenario: company tech townhall (large audience) ----------
function buildTownhall({ code, hostKey, hostPass, uid }) {
  let seed = 20260930;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const MIN = 60000, now = Math.floor(Date.now() / MIN) * MIN, DURATION = 95, start = now - DURATION * MIN;
  const people = Array.from({ length: 1200 }, (_, i) => `th-${i + 1}`);
  const engaged = people.slice(0, 640);                                   // ~53 % interact during a townhall
  const sample = (n, from = engaged) => { const s = new Set(); while (s.size < Math.min(n, from.length)) s.add(pick(from)); return [...s]; };
  const at = m => start + m * MIN + Math.floor(rnd() * 50000);
  const hh = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');

  const sessionDefs = [
    ['Opening — where we stand', 'Claire Dubois, CEO', 10, 'Highlights of the quarter and what is coming next.'],
    ['Q3 results', 'Marc Lefèvre, CFO', 15, 'Revenue, margins and headcount versus plan.'],
    ['Tech roadmap Q4 2026', 'Nadia Benali, CTO', 20, 'Platform, cloud migration, mobile rewrite and reliability.'],
    ['AI at work', 'Hugo Martin, Head of AI', 15, 'Our AI policy, tools and the first internal copilots.'],
    ['Open Q&A with the leadership team', 'Leadership team', 30, 'Your questions, answered live.'],
  ];
  let off = 0;
  const sessions = sessionDefs.map(([title, speaker, duration, description], i) => {
    const s = { id: uid(), title, speaker, startTime: hh(new Date(start + off * MIN)), duration, description, order: i, status: i < 2 ? 'done' : i === 2 ? 'live' : 'upcoming' };
    off += duration; return s;
  });
  // [text, author|null, votes, session index|null, host answer|null, pinned]
  const Q = [
    ['What are the top 3 tech priorities for Q4?', 'Julien', 612, 2, 'Reliability, the cloud migration and the mobile rewrite — in that order.', true],
    ['Will there be a hiring freeze in 2027?', null, 588, 4, null, false],
    ['How will AI change our engineering workflows in the next 12 months?', 'Sofia', 541, 3, 'Copilots for every developer in Q1, with clear rules on customer data.', false],
    ['What happened during the September outage and what did we change?', 'Ahmed', 503, 2, 'Root cause: a config rollout without canary. All rollouts are now progressive.', false],
    ['When will the new remote-work policy be published?', null, 476, 4, null, false],
    ['Are salary reviews still planned for January?', null, 455, 1, 'Yes, January as usual; budget confirmed in the Q3 results.', false],
    ['What is the timeline to retire the legacy monolith?', 'Lena', 402, 2, null, false],
    ['How do we measure developer productivity without micromanaging?', 'Tom', 371, 2, null, false],
    ['Can we use ChatGPT or Claude with customer data?', 'Priya', 352, 3, 'Not with customer data until the enterprise agreement is signed (expected November).', false],
    ['How will the reorganisation affect platform teams?', null, 337, 4, null, false],
    ['How are we tracking against the Q3 revenue target?', 'Karim', 310, 1, '104 % of target, driven by the enterprise segment.', false],
    ['Is the mobile app rewrite still shipping before Christmas?', 'Emma', 288, 2, null, false],
    ['How can individual contributors grow without becoming managers?', 'Lucas', 265, 4, null, false],
    ['What is our plan to reduce on-call fatigue?', 'Ines', 241, 2, null, false],
    ['Build or buy for internal AI tools: how do we decide?', 'Noah', 222, 3, null, false],
    ['Will we keep the 4-day hackathon this year?', 'Chloé', 205, null, null, false],
    ['Can we get more budget for conferences and training?', null, 188, 1, null, false],
    ['Which security incidents did we have in Q3 and what did we learn?', 'Victor', 171, 2, null, false],
    ['Are we opening a new tech hub in 2027?', null, 154, 4, null, false],
    ['What is the carbon footprint of our infrastructure?', 'Manon', 132, 2, null, false],
    ['How are we improving diversity in tech hiring?', 'Aisha', 118, 4, null, false],
    ['Can the product roadmap be shared with all teams?', 'Paul', 97, 2, null, false],
    ['Who will replace the VP Engineering?', null, 84, 4, null, false],
    ['When do we get the new laptops?', 'Sam', 63, null, 'Rollout starts mid-October, by team.', false],
    ['Will townhalls be recorded for colleagues in other time zones?', 'Mei', 41, null, null, false],
  ];
  const questions = Q.map(([text, author, votes, si, note, pinned], i) => {
    const voters = sample(votes);
    const q = { id: uid(), text, author: author || 'Anonymous', anon: !author, cid: voters[0], ts: at(2 + Math.floor(i * 3.4)), voters,
      status: note ? 'answered' : 'live', pinned, highlighted: i === 2, note: note || '', merged: [], reacts: {}, sessionId: si == null ? null : sessions[si].id };
    for (const e of ['❤️', '🔥', '💡', '👏']) if (rnd() < 0.8) q.reacts[e] = sample(Math.floor(rnd() * Math.max(8, votes / 6)) + 1);
    return q;
  });
  questions[1].merged.push({ text: 'Are we freezing hiring next year?', author: null }, { text: 'Any plan to stop recruiting in 2027?', author: 'Ben' });
  questions[1].voters = [...new Set([...questions[1].voters, ...sample(60)])];

  const choice = (question, opts, n, type, created, open, w) => {
    const o = opts.map(label => ({ label, voters: [] }));
    for (const v of sample(n)) {
      if (type === 'multi') o.forEach((x, k) => { if (rnd() < w[k]) x.voters.push(v); });
      else { let r = rnd(), k = 0; while (k < w.length - 1 && (r -= w[k]) > 0) k++; o[k].voters.push(v); }
    }
    return { id: uid(), type, question, open, hidden: false, created, options: o };
  };
  const polls = [];
  polls.push(choice('Should townhalls become monthly?', ['Yes, monthly', 'Keep quarterly', 'Monthly, but shorter'], 534, 'choice', at(88), true, [0.34, 0.27, 0.39]));
  const words = []; const W = ['Growth', 'Intense', 'Cloud', 'Reliability', 'AI', 'Busy', 'Promising', 'Teamwork', 'Outage', 'Shipping', 'Focus', 'Change', 'Learning', 'Customers', 'Momentum'];
  for (const v of sample(487)) for (let k = 0; k < 1 + Math.floor(rnd() * 2); k++) words.push({ cid: v, word: W[Math.min(W.length - 1, Math.floor(Math.pow(rnd(), 1.7) * W.length))], ts: at(6) });
  polls.push({ id: uid(), type: 'wordcloud', question: 'Q3 in one word?', open: false, hidden: false, created: at(5), responses: words });
  const stopDoing = ['Too many meetings on Fridays', 'Changing priorities mid-sprint', 'Approvals that take weeks', 'Announcing reorgs by e-mail', 'Late-night deploys', 'Duplicate reporting tools', 'Surprise deadlines', 'Ignoring tech debt'];
  polls.push({ id: uid(), type: 'open', question: 'What should leadership stop doing?', open: false, hidden: false, created: at(62),
    responses: stopDoing.map((text, i) => ({ id: uid(), cid: engaged[i * 11], text, ts: at(63 + i) })) });
  const clarity = {}; for (const v of sample(612)) clarity[v] = [5, 4, 4, 4, 3, 3, 3, 2, 4, 5][Math.floor(rnd() * 10)];
  polls.push({ id: uid(), type: 'rating', question: 'How clear is the Q4 tech strategy?', open: false, hidden: false, created: at(48), responses: clarity });
  polls.push(choice('Which AI tools do you use every day?', ['GitHub Copilot', 'ChatGPT', 'Claude', 'Internal copilot (beta)', 'None'], 598, 'multi', at(55), false, [0.48, 0.41, 0.37, 0.14, 0.19]));
  polls.push(choice('Which Q4 priority matters most to you?', ['Reliability', 'Cloud migration', 'Mobile rewrite', 'AI tooling'], 701, 'choice', at(32), false, [0.36, 0.22, 0.18, 0.24]));
  polls.push({ ...choice('Topic for the Q4 townhall?', ['Career paths', 'Product roadmap 2027', 'Security', 'Engineering culture'], 0, 'choice', now, false, [1]), draft: true });
  const enps = {}; for (const v of sample(684)) enps[v] = [10, 9, 9, 8, 8, 8, 7, 7, 6, 5, 9, 10, 3, 8][Math.floor(rnd() * 14)];
  polls.push({ id: uid(), type: 'nps', question: 'How likely are you to recommend our company as a place to work? (eNPS)', open: true, hidden: true, persistent: true, responses: enps, created: start });

  // Audience: 1,000 people join in the first 5 minutes, peak during the CTO roadmap, interactions peak during the open Q&A
  const tl = {}, actives = new Set();
  let peak = 0, peakAt = start;
  for (let m = 0; m <= DURATION; m++) {
    const o = Math.max(20, Math.round(1105 * (1 - Math.exp(-m / 2.2)) - 60 * Math.exp(-(((m - 22) / 6) ** 2)) + 40 * Math.exp(-(((m - 38) / 8) ** 2)) - Math.max(0, m - 80) * 9 + (rnd() * 20 - 10)));
    const a = Math.max(0, Math.round(15 + 60 * Math.exp(-(((m - 75) / 9) ** 2)) + 35 * Math.exp(-(((m - 40) / 5) ** 2)) + 25 * Math.exp(-(((m - 5) / 2) ** 2)) + rnd() * 12 - 4));
    const u = sample(Math.min(a, o)); u.forEach(x => actives.add(x));
    tl[start + m * MIN] = { o: Math.min(o, 1200), a, u };
    if (o > peak) { peak = Math.min(o, 1200); peakAt = start + m * MIN; }
  }
  for (const q of questions) q.voters.forEach(v => actives.add(v));
  return { code, title: 'Townhall Tech Q3 2026', hostKey, hostPass, open: true, moderation: false, demo: true, lang: 'en',
    sessions, questions, polls, created: start, participants: people, actives: [...actives], peakOnline: peak, peakOnlineAt: peakAt, tl, screenPoll: null };
}

module.exports.buildTownhall = buildTownhall;
