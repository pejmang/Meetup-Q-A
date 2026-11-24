/*!
 * Meetup Q&A (ORBii Interact)
 * Copyright (c) 2026 ORBii SAS. All rights reserved.
 * Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE): free for any noncommercial use.
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

  if (days > 1) C.title = C.title.replace(/\(/, `(${days} ${lang === 'fr' ? 'jours' : 'days'}, `);
  return { code, title: C.title, hostKey, hostPass, open: true, moderation: false, demo: true, lang,
    questions, polls, created: days > 1 ? Math.min(...Object.keys(tl).map(Number)) : start, participants: people.slice(0, Math.max(peak + 8, 0)), actives: [...actives].filter(x => people.includes(x)),
    peakOnline: peak, peakOnlineAt: peakAt, tl };
}

module.exports = { buildDemo };
