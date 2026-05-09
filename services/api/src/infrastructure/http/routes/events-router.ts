import { Router } from "express";
import { ingestEventBodySchema } from "@reh/shared";
import type { IngestEventUseCase } from "../../../application/ingest-event.use-case.js";
import { randomUUID } from "node:crypto";

export function createEventsRouter(useCase: IngestEventUseCase): Router {
  const r = Router();

  r.post("/events", async (req, res) => {
    const parsed = ingestEventBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    const occurredAt = body.occurredAt ?? new Date();
    const requestId = randomUUID();
    try {
      const result = await useCase.execute({
        eventType: body.eventType,
        payload: body.payload,
        occurredAt,
        requestId,
      });
      res.status(202).json({
        accepted: true,
        streamMessageId: result.streamMessageId,
        requestId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ingest_failed";
      res.status(500).json({ error: msg });
    }
  });

  return r;
}
