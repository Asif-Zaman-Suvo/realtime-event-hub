import type { MetricsBroadcast } from "@reh/shared";

export interface MetricsBroadcaster {
  broadcast(message: MetricsBroadcast): void;
}
