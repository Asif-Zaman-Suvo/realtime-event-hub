import { useEffect, useState } from "react";
import type { MetricsBroadcast } from "@reh/shared";
import { WS_URL, parseMetricsMessage } from "./api.js";

export function useMetricsWebSocket(): MetricsBroadcast["data"] | null {
  const [data, setData] = useState<MetricsBroadcast["data"] | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws`);
    ws.onmessage = (ev) => {
      const msg = parseMetricsMessage(String(ev.data));
      if (msg) setData(msg.data);
    };
    ws.onclose = () => {
      /* reconnect left as exercise; keeps demo simple */
    };
    return () => ws.close();
  }, []);

  return data;
}
