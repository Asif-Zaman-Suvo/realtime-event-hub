import { Redis } from "ioredis";
import { Pool } from "pg";
import { loadWorkerConfig } from "./config/env.js";
import { ProcessEventBatchesLoop } from "./application/process-event-batches.loop.js";
import { RedisStreamConsumer } from "./infrastructure/redis/redis-stream-consumer.js";
import { PostgresBatchWriter } from "./infrastructure/postgres/postgres-batch-writer.js";

async function main(): Promise<void> {
  const config = loadWorkerConfig();
  const redis = new Redis(config.redis.url, { maxRetriesPerRequest: 3 });
  const pool = new Pool({
    connectionString: config.postgres.url,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

  const loop = new ProcessEventBatchesLoop(
    redis,
    pool,
    new RedisStreamConsumer(redis),
    new PostgresBatchWriter(),
    {
      streamKey: config.redis.streamKey,
      group: config.redis.consumerGroup,
      consumer: config.worker.consumerName,
      batchSize: config.worker.batchSize,
      flushIntervalMs: config.worker.flushIntervalMs,
      blockMs: config.worker.blockMs,
      metricsChannel: config.redis.metricsChannel,
    },
  );

  const controller = new AbortController();
  const shutdown = (): void => {
    controller.abort();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await loop.run(controller.signal);
  } finally {
    redis.disconnect();
    await pool.end();
  }
}

void main();
