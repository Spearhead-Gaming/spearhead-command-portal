# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./

# Install all dependencies without executing lifecycle scripts.
# Prisma generation happens explicitly in the builder/worker stages
# after the Prisma configuration and schema are available.
RUN npm ci --include=dev --ignore-scripts


FROM deps AS builder

WORKDIR /app

# Prisma configuration and schema must exist before prisma generate.
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN npx prisma generate

# Copy the application source.
COPY . .

RUN mkdir -p public

RUN npm run build


FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 nextjs \
  && mkdir -p /app/storage \
  && chown -R nextjs:nodejs /app/storage

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]


FROM deps AS worker

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Prisma configuration and schema must exist before prisma generate.
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN npx prisma generate

COPY . .

RUN mkdir -p /app/storage \
  && chown -R node:node /app/storage

USER node

CMD ["npm", "run", "gateway:start"]