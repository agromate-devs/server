# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

# ---------- Runtime stage ----------
FROM node:${NODE_VERSION}-alpine AS runtime

RUN apk add --no-cache python3 make g++ openssl tini openssl \
    && addgroup -S agromate \
    && adduser -S -D -G agromate -h /home/agromate -s /sbin/nologin agromate

WORKDIR /app

ENV NODE_ENV=production \
    DATABASE_URL="file:/app/data/agromate.db"


COPY package.json package-lock.json prisma.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public
COPY prisma ./prisma

RUN npm ci --include=dev && npm cache clean --force

# prisma generate does not connect to the DB, the URL is only a placeholder
RUN npx prisma generate

# Only the directories the server writes to are owned by the runtime user
RUN mkdir -p /app/data/profile_pictures /app/public/plants \
    && chown -R 100:101 /app/data /app/public/plants

USER 100:101

VOLUME ["/app/data", "/app/public"]

EXPOSE 3000

# busybox wget ships with the alpine base image
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/health || exit 1

# Migrations and seed run at container start (not at build time), because the SQLite file
# lives in the /app/data volume, which may be a bind mount of a local database.
# The seed runs non-interactively: new plants are inserted, existing ones are never overwritten.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/validatePlants.ts && npx tsx prisma/seed.ts && exec npx tsx src/index.ts"]
