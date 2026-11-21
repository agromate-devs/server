# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Agromate Server is the backend for the Agromate plant-management app. It is a Fastify 5 + TypeScript (ESM) REST API that manages users, plants, wishlists, webcams and "Agrosmart" devices (ESP-based plant controllers, identified by MAC address). It talks to three external systems:

- **SQLite via Prisma 7** for relational data (users, sessions, plants, agrosmarts, webcams, …).
- **Mosquitto (MQTT)** to push config/commands to devices and to manage broker credentials/ACLs.
- **InfluxDB 2** for time-series sensor metrics, which are ingested by **Telegraf**, not by this server.

`README.md` is the unmodified Prisma Fastify example template and does not describe this project.

## Commands

```bash
npm install
npx prisma generate                 # generates the client into ./generated/prisma (required before running)
npx prisma migrate dev --name <x>   # create + apply a migration after editing prisma/schema.prisma
npx prisma migrate deploy           # apply pending migrations (what tmp.sh does in the container)
npm run dev                         # tsx src/index.ts, listens on 0.0.0.0:3000
npx tsc --noEmit -p . 2>&1 | grep '^src/'   # typecheck; errors under node_modules are pre-existing noise
docker compose up -d                # influxdb, mosquitto, telegraf (the API itself is built from Dockerfile)
```

There is no test suite and no linter configured. Swagger UI is served at `/docs`.

Configuration comes from `.env` (loaded via `dotenv`): `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `MQTT_URL`, `MQTT_PASSWORD`, `INFLUX_HOST`, `INFLUX_TOKEN`, `INFLUX_BUCKET`, `INFLUX_ORG`, `TURN_URL`, `TURN_SECRET`, `MAX_IMAGE_SIZE`, `SMTP_*`, `RESET_PASSWORD_URL`, `FIREBASE_SERVICE_ACCOUNT` (path to the service account JSON; if unset, push notifications are only logged), `NOTIFICATION_COOLDOWN_MINUTES` (default 360).

## Architecture

### Request pipeline
`src/index.ts` → `src/app/startServer.ts`: creates the Fastify app and Prisma client (`src/app/utils.ts`), registers plugins (CORS, formbody, static `public/`, Swagger), then routes, then the auth hook.

### Routes
Each resource lives in `src/routes/<resource>/` with one file per HTTP method (`<resource>.get.ts`, `.post.ts`, …) exporting a function `(fastify, prisma) => void` that calls `fastify.<method>(path, { schema }, handler)`. A `<resource>.routes.ts` aggregates them and is wired in `src/routes/index.ts`. Every route declares a full JSON schema (headers, querystring/body, responses), and that schema drives both validation and Swagger. Fastify **serializes responses through the response schema**, so a field that is missing from the response schema is silently dropped from the output. When you add returned fields, update the schema too. Responses use the shape `{ success: boolean, message?: string, data?: ... }`.

### Authentication
`src/app/authHooks.ts` adds a global `preHandler` that validates the `Authorization` header (optionally `Bearer `-prefixed) against the `Session` table and sets `request.user` to the username. Routes whose first path segment is in `noAuthRoutes` skip auth; add new public endpoints there. Handlers must enforce ownership themselves, e.g. `prisma.agrosmart.findFirst({ where: { macAddress: id, username: request.user } })` → 403.

### MQTT (`src/app/mqtt.ts`)
`MqttService.getClient()` is a singleton connecting as `api_server`. The broker uses the Mosquitto **dynamic-security plugin**. The server creates and deletes broker clients and roles at runtime by publishing commands to `$CONTROL/dynamic-security/v1` (users on registration, `agrosmart_<mac>` clients on pairing, per-webcam roles). `rules.json` / `dynsec.json` hold the base roles (e.g. `agrosmart`, `telegraf_consumer`).

Device topics:
- `agrosmart/<mac>/settings`: the server publishes `{type: "config", ...PlantConfig}` (retained) on create/patch and `{type: "control", hydrate, humidify}` (not retained) from `agrosmart_control`.
- `agrosmart/metrics`: devices publish sensor JSON (`id`, `temperature`, `humidity`, `soil_moisture`, `last_irrigation`, `water_reserve`, …).
- `webrtc/<webcamId>/#`: WebRTC signaling for webcams. `/turn` issues TURN credentials.

### Metrics flow
Device → MQTT `agrosmart/metrics` → Telegraf (`telegraf/telegraf.conf`, measurement `mqtt_consumer`, tag `id`) → InfluxDB → Flux queries in `src/routes/agrosmart_metrics/` (via `InfluxDBConnector.getQueryClient()` in `src/app/influxdb.ts`). Adding a new sensor field usually needs two changes:
1. Telegraf's `json` parser keeps only numeric values by default, so string and **boolean** fields must be listed in `json_string_fields`. Restart the Telegraf container after editing the config.
2. Add the field to the Flux `keep(columns: [...])` and to the route's response schema.

### Push notifications
`src/workers/metricsNotifier.ts` starts a worker thread (`metricsNotifier.worker.ts`) after `listen`. The worker has its own MQTT connection (user `api_server`, clientId `api_server_notifier_*`) subscribed to `agrosmart/metrics` and its own Prisma client. Its logs are forwarded to the Fastify logger. For each metric it resolves the owner (cached for 60s), evaluates the rules in `notificationRules.ts` against the agrosmart `plantConfig` (water reserve, temperature outside `temperatureMin`/`temperatureMax`), applies an in-memory per-device/per-alert cooldown and sends through FCM (`src/app/firebase.ts`) to the user's `FcmInstallation`s (Firebase Installation IDs), deleting the FIDs FCM reports as invalid. The app registers/unregisters its FID via `POST`/`DELETE /fcm_installation`.

### Plant configuration
`preparePlantConfiguration` in `src/app/utils.ts` validates an Agrosmart body into a `PlantConfig`. Irrigation is either time-based or soil-moisture-based, and humidification is either time-based or humidity-based. The result is stored as JSON in `Agrosmart.plantConfig` and published to the device. Global types (`User`, `PlantEntry`, `PlantConfig`, `AgrosmartBody`, …) are declared in `src/app.d.ts`.

### Plant docs link
`Plant.docsArticle` (e.g. `"basil"`, set in `prisma/seed/plants.json`) is the plant's article on the website docs. The API returns only the name: clients build the URL (`https://agromate-devs.github.io/website/docs?article=<docsArticle>`).

### Static/OTA files
`public/` is served statically: plant images in `public/plants/`, `reset_password.html`, and `version.txt` / `agrosmart.bin` for device firmware OTA. These are public routes.

### Deployment
`Dockerfile` runs `prisma generate` at build time and starts `tsx src/index.ts` with SQLite at `/app/data/agromate.db`. `tmp.sh` is an entrypoint that runs `prisma migrate deploy` unless `SKIP_MIGRATIONS=true`. Health check: `GET /health`.