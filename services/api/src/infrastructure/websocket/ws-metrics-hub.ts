import type { MetricsBroadcast } from "@reh/shared";
import type { WebSocket } from "ws";

export class WsMetricsHub {
  private readonly clients = new Set<WebSocket>();

  add(client: WebSocket): void {
    this.clients.add(client);
    client.on("close", () => this.clients.delete(client));
    client.on("error", () => this.clients.delete(client));
  }

  broadcast(message: MetricsBroadcast): void {
    const raw = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) client.send(raw);
    }
  }
}
