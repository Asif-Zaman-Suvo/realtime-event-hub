import type { Redis } from "ioredis";

const KEYS = {
  published: "metrics:published:count",
  lastPublish: "metrics:published:lastAt",
  persisted: "metrics:persisted:count",
  lastBatchAt: "metrics:persisted:lastBatchAt",
  lastBatchSize: "metrics:persisted:lastBatchSize",
} as const;

import type { MetricsSnapshotStore } from "../../application/ports/metrics-snapshot.port.js";

export class RedisMetricsSnapshotStore implements MetricsSnapshotStore {
  constructor(private readonly redis: Redis) {}

  async incrementPublished(): Promise<void> {
    const now = Date.now().toString();
    const pipeline = this.redis.multi();
    pipeline.incr(KEYS.published);
    pipeline.set(KEYS.lastPublish, now);
    await pipeline.exec();
  }

  async applyPersistedDelta(
    count: number,
    batchAtIso: string,
    batchSize: number,
  ): Promise<void> {
    const pipeline = this.redis.multi();
    pipeline.incrby(KEYS.persisted, count);
    pipeline.set(KEYS.lastBatchAt, batchAtIso);
    pipeline.set(KEYS.lastBatchSize, String(batchSize));
    await pipeline.exec();
  }

  async getSnapshot(): Promise<{
    totalPublished: number;
    lastPublishAt?: string;
    totalPersisted: number;
    lastBatchAt?: string;
    lastBatchSize: number;
  }> {
    const [published, lastPub, persisted, lastBatchAt, lastBatchSize] =
      await this.redis.mget(
        KEYS.published,
        KEYS.lastPublish,
        KEYS.persisted,
        KEYS.lastBatchAt,
        KEYS.lastBatchSize,
      );
    return {
      totalPublished: Number(published ?? 0),
      lastPublishAt: lastPub
        ? new Date(Number(lastPub)).toISOString()
        : undefined,
      totalPersisted: Number(persisted ?? 0),
      lastBatchAt: lastBatchAt ?? undefined,
      lastBatchSize: Number(lastBatchSize ?? 0),
    };
  }
}
