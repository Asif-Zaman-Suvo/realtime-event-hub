import { z } from "zod";

export const ingestEventBodySchema = z.object({
  eventType: z.string().min(1).max(128),
  payload: z.record(z.string(), z.unknown()).default({}),
  occurredAt: z.coerce.date().optional(),
});

export type IngestEventBody = z.infer<typeof ingestEventBodySchema>;

export const streamEventFieldsSchema = z.object({
  eventType: z.string(),
  payloadJson: z.string(),
  occurredAtIso: z.string(),
  clientId: z.string().optional(),
  requestId: z.string().optional(),
});

export type StreamEventFields = z.infer<typeof streamEventFieldsSchema>;

export const metricsBroadcastSchema = z.object({
  type: z.literal("metrics"),
  data: z.object({
    totalPublished: z.number(),
    lastPublishAt: z.string().optional(),
    totalPersisted: z.number().optional(),
    lastBatchAt: z.string().optional(),
    lastBatchSize: z.number().optional(),
  }),
});

export type MetricsBroadcast = z.infer<typeof metricsBroadcastSchema>;

export const redisConfigSchema = z.object({
  url: z.string().url().default("redis://localhost:6379"),
  streamKey: z.string().default("events:stream"),
  consumerGroup: z.string().default("persist-workers"),
  metricsChannel: z.string().default("events:metrics"),
});

export const postgresConfigSchema = z.object({
  url: z.string().url(),
});

export const apiConfigSchema = z.object({
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  port: z.coerce.number().default(3000),
  /** Used when dashboard talks to API through browser (see VITE_API_URL) */
  corsOrigin: z.string().default("http://localhost:5173"),
});

export const workerConfigSchema = z.object({
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  consumerName: z.string().default("worker-1"),
  batchSize: z.coerce.number().min(1).max(5000).default(500),
  flushIntervalMs: z.coerce.number().min(100).default(3000),
  blockMs: z.coerce.number().min(1).default(5000),
});
