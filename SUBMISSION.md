# Unbox Assignment — Speedometer (Realtime)

## Architecture block diagram

```mermaid
flowchart LR
  sensorSim[SensorSimulator_1Hz] -->|"HTTP POST /api/speeds"| backend[Backend_Express]
  backend -->|"INSERT speed_samples"| db[(Postgres)]
  db -->|"Trigger NOTIFY speed_insert"| db
  backend -->|"LISTEN speed_insert"| db
  backend -->|"SSE /api/stream/speed"| ui[React_UI]
  ui -->|"GET /api/speeds?since=..."| backend
```

## What you get
- **Time series speed data** stored in Postgres (`speed_samples`).
- **Realtime UI updates** as rows are inserted into the DB, via Postgres `LISTEN/NOTIFY` → backend fanout → SSE to the browser.
- **Repeatable demo** using a 1Hz sensor simulator container that continuously inserts samples.

## Tech stack used
- **Backend**: Node.js + Express + `pg`
- **DB**: Postgres
- **Frontend**: React (CRA) using `EventSource` (SSE)
- **Runtime**: Docker + Docker Compose

## How to run (dockerized)
From the repo root:

```bash
cd /Users/saurabhpowar/unbox-task
docker compose up --build
```

Then open:
- **UI**: `http://localhost:3000`
- **Backend health**: `http://localhost:8080/healthz`

## Demo data generation (curated profile)
There are two generators:
- **Continuous simulator (looping)**: runs automatically in docker compose as the `simulator` service.
- **Deterministic “demo profile” (finite run)**: useful when you want a predictable story (accelerate → cruise → brake → stop). Implemented in `backend/scripts/generateDemoData.js` and inserts directly into Postgres (so it triggers DB `NOTIFY` → SSE updates).

Run the deterministic profile locally (requires `DATABASE_URL`):

```bash
cd /Users/saurabhpowar/unbox-task/backend
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/unbox
npm run demo:generate
```

Options (environment variables):
- `DEMO_SECONDS` (default 120)
- `DEMO_MAX_SPEED_MPS` (default 22)
- `DEMO_LIVE` (`true` inserts 1Hz with sleeps; `false` inserts instantly)
- `DEMO_CLEAR` (`true` clears existing rows first)
- `DEMO_SOURCE` (default `demo`)

## API contract

### Insert a sample
`POST /api/speeds`

Body:
```json
{ "speed_mps": 12.3, "ts": "2026-04-27T12:34:56.000Z", "source": "api" }
```

Response: inserted row `{ id, ts, speed_mps, source }`.

### Read recent samples
`GET /api/speeds?limit=60&since=<ISO8601>`

Response:
```json
{ "rows": [ { "id": 1, "ts": "...", "speed_mps": 1.23, "source": "sim" } ] }
```

### Realtime stream
`GET /api/stream/speed`

- Content-Type: `text/event-stream`
- Emits `event: speed` with JSON payload like:

```json
{ "id": 123, "ts": "2026-04-27T12:34:56.000Z", "speed_mps": 7.1, "source": "sim" }
```

## Strategy notes (seasoned-dev rationale)
- **SSE over WebSockets**: the UI only needs a server→client stream; SSE is simpler to operate (HTTP-based, plays well with proxies) and maps cleanly to “push new samples”.
- **DB-driven realtime**: Postgres trigger + `NOTIFY` ensures the UI updates whenever inserts happen in the DB, regardless of which process performed the insert. This directly addresses “update in real-time as sensor data is inserted in db”.
- **Scaling considerations**:
  - Fanout: SSE broadcast is O(clients); for large fanout you’d front the stream with a dedicated pub/sub or push service.
  - Backpressure: slow clients are dropped automatically on write errors; in production you’d add per-client buffers and stronger timeouts.
  - History: the read API is indexed by `ts` and supports time-window pagination (`since`) to avoid unbounded payloads.

