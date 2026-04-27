# Speedometer Realtime App — Detailed Documentation

This repository implements a full-stack “speedometer” demo:
- **Speed samples** are stored as a **time series** (1 row per second) in **Postgres**.
- The **UI updates in real time** as new samples are inserted into the DB.

## Repo structure

```text
unbox-task/
  backend/
    index.js
    src/
      app.js
      server.js
      routes/
        speeds.js
        stream.js
      db/
        pool.js
        listener.js
        migrate.sql
      services/
        sseHub.js
    scripts/
      migrate.js
      simulateSensor.js
      generateDemoData.js
    Dockerfile
  frontend/
    src/
      App.js
      config.js
      hooks/useSpeedStream.js
      components/
        Speedometer.js
        SpeedHistory.js
    Dockerfile
  docker-compose.yml
  SUBMISSION.md
  DOCUMENTATION.md
```

## Architecture overview

### Block diagram

```mermaid
flowchart LR
  sensorSim[SensorSimulator_1Hz] -->|"HTTP POST /api/speeds"| backend[Backend_Express]
  backend -->|"INSERT speed_samples"| db[(Postgres)]
  db -->|"Trigger NOTIFY speed_insert"| db
  backend -->|"LISTEN speed_insert"| db
  backend -->|"SSE /api/stream/speed"| ui[React_UI]
  ui -->|"GET /api/speeds?since=..."| backend
```

### Key design choice: DB-driven realtime
The requirement is “update in real time as sensor data is inserted in DB”.

To ensure that *any* insert (even if it comes from outside the backend) triggers UI updates:
- Postgres has an **AFTER INSERT trigger** on `speed_samples`
- The trigger emits a `NOTIFY speed_insert` with the newly inserted row as JSON
- The backend maintains a dedicated connection that **LISTENs** on `speed_insert`
- When a notification arrives, the backend **broadcasts** it to all connected **SSE** clients

This is implemented in:
- Trigger + function: `backend/src/db/migrate.sql`
- Listener: `backend/src/db/listener.js`
- SSE broadcast hub: `backend/src/services/sseHub.js`
- SSE route: `backend/src/routes/stream.js`

## Data model (Postgres)

Table: `speed_samples`
- `id BIGSERIAL PRIMARY KEY`
- `ts TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `speed_mps DOUBLE PRECISION NOT NULL`
- `source TEXT NOT NULL DEFAULT 'unknown'`

Index:
- `idx_speed_samples_ts` on `(ts)` for time-window reads

## Backend (Node + Express)

### Environment variables
- **`PORT`**: HTTP port (default `8080`)
- **`DATABASE_URL`**: Postgres connection string (required)

Example: see `backend/.env.example`

### Startup flow
`backend/index.js` calls `startServer()` which:
- boots Express
- starts the Postgres LISTEN loop (`LISTEN speed_insert`)

### REST endpoints

#### Health
`GET /healthz` → `{ "ok": true }`

#### Insert a speed sample
`POST /api/speeds`

Body:
```json
{ "speed_mps": 12.3, "ts": "2026-04-27T12:34:56.000Z", "source": "api" }
```

Notes:
- `speed_mps` is required and must be a number.
- `ts` is optional; when omitted the DB default `NOW()` is used.
- `source` defaults to `"api"`.

#### Read recent samples
`GET /api/speeds?limit=60&since=<ISO8601>`

Response:
```json
{
  "rows": [
    { "id": 1, "ts": "2026-04-27T12:34:56.000Z", "speed_mps": 1.23, "source": "sim" }
  ]
}
```

Notes:
- results are returned in chronological order (oldest → newest) for easy plotting.

### Realtime endpoint (SSE)
`GET /api/stream/speed`

Protocol details:
- Response headers:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache, no-transform`
  - `Connection: keep-alive`
- The backend emits named events:
  - `event: speed`
  - `data: <json>`

Example event payload:
```json
{ "id": 123, "ts": "2026-04-27T12:34:56.000Z", "speed_mps": 7.1, "source": "sim" }
```

