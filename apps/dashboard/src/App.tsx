import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchTimeseries } from "./api.js";
import { useMetricsWebSocket } from "./useMetricsWebSocket.js";

function formatBatchTimestamp(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${dd}/${mm}/${yyyy}, ${time}`;
}

export default function App(): JSX.Element {
  const live = useMetricsWebSocket();
  const [minutes, setMinutes] = useState(60);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - minutes * 60_000);
    return { from, to };
  }, [minutes]);

  const ts = useQuery({
    queryKey: ["timeseries", range.from.toISOString(), range.to.toISOString()],
    queryFn: () =>
      fetchTimeseries({ from: range.from, to: range.to, bucket: "minute" }),
    refetchInterval: 30_000,
  });

  const chartData =
    ts.data?.series.map((p) => ({
      t: new Date(p.bucketStart).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      events: p.eventCount,
    })) ?? [];

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Event processing hub</h1>
          <p className="sub">
            API ingests to Redis Streams; worker batch-persists to Postgres; live
            counters fan out over WebSockets.
          </p>
        </div>
        <label className="range">
          Window
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          >
            <option value={30}>30m</option>
            <option value={60}>60m</option>
            <option value={360}>6h</option>
          </select>
        </label>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Live throughput</h2>
          <dl className="stats">
            <div>
              <dt>Published (API → Redis)</dt>
              <dd>{live?.totalPublished ?? "—"}</dd>
            </div>
            <div>
              <dt>Persisted (worker → Postgres)</dt>
              <dd>{live?.totalPersisted ?? "—"}</dd>
            </div>
            <div>
              <dt>Last batch</dt>
              <dd>
                {live?.lastBatchSize != null && live.lastBatchSize > 0
                  ? `${live.lastBatchSize} @ ${formatBatchTimestamp(live.lastBatchAt)}`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card chart">
          <h2>Events / minute (Postgres)</h2>
          {ts.isLoading && <p className="muted">Loading…</p>}
          {ts.isError && <p className="error">Failed to load series</p>}
          {!ts.isLoading && !ts.isError && (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="t" stroke="#888" />
                <YAxis stroke="#888" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="events"
                  stroke="#6ee7ff"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
