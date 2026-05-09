import type { PoolClient } from "pg";

export type PersistRow = {
  sourceMessageId: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
};

export class PostgresBatchWriter {
  /** @returns inserted row count (excludes conflicts) */
  async insertBatch(client: PoolClient, rows: PersistRow[]): Promise<number> {
    if (rows.length === 0) return 0;

    const placeholders: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const r of rows) {
      placeholders.push(
        `($${i}, $${i + 1}, $${i + 2}::jsonb, $${i + 3}::timestamptz)`,
      );
      values.push(
        r.sourceMessageId,
        r.eventType,
        JSON.stringify(r.payload),
        r.occurredAt.toISOString(),
      );
      i += 4;
    }

    const result = await client.query(
      `
      INSERT INTO events (source_message_id, event_type, payload, occurred_at)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (source_message_id) DO NOTHING
      `,
      values,
    );
    return result.rowCount ?? 0;
  }
}