### Backend scripts
From `unbox-task/backend`:
- `npm run migrate`
  - Applies schema + trigger from `src/db/migrate.sql`
- `npm run simulate`
  - Runs an infinite 1Hz sensor loop that posts to `POST /api/speeds`
- `npm run demo:generate`
  - Generates a deterministic demo profile (finite duration) by inserting directly into Postgres (so it triggers the DB `NOTIFY` trigger and updates the UI via SSE)
  - Profile shape (by second): accelerate (0..30s) → cruise (30..60s) → brake (60..90s) → stop (90..end)
  - Options (env vars):
    - `DEMO_SECONDS` (default `120`, max `3600`)
    - `DEMO_MAX_SPEED_MPS` (default `22`, max `60`)
    - `DEMO_LIVE` (default `true`; set `false` to insert instantly)
    - `DEMO_CLEAR` (default `false`; set `true` to delete existing rows first)
    - `DEMO_SOURCE` (default `demo`)

## Frontend (React CRA)

### Environment variables
- `REACT_APP_API_BASE_URL`
  - Defaults to `http://localhost:8080` if not set (see `frontend/src/config.js`)

Example: `frontend/.env.example`

### Data flow in the UI
- `useSpeedStream()` in `frontend/src/hooks/useSpeedStream.js`:
  - creates `new EventSource(<API_BASE_URL>/api/stream/speed)`
  - listens for `speed` events
  - updates:
    - `current` (the latest sample)
    - `history` (capped to last N samples)
  - implements a simple reconnect loop on errors

### Speedometer rendering
- `Speedometer` converts \(m/s\) to \(km/h\) (\(km/h = m/s * 3.6\))
- Needle sweep is 270° for an intuitive “dial” feel

## Running the system

### Docker Compose (recommended for demo)
From repo root:

```bash
cd /Users/saurabhpowar/unbox-task
docker compose up --build
```

Services:
- `db`: Postgres 16
- `backend`: Express API + LISTEN/NOTIFY → SSE broadcaster
- `simulator`: posts 1Hz speed samples into the backend continuously
- `frontend`: CRA dev server on port 3000

Open:
- UI: `http://localhost:3000`
- Backend: `http://localhost:8080/healthz`

### Local (without docker)
1) Start Postgres and create the `unbox` DB.
2) Backend:

```bash
cd /Users/saurabhpowar/unbox-task/backend
cp .env.example .env
npm run migrate
npm run start
```

3) Frontend:

```bash
cd /Users/saurabhpowar/unbox-task/frontend
cp .env.example .env
npm start
```

4) Start generating data:
- Infinite live feed:

```bash
cd /Users/saurabhpowar/unbox-task/backend
npm run simulate
```

- Deterministic “demo story”:

```bash
cd /Users/saurabhpowar/unbox-task/backend
DEMO_CLEAR=true DEMO_SECONDS=120 DEMO_LIVE=true npm run demo:generate
```

## Troubleshooting

### UI shows `error` status
Common causes:
- backend isn’t reachable at `REACT_APP_API_BASE_URL`
- backend is up, but SSE endpoint is blocked by a proxy or wrong URL

Checks:
- open `http://localhost:8080/healthz`
- open `http://localhost:8080/api/stream/speed` in a browser; you should see an open request (it won’t “render” a page)

### Inserts work but UI doesn’t update
This indicates the SSE stream isn’t receiving DB notifications.

Checks:
- ensure migrations ran (trigger exists) via `npm run migrate`
- ensure backend logs show: `listening for NOTIFY speed_insert`

### DB connects locally but not in docker
Use the correct `DATABASE_URL`:
- in docker compose: `postgres://postgres:postgres@db:5432/unbox`
- locally: `postgres://postgres:postgres@localhost:5432/unbox`

## Notes on production hardening (out of scope for the demo)
- Add structured logging and request IDs
- Add auth if exposing beyond local/demo networks
- Add a proper migration toolchain (or versioned migrations)
- Add per-client heartbeat/ping events and stronger timeouts
- Consider a message broker / pubsub for high fanout or multi-backend deployments

