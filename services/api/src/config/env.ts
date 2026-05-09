import {
  apiConfigSchema,
  postgresConfigSchema,
  redisConfigSchema,
} from "@reh/shared";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_STREAM_KEY: z.string().optional(),
  REDIS_CONSUMER_GROUP: z.string().optional(),
  REDIS_METRICS_CHANNEL: z.string().optional(),
  DATABASE_URL: z.string().url(),
});

export type AppConfig = {
  api: z.infer<typeof apiConfigSchema>;
  redis: z.infer<typeof redisConfigSchema>;
  postgres: z.infer<typeof postgresConfigSchema>;
};

export function loadConfig(env = process.env): AppConfig {
  const parsed = envSchema.parse({ ...env });
  return {
    api: apiConfigSchema.parse({
      nodeEnv: parsed.NODE_ENV,
      port: parsed.PORT,
      corsOrigin: parsed.CORS_ORIGIN,
    }),
    redis: redisConfigSchema.parse({
      url: parsed.REDIS_URL,
      streamKey: parsed.REDIS_STREAM_KEY,
      consumerGroup: parsed.REDIS_CONSUMER_GROUP,
      metricsChannel: parsed.REDIS_METRICS_CHANNEL,
    }),
    postgres: postgresConfigSchema.parse({
      url: parsed.DATABASE_URL,
    }),
  };
}
