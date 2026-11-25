# Meetup Q&A

[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-7b5cd6)](LICENSE) [![CI](https://github.com/pejmang/Meetup-Q-A/actions/workflows/ci.yml/badge.svg)](https://github.com/pejmang/Meetup-Q-A/actions/workflows/ci.yml) [![Live demo](https://img.shields.io/badge/live%20demo-try%20it-c8a24a)](https://interact.orbii.tech/en/demo)

**Open source under the [GNU AGPL v3.0](LICENSE). Commercial license available: [info@orbii.tech](mailto:info@orbii.tech)**

**Website: [ORBii Interact](https://interact.orbii.tech/en)** (English) · [en français](https://interact.orbii.tech/)

## Live demo

Try it with two fully simulated events (English, agenda, questions, polls, NPS, live analytics). Host password: `demo20272028`.

| Demo | 🎛 Host | 👥 Participant | 📺 Projection screen |
|---|---|---|---|
| **Townhall Tech Q3 2026** — 1,200 people, 25 questions, eNPS | [host](https://interact.orbii.tech/v2.0/e/DKPTZ/host) | [participant](https://interact.orbii.tech/v2.0/e/DKPTZ) | [screen](https://interact.orbii.tech/v2.0/e/DKPTZ/screen) |
| **AI & Data Meetup** — 3 days, agenda, reset every 30 min | [host](https://interact.orbii.tech/v2.0/e/K4ARN/host) | [participant](https://interact.orbii.tech/v2.0/e/K4ARN) | [screen](https://interact.orbii.tech/v2.0/e/K4ARN/screen) |

The demo data is simulated and may be reset at any time.

Live Q&A and polls for meetups and events. Zero dependencies (Node ≥ 18), real-time via Server-Sent Events, data stored in a single JSON file.

## Public website

The home, features, use cases and demo pages (French and English) are complete HTML rendered by `website.js` from `website/{fr,en}/*.html`, so they can be read without JavaScript. The server also provides `robots.txt`, `sitemap.xml` and `llms.txt`. Settings: `SITE_URL` (public address, derived from the request when empty) and `SITE_NOINDEX=1` for test sites.

## Roles
- **Participant**: sees live events, joins with a code or QR code, asks questions (named or anonymous), upvotes 👍, reacts with emojis, answers polls.
- **Event host** (per-event password): manages *one* event — moderation, pin, mark answered, show a question on screen, polls, close questions, end the event.
- **Admin** (global password): creates events and sets each event's host password, manages *all* events, resets host passwords, deletes events.
- **Projection screen**: `/e/CODE/screen` — top questions, highlighted question, current poll, QR code to join.

## Permissions

| Action | Admin | Event host | Participant |
|---|---|---|---|
| Create an event | ✅ | — | — |
| Host an event (moderate, polls, screen, end) | ✅ all | ✅ own event | — |
| Set / reset a host password | ✅ | — | — |
| Delete an event | ✅ | — | — |
| Ask, upvote, react, vote in polls | ✅ | ✅ | ✅ |

Host passwords are stored hashed (scrypt). Resetting one rotates the event's host key, which signs out current hosts. The admin password also works as a host password on any event.

## Features (v2.0)
- **Post-event deliverable**: CSV export (questions with session, votes, notes, merged duplicates, polls, audience stats), host answer/note on each question, merge duplicates (votes are combined, a device is never counted twice), end-of-event statistics (participants, peak online, votes, poll responses, activity peak and timeline).
- **6 poll formats**: single choice, multiple choice, live word cloud, rating 1–5, NPS 0–10, open question — each with an optional "hide results until the poll closes", all rendered on the projection screen.
- **Prepared polls**: hosts prepare polls before the event (invisible to participants), edit them, and launch each one in one click.
- **Event-long NPS**: every event gets an NPS open for the whole meetup (not closed by other polls; participants can change their score; results hidden until closed).
- **Live audience chart**: per minute, people connected at the same time, active participants and interactions, with peaks, engagement rate, hover details and a data table; can be shown on the projection screen.
- **French / English** interface (auto-detected, switchable).
- **Security & hygiene**: no default admin password (the server refuses to start without one), rate limiting, daily backups, atomic writes, refuses to start if the data folder is not writable, tests + CI.

## Environment variables
| Variable | Purpose | Default |
|---|---|---|
| `ADMIN_PASSWORD` | Admin password — **required** (min. 8 characters), the server refuses to start without it | — |
| `PORT` | Listening port inside the app | `3000` |
| `DATA_DIR` | Folder for `data.json` and `backups/` (persist it) | app folder |
| `BASE_PATH` | Sub-path when served under e.g. `/v2.0` | empty (root) |
| `TRUST_PROXY` | `1` = read the client IP from `X-Real-IP` / `X-Forwarded-For` (behind nginx) | `0` (`1` in docker-compose) |
| `RATE_LIMIT_PER_MIN` | Writes (questions, votes, poll answers) per minute per IP **and device** → 429 above | `30` |
| `LOGIN_LIMIT_PER_MIN` | Sign-in attempts per minute per IP | `10` |
| `IP_LIMIT_PER_MIN` | All writes per minute per IP (whole room behind one Wi-Fi) | `600` |
| `BACKUP_KEEP` | Daily backups kept | `14` |
| `DEMO_RESET_EVENTS` | Codes of public demo events that reset automatically and lock end/close/moderation for hosts (e.g. `K4ARN`) | empty (none) |
| `DEMO_RESET_MIN` | Reset interval of those demos, in minutes | `30` |
| `GOOGLE_CLIENT_ID` | Google OAuth **Web** client ID — enables self-service registration at `/register` (Google sign-in, terms acceptance) | empty (disabled) |
| `REQUIRE_PRO_EMAIL` | `1` = refuse consumer mailboxes (Gmail, Outlook, Free…) at registration | off |
| `MAX_SPACES_PER_EMAIL` | Active spaces allowed per organiser | `3` |
| `HOST_PORT` | Host port used by `docker-compose.yml` (bound to 127.0.0.1) | `3000` |

Rate limiting is per IP **and** device on purpose: at a meetup, the whole room usually shares one public IP, so a strict per-IP limit would block everyone.

## Backups and restore
A snapshot of `data.json` is written to `DATA_DIR/backups/data-YYYY-MM-DD.json` at startup and refreshed every 6 hours (one file per day, `BACKUP_KEEP` kept). To restore:
```bash
docker compose stop
docker compose run --rm --entrypoint sh meetup-qa -c 'cp /data/backups/data-2026-11-24.json /data/data.json'
docker compose start
```

## Tests
```bash
npm test          # node:test, no dependencies
```
GitHub Actions runs the tests on Node 18 and 22, builds the Docker image and smoke-tests it on every push.

## Option A — Docker (recommended)
```bash
cp .env.example .env     # set ADMIN_PASSWORD (required)
docker compose up -d --build
```
Data lives in the `qa-data` volume. Health check: `GET /healthz`.

## Option B — Node + systemd
```bash
sudo mkdir -p /opt/meetup-qa && sudo cp -r server.js package.json public /opt/meetup-qa/
sudo cp meetup-qa.service /etc/systemd/system/   # edit ADMIN_PASSWORD
sudo systemctl enable --now meetup-qa
```

## Option C — PaaS (Render, Railway, Fly.io…)
Deploy the repo (Dockerfile or `npm start`), set `ADMIN_PASSWORD`, and mount a persistent disk at `/data` (`DATA_DIR=/data`). Without a persistent disk, events are lost on every redeploy.

## HTTPS
Put a reverse proxy in front (see `nginx.conf.example`). Important: `proxy_buffering off`, otherwise real-time updates won't work. The QR code uses the site address; over HTTPS it works on every phone.

## Limitations
- Single instance (real-time state is in memory) — no horizontal scaling.
- One vote per device (ID stored in the browser), not per person.
- The QR code is generated in the browser via cdnjs (internet required).

## License

Copyright © 2026 **ORBii SAS**.

This program is free software, released under the **[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html)** only (`AGPL-3.0-only`, see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE)). It comes **without any warranty**. In short (the license text prevails):

- ✅ **You may use, study, modify and share it for any purpose, including commercially.**
- 🔁 If you distribute it, modified or not, you must do so under the same license, with the source code and the copyright notices.
- 🌐 If you **modify it and let users interact with it over a network** (hosted or SaaS use), you must offer those users the source code of your version (section 13). Point the "source code" links of the website and of the application to it.
- 💼 **Commercial license**: if you cannot meet these obligations, ORBii SAS can grant a separate license: **info@orbii.tech**

**Hosted service.** The license covers the software. Using the service operated by ORBii SAS at interact.orbii.tech is governed by its [terms of use](https://interact.orbii.tech/terms).

**Trademarks.** No rights are granted under trademark law for the ORBii name and logo (AGPL section 7(e)). You may not use them to brand, endorse or promote your own products or services without prior written permission.

**Earlier versions.** Versions published before this change of license (including the releases up to v2.8.0) were distributed under the PolyForm Noncommercial License 1.0.0, which continues to apply to copies obtained under it.
