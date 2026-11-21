# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Agromate Server is the backend for the Agromate plant-management app. It is a Fastify 5 + TypeScript (ESM) REST API that manages users, plants, wishlists, webcams and "Agrosmart" devices (ESP-based plant controllers, identified by MAC address). It talks to three external systems:

- **SQLite via Prisma 7** for relational data (users, sessions, plants, agrosmarts, webcams, …).
- **Mosquitto (MQTT)** to push config/commands to devices and to manage broker credentials/ACLs.
- **InfluxDB 2** for time-series sensor metrics, which are ingested by **Telegraf**, not by this server.

`README.md` describes the project for users and contributors (features, Docker, local development, `.env` variables). The general contributor guide for all Agromate repos lives on the website (`docs/contributing/contributing_code.en.md` in the `website` repo): keep it in sync when the layout, commands or checks here change.

## Commands

```bash
npm install
npx prisma generate                 # generates the client into ./generated/prisma (required before running)
npx prisma migrate dev --name <x>   # create + apply a migration after editing prisma/schema.prisma
npx prisma migrate deploy           # apply pending migrations
npm run seed                        # seed:validate, then prisma/seed.ts (loads prisma/seed/plants.json)
npm run seed:validate:strict        # catalog validator, fails on warnings too (what CI runs)
npm run dev                         # tsx src/index.ts, listens on 0.0.0.0:3000
npx tsc --noEmit -p . 2>&1 | grep '^src/'   # typecheck; errors under node_modules are pre-existing noise
```

There is no test suite and no linter configured. Swagger UI is served at `/docs`. Mosquitto, InfluxDB and Telegraf are **not** defined in this repo: their `docker-compose.yaml`, `mosquitto.conf`, `telegraf.conf` and ACL setup are documented in the website docs (*First steps*, `docs/getting_started/first_steps.en.md`).

Configuration comes from `.env`, loaded via `import 'dotenv/config'` in `startServer.ts`, in the notifier worker and in `prisma.config.ts`. Variables actually read by the code: `DATABASE_URL`, `JWT_SECRET`, `MQTT_URL`, `MQTT_PASSWORD`, `INFLUX_HOST`, `INFLUX_TOKEN`, `INFLUX_BUCKET`, `INFLUX_ORG`, `TURN_URL`, `TURN_SECRET`, `MAX_IMAGE_SIZE`, `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM`, `RESET_PASSWORD_URL`, `NOTIFICATION_COOLDOWN_MINUTES` (default 360), `AGROSMART_CACHE_TTL_MS` (default 900000), `ALERT_DRY_RUN` (`true` = log notifications instead of sending them). When adding one, also add it to `.env` and to the README table.

The tracked `.env` contains **example values only** (it is also listed in `.gitignore`, which has no effect on a tracked file). Local real values are kept out of commits with `git update-index --skip-worktree .env`: never stage real secrets. The Firebase service account is not an env var: it is the fixed file `./firebase-service-account.json` (ignored by `*service-account*.json`).

## Architecture

### Request pipeline
`src/index.ts` → `src/app/startServer.ts`: creates the Fastify app and Prisma client (`src/app/utils.ts`), registers plugins (CORS, formbody, static `public/`, Swagger), then routes, then the auth hook.

### Routes
Each resource lives in `src/routes/<resource>/` with one file per HTTP method (`<resource>.get.ts`, `.post.ts`, …) exporting a function `(fastify, prisma) => void` that calls `fastify.<method>(path, { schema }, handler)`. A `<resource>.routes.ts` aggregates them and is wired in `src/routes/index.ts`. Every route declares a full JSON schema (headers, querystring/body, responses), and that schema drives both validation and Swagger. Fastify **serializes responses through the response schema**, so a field that is missing from the response schema is silently dropped from the output. When you add returned fields, update the schema too. Responses use the shape `{ success: boolean, message?: string, data?: ... }`.

### Authentication
`GET /login` takes HTTP Basic credentials (`parseBasicAuth` in `utils.ts`), creates a `Session` row (UUID token, 1 month) and also returns a 12h JWT signed with `JWT_SECRET`. `src/app/authHooks.ts` adds a global `preHandler` that validates the `Authorization` header (optionally `Bearer `-prefixed) against the `Session` table (`validateAndExtractUsername`) and sets `request.user` to the username; the JWT is not used for API auth. Routes whose first path segment is in `noAuthRoutes` skip auth; add new public endpoints there. Handlers must enforce ownership themselves, e.g. `prisma.agrosmart.findFirst({ where: { macAddress: id, username: request.user } })` → 403.

### MQTT (`src/app/mqtt.ts`)
`MqttService.getClient()` is a singleton connecting as `api_server`. The broker uses the Mosquitto **dynamic-security plugin**. The server creates and deletes broker clients and roles at runtime by publishing commands to `$CONTROL/dynamic-security/v1` (users on registration, `agrosmart_<mac>` clients on pairing, per-webcam roles). The base roles (e.g. `agrosmart`, `telegraf_consumer`) are set up on the broker as described in the website *First steps* page, not in this repo.

