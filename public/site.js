/*!
 * Meetup Q&A (ORBii Interact)
 * Copyright (c) 2026 ORBii SAS. All rights reserved.
 * Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE and NOTICE): free for any noncommercial use.
 * Commercial use requires a separate license from ORBii SAS: info@orbii.tech
 * https://polyformproject.org/licenses/noncommercial/1.0.0
 */

// Public website for visitors (home, features, use cases, local demo).
// The page is written in French; SITE_EN maps each French string to English.
'use strict';

const SITE_HTML = `<a class="mk-skip" href="#main" data-act="skip">Aller au contenu</a><header class="mk-nav"><div class="mk-wrap"><a class="mk-logo" href="#accueil" aria-label="ORBii Interact accueil"><span class="mk-mark"><i></i><i></i><i></i><i></i></span>ORBii<small>interact</small></a><nav class="mk-navlinks" id="navlinks" aria-label="Navigation principale"><a href="#accueil" data-nav="accueil">Accueil</a><a href="#fonctionnalites" data-nav="fonctionnalites">Fonctionnalités</a><a href="#cas-usage" data-nav="cas-usage">Cas d’usage</a><a href="#demo" data-nav="demo">Démo</a><button type="button" class="mk-navbtn" data-act="signin">Connexion</button></nav><div class="mk-actions"><button type="button" class="mk-btn mk-outline mk-langsw" data-act="lang"></button><button class="mk-btn mk-ghost" data-modal="join">Rejoindre</button><button class="mk-btn mk-primary" data-modal="create">Créer une session <span aria-hidden="true">↗</span></button><button class="mk-btn mk-outline mk-menu" id="menu" aria-expanded="false" aria-controls="navlinks" aria-label="Menu">☰</button></div></div></header><main id="main">
<section class="mk-page mk-active" data-page="accueil"><div class="mk-hero"><div class="mk-wrap mk-heroGrid"><div><div class="mk-eyebrow">Audience engagement · En direct</div><h1>Ne parlez plus à votre audience.<br><span class="mk-accent">Parlez avec elle.</span></h1><p class="mk-lead">Donnez la parole à chacun, faites émerger les questions qui comptent et transformez vos réunions et événements en conversations collectives.</p><div class="mk-btnrow"><button class="mk-btn mk-dark" data-modal="create">Créer une session <span>↗</span></button><a class="mk-btn mk-outline" href="#demo">▷ &nbsp;Tester la démo</a></div><div class="mk-micro"><span>Questions anonymes</span><span>Votes en direct</span><span>Modération</span></div></div><div class="mk-heroVisual"><div class="mk-dashboard"><div class="mk-dashhead"><b>ORBii interact <span style="opacity:.6;font-weight:400"> / Live</span></b><span class="mk-live">EN DIRECT</span></div><div class="mk-dashbody"><div class="mk-dashrow"><h3>Town Hall · Cap 2027</h3><span class="mk-tag">Q&A ouvert</span></div><div class="mk-metrics"><div class="mk-metric"><b>248</b><span>Participants</span></div><div class="mk-metric"><b>32</b><span>Questions</span></div><div class="mk-metric"><b>186</b><span>Votes</span></div></div><div class="mk-q"><span class="mk-vote"><i>▲</i>42</span><div><b>Quelles sont nos priorités pour 2027 ?</b><small>Anonyme · 2 min</small></div></div><div class="mk-q"><span class="mk-vote"><i>▲</i>31</span><div><b>Comment accompagner la transformation IA ?</b><small>Anonyme · 5 min</small></div></div><div class="mk-q"><span class="mk-vote"><i>▲</i>18</span><div><b>Comment mieux collaborer entre les équipes ?</b><small>Anonyme · 7 min</small></div></div></div></div><div class="mk-phone" aria-hidden="true"><div class="mk-phoneinner"><div class="mk-notch"></div><div class="mk-eyebrow" style="font-size:8px;margin-bottom:8px;letter-spacing:.6px">À vous la parole</div><h4>Posez votre question</h4><p>Votre contribution compte.</p><div class="mk-phoneinput">Qu’aimeriez-vous demander ?</div><div class="mk-phonesend">Envoyer</div><p style="margin-top:6px">✓ En mode anonyme</p></div></div><div class="mk-visualnote">Illustration produit · Données fictives</div></div></div></div><div class="mk-strip"><div class="mk-wrap"><b>Un outil, plusieurs moments clés</b><span>Town halls</span><span class="mk-dot">·</span><span>Meetups</span><span class="mk-dot">·</span><span>Conférences</span><span class="mk-dot">·</span><span>Ateliers</span><span class="mk-dot">·</span><span>Formations</span></div></div>
<div class="mk-section mk-white"><div class="mk-wrap"><div class="mk-sectionhead mk-center"><div class="mk-eyebrow">La valeur du dialogue</div><h2>Les meilleures questions ne sont pas toujours posées à voix haute.</h2><p>Créez un espace où les participants peuvent s’exprimer, soutenir les idées des autres et contribuer à la discussion.</p></div><div class="mk-cards"><article class="mk-card"><div class="mk-ico" data-icon="voice"></div><h3>Libérez la parole</h3><p>Permettez à chacun de poser une question, y compris anonymement, sans interrompre la conversation.</p><a href="#fonctionnalites/qa">Découvrir les Q&A →</a></article><article class="mk-card"><div class="mk-ico" data-icon="rank"></div><h3>Faites émerger l’essentiel</h3><p>Les votes révèlent les sujets qui mobilisent le plus votre audience. Donnez la priorité aux questions collectives.</p><a href="#fonctionnalites/sondages">Découvrir les interactions →</a></article><article class="mk-card"><div class="mk-ico" data-icon="screen"></div><h3>Gardez le contrôle</h3><p>Organisez les questions, animez la discussion et affichez les contributions au bon moment.</p><a href="#fonctionnalites/moderation">Découvrir la modération →</a></article></div></div></div>
<div class="mk-section"><div class="mk-wrap mk-split"><div><div class="mk-sectionhead"><div class="mk-eyebrow">Simple par conception</div><h2>Trois étapes pour changer la dynamique.</h2></div><div class="mk-steps"><div class="mk-step"><span class="mk-num">01</span><div><h3>Créez votre session</h3><p>Préparez le nom de votre événement et ouvrez l’espace de discussion.</p></div></div><div class="mk-step"><span class="mk-num">02</span><div><h3>Invitez votre audience</h3><p>Partagez le lien ou le code de participation.</p></div></div><div class="mk-step"><span class="mk-num">03</span><div><h3>Engagez la conversation</h3><p>Collectez, priorisez et animez les questions en direct.</p></div></div></div></div><div class="mk-panel"><div class="mk-eyebrow">L’expérience participant</div><h3>Une invitation suffit pour prendre la parole.</h3><p>Testez le parcours comme si vous assistiez à une réunion.</p><div class="mk-joinvisual"><div data-democode hidden><small>Code de démonstration</small><div class="mk-codeblock"></div></div><button class="mk-btn mk-primary" data-modal="join">Rejoindre</button></div><div class="mk-bubbles"><span>Poser une question</span><span>Voter</span><span>Réagir</span></div></div></div></div>
<div class="mk-section mk-white"><div class="mk-wrap"><div class="mk-sectionhead"><div class="mk-eyebrow">Pour les moments qui comptent</div><h2>Un dialogue plus riche, quel que soit le format.</h2></div><div class="mk-cards"><article class="mk-card"><div class="mk-ico" data-icon="people"></div><h3>Dirigeants & RH</h3><p>Échanges COMEX, communication interne, transformation et écoute des collaborateurs.</p><a href="#cas-usage">Voir les cas d’usage →</a></article><article class="mk-card"><div class="mk-ico" data-icon="screen"></div><h3>Événements & conférences</h3><p>Questions de l’audience, tables rondes, rencontres professionnelles et meetups.</p><a href="#cas-usage">Voir les cas d’usage →</a></article><article class="mk-card"><div class="mk-ico" data-icon="voice"></div><h3>Managers & facilitateurs</h3><p>Ateliers, séminaires, discussions d’équipe et sessions de formation.</p><a href="#cas-usage">Voir les cas d’usage →</a></article></div></div></div><div class="mk-section"><div class="mk-wrap"><div class="mk-cta"><div><h2>Votre prochaine conversation commence ici.</h2><p>Découvrez l’expérience ORBii Interact en quelques clics.</p></div><div class="mk-btnrow"><a class="mk-btn mk-primary" href="#demo">Tester la démo →</a><button class="mk-btn mk-outline" data-modal="create">Créer une session</button></div></div></div></div></section>
<section class="mk-page" data-page="fonctionnalites"><div class="mk-pagehead"><div class="mk-wrap"><div class="mk-eyebrow">Fonctionnalités</div><h1>De la première question à la conversation collective.</h1><p>Tout ce qu’il faut pour recueillir les contributions, révéler les priorités et piloter vos interactions en direct.</p><div class="mk-btnrow"><a class="mk-btn mk-dark" href="#demo">Essayer en direct →</a></div></div></div><div class="mk-subnav"><div class="mk-wrap"><a href="#fonctionnalites/qa">Questions & votes</a><a href="#fonctionnalites/sondages">Sondages & réactions</a><a href="#fonctionnalites/moderation">Modération</a><a href="#fonctionnalites/projection">Projection</a><a href="#fonctionnalites/statistiques">Statistiques</a></div></div><div class="mk-wrap mk-section" style="padding-top:0"><div class="mk-featureblock mk-split" id="qa"><div><div class="mk-eyebrow">01 · Questions & votes</div><h2>Écoutez aussi ceux qui ne prennent pas le micro.</h2><p>Une interface de questions-réponses ouverte à toute l’audience. Les participants soumettent leurs questions et soutiennent celles qu’ils jugent importantes.</p><ul><li>Questions anonymes ou identifiées, selon le mode de la session.</li><li>Votes pour faire remonter les sujets prioritaires.</li><li>Fil de questions accessible aux participants.</li></ul><a class="mk-btn mk-outline" href="#demo">Tester les questions & votes →</a></div><div class="mk-mock"><div class="mk-mocktop"><h3>Questions de l’audience</h3><span class="mk-tag">Par popularité</span></div><div class="mk-q"><span class="mk-vote"><i>▲</i>42</span><div><b>Quelles sont les prochaines étapes ?</b><small>Anonyme</small></div></div><div class="mk-q"><span class="mk-vote"><i>▲</i>31</span><div><b>Comment mesurer les résultats ?</b><small>Anonyme</small></div></div><div class="mk-q"><span class="mk-vote"><i>▲</i>18</span><div><b>Quels moyens pour les équipes ?</b><small>Anonyme</small></div></div></div></div><div class="mk-featureblock mk-split" id="sondages"><div><div class="mk-eyebrow">02 · Sondages & réactions</div><h2>Comprenez votre audience en temps réel.</h2><p>Posez une question ciblée, recueillez les réponses et rendez les résultats visibles pour ouvrir la discussion.</p><ul><li>Sondages et votes en direct.</li><li>Réactions aux contributions.</li><li>Lecture visuelle des réponses.</li></ul><a class="mk-btn mk-outline" href="#demo/poll">Tester un sondage →</a></div><div class="mk-mock"><div class="mk-mocktop"><h3>Quel sujet approfondir ?</h3><span class="mk-tag">Exemple</span></div><div class="mk-barlabel"><span>Stratégie</span><b>46 %</b></div><div class="mk-bar"><i style="width:46%"></i></div><div class="mk-barlabel"><span>Organisation</span><b>34 %</b></div><div class="mk-bar"><i style="width:34%"></i></div><div class="mk-barlabel"><span>Compétences</span><b>20 %</b></div><div class="mk-bar"><i style="width:20%"></i></div></div></div><div class="mk-featureblock mk-split" id="moderation"><div><div class="mk-eyebrow">03 · Modération</div><h2>Gardez la maîtrise du dialogue.</h2><p>L’organisateur dispose d’un espace de pilotage distinct de l’interface participant pour gérer les questions et le déroulement de la session.</p><ul><li>Mettre en avant une question.</li><li>Marquer les questions traitées.</li><li>Organiser et modérer les contributions.</li></ul><a class="mk-btn mk-outline" href="#demo">Voir l’espace organisateur →</a></div><div class="mk-mock"><div class="mk-mocktop"><h3>Console organisateur</h3><span class="mk-tag">En direct</span></div><div class="mk-mockrow"><span>Les priorités de l’année ?</span><span class="mk-mini">Projeter</span></div><div class="mk-mockrow"><span>Quels nouveaux outils ?</span><span class="mk-mini">Épingler</span></div><div class="mk-mockrow"><span>Quels indicateurs de suivi ?</span><span class="mk-mini">Traitée</span></div></div></div><div class="mk-featureblock mk-split" id="projection"><div><div class="mk-eyebrow">04 · Projection</div><h2>Faites de la discussion un moment partagé.</h2><p>Affichez les questions sélectionnées sur un écran commun afin de donner à tous les participants le même contexte.</p><ul><li>Affichage dédié à l’animation.</li><li>Mise en avant de la question en cours.</li><li>Lecture collective des contributions.</li></ul></div><div class="mk-panel" style="text-align:center"><span class="mk-live">QUESTION À L’ÉCRAN</span><h3 style="font-size:31px;margin:27px 0">Comment accompagner la transformation IA ?</h3><p style="margin:0">31 votes · Question anonyme</p></div></div><div class="mk-featureblock mk-split" id="statistiques"><div><div class="mk-eyebrow">05 · Statistiques</div><h2>Au-delà de l’événement, comprenez la participation.</h2><p>Les indicateurs de session donnent une première lecture de l’activité et des contributions de votre audience.</p><ul><li>Nombre de questions et de votes.</li><li>Indicateurs de participation disponibles.</li><li>Identification des sujets ayant mobilisé le collectif.</li></ul></div><div class="mk-mock"><h3>Vue de session · Exemple</h3><div class="mk-metrics"><div class="mk-metric"><b>248</b><span>Participants</span></div><div class="mk-metric"><b>32</b><span>Questions</span></div><div class="mk-metric"><b>186</b><span>Votes</span></div></div><div class="mk-mockrow"><span>Sujet le plus voté</span><b>Stratégie 2027</b></div><div class="mk-mockrow"><span>Questions traitées</span><b>24 / 32</b></div></div></div></div></section>
<section class="mk-page" data-page="cas-usage"><div class="mk-pagehead"><div class="mk-wrap"><div class="mk-eyebrow">Cas d’usage</div><h1>Chaque audience mérite d’être entendue.</h1><p>Des réunions d’équipe aux grands événements, découvrez comment mettre le dialogue au cœur de vos moments collectifs.</p><div class="mk-btnrow"><a class="mk-btn mk-dark" href="#demo">Vivre l’expérience →</a></div></div></div><div class="mk-section"><div class="mk-wrap"><div class="mk-cards mk-cases"><article class="mk-card mk-case"><span class="mk-label">Direction générale</span><div class="mk-ico" data-icon="people"></div><h3>Town halls & échanges COMEX</h3><p>Faites remonter les préoccupations des collaborateurs et identifiez les questions auxquelles les dirigeants doivent répondre en priorité.</p><div class="mk-example">Exemple : « Quelles seront nos priorités stratégiques l’année prochaine ? »</div></article><article class="mk-card mk-case"><span class="mk-label">RH & communication interne</span><div class="mk-ico" data-icon="voice"></div><h3>Transformation & écoute</h3><p>Donnez un espace d’expression à chacun, y compris aux collaborateurs moins à l’aise avec la prise de parole publique.</p><div class="mk-example">Exemple : collecter les questions sur une réorganisation.</div></article><article class="mk-card mk-case"><span class="mk-label">Événementiel</span><div class="mk-ico" data-icon="screen"></div><h3>Conférences & tables rondes</h3><p>Faites participer le public et aidez le modérateur à choisir les sujets les plus attendus.</p><div class="mk-example">Exemple : sélectionner les questions à poser aux intervenants.</div></article><article class="mk-card mk-case"><span class="mk-label">Management & conseil</span><div class="mk-ico" data-icon="rank"></div><h3>Ateliers & séminaires</h3><p>Recueillez des contributions, identifiez les priorités et ouvrez le débat autour des sujets importants.</p><div class="mk-example">Exemple : prioriser les irritants d’une équipe.</div></article><article class="mk-card mk-case"><span class="mk-label">Tech & innovation</span><div class="mk-ico" data-icon="screen"></div><h3>Meetups & communautés</h3><p>Animez vos rendez-vous récurrents et favorisez les questions transverses entre équipes.</p><div class="mk-example">Exemple : Q&A lors d’un meetup Data & IA.</div></article><article class="mk-card mk-case"><span class="mk-label">Formation</span><div class="mk-ico" data-icon="voice"></div><h3>Sessions d’apprentissage</h3><p>Identifiez les notions qui suscitent des questions et encouragez les participants à s’exprimer.</p><div class="mk-example">Exemple : sonder les sujets à approfondir en fin de session.</div></article></div></div></div><div class="mk-section" style="padding-top:0"><div class="mk-wrap"><div class="mk-cta"><div><h2>Et si votre prochain événement devenait une conversation ?</h2><p>Explorez les deux expériences, organisateur et participant.</p></div><a class="mk-btn mk-primary" href="#demo">Tester la démo →</a></div></div></div></section>
<section class="mk-page" data-page="demo"><div class="mk-pagehead"><div class="mk-wrap"><div class="mk-eyebrow">Démo interactive</div><h1>À vous de jouer.</h1><p>Posez une question, votez et voyez comment l’organisateur peut animer la conversation. Les deux vues se synchronisent dans votre navigateur.</p></div></div><div class="mk-section" style="padding-top:32px"><div class="mk-wrap"><div class="mk-demoShell"><section class="mk-demoPanel"><header><h3>Vue participant</h3><span class="mk-live">DÉMO</span></header><div class="mk-demoBody"><div class="mk-tabs"><button class="mk-tab mk-active" data-tab="questions">Questions</button><button class="mk-tab" data-tab="poll">Sondage</button></div><div id="questionsTab"><h3 style="margin:0 0 12px;font-size:19px">Town Hall · Cap 2027</h3><form id="questionForm"><label for="question" style="font-size:13px;font-weight:700">Votre question anonyme</label><textarea id="question" maxlength="220" required placeholder="Qu’aimeriez-vous demander ?"></textarea><button class="mk-btn mk-dark" type="submit" style="margin-top:8px">Envoyer ma question</button></form><p style="font-weight:700;font-size:13px;margin:22px 0 8px">Questions de l’audience</p><div id="questionList" aria-live="polite"></div></div><div id="pollTab" hidden><h3>Quel sujet souhaitez-vous approfondir ?</h3><div id="pollOptions"></div><div class="mk-notice" id="pollNote">Sélectionnez une réponse.</div></div></div></section><section class="mk-demoPanel"><header><h3>Vue organisateur</h3><span class="mk-live">DÉMO</span></header><div class="mk-demoBody"><div class="mk-metrics"><div class="mk-metric"><b id="nQuestions">3</b><span>Questions</span></div><div class="mk-metric"><b id="nVotes">91</b><span>Votes Q&A</span></div><div class="mk-metric"><b id="nAnswered">0</b><span>Traitées</span></div></div><h3 style="font-size:17px;margin:15px 0 10px">Gestion des questions</h3><div id="adminList"></div><div class="mk-panel" style="padding:20px;margin-top:18px" aria-live="polite"><span class="mk-live">PROJECTION</span><h3 id="projected" style="font-size:21px;margin:16px 0 5px">Sélectionnez une question à projeter.</h3><p id="projectedMeta" style="margin:0;font-size:12px">Écran de présentation</p></div><div style="margin-top:20px"><h3 style="font-size:17px;margin:0 0 5px">Résultats du sondage</h3><div id="pollResults"></div></div></div></section></div><p class="mk-notice"><strong>Démo locale :</strong> données fictives, rien n’est transmis ni enregistré. Les changements sont réinitialisés au rechargement.</p><button class="mk-btn mk-outline" id="reset">Réinitialiser la démonstration</button><div class="mk-livedemos" data-livedemos hidden></div></div></div></section>
</main><footer class="mk-footer"><div class="mk-wrap"><div class="mk-footergrid"><div><a class="mk-logo" href="#accueil"><span class="mk-mark"><i></i><i></i><i></i><i></i></span>ORBii<small>interact</small></a><p>Donnez la parole à chacun. Faites émerger l’essentiel.</p></div><div><h4>Produit</h4><a href="#fonctionnalites">Fonctionnalités</a><a href="#demo">Démonstration</a><a href="https://github.com/pejmang/Meetup-Q-A" target="_blank" rel="noopener">Code source (GitHub)</a></div><div><h4>Solutions</h4><a href="#cas-usage">Cas d’usage</a><a href="#cas-usage">Entreprises & événements</a></div><div><h4>Participer</h4><a href="#demo">Tester la démo</a><a href="#demo" data-modal="join">Rejoindre une session</a><a href="#demo" data-modal="create">Créer une session</a><a href="#accueil" data-act="my" data-google hidden>Mes espaces</a><a href="#accueil" data-act="signin">Connexion animateur / admin</a></div></div><div class="mk-footnote"><span><span data-copyright></span> · <a href="#accueil" data-act="terms">Conditions d’utilisation</a></span><a href="https://orbii.tech" target="_blank" rel="noopener">Powered by <b>ORBii</b>, Smart Tools for a Connected World</a></div></div></footer><div class="mk-modal" id="modal" hidden role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="mk-modalbox"><h2 id="modalTitle">Rejoindre une session</h2><p>Saisissez le code communiqué par l’organisateur.</p><form id="modalForm"><label for="modalField">Code de session</label><input class="mk-field" id="modalField" required maxlength="5" placeholder="K7M2P" autocapitalize="characters" autocomplete="off"><div class="mk-alert" id="modalError" aria-live="polite"></div><div class="mk-btnrow"><button type="button" class="mk-btn mk-outline" id="closeModal">Annuler</button><button class="mk-btn mk-dark" type="submit">Rejoindre →</button></div></form><div data-find></div></div></div>`;

