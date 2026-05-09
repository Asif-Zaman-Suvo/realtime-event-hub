import cors from "cors";
import express from "express";
import type { IngestEventUseCase } from "../../application/ingest-event.use-case.js";
import type { TimeseriesRepository } from "../postgres/timeseries-repository.js";
import { createEventsRouter } from "./routes/events-router.js";
import { createMetricsRouter } from "./routes/metrics-router.js";

export function createHttpApp(deps: {
  ingestEvent: IngestEventUseCase;
  timeseries: TimeseriesRepository;
  corsOrigin: string;
}): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin: deps.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(createEventsRouter(deps.ingestEvent));
  app.use(createMetricsRouter(deps.timeseries));

  return app;
}
