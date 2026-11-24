# Meetup Q&A — Technical Design

Copyright 2026 ORBii SAS · PolyForm Noncommercial 1.0.0 (see `LICENSE` and `NOTICE`).
Free for noncommercial use. For commercial use, contact us: info@orbii.tech

This document describes the software architecture of Meetup Q&A (ORBii Interact), how data and real-time updates flow, how it is deployed, and the measured capacity limits.

---

## 1. Goals and principles

| Principle | Consequence |
|---|---|
| **Zero dependencies** | Server on Node.js built-ins only (`http`, `fs`, `crypto`); client in vanilla JavaScript. No `npm install`, small attack surface, nothing to patch but Node itself. |
| **One process, one file** | All state lives in memory and is persisted to a single JSON file. Simple to run, back up and restore. |
| **Real-time by default** | Server-Sent Events (SSE): every connected screen is updated live, without polling. |
| **Privacy by design** | No accounts for participants, no tracking, no third-party analytics; data hosted in France on the organiser's server. |
| **Role-based views** | The server builds a different view for participants, hosts and the projection screen; hidden data (pending questions, hidden poll results, host keys) never leaves the server. |

---

## 2. Architecture overview

```
  Phones / laptops / projection screen
  ┌──────────────────────────────────────────┐
  │  Single-page app (public/)                │
  │  app.js · i18n.js · style.css · index.html│
  └───────────────┬──────────────────────────┘
        HTTPS     │  REST (JSON)  +  SSE stream (text/event-stream)
  ┌───────────────▼──────────────────────────┐
  │  nginx  (TLS, Let's Encrypt)              │
  │   /        → 127.0.0.1:3010  (production) │
  │   /v2.0/   → 127.0.0.1:3011  (staging)    │
  │   proxy_buffering off (required for SSE)  │
  └───────────────┬──────────────────────────┘
  ┌───────────────▼──────────────────────────┐
  │  Docker container  (node:22-alpine, user node)
  │  server.js — single Node.js process       │
  │   ├─ router (REST + SSE + static files)   │
  │   ├─ auth (admin token, host keys, scrypt)│
  │   ├─ rate limiter                         │
  │   ├─ in-memory state  events{}            │
  │   ├─ view builder (per role / per device) │
  │   ├─ coalesced broadcaster (SSE push)     │
  │   ├─ stats & timeline aggregation         │
  │   └─ CSV export · demo generator (demo.js)│
  └───────────────┬──────────────────────────┘
  ┌───────────────▼──────────────────────────┐
  │  Docker volume /data                      │
  │   data.json          all events           │
  │   admin.json         admin password hash  │
  │   backups/data-YYYY-MM-DD.json (14 kept)  │
  └──────────────────────────────────────────┘
```

---

## 3. Components

### 3.1 Server (`server.js`, ~700 lines)

| Module | Responsibility |
|---|---|
| Configuration | Environment variables (`ADMIN_PASSWORD` required, `PORT`, `DATA_DIR`, `BASE_PATH`, `TRUST_PROXY`, rate limits, `BACKUP_KEEP`, `BROADCAST_MS`). Refuses to start without an admin password or if `DATA_DIR` is not writable. |
| Auth | Admin token = HMAC of the admin secret (changes when the password changes, which signs out other admin sessions). Per-event host password hashed with scrypt + salt; a random `hostKey` grants host rights (rotated on password reset). Admin password changeable from the UI, stored hashed in `admin.json`. |
| Rate limiting | Fixed one-minute windows: writes per IP + device (30/min), sign-in attempts per IP (10/min), all writes per IP (600/min, for a whole room behind one Wi-Fi). 1 question / 4 s per device. |
| Storage | `events{}` in memory; debounced (300 ms) atomic write of `data.json` (write temp file + rename); flush on SIGTERM; daily snapshot in `backups/`. |
| Views | `view(event, isHost, deviceId, isScreen)` builds the JSON a given client may see: questions (with `voted` / `mine` flags), polls (results hidden or shown), agenda, and stats for hosts. |
| Real-time | `GET /api/events/:code/stream` opens an SSE stream. Changes call `broadcast(code)`, which is **coalesced**: at most one push per event every 250 ms, whatever the number of actions or connections in between. Keep-alive ping every 25 s; sampling every 30 s. |
| Stats | Per-minute timeline (`tl`): max people connected at the same time, interactions, distinct active devices. Aggregated on read to an automatic resolution (1 min → 1 day, ≤ 240 points). |
| CSV export | Questions (session, votes, status, notes, merged duplicates, reactions), polls and audience stats; `;` separator for French Excel. |
| Demo generator (`demo.js`) | Builds fully simulated events (EN/FR, 1 or 3 days) with agenda, questions, polls, NPS and audience data, labelled "DEMO · simulated data". |

