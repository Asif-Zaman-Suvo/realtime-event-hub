import {
  postgresConfigSchema,
  redisConfigSchema,
  streamEventFieldsSchema,
  workerConfigSchema,
} from "@reh/shared";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().optional(),
  REDIS_STREAM_KEY: z.string().optional(),
  REDIS_CONSUMER_GROUP: z.string().optional(),
  REDIS_METRICS_CHANNEL: z.string().optional(),
  WORKER_NAME: z.string().optional(),
  WORKER_BATCH_SIZE: z.string().optional(),
  WORKER_FLUSH_MS: z.string().optional(),
  WORKER_BLOCK_MS: z.string().optional(),
});

export type WorkerAppConfig = {
  worker: z.infer<typeof workerConfigSchema>;
  redis: z.infer<typeof redisConfigSchema>;
  postgres: z.infer<typeof postgresConfigSchema>;
};

export function loadWorkerConfig(env = process.env): WorkerAppConfig {
  const parsed = envSchema.parse({ ...env });
  return {
    worker: workerConfigSchema.parse({
      nodeEnv: parsed.NODE_ENV,
      consumerName: parsed.WORKER_NAME,
      batchSize: parsed.WORKER_BATCH_SIZE,
      flushIntervalMs: parsed.WORKER_FLUSH_MS,
      blockMs: parsed.WORKER_BLOCK_MS,
    }),
    redis: redisConfigSchema.parse({
      url: parsed.REDIS_URL,
      streamKey: parsed.REDIS_STREAM_KEY,
      consumerGroup: parsed.REDIS_CONSUMER_GROUP,
      metricsChannel: parsed.REDIS_METRICS_CHANNEL,
    }),
    postgres: postgresConfigSchema.parse({ url: parsed.DATABASE_URL }),
  };
}

export { streamEventFieldsSchema };
