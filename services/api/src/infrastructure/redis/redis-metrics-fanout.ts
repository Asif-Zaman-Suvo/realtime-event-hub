import { Redis } from "ioredis";
import type { MetricsBroadcast } from "@reh/shared";
import type { RedisMetricsSnapshotStore } from "./redis-metrics-snapshot-store.js";
import type { WsMetricsHub } from "../websocket/ws-metrics-hub.js";
import { workerPersistMessageSchema } from "./worker-persist-message.js";

/**
 * Worker PUBLISHes persistence deltas; API updates Redis snapshot keys and fans out to WebSockets.
 */
export async function startMetricsFanout(params: {
  redisUrl: string;
  metricsChannel: string;
  snapshots: RedisMetricsSnapshotStore;
  wsHub: WsMetricsHub;
}): Promise<{ subscriber: Redis; stop: () => Promise<void> }> {
  const subscriber = new Redis(params.redisUrl, { maxRetriesPerRequest: 2 });
  await subscriber.subscribe(params.metricsChannel);

  subscriber.on("message", async (_channel: string, message: string) => {
    try {
      const json: unknown = JSON.parse(message);
      const parsed = workerPersistMessageSchema.safeParse(json);
      if (!parsed.success) return;
      await params.snapshots.applyPersistedDelta(
        parsed.data.persistedDelta,
        parsed.data.batchAtIso,
        parsed.data.batchSize,
      );
      const broadcast: MetricsBroadcast = {
        type: "metrics",
        data: await params.snapshots.getSnapshot(),
      };
      params.wsHub.broadcast(broadcast);
    } catch {
      // ignore malformed
    }
  });

  return {
    subscriber,
    stop: async () => {
      await subscriber.quit();
    },
  };
}
