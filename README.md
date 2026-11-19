# Meetup Q&A

Live Q&A and polls for meetups and events. Zero dependencies (Node ≥ 18), real-time via Server-Sent Events, data stored in a single JSON file.

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

## Environment variables
| Variable | Purpose | Default |
|---|---|---|
| `ADMIN_PASSWORD` | Admin password — **change it** | `Admin2027` |
| `PORT` | Listening port inside the app | `3000` |
| `DATA_DIR` | Folder for `data.json` (persist it) | app folder |
| `HOST_PORT` | Host port used by `docker-compose.yml` (bound to 127.0.0.1) | `3000` |

## Option A — Docker (recommended)
```bash
cp .env.example .env     # set ADMIN_PASSWORD
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
