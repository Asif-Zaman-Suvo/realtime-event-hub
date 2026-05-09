import type { Redis } from "ioredis";
import type { StreamEventFields } from "@reh/shared";

export type RawStreamMessage = {
  id: string;
  fields: StreamEventFields;
};

function toFields(raw: string[]): StreamEventFields {
  const map = new Map<string, string>();
  for (let i = 0; i < raw.length; i += 2) {
    map.set(raw[i]!, raw[i + 1] ?? "");
  }
  return {
    eventType: map.get("eventType") ?? "",
    payloadJson: map.get("payloadJson") ?? "{}",
    occurredAtIso: map.get("occurredAtIso") ?? new Date().toISOString(),
    clientId: map.get("clientId") ?? undefined,
    requestId: map.get("requestId") ?? undefined,
  };
}

export class RedisStreamConsumer {
  constructor(private readonly redis: Redis) {}

  async ensureGroup(streamKey: string, group: string): Promise<void> {
    try {
      await this.redis.xgroup("CREATE", streamKey, group, "0", "MKSTREAM");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("BUSYGROUP")) throw e;
    }
  }

  async readBatch(params: {
    streamKey: string;
    group: string;
    consumer: string;
    count: number;
    blockMs: number;
  }): Promise<{ messages: RawStreamMessage[] }> {
    const res = (await this.redis.xreadgroup(
      "GROUP",
      params.group,
      params.consumer,
      "COUNT",
      params.count,
      "BLOCK",
      params.blockMs,
      "STREAMS",
      params.streamKey,
      ">",
    )) as Array<[string, Array<[string, string[]]>]> | null;

    if (!res) return { messages: [] };

    const messages: RawStreamMessage[] = [];
    for (const [, entries] of res) {
      for (const [id, rawFields] of entries) {
        messages.push({ id, fields: toFields(rawFields) });
      }
    }
    return { messages };
  }

  async ack(streamKey: string, group: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.redis.xack(streamKey, group, ...ids);
  }
}
