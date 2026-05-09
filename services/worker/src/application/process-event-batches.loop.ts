import type { Pool } from "pg";
import type { Redis } from "ioredis";
import { streamEventFieldsSchema } from "@reh/shared";
import { PostgresBatchWriter, type PersistRow } from "../infrastructure/postgres/postgres-batch-writer.js";
import { RedisStreamConsumer, type RawStreamMessage } from "../infrastructure/redis/redis-stream-consumer.js";

function mapMessage(msg: RawStreamMessage): PersistRow | null {
  const parsed = streamEventFieldsSchema.safeParse(msg.fields);
  if (!parsed.success) return null;
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(parsed.data.payloadJson) as Record<string, unknown>;
  } catch {
    payload = { _raw: parsed.data.payloadJson };
  }
  const occurredAt = new Date(parsed.data.occurredAtIso);
  if (Number.isNaN(occurredAt.getTime())) return null;
  return {
    sourceMessageId: msg.id,
    eventType: parsed.data.eventType,
    payload,
    occurredAt,
  };
}

export class ProcessEventBatchesLoop {
  private buffer: RawStreamMessage[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing = false;

  constructor(
    private readonly redisClient: Redis,
    private readonly pool: Pool,
    private readonly reader: RedisStreamConsumer,
    private readonly writer: PostgresBatchWriter,
    private readonly opts: {
      streamKey: string;
      group: string;
      consumer: string;
      batchSize: number;
      flushIntervalMs: number;
      blockMs: number;
      metricsChannel: string;
    },
  ) {}

  async run(signal: AbortSignal): Promise<void> {
    await this.reader.ensureGroup(this.opts.streamKey, this.opts.group);
    this.flushTimer = setInterval(() => {
      void this.flush("timer");
    }, this.opts.flushIntervalMs);

    while (!signal.aborted) {
      const { messages } = await this.reader.readBatch({
        streamKey: this.opts.streamKey,
        group: this.opts.group,
        consumer: this.opts.consumer,
        count: this.opts.batchSize,
        blockMs: this.opts.blockMs,
      });
      this.buffer.push(...messages);
      if (this.buffer.length >= this.opts.batchSize) {
        await this.flush("size");
      }
    }

    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush("shutdown");
  }

  private async flush(reason: string): Promise<void> {
    if (this.flushing) return;
    if (this.buffer.length === 0) return;
    this.flushing = true;
    const batch = this.buffer;
    this.buffer = [];
    try {
      const rows: PersistRow[] = [];
      for (const m of batch) {
        const row = mapMessage(m);
        if (row) rows.push(row);
      }

      if (rows.length === 0) {
        await this.reader.ack(this.opts.streamKey, this.opts.group, batch.map((b) => b.id));
        return;
      }

      const client = await this.pool.connect();
      let inserted = 0;
      try {
        await client.query("BEGIN");
        inserted = await this.writer.insertBatch(client, rows);
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        this.buffer.unshift(...batch);
        throw e;
      } finally {
        client.release();
      }

      await this.reader.ack(this.opts.streamKey, this.opts.group, batch.map((b) => b.id));

      if (inserted > 0) {
        const batchAtIso = new Date().toISOString();
        await this.redisClient.publish(
          this.opts.metricsChannel,
          JSON.stringify({
            v: 1 as const,
            persistedDelta: inserted,
            batchAtIso,
            batchSize: inserted,
          }),
        );
      }

      if (reason !== "timer") {
        // eslint-disable-next-line no-console
        console.info(`flush:${reason} persisted=${inserted} read=${batch.length}`);
      }
    } finally {
      this.flushing = false;
    }
  }
}