### 3.2 Client (`public/`)

| File | Role |
|---|---|
| `index.html` | Shell; the server injects the base path (`/` or `/v2.0`). |
| `app.js` (~950 lines) | SPA router (`/`, `/e/CODE`, `/e/CODE/host`, `/e/CODE/screen`), views (home/admin, participant, host, projection screen), poll and result components, live analytics chart (SVG), agenda. A tiny `h()` helper builds DOM nodes with `textContent` only, which prevents HTML injection. |
| `i18n.js` | All strings in English and French (~300 keys); language auto-detected, switchable. |
| `style.css` | Design tokens, light/dark mode, mobile-first layout, projection-screen theme, print styles. Chart and NPS palettes validated for colour-blindness. |

The only external resource is the QR-code generator (`qrcode-generator` from cdnjs).

### 3.3 Roles

| Role | How | Can |
|---|---|---|
| Participant | Event code or QR code; anonymous device id stored in the browser | Ask (to a session or the whole meetup), upvote, react, answer polls, rate the NPS (unlocks results and analytics) |
| Host | Event code + host password (or co-host link) | Moderate, answer, pin, merge, move between sessions, show on screen, manage polls and agenda, analytics, CSV export |
| Admin | Admin password | Create events (incl. demo events), manage all events, reset host passwords, change the admin password, delete events |
| Projection screen | `/e/CODE/screen` | Read-only big-screen view (top questions, highlighted question, current poll, live session, audience chart) |

---

## 4. Data model (`data.json`)

```jsonc
{
  "K4ARN": {                                   // event code
    "code": "K4ARN", "title": "…", "created": 1764000000000,
    "hostKey": "…", "hostPass": "salt:scrypt-hash",
    "open": true, "ended": false, "endedAt": null, "moderation": false, "demo": false,
    "sessions": [ { "id": "…", "title": "…", "speaker": "…", "startTime": "18:30",
                    "duration": 20, "description": "…", "order": 0, "status": "live" } ],
    "questions": [ { "id": "…", "text": "…", "author": "…", "anon": false, "cid": "<device>",
                     "ts": 0, "voters": ["<device>", "…"], "status": "live|pending|answered",
                     "pinned": false, "highlighted": false, "note": "…", "sessionId": null,
                     "merged": [ { "text": "…", "author": "…", "cid": "…" } ],
                     "reacts": { "🔥": ["<device>"] } } ],
    "polls": [ { "id": "…", "type": "choice|multi|wordcloud|rating|nps|open", "question": "…",
                 "open": true, "hidden": false, "draft": false, "persistent": false,
                 "options": [ { "label": "…", "voters": [] } ],      // choice / multi
                 "responses": { "<device>": 9 } } ],                   // rating / nps (arrays for wordcloud / open)
    "screenPoll": null, "screenSessionOnly": false,
    "participants": ["<device>"], "actives": ["<device>"],
    "peakOnline": 81, "peakOnlineAt": 0,
    "tl": { "<minute timestamp>": { "o": 42, "a": 7, "u": ["<device>"] } }
  }
}
```

Fields added over time are optional: older events without them keep working without migration.

---

## 5. Main flows

**Ask a question** — `POST /api/events/:code/questions` → validation (length, session, rate limit) → question added (pending if moderation is on) → `track()` updates the timeline → `save()` (debounced) → `broadcast()` (coalesced) → every client receives its own view.

**Vote / poll answer** — same path; toggles are idempotent per device (a device id can vote once).

**Live analytics** — stats are computed on read from the per-minute timeline; hosts receive them in every push; participants receive them once they have rated the event NPS; the projection screen when the host shows activity on screen.

**Release flow** — develop on the staging instance (`/opt/meetup-qa-v2`, `/v2.0/`) → tests + CI → merge into `main` → back up `data.json` → `docker compose build` then `up -d` (≈ 1–2 s downtime) → verify → tag a release.

---

## 6. Security

