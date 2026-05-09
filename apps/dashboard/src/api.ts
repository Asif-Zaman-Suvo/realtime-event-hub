import type { MetricsBroadcast } from "@reh/shared";

export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3000";

export type TimeseriesResponse = {
  bucket: "minute" | "hour";
  series: { bucketStart: string; eventCount: number }[];
};

export async function fetchTimeseries(params: {
  from: Date;
  to: Date;
  bucket?: "minute" | "hour";
  eventType?: string;
}): Promise<TimeseriesResponse> {
  const q = new URLSearchParams({
    from: params.from.toISOString(),
    to: params.to.toISOString(),
    bucket: params.bucket ?? "minute",
  });
  if (params.eventType) q.set("eventType", params.eventType);
  const res = await fetch(`${API_URL}/metrics/timeseries?${q.toString()}`);
  if (!res.ok) throw new Error(`timeseries_${res.status}`);
  return (await res.json()) as TimeseriesResponse;
}

export function parseMetricsMessage(raw: string): MetricsBroadcast | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (
      data &&
      typeof data === "object" &&
      "type" in data &&
      (data as { type: string }).type === "metrics" &&
      "data" in data
    ) {
      return data as MetricsBroadcast;
    }
  } catch {
    /* ignore */
  }
  return null;
}