const SITE_EN = {
 "Aller au contenu": "Skip to content",
 "ORBii Interact accueil": "ORBii Interact home",
 "Navigation principale": "Main navigation",
 "Accueil": "Home",
 "Fonctionnalités": "Features",
 "Cas d’usage": "Use cases",
 "Démo": "Demo",
 "Connexion": "Sign in",
 "Rejoindre": "Join",
 "Créer une session": "Create a session",
 "Menu": "Menu",
 "Audience engagement · En direct": "Audience engagement · Live",
 "Ne parlez plus à votre audience.": "Stop talking at your audience.",
 "Parlez avec elle.": "Talk with them.",
 "Donnez la parole à chacun, faites émerger les questions qui comptent et transformez vos réunions et événements en conversations collectives.": "Give everyone a voice, surface the questions that matter and turn your meetings and events into shared conversations.",
 "▷ Tester la démo": "▷ Try the demo",
 "Questions anonymes": "Anonymous questions",
 "Votes en direct": "Live voting",
 "Modération": "Moderation",
 "EN DIRECT": "LIVE",
 "Q&A ouvert": "Q&A open",
 "Participants": "Participants",
 "Quelles sont nos priorités pour 2027 ?": "What are our priorities for 2027?",
 "Anonyme · 2 min": "Anonymous · 2 min",
 "Comment accompagner la transformation IA ?": "How do we support the AI transformation?",
 "Anonyme · 5 min": "Anonymous · 5 min",
 "Comment mieux collaborer entre les équipes ?": "How can teams work better together?",
 "Anonyme · 7 min": "Anonymous · 7 min",
 "À vous la parole": "Your turn to speak",
 "Posez votre question": "Ask your question",
 "Votre contribution compte.": "Your input matters.",
 "Qu’aimeriez-vous demander ?": "What would you like to ask?",
 "Envoyer": "Send",
 "✓ En mode anonyme": "✓ Anonymous mode",
 "Illustration produit · Données fictives": "Product illustration · Fictional data",
 "Un outil, plusieurs moments clés": "One tool, many key moments",
 "Town halls": "Town halls",
 "Meetups": "Meetups",
 "Conférences": "Conferences",
 "Ateliers": "Workshops",
 "Formations": "Training",
 "La valeur du dialogue": "The value of dialogue",
 "Les meilleures questions ne sont pas toujours posées à voix haute.": "The best questions are not always asked out loud.",
 "Créez un espace où les participants peuvent s’exprimer, soutenir les idées des autres et contribuer à la discussion.": "Create a space where participants can speak up, back each other’s ideas and contribute to the discussion.",
 "Libérez la parole": "Let people speak up",
 "Permettez à chacun de poser une question, y compris anonymement, sans interrompre la conversation.": "Let anyone ask a question, even anonymously, without interrupting the conversation.",
 "Découvrir les Q&A →": "Explore Q&A →",
 "Faites émerger l’essentiel": "Surface what matters",
 "Les votes révèlent les sujets qui mobilisent le plus votre audience. Donnez la priorité aux questions collectives.": "Votes reveal the topics your audience cares about most. Give priority to shared questions.",
 "Découvrir les interactions →": "Explore interactions →",
 "Gardez le contrôle": "Stay in control",
 "Organisez les questions, animez la discussion et affichez les contributions au bon moment.": "Organise questions, lead the discussion and show contributions at the right time.",
 "Découvrir la modération →": "Explore moderation →",
 "Simple par conception": "Simple by design",
 "Trois étapes pour changer la dynamique.": "Three steps to change the dynamic.",
 "Créez votre session": "Create your session",
 "Préparez le nom de votre événement et ouvrez l’espace de discussion.": "Name your event and open the discussion space.",
 "Invitez votre audience": "Invite your audience",
 "Partagez le lien ou le code de participation.": "Share the link or the event code.",
 "Engagez la conversation": "Start the conversation",
 "Collectez, priorisez et animez les questions en direct.": "Collect, prioritise and handle questions live.",
 "L’expérience participant": "The participant experience",
 "Une invitation suffit pour prendre la parole.": "One invitation is all it takes to speak up.",
 "Testez le parcours comme si vous assistiez à une réunion.": "Try it as if you were attending a meeting.",
 "Code de démonstration": "Demo code",
 "Poser une question": "Ask a question",
 "Voter": "Vote",
 "Réagir": "React",
 "Pour les moments qui comptent": "For the moments that matter",
 "Un dialogue plus riche, quel que soit le format.": "Richer dialogue, whatever the format.",
 "Dirigeants & RH": "Leaders & HR",
 "Échanges COMEX, communication interne, transformation et écoute des collaborateurs.": "Executive Q&A, internal communication, transformation and employee listening.",
 "Voir les cas d’usage →": "See use cases →",
 "Événements & conférences": "Events & conferences",
 "Questions de l’audience, tables rondes, rencontres professionnelles et meetups.": "Audience questions, panels, professional gatherings and meetups.",
 "Managers & facilitateurs": "Managers & facilitators",
 "Ateliers, séminaires, discussions d’équipe et sessions de formation.": "Workshops, offsites, team discussions and training sessions.",
 "Votre prochaine conversation commence ici.": "Your next conversation starts here.",
 "Découvrez l’expérience ORBii Interact en quelques clics.": "Discover ORBii Interact in a few clicks.",
 "Tester la démo →": "Try the demo →",
 "De la première question à la conversation collective.": "From the first question to a shared conversation.",
 "Tout ce qu’il faut pour recueillir les contributions, révéler les priorités et piloter vos interactions en direct.": "Everything you need to gather input, reveal priorities and run your interactions live.",
 "Essayer en direct →": "Try it now →",
 "Questions & votes": "Questions & voting",
 "Sondages & réactions": "Polls & reactions",
 "Projection": "Big screen",
 "Statistiques": "Analytics",
 "01 · Questions & votes": "01 · Questions & voting",
 "Écoutez aussi ceux qui ne prennent pas le micro.": "Hear from those who never take the mic, too.",
 "Une interface de questions-réponses ouverte à toute l’audience. Les participants soumettent leurs questions et soutiennent celles qu’ils jugent importantes.": "A Q&A space open to the whole audience. Participants submit questions and upvote the ones they find important.",
 "Questions anonymes ou identifiées, selon le mode de la session.": "Anonymous or named questions, depending on the session mode.",
 "Votes pour faire remonter les sujets prioritaires.": "Voting to bring priority topics to the top.",
 "Fil de questions accessible aux participants.": "A question feed visible to participants.",
 "Tester les questions & votes →": "Try questions & voting →",
 "Questions de l’audience": "Audience questions",
 "Par popularité": "By popularity",
 "Quelles sont les prochaines étapes ?": "What are the next steps?",
 "Anonyme": "Anonymous",
 "Comment mesurer les résultats ?": "How will we measure results?",
 "Quels moyens pour les équipes ?": "What resources will teams get?",
 "02 · Sondages & réactions": "02 · Polls & reactions",
 "Comprenez votre audience en temps réel.": "Understand your audience in real time.",
 "Posez une question ciblée, recueillez les réponses et rendez les résultats visibles pour ouvrir la discussion.": "Ask a focused question, collect answers and show the results to open the discussion.",
 "Sondages et votes en direct.": "Live polls and voting.",
 "Réactions aux contributions.": "Reactions to contributions.",
 "Lecture visuelle des réponses.": "Visual view of the answers.",
 "Tester un sondage →": "Try a poll →",
 "Quel sujet approfondir ?": "Which topic should we explore?",
 "Exemple": "Example",
 "Stratégie": "Strategy",
 "Organisation": "Organisation",
 "Compétences": "Skills",
 "03 · Modération": "03 · Moderation",
 "Gardez la maîtrise du dialogue.": "Keep the dialogue on track.",
 "L’organisateur dispose d’un espace de pilotage distinct de l’interface participant pour gérer les questions et le déroulement de la session.": "Organisers get a control room, separate from the participant view, to manage questions and run the session.",
 "Mettre en avant une question.": "Highlight a question.",
 "Marquer les questions traitées.": "Mark questions as answered.",
 "Organiser et modérer les contributions.": "Organise and moderate contributions.",
 "Voir l’espace organisateur →": "See the organiser view →",
 "Console organisateur": "Organiser console",
 "En direct": "Live",
 "Les priorités de l’année ?": "This year’s priorities?",
 "Projeter": "Show",
 "Quels nouveaux outils ?": "Which new tools?",
 "Épingler": "Pin",
 "Quels indicateurs de suivi ?": "Which metrics will we track?",
 "Traitée": "Answered",
 "04 · Projection": "04 · Big screen",
 "Faites de la discussion un moment partagé.": "Make the discussion a shared moment.",
 "Affichez les questions sélectionnées sur un écran commun afin de donner à tous les participants le même contexte.": "Show selected questions on a shared screen so everyone has the same context.",
 "Affichage dédié à l’animation.": "A dedicated presentation display.",
 "Mise en avant de la question en cours.": "The current question in the spotlight.",
 "Lecture collective des contributions.": "Contributions everyone can read together.",
 "QUESTION À L’ÉCRAN": "QUESTION ON SCREEN",
 "31 votes · Question anonyme": "31 votes · Anonymous question",
 "05 · Statistiques": "05 · Analytics",
 "Au-delà de l’événement, comprenez la participation.": "Beyond the event, understand participation.",
 "Les indicateurs de session donnent une première lecture de l’activité et des contributions de votre audience.": "Session metrics give a first reading of your audience’s activity and contributions.",
 "Nombre de questions et de votes.": "Number of questions and votes.",
 "Indicateurs de participation disponibles.": "Participation metrics.",
 "Identification des sujets ayant mobilisé le collectif.": "See which topics engaged the group.",
 "Vue de session · Exemple": "Session overview · Example",
 "Sujet le plus voté": "Most upvoted topic",
 "Stratégie 2027": "2027 strategy",
 "Questions traitées": "Questions answered",
 "Chaque audience mérite d’être entendue.": "Every audience deserves to be heard.",
 "Des réunions d’équipe aux grands événements, découvrez comment mettre le dialogue au cœur de vos moments collectifs.": "From team meetings to large events, see how to put dialogue at the heart of your gatherings.",
 "Vivre l’expérience →": "Experience it →",
 "Direction générale": "Executive leadership",
 "Town halls & échanges COMEX": "Town halls & leadership Q&A",
 "Faites remonter les préoccupations des collaborateurs et identifiez les questions auxquelles les dirigeants doivent répondre en priorité.": "Bring employee concerns to the surface and identify the questions leaders should answer first.",
 "Exemple : « Quelles seront nos priorités stratégiques l’année prochaine ? »": "Example: “What will our strategic priorities be next year?”",
 "RH & communication interne": "HR & internal communications",
 "Transformation & écoute": "Transformation & listening",
 "Donnez un espace d’expression à chacun, y compris aux collaborateurs moins à l’aise avec la prise de parole publique.": "Give everyone a way to speak up, including people less comfortable speaking in public.",
 "Exemple : collecter les questions sur une réorganisation.": "Example: collecting questions about a reorganisation.",
 "Événementiel": "Events",
 "Conférences & tables rondes": "Conferences & panels",
 "Faites participer le public et aidez le modérateur à choisir les sujets les plus attendus.": "Involve the audience and help the moderator pick the most awaited topics.",
 "Exemple : sélectionner les questions à poser aux intervenants.": "Example: choosing which questions to put to speakers.",
 "Management & conseil": "Management & consulting",
 "Ateliers & séminaires": "Workshops & offsites",
 "Recueillez des contributions, identifiez les priorités et ouvrez le débat autour des sujets importants.": "Gather input, identify priorities and open the debate on important topics.",
 "Exemple : prioriser les irritants d’une équipe.": "Example: prioritising a team’s pain points.",
 "Tech & innovation": "Tech & innovation",
 "Meetups & communautés": "Meetups & communities",
 "Animez vos rendez-vous récurrents et favorisez les questions transverses entre équipes.": "Run your recurring gatherings and encourage cross-team questions.",
 "Exemple : Q&A lors d’un meetup Data & IA.": "Example: Q&A at a Data & AI meetup.",
 "Formation": "Training",
 "Sessions d’apprentissage": "Learning sessions",
 "Identifiez les notions qui suscitent des questions et encouragez les participants à s’exprimer.": "Spot the concepts that raise questions and encourage participants to speak up.",
 "Exemple : sonder les sujets à approfondir en fin de session.": "Example: polling which topics to revisit at the end of a session.",
 "Et si votre prochain événement devenait une conversation ?": "What if your next event became a conversation?",
 "Explorez les deux expériences, organisateur et participant.": "Explore both experiences, organiser and participant.",
 "Démo interactive": "Interactive demo",
 "À vous de jouer.": "Your turn.",
 "Posez une question, votez et voyez comment l’organisateur peut animer la conversation. Les deux vues se synchronisent dans votre navigateur.": "Ask a question, vote and see how the organiser can lead the conversation. Both views stay in sync in your browser.",
 "Vue participant": "Participant view",
 "DÉMO": "DEMO",
 "Sondage": "Poll",
 "Votre question anonyme": "Your anonymous question",
 "Envoyer ma question": "Send my question",
 "Quel sujet souhaitez-vous approfondir ?": "Which topic would you like to explore?",
 "Sélectionnez une réponse.": "Select an answer.",
 "Vue organisateur": "Organiser view",
 "Votes Q&A": "Q&A votes",
 "Traitées": "Answered",
 "Gestion des questions": "Manage questions",
 "Résultats du sondage": "Poll results",
 "PROJECTION": "BIG SCREEN",
 "Sélectionnez une question à projeter.": "Select a question to show.",
 "Écran de présentation": "Presentation screen",
 "Démo locale :": "Local demo:",
 "données fictives, rien n’est transmis ni enregistré. Les changements sont réinitialisés au rechargement.": "fictional data, nothing is sent or saved. Changes are reset when the page reloads.",
 "Réinitialiser la démonstration": "Reset the demo",
 "Donnez la parole à chacun. Faites émerger l’essentiel.": "Give everyone a voice. Surface what matters.",
 "Produit": "Product",
 "Démonstration": "Demo",
 "Code source (GitHub)": "Source code (GitHub)",
 "Solutions": "Solutions",
 "Entreprises & événements": "Companies & events",
 "Participer": "Take part",
 "Tester la démo": "Try the demo",
 "Rejoindre une session": "Join a session",
 "Mes espaces": "My spaces",
 "Connexion animateur / admin": "Host / admin sign-in",
 "Conditions d’utilisation": "Terms of use",
 "Saisissez le code communiqué par l’organisateur.": "Enter the code shared by the organiser.",
 "Code de session": "Session code",
 "Annuler": "Cancel",
 "Rejoindre →": "Join →",
 "Donnez la parole à chacun": "Give everyone a voice",
 "Voter pour": "Vote for",
 "Anonyme · Traitée": "Anonymous · Answered",
 "Anonyme · Épinglée": "Anonymous · Pinned",
 "À l’écran": "On screen",
 "Désépingler": "Unpin",
 "Rouvrir": "Reopen",
 "Question anonyme": "Anonymous question",
 "Votre réponse est enregistrée dans la démo.": "Your answer is recorded in the demo.",
 "Veuillez renseigner ce champ.": "Please fill in this field."
};

