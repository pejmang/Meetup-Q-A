# Meetup Q&A (ORBii Interact)
# Copyright (c) 2026 ORBii SAS. All rights reserved.
# Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE and NOTICE): free for any noncommercial use.
# Commercial use requires a separate license from ORBii SAS: info@orbii.tech
# https://polyformproject.org/licenses/noncommercial/1.0.0

FROM node:22-alpine
WORKDIR /app
COPY package.json server.js demo.js register.js ./
COPY public ./public
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
# /data must be writable by the unprivileged user, otherwise nothing is persisted
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "server.js"]
