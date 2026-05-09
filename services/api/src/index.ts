import http from "node:http";
import { WebSocketServer } from "ws";
import { Redis } from "ioredis";
import { Pool } from "pg";
import type { MetricsBroadcast } from "@reh/shared";
import { metricsBroadcastSchema } from "@reh/shared";
import { loadConfig } from "./config/env.js";
import { IngestEventUseCase } from "./application/ingest-event.use-case.js";
import { RedisStreamEventPublisher } from "./infrastructure/redis/redis-stream-event-publisher.js";
import { RedisMetricsSnapshotStore } from "./infrastructure/redis/redis-metrics-snapshot-store.js";
import { createHttpApp } from "./infrastructure/http/create-app.js";
import { WsMetricsHub } from "./infrastructure/websocket/ws-metrics-hub.js";
import { TimeseriesRepository } from "./infrastructure/postgres/timeseries-repository.js";
import { startMetricsFanout } from "./infrastructure/redis/redis-metrics-fanout.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const redis = new Redis(config.redis.url, { maxRetriesPerRequest: 3 });
  const publisher = new RedisStreamEventPublisher(
    redis,
    config.redis.streamKey,
  );
  const snapshots = new RedisMetricsSnapshotStore(redis);
  const wsHub = new WsMetricsHub();

  const ingest = new IngestEventUseCase(publisher, snapshots, {
    broadcast: (msg) => {
      const parsed = metricsBroadcastSchema.safeParse(msg);
      if (!parsed.success) return;
      wsHub.broadcast(parsed.data);
    },
  });

  const pool = new Pool({
    connectionString: config.postgres.url,
    max: 20,
    idleTimeoutMillis: 30_000,
  });
  const timeseries = new TimeseriesRepository(pool);

  const app = createHttpApp({
    ingestEvent: ingest,
    timeseries,
    corsOrigin: config.api.corsOrigin,
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    wsHub.add(socket);
    void snapshots.getSnapshot().then((data) => {
      const hello: MetricsBroadcast = { type: "metrics", data };
      socket.send(JSON.stringify(hello));
    });
  });

  const fanout = await startMetricsFanout({
    redisUrl: config.redis.url,
    metricsChannel: config.redis.metricsChannel,
    snapshots,
    wsHub,
  });

  server.listen(config.api.port, () => {
    // eslint-disable-next-line no-console
    console.log(`api listening on :${config.api.port}`);
  });

  const shutdown = async (): Promise<void> => {
    await fanout.stop();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    wss.close();
    redis.disconnect();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main();
