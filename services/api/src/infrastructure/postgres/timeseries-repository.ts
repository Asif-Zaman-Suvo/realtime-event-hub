import type { Pool } from "pg";

export type TimeBucket = "minute" | "hour";

export interface BucketRow {
  bucketStart: string;
  eventCount: number;
}

export class TimeseriesRepository {
  constructor(private readonly pool: Pool) {}

  async eventCountsByBucket(params: {
    from: Date;
    to: Date;
    bucket: TimeBucket;
    eventType?: string;
  }): Promise<BucketRow[]> {
    const trunc = params.bucket === "minute" ? "minute" : "hour";
    const sql = `
      SELECT
        date_trunc($3::text, occurred_at) AS bucket_start,
        COUNT(*)::bigint AS event_count
      FROM events
      WHERE occurred_at >= $1::timestamptz
        AND occurred_at < $2::timestamptz
        AND ($4::text IS NULL OR event_type = $4)
      GROUP BY 1
      ORDER BY 1 ASC`;

    const result = await this.pool.query<{
      bucket_start: Date;
      event_count: string;
    }>(sql, [
      params.from.toISOString(),
      params.to.toISOString(),
      trunc,
      params.eventType ?? null,
    ]);

    return result.rows.map((r) => ({
      bucketStart: r.bucket_start.toISOString(),
      eventCount: Number(r.event_count),
    }));
  }
}
