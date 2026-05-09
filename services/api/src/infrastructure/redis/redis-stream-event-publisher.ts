import type { Redis } from "ioredis";
import type { InboundEvent } from "../../domain/event.entity.js";
import type { EventPublisher } from "../../application/ports/event-publisher.port.js";

export class RedisStreamEventPublisher implements EventPublisher {
  constructor(
    private readonly redis: Redis,
    private readonly streamKey: string,
  ) {}

  async publish(event: InboundEvent): Promise<{ streamMessageId: string }> {
    const id = await this.redis.xadd(
      this.streamKey,
      "*",
      "eventType",
      event.eventType,
      "payloadJson",
      JSON.stringify(event.payload),
      "occurredAtIso",
      event.occurredAt.toISOString(),
      ...(event.clientId
        ? (["clientId", event.clientId] as const)
        : ([] as const)),
      ...(event.requestId
        ? (["requestId", event.requestId] as const)
        : ([] as const)),
    );
    return { streamMessageId: id ?? "" };
  }
}
