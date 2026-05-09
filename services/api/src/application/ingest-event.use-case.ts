import type { InboundEvent } from "../domain/event.entity.js";
import type { EventPublisher } from "./ports/event-publisher.port.js";
import type { MetricsBroadcaster } from "./ports/metrics-broadcaster.port.js";
import type { MetricsSnapshotStore } from "./ports/metrics-snapshot.port.js";

export class IngestEventUseCase {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly snapshots: MetricsSnapshotStore,
    private readonly broadcaster: MetricsBroadcaster,
  ) {}

  async execute(event: InboundEvent): Promise<{ streamMessageId: string }> {
    const { streamMessageId } = await this.publisher.publish(event);
    await this.snapshots.incrementPublished();
    const data = await this.snapshots.getSnapshot();
    this.broadcaster.broadcast({ type: "metrics", data });
    return { streamMessageId };
  }
}
