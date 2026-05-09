-- High-volume append-mostly workload: narrow table, time-series indexes, idempotency on ingest.

CREATE TABLE IF NOT EXISTS events (
  id                bigserial PRIMARY KEY,
  source_message_id text        NOT NULL,
  event_type        text        NOT NULL,
  payload           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  occurred_at       timestamptz NOT NULL,
  ingested_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_source_message_id_key UNIQUE (source_message_id)
);

-- BRIN: cheap/minimal for sequential time-ordered inserts & range scans.
CREATE INDEX IF NOT EXISTS events_occurred_at_brin
  ON events USING brin (occurred_at);

-- B-tree for dashboard filters and replay by type + time.
CREATE INDEX IF NOT EXISTS events_event_type_occurred_at_idx
  ON events (event_type, occurred_at DESC);

-- Supports ingestion pipelines that key off arrival order.
CREATE INDEX IF NOT EXISTS events_ingested_at_idx
  ON events (ingested_at DESC);

ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE events SET (fillfactor = 90);

COMMENT ON TABLE events IS 'Append-only fact stream; partitioned by month in production if >100M rows/month.';
