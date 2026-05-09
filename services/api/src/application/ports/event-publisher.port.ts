import type { InboundEvent } from "../../domain/event.entity.js";

export interface EventPublisher {
  publish(event: InboundEvent): Promise<{ streamMessageId: string }>;
}
