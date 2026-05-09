# Realtime event hub

Demo of a **high-throughput event ingestion pipeline** with **live observability**: HTTP ingest → **Redis Streams** → background **worker** (batched writes) → **Postgres**, plus a **React dashboard** fed by **WebSockets** and historical **timeseries** from the database.

## Goals

- **Decouple ingest from persistence** — the API accepts events quickly (writes to a stream); the worker persists in configurable batches so spikes don’t force synchronous DB work on the request path.
- **Observe the pipeline in real time** — published vs persisted counts, last flush size/time, and events-per-minute from Postgres.
- **Room to grow** toward full SRE-style monitoring (HTTP error rates, consumer lag, explicit worker/DB health); see [Observability scope](#observability-scope).

## Architecture

```mermaid
flowchart LR
  Client[Clients] -->|POST /events| API[API]
  API -->|XADD| Redis[(Redis Streams)]
  Redis -->|consumer group| Worker[Worker]
  Worker -->|batch INSERT| PG[(Postgres)]
  API -->|metrics pub/sub + WS| Dash[Dashboard]
  Dash -->|GET timeseries| API
```

- **Published (API → Redis)** — events accepted and appended to the stream.
- **Persisted (worker → Postgres)** — events successfully written by the worker.
- **Last batch** — size and timestamp of the **most recent** completed flush (not an in-flight buffer).
- **Chart** — aggregated event counts by time bucket from Postgres (`/metrics/timeseries`).

## Repository layout

| Path | Role |
|------|------|
| `packages/shared` | Zod schemas and shared types (`@reh/shared`) |
| `services/api` | Express HTTP + WebSocket metrics hub |
| `services/worker` | Redis stream consumer, batch persist |
| `apps/dashboard` | Vite + React UI |
| `infra/postgres` | DB init SQL |

## Prerequisites

- **Node.js ≥ 20**
- **Docker** (for Compose) or local Postgres + Redis

## Run with Docker Compose

From the repo root:

```bash
docker compose up --build
```

Default URLs:

| Service | URL / port |
|---------|------------|
| Dashboard | http://localhost:5173 |
| API | http://localhost:3000 |
| Postgres (host) | `localhost:5433` → container `5432` |
| Redis | `localhost:6379` |

Postgres is mapped to host port **5433** to avoid clashing with a local Postgres on `5432`. Inside Docker, `api` and `worker` still use `postgres:5432`.

### Smoke test

```bash
curl -sS http://localhost:3000/health
curl -sS -X POST http://localhost:3000/events \
  -H 'Content-Type: application/json' \
  -d '{"eventType":"demo","payload":{}}'
```

Expect `202` with `accepted: true`. Counters on the dashboard should move after the worker flushes.

## Local development (Node + Docker for infra)

1. Start data stores only:

   ```bash
   docker compose up -d postgres redis
   ```

2. Copy env and point `DATABASE_URL` at the **host** port for Postgres:

   ```bash
   cp .env.example .env
   # DATABASE_URL=postgres://events:events@localhost:5433/events
   ```

3. Load env for services that don’t load `.env` automatically:

   ```bash
   set -a && source .env && set +a
   ```

4. Install and run (separate terminals for API and worker; dashboard reads `apps/dashboard/.env` for `VITE_*`):

   ```bash
   npm install
   npm run dev:api
   npm run dev:worker
   ```

   For the dashboard, symlink or copy `VITE_*` into `apps/dashboard/.env`, then:

   ```bash
   npm run dev:dashboard
   ```

## HTTP API (summary)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness JSON |
| `POST` | `/events` | Ingest body: `{ "eventType": string, "payload"?: object, "occurredAt"?: ISO date }` → `202` + stream id |
| `GET` | `/metrics/timeseries` | Query: `from`, `to` (ISO), `bucket` (`minute` \| `hour`), optional `eventType` |

WebSocket: connect to `ws://localhost:3000/ws` (or `VITE_WS_URL` in the dashboard) for metrics broadcasts.

## Observability scope

**Implemented today**

- Live **published** / **persisted** totals and **last batch** metadata over WebSockets.
- **Historical throughput** from Postgres (minute/hour buckets).
- Container **healthchecks** for Postgres and Redis in Compose.

**Not implemented (natural extensions)**

- Per-route **HTTP success vs 4xx/5xx** rates and latency histograms on the dashboard.
- **Consumer lag** (pending messages length / idle time) and explicit **worker heartbeat**.
- **Divergence alerts** when persisted falls behind published for too long.

Treat those as product/README follow-ups if you want the UI to match full “SLO + pipeline health” wording.

## Scripts (root)

```bash
npm run build          # shared, api, worker, dashboard
npm run dev:api
npm run dev:worker
npm run dev:dashboard
```

## License

Private / demo — add a `LICENSE` if you open-source the repo.
