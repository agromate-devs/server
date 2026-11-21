# Agromate server

Backend of [Agromate](https://agromate-devs.github.io/website/), the open source smart greenhouse. It is the REST API
used by the [mobile app](https://github.com/agromate-devs/new_mobile_app) and the bridge towards the
[Agrosmart](https://github.com/agromate-devs/agrosmart) devices and the [webcams](https://github.com/agromate-devs/camera).

📖 **Documentation:** <https://agromate-devs.github.io/website/docs>

## What it does

- Users, sessions, password reset by email.
- Plant catalog and wishlist.
- Agrosmart pairing and configuration: the plant settings chosen in the app are validated and published (retained) to
  the device on `agrosmart/<MAC>/settings`, together with manual commands (water, humidify).
- Broker users and ACLs managed at runtime with the Mosquitto **dynamic security plugin** (one client per user,
  Agrosmart and webcam).
- Sensor history read from **InfluxDB**, where Telegraf stores the metrics the Agrosmarts publish on
  `agrosmart/metrics`.
- Push notifications through **Firebase Cloud Messaging** when the water tank is low or the temperature is out of range.
- Webcam registration and TURN credentials for the WebRTC streams.
- Plant images served as static files from `public/`.

## Running with Docker

The recommended setup runs the server together with Mosquitto, InfluxDB and Telegraf with Docker Compose, using the
[`andreockx/agromate-server`](https://hub.docker.com/r/andreockx/agromate-server) image. The full
`docker-compose.yaml`, the broker and Telegraf configuration and the first-run steps are in
[First steps](https://agromate-devs.github.io/website/docs?article=first_steps).

At start the container applies the database migrations, validates and loads the plant catalog (existing plants are
never overwritten) and listens on port **3000**. The database lives in the `/app/data` volume.

## Development

Requirements: Node.js 22 or later, and a running Mosquitto, InfluxDB and Telegraf (the Compose file from
[First steps](https://agromate-devs.github.io/website/docs?article=first_steps) is the quickest way to get them).

```bash
npm install
# edit .env with your values (see Configuration below)
npx prisma generate         # generates the Prisma client in ./generated/prisma
npx prisma migrate dev      # creates/updates the SQLite database
npm run seed                # validates and loads the plant catalog
npm run dev                 # http://localhost:3000
```

The API is documented with **Swagger UI** at <http://localhost:3000/docs>. Health check: `GET /health`.

Type-check with:

```bash
npx tsc --noEmit -p .
```

### Configuration

The server reads `.env` from the working directory. The one in the repository contains example values: replace them
with yours and never commit real secrets.

| Variable                                       | Description                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                                 | SQLite database, e.g. `file:./dev.db`                                         |
| `JWT_SECRET`                                   | Secret used to sign the tokens                                                |
| `MQTT_URL`, `MQTT_PASSWORD`                    | Broker URL and password of the `api_server` client                            |
| `INFLUX_HOST`, `INFLUX_TOKEN`                  | InfluxDB URL and API token                                                    |
| `INFLUX_BUCKET`, `INFLUX_ORG`                  | InfluxDB bucket and organization where Telegraf writes the metrics            |
| `TURN_URL`, `TURN_SECRET`                      | TURN server and shared secret, only needed for the webcams                    |
| `MAX_IMAGE_SIZE`                               | Maximum size of uploaded images, in bytes                                     |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`        | SMTP server used for the password reset emails                                |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`      | SMTP credentials and sender                                                   |
| `RESET_PASSWORD_URL`                           | Public URL of the reset password page                                         |
| `NOTIFICATION_COOLDOWN_MINUTES`                | Minimum time between two identical alerts for the same device (default `360`) |
| `AGROSMART_CACHE_TTL_MS`                       | Cache of the device owner in the notification worker (default `900000`)       |
| `ALERT_DRY_RUN`                                | `true` logs the push notifications instead of sending them                    |

Push notifications need a Firebase service account saved as `firebase-service-account.json` in the working directory:
without it notifications are disabled. See
[Push notifications](https://agromate-devs.github.io/website/docs?article=push_notifications).

> [!TIP]
> To keep your local values out of git, run `git update-index --skip-worktree .env` after editing it.

## Project structure

```text
src/
├── index.ts
├── app.d.ts               # global types: User, PlantEntry, PlantConfig, ...
├── app/                   # server setup, auth hook, MQTT, InfluxDB, Firebase, utilities
├── routes/
│   └── <resource>/        # one file per HTTP method + <resource>.routes.ts
└── workers/               # push notification worker (metrics → rules → FCM)
prisma/
├── schema.prisma
├── migrations/
├── seed/plants.json       # default plant catalog
├── seed.ts
└── validatePlants.ts      # catalog validator (npm run seed:validate[:strict])
public/                    # static files: plant images, reset password page, OTA files
```

Every route declares a full JSON schema, used for validation, Swagger and response serialization: fields missing from
the response schema are dropped from the output. All routes require the session token in the `Authorization` header,
except the public ones listed in `src/app/authHooks.ts`.

## Contributing

Bug reports, ideas and pull requests are welcome, including new plants for the catalog (`prisma/seed/plants.json`,
checked by the **Validate seed** workflow). Read
[Contributing to the code](https://agromate-devs.github.io/website/docs?article=contributing_code) before opening a pull
request.
