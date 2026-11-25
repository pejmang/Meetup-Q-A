/*!
 * Meetup Q&A (ORBii Interact)
 * Copyright (c) 2026 ORBii SAS. All rights reserved.
 * Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE and NOTICE): free for any noncommercial use.
 * Commercial use requires a separate license from ORBii SAS: info@orbii.tech
 * https://polyformproject.org/licenses/noncommercial/1.0.0
 */

// Behaviour of the public website. The pages themselves are rendered by the server (website.js);
// this script only adds the menu, the join dialog, sign-in and the local demo.
'use strict';

const Site = (() => {
  // texts written by this script; the pages are in website/{fr,en}/*.html
  const EN = {
    'Quelles sont nos priorités pour 2027 ?': 'What are our priorities for 2027?',
    'Comment accompagner la transformation IA ?': 'How do we support the AI transformation?',
    'Comment mieux collaborer entre les équipes ?': 'How can teams work better together?',
    'Stratégie': 'Strategy', 'Organisation': 'Organisation', 'Compétences': 'Skills',
    'Voter pour': 'Vote for', 'Anonyme': 'Anonymous', 'Anonyme · Traitée': 'Anonymous · Answered', 'Anonyme · Épinglée': 'Anonymous · Pinned',
    'À l’écran': 'On screen', 'Projeter': 'Show', 'Désépingler': 'Unpin', 'Épingler': 'Pin', 'Rouvrir': 'Reopen', 'Traitée': 'Answered',
    'Sélectionnez une question à projeter.': 'Select a question to show.', 'Question anonyme': 'Anonymous question', 'Écran de présentation': 'Presentation screen',
    'Votre réponse est enregistrée dans la démo.': 'Your answer is recorded in the demo.', 'Sélectionnez une réponse.': 'Select an answer.',
    'Veuillez renseigner ce champ.': 'Please fill in this field.'
  };
  // addresses used by the previous single-page version (#demo/poll…)
  const OLD = { accueil: '/', fonctionnalites: '/fonctionnalites', 'cas-usage': '/cas-usage', demo: '/demo', 'open-source': '/open-source', offres: '/offres' };
  const OPTS = ['Stratégie', 'Organisation', 'Compétences'];

  const pageRoot = document.querySelector('#app > .mk');
  const lang = pageRoot?.dataset.lang;
  const tr = s => (lang === 'fr' ? s : EN[s] ?? s);
  let root = null, ctx = null, returnFocus = null;
  const $ = sel => root.querySelector(sel);
  const $$ = sel => root.querySelectorAll(sel);
  const btn = (text, cls, fn) => h('button', { type: 'button', class: cls, onclick: fn }, text);

  // ----- Local demo (fictional data, nothing leaves the browser) -----
  const demo = { chosen: -1, projection: null, nextId: 4, poll: [46, 34, 20], questions: [
    { id: 1, q: 'Quelles sont nos priorités pour 2027 ?', seed: true, votes: 42 },
    { id: 2, q: 'Comment accompagner la transformation IA ?', seed: true, votes: 31 },
    { id: 3, q: 'Comment mieux collaborer entre les équipes ?', seed: true, votes: 18 }] };
  const label = q => (q.seed ? tr(q.q) : q.q);

  function renderDemo() {
    const ordered = [...demo.questions].sort((a, b) => Number(!!b.pin) - Number(!!a.pin) || b.votes - a.votes);
    $('#questionList').replaceChildren(...ordered.map(q => {
      const v = btn('▲ ' + q.votes, 'mk-vote' + (q.voted ? ' mk-voted' : ''), () => { q.votes += q.voted ? -1 : 1; q.voted = !q.voted; renderDemo(); });
      v.setAttribute('aria-pressed', String(!!q.voted));
      v.setAttribute('aria-label', tr('Voter pour') + ' ' + label(q));
      return h('div', { class: 'mk-q' }, v, h('div', {}, h('b', {}, label(q)), h('small', {}, tr(q.done ? 'Anonyme · Traitée' : q.pin ? 'Anonyme · Épinglée' : 'Anonyme'))));
    }));
    $('#adminList').replaceChildren(...ordered.map(q => h('div', { class: 'mk-mockrow', style: 'flex-wrap:wrap' }, h('span', {}, label(q)),
      h('div', { class: 'mk-btnrow' },
        btn(tr(q.id === demo.projection ? 'À l’écran' : 'Projeter'), 'mk-mini', () => { demo.projection = q.id; renderDemo(); }),
        btn(tr(q.pin ? 'Désépingler' : 'Épingler'), 'mk-mini', () => { q.pin = !q.pin; renderDemo(); }),
        btn(tr(q.done ? 'Rouvrir' : 'Traitée'), 'mk-mini', () => { q.done = !q.done; renderDemo(); })))));
    $('#nQuestions').textContent = demo.questions.length;
    $('#nVotes').textContent = demo.questions.reduce((s, q) => s + q.votes, 0);
    $('#nAnswered').textContent = demo.questions.filter(q => q.done).length;
    const sel = demo.questions.find(q => q.id === demo.projection);
    $('#projected').textContent = sel ? label(sel) : tr('Sélectionnez une question à projeter.');
    $('#projectedMeta').textContent = sel ? sel.votes + ' votes · ' + tr('Question anonyme') : tr('Écran de présentation');
    const total = demo.poll.reduce((a, b) => a + b, 0);
    $('#pollOptions').replaceChildren(...OPTS.map((s, i) => {
      const on = demo.chosen === i;
      const b = btn(tr(s) + (on ? ' ✓' : ''), 'mk-pollopt' + (on ? ' mk-selected' : ''), () => {
        if (demo.chosen === i) return;
        if (demo.chosen >= 0) demo.poll[demo.chosen]--;
        demo.chosen = i; demo.poll[i]++; renderDemo();
      });
      b.setAttribute('aria-pressed', String(on));
      return b;
    }));
    $('#pollResults').replaceChildren(...OPTS.flatMap((s, i) => {
      const percent = total ? Math.round(demo.poll[i] * 100 / total) : 0;
      return [h('div', { class: 'mk-barlabel' }, h('span', {}, tr(s)), h('b', {}, percent + ' %')), h('div', { class: 'mk-bar' }, h('i', { style: `width:${percent}%` }))];
    }));
    $('#pollNote').textContent = tr(demo.chosen >= 0 ? 'Votre réponse est enregistrée dans la démo.' : 'Sélectionnez une réponse.');
  }
  function setTab(tab) {
    $('#questionsTab').hidden = tab !== 'questions';
    $('#pollTab').hidden = tab !== 'poll';
    $$('[data-tab]').forEach(b => { b.classList.toggle('mk-active', b.dataset.tab === tab); b.setAttribute('aria-pressed', String(b.dataset.tab === tab)); });
  }

  const closeMenu = () => { $('#navlinks').classList.remove('mk-open'); $('#menu').setAttribute('aria-expanded', 'false'); };
  function openJoin() {
    returnFocus = document.activeElement;
    closeMenu();
    $('#modalField').value = ''; $('#modalError').textContent = '';
    $('#modal').hidden = false;
    $('#modalField').focus();
  }
  function closeJoin() { $('#modal').hidden = true; returnFocus?.focus(); }

  function bind() {
    $('#menu').onclick = () => $('#menu').setAttribute('aria-expanded', String($('#navlinks').classList.toggle('mk-open')));
    $$('[data-modal="join"]').forEach(b => { b.onclick = openJoin; });
    $$('[data-act="signin"]').forEach(b => { b.onclick = () => { closeMenu(); ctx.signIn(); }; });
    // the chosen language is remembered for the application screens
    $$('[data-act="lang"]').forEach(a => { a.onclick = () => safe('lang', a.getAttribute('hreflang')); });
    $('#closeModal').onclick = closeJoin;
    $('#modal').onclick = e => { if (e.target === $('#modal')) closeJoin(); };
    $('#modal').onkeydown = e => {
      if (e.key === 'Escape') return closeJoin();
      if (e.key !== 'Tab') return;
      const f = [...$$('#modal input, #modal button')];
      const edge = e.shiftKey ? f[0] : f[f.length - 1];
      if (document.activeElement === edge) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); }
    };
    $('#modalForm').onsubmit = e => {
      e.preventDefault();
      const code = $('#modalField').value.trim().toUpperCase();
      if (!code) { $('#modalError').textContent = tr('Veuillez renseigner ce champ.'); return; }
      go('/e/' + encodeURIComponent(code));
    };
    if (!$('#questionForm')) return;
    $$('[data-tab]').forEach(b => { b.onclick = () => setTab(b.dataset.tab); });
    $('#questionForm').onsubmit = e => {
      e.preventDefault();
      const q = $('#question').value.trim();
      if (!q) return;
      demo.questions.push({ id: demo.nextId++, q, votes: 0 });
      $('#question').value = ''; renderDemo();
    };
    renderDemo();
    const followHash = () => setTab(location.hash === '#poll' ? 'poll' : 'questions');
    window.addEventListener('hashchange', followHash);
    followHash();
  }

  // The page sent by the server, or null once an application screen has replaced it
  function render(context) {
    if (!pageRoot || !pageRoot.isConnected) return null;
    ctx = context;
    if (!root) {
      root = pageRoot;
      const [name, anchor] = location.hash.slice(1).split('/');
      if (OLD[name]) location.replace(BASE + (lang === 'en' ? { accueil: '/en', fonctionnalites: '/en/features', 'cas-usage': '/en/use-cases', demo: '/en/demo', 'open-source': '/en/open-source', offres: '/en/offers' }[name] : OLD[name]) + (anchor ? '#' + anchor : ''));
      bind();
    }
    return root;
  }
  // searchable list of spaces inside the join dialog (left untouched while being typed in)
  function sync() { if (!document.activeElement?.matches('[data-keep="find"]')) $('[data-find]').replaceChildren(ctx.findSpace()); }

  return { lang, render, sync };
})();
