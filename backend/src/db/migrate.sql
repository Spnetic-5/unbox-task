BEGIN;

CREATE TABLE IF NOT EXISTS speed_samples (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  speed_mps DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL DEFAULT 'unknown'
);

CREATE INDEX IF NOT EXISTS idx_speed_samples_ts ON speed_samples (ts);

CREATE OR REPLACE FUNCTION notify_speed_insert() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('speed_insert', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_speed_insert_notify ON speed_samples;
CREATE TRIGGER trg_speed_insert_notify
AFTER INSERT ON speed_samples
FOR EACH ROW
EXECUTE FUNCTION notify_speed_insert();

COMMIT;