const Site = (() => {
  const PAGES = { accueil: 'Donnez la parole à chacun', fonctionnalites: 'Fonctionnalités', 'cas-usage': 'Cas d’usage', demo: 'Démo interactive' };
  const ICONS = {
    voice: '<path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-5 3 1.5-5A7.5 7.5 0 1 1 21 11.5Z"/><path d="M8 10h8M8 14h5"/>',
    rank: '<path d="M4 20V11m5 9V7m6 13V3m5 17V9"/><path d="M3 20h19"/>',
    screen: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="m8 21 4-4 4 4M7 10l3 3 6-6"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>'
  };
  const OPTS = ['Stratégie', 'Organisation', 'Compétences'];
  const tr = s => (LANG === 'fr' ? s : SITE_EN[s] ?? s);

  let root = null, ctx = null, page = 'accueil', lastHash = null, returnFocus = null, demo;
  const $ = sel => root.querySelector(sel);
  const $$ = sel => root.querySelectorAll(sel);

  // ----- Local demo (fictional data, nothing leaves the browser) -----
  function newDemo() {
    return { chosen: -1, projection: null, nextId: 4, poll: [46, 34, 20], questions: [
      { id: 1, q: 'Quelles sont nos priorités pour 2027 ?', seed: true, votes: 42 },
      { id: 2, q: 'Comment accompagner la transformation IA ?', seed: true, votes: 31 },
      { id: 3, q: 'Comment mieux collaborer entre les équipes ?', seed: true, votes: 18 }] };
  }
  const label = q => (q.seed ? tr(q.q) : q.q);
  const btn = (text, cls, fn) => h('button', { type: 'button', class: cls, onclick: fn }, text);

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

  // ----- Pages (#accueil, #fonctionnalites/qa, #cas-usage, #demo/poll) -----
  function showPage() {
    const hash = location.hash.slice(1);
    if (hash === 'main') return;
    const [name, anchor] = (hash || 'accueil').split('/');
    page = PAGES[name] ? name : 'accueil';
    $$('[data-page]').forEach(el => el.classList.toggle('mk-active', el.dataset.page === page));
    $$('[data-nav]').forEach(el => {
      const on = el.dataset.nav === page;
      el.classList.toggle('mk-active', on);
      if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    closeMenu();
    if (page === 'demo') setTab(anchor === 'poll' ? 'poll' : 'questions');
    if (hash !== lastHash) {
      const first = lastHash === null;
      lastHash = hash;
      if (anchor && page === 'fonctionnalites') requestAnimationFrame(() => root.querySelector('#' + CSS.escape(anchor))?.scrollIntoView());
      else if (!first || hash) window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  function closeMenu() { $('#navlinks').classList.remove('mk-open'); $('#menu').setAttribute('aria-expanded', 'false'); }

  // ----- Join dialog -----
  function openJoin() {
    returnFocus = document.activeElement;
    $('#modalField').value = ''; $('#modalError').textContent = '';
    $('#modal').hidden = false;
    $('#modalField').focus();
  }
  function closeJoin() { $('#modal').hidden = true; returnFocus?.focus(); }

  // "Create a session" goes to Google registration; without it, to an e-mail request
  async function create() {
    const info = await infoReady;
    if (info && info.googleClientId) return go('/register');
    location.href = `mailto:info@orbii.tech?subject=${encodeURIComponent(t('land.mailSubject'))}&body=${encodeURIComponent(t('land.mailBody'))}`;
  }

  function translate(node) {
    if (LANG === 'fr') return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const [, before, text, after] = n.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
      const en = SITE_EN[text.replace(/\s+/g, ' ')];
      if (en !== undefined) n.nodeValue = before + en + after;
    }
    for (const attr of ['aria-label', 'placeholder']) node.querySelectorAll(`[${attr}]`).forEach(el => el.setAttribute(attr, tr(el.getAttribute(attr))));
  }

  function build() {
    const el = h('div', { class: 'mk', 'data-lang': LANG });
    el.innerHTML = SITE_HTML;   // static, trusted markup; event data is only ever added with h()
    translate(el);
    root = el; lastHash = null;
    $$('[data-icon]').forEach(x => { x.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[x.dataset.icon]}</svg>`; });
    const lang = $('[data-act="lang"]');
    lang.textContent = LANG === 'fr' ? 'EN' : 'FR';
    lang.setAttribute('aria-label', t('lang.switch'));
    $('[data-copyright]').textContent = `© ${copyrightYears()} ORBii SAS`;
    $('#menu').onclick = () => $('#menu').setAttribute('aria-expanded', String($('#navlinks').classList.toggle('mk-open')));
    $$('[data-modal]').forEach(b => { b.onclick = e => { e.preventDefault(); closeMenu(); if (b.dataset.modal === 'join') openJoin(); else create(); }; });
    const actions = {
      signin: () => { closeMenu(); ctx.signIn(); },
      lang: () => setLang(LANG === 'fr' ? 'en' : 'fr'),
      my: () => go('/my'),
      terms: () => go('/terms'),
      skip: () => { $('#main').setAttribute('tabindex', '-1'); $('#main').focus(); }
    };
    $$('[data-act]').forEach(b => { b.onclick = e => { e.preventDefault(); actions[b.dataset.act](); }; });
    $$('[data-tab]').forEach(b => { b.onclick = () => setTab(b.dataset.tab); });
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
    $('#questionForm').onsubmit = e => {
      e.preventDefault();
      const q = $('#question').value.trim();
      if (!q) return;
      demo.questions.push({ id: demo.nextId++, q, votes: 0 });
      $('#question').value = ''; renderDemo();
    };
    $('#reset').onclick = () => { demo = newDemo(); renderDemo(); };
    renderDemo();
  }

  // Parts that depend on the server: public demos, Google sign-in, searchable list of spaces
  function update() {
    const demos = INFO.demos || [];
    $$('[data-google]').forEach(el => { el.hidden = !INFO.googleClientId; });
    const codes = demos.map(d => String(d.url).match(/\/e\/([A-Za-z0-9]+)\/?$/)?.[1]).filter(Boolean);
    $('[data-democode]').hidden = !codes.length;
    if (codes.length) $('.mk-codeblock').textContent = codes[0].toUpperCase();
    const live = $('[data-livedemos]');
    live.hidden = !demos.length;
    live.replaceChildren(h('h3', {}, t('land.demoT')), h('p', {}, t('land.demoP')),
      ...demos.map(d => h('div', { class: 'mk-livedemo' }, h('b', {}, d.title),
        h('div', { class: 'mk-btnrow' }, h('a', { class: 'mk-btn mk-dark', href: d.url + '/host' }, t('land.demoHost')), h('a', { class: 'mk-btn mk-outline', href: d.url }, t('land.demoGuest'))))),
      h('p', { style: 'margin:10px 0 0' }, t('land.demoPw') + ' ', h('code', {}, 'demo20272028')));
    // keep the search field untouched while it is being typed in
    if (!document.activeElement?.matches('[data-keep="find"]')) $('[data-find]').replaceChildren(ctx.findSpace());
  }

  // Returns the site element; it is kept between refreshes so that typing and the demo are never reset
  function render(context) {
    ctx = context;
    demo = demo || newDemo();
    if (!root || root.dataset.lang !== LANG) build();
    return root;
  }

  function sync() { showPage(); update(); document.title = 'ORBii Interact — ' + tr(PAGES[page]); }
  // coming back from another screen: start from a closed dialog and follow the address
  function leave() { if (root) { $('#modal').hidden = true; } lastHash = null; }

  return { render, sync, leave };
})();
