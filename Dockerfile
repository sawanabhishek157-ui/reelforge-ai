# syntax=docker/dockerfile:1.7
# Single-image deploy of ReelForge AI. Includes Node 22, ffmpeg and Chromium so
# Remotion can render server-side.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DB_PATH=/data/reelforge.db
ENV REMOTION_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# Install ffmpeg + Chromium + the system libs Chromium needs
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      ca-certificates \
      fonts-liberation \
      chromium \
      libnss3 \
      libatk1.0-0 \
      libatk-bridge2.0-0 \
      libxss1 \
      libxshmfence1 \
      libgbm1 \
      libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the full app — Remotion's CLI is spawned from node_modules at runtime
COPY --from=builder /app/.next             ./.next
COPY --from=builder /app/node_modules      ./node_modules
COPY --from=builder /app/public            ./public
COPY --from=builder /app/src               ./src
COPY --from=builder /app/package.json      ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next.config.ts    ./next.config.ts
COPY --from=builder /app/remotion.config.ts ./remotion.config.ts
COPY --from=builder /app/tsconfig.json     ./tsconfig.json
COPY --from=builder /app/postcss.config.mjs ./postcss.config.mjs

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]