- No default admin password; admin password hashed once changed from the UI.
- Host passwords hashed (scrypt + salt); timing-safe comparisons; 700 ms delay on failed sign-in.
- Rate limiting per IP and device; request bodies capped at 20 KB; all text inputs trimmed and length-limited.
- No HTML rendering of user content (DOM `textContent` only) → no stored XSS.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`; TLS terminated by nginx.
- Container runs as the unprivileged `node` user; data in a dedicated volume; secrets only in `.env` (never committed).

---

## 7. Operations

| Topic | How |
|---|---|
| Health | `GET /healthz` → `ok` (also Docker HEALTHCHECK) |
| Backups | Daily snapshot in `/data/backups` (14 kept) + copies taken before each release in `/root/backups/meetup-qa/` |
| Restore | Stop, copy a snapshot to `/data/data.json`, start (see README) |
| Rollback | Previous image kept as `meetup-qa-meetup-qa:<version>-rollback` |
| Admin password lost | Start once with `ADMIN_PASSWORD_RESET=1` → back to the password in `.env` |
| Tests / CI | `npm test` (node:test, 15 tests); GitHub Actions on Node 18 & 22 + Docker build and smoke test |

---

## 8. Capacity and limits (measured)

Measured on the current VPS: **2 vCPU (AMD EPYC, shared with ~10 other services), 7.8 GB RAM**, load generator on the same machine (results are therefore conservative). Realistic event: 9 questions, 8 polls, agenda, ~7 KB per push to a participant.

### 8.1 Concurrent participants on one event (5–10 actions/s, i.e. a very busy meetup)

| Connected at the same time | Before coalescing (v2.3.0) | With coalescing (staging, v2.4) |
|---|---|---|
| 100 | join 1.5 s · action 16 ms | — |
| 300 | join **13 s** · action 62 ms (p95 165 ms) · CPU 150 % | join **0.5 s** · action **2 ms** (p95 4 ms) |
| 600 | join **43 s** (CPU saturated) · action 116 ms · 19 MB/s out | join **0.8 s** · action **2 ms** (p95 69 ms) · 10 MB/s out |
| 1,500 | — | join 4 s · action 144 ms (p95 0.5 s) · CPU ~65 % · 194 MB RAM |
| 3,000 | — | join 14 s · action 0.6 s (p95 1.3 s) · CPU ~80 % · 243 MB RAM — works but sluggish |

"Join" = time for all participants to connect at once (everyone scanning the QR code). "Action" = server response time for a vote.

**Recommended limits on this server (with coalescing):**

| Metric | Comfortable | Maximum (degraded) |
|---|---|---|
| People connected at the same time (all events together) | **≈ 1,000–1,500** | ≈ 3,000 |
| Interactions per second | 10+ (cost no longer depends on it) | — |
| Questions per event | **≤ 150–200** for a 500-person room | ~500 (each push carries every question: ~520 bytes/question → 105 KB per push at 200 questions) |
| Sessions per event | 20 (hard limit) | 20 |
| Poll answers | thousands (aggregated, small payload) | — |
| Events stored | hundreds | a few thousand (the whole `data.json` is rewritten on each change; multi-day events store per-minute data) |
| Event duration | days to weeks (chart switches to hourly/daily points) | — |

### 8.2 What limits capacity, and what would raise it

| Bottleneck | Why | Fix (backlog) |
|---|---|---|
| Full state pushed to every client | Each push re-sends all questions and polls, personalised per device | Send diffs (only what changed), paginate old/answered questions; gzip the SSE stream in nginx |
| One Node.js process | Uses one CPU core for JSON building | Cache the shared part of the view once per push and only personalise small flags; or run per-event workers |
| JSON file storage | Whole file rewritten on each change | SQLite (planned before offering the app to many clients) |
| Single instance | In-memory state and SSE connections live in one process | Redis pub/sub + several instances behind nginx for very large events |
| Shared 2-vCPU VPS | Other services compete for CPU and bandwidth | Dedicated 4-vCPU instance roughly doubles the comfortable limit |

---

## 9. Roadmap

- AI features (themes, semantic duplicates, summary) — waiting for decisions on provider/hosting (GDPR), opt-in per event and cost cap.
- Diff-based real-time updates and question pagination (capacity).
- SQLite storage.
- Branding (logo, colours), speaker and co-moderator roles, multi-room events, Teams/PowerPoint integrations, quiz with leaderboard.
