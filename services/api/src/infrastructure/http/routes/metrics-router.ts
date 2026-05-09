import { Router } from "express";
import { z } from "zod";
import type { TimeseriesRepository } from "../../postgres/timeseries-repository.js";

const querySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  bucket: z.enum(["minute", "hour"]).default("minute"),
  eventType: z.string().optional(),
});

export function createMetricsRouter(repo: TimeseriesRepository): Router {
  const r = Router();

  r.get("/metrics/timeseries", async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const q = parsed.data;
    if (q.from >= q.to) {
      res.status(400).json({ error: "from_must_be_before_to" });
      return;
    }
    try {
      const rows = await repo.eventCountsByBucket({
        from: q.from,
        to: q.to,
        bucket: q.bucket,
        eventType: q.eventType,
      });
      res.json({ bucket: q.bucket, series: rows });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "query_failed";
      res.status(500).json({ error: msg });
    }
  });

  return r;
}
