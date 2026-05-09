import { z } from "zod";

export const workerPersistMessageSchema = z.object({
  v: z.literal(1),
  persistedDelta: z.number().int().positive(),
  batchAtIso: z.string(),
  batchSize: z.number().int().positive(),
});

export type WorkerPersistMessage = z.infer<typeof workerPersistMessageSchema>;