Device topics:
- `agrosmart/<mac>/settings`: the server publishes `{type: "config", ...PlantConfig}` (retained) on create/patch and `{type: "control", hydrate, humidify}` (not retained) from `agrosmart_control`.
- `agrosmart/metrics`: devices publish JSON with `id` and a `type`: `metric` for sensor readings (`temperature`, `humidity`, `soil_moisture`, `last_irrigation`, `water_reserve`, …), `irrigation` / `humidification` for action events. Messages without `type` come from older firmware and are treated as metrics (`notificationRules.ts`).
- `webrtc/<webcamId>/#`: WebRTC signaling for webcams. `/turn` issues TURN credentials.

### Metrics flow
Device → MQTT `agrosmart/metrics` → Telegraf (`telegraf.conf` from the deployment, not in this repo; measurement `mqtt_consumer`, tag `id`) → InfluxDB → Flux queries in `src/routes/agrosmart_metrics/` (via `InfluxDBConnector.getQueryClient()` in `src/app/influxdb.ts`). Adding a new sensor field usually needs two changes:
1. Telegraf's `json` parser keeps only numeric values by default, so string and **boolean** fields must be listed in `json_string_fields`. Restart the Telegraf container after editing the config.
2. Add the field to the Flux `keep(columns: [...])` and to the route's response schema.

### Push notifications
`src/workers/metricsNotifier.ts` starts a worker thread (`metricsNotifier.worker.ts`) after `listen`, **only if `./firebase-service-account.json` exists** (otherwise it logs a warning and notifications are disabled); a crashed worker is restarted after 5s. The worker has its own MQTT connection (user `api_server`, clientId `api_server_notifier_*`) subscribed to `agrosmart/metrics` and its own Prisma client. Its logs are forwarded to the Fastify logger. For each message it resolves the owner (cached for `AGROSMART_CACHE_TTL_MS`, default 15 min). Metrics are evaluated by the rules in `notificationRules.ts` against the agrosmart `plantConfig` (alert types `water_reserve`, `temperature_low`, `temperature_high`) with an in-memory per-device/per-alert cooldown (`NOTIFICATION_COOLDOWN_MINUTES`); `irrigation`/`humidification` events notify once per action, without cooldown. With `ALERT_DRY_RUN=true` `getMessaging()` returns null and notifications are only logged. Notifications are sent through FCM (`src/app/firebase.ts`) to the user's `FcmInstallation`s (Firebase Installation IDs), deleting the FIDs FCM reports as invalid. The app registers/unregisters its FID via `POST`/`DELETE /fcm_installation`.

### Plant configuration
`preparePlantConfiguration` in `src/app/utils.ts` validates an Agrosmart body into a `PlantConfig`. Irrigation is either time-based or soil-moisture-based, and humidification is either time-based or humidity-based. The result is stored as JSON in `Agrosmart.plantConfig` and published to the device. Global types (`User`, `PlantEntry`, `PlantConfig`, `AgrosmartBody`, …) are declared in `src/app.d.ts`.

### Plant catalog seed
`prisma/seed/plants.json` (`{ version, plants: [...] }`) is the default catalog, checked by `prisma/validatePlants.ts` (CI: `.github/workflows/validate-seed.yml`, strict mode, on changes to the JSON or the validator). `prisma/seed.ts` matches seed plants by `Plant.idSeed` (user-added plants have `idSeed = NULL` and are never touched), stores the applied version in the `SeedVersion` table and only checks plants that are missing or whose `lastUpdate` is newer than it. Flags: `--all` (check every plant), `--force` (ignore the stored version), `--yes`/`-y` (update without asking). Images go in `public/plants/`.

### Plant docs link
`Plant.docsArticle` (e.g. `"basil"`, set in `prisma/seed/plants.json`) is the plant's article on the website docs. The API returns only the name: clients build the URL (`https://agromate-devs.github.io/website/docs?article=<docsArticle>`).

### Static/OTA files
`public/` is served statically: plant images in `public/plants/`, `reset_password.html`, and `version.txt` / `agrosmart.bin` for device firmware OTA. These are public routes.

### Deployment
`Dockerfile` (Node 24 alpine, published as `andreockx/agromate-server`) runs `prisma generate` at build time, runs as an unprivileged user and uses SQLite at `/app/data/agromate.db` (volumes `/app/data` and `/app/public`). At container start (`CMD`, under `tini`) it runs `prisma migrate deploy`, `validatePlants.ts`, `seed.ts` (non-interactive: new plants inserted, existing ones never overwritten) and then `tsx src/index.ts`. Port 3000, health check `GET /health`.