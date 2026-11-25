# Meetup Q&A (ORBii Interact)
# Copyright (c) 2026 ORBii SAS.
# SPDX-License-Identifier: AGPL-3.0-only
# Licensed under the GNU Affero General Public License v3.0 (see LICENSE and NOTICE).
# A separate commercial license is available from ORBii SAS: info@orbii.tech
# https://www.gnu.org/licenses/agpl-3.0.html

FROM node:22-alpine
WORKDIR /app
COPY LICENSE NOTICE ./
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
