-- Phase 3.2: Create hypertable for time-series data points
-- Run after migrating to TimescaleDB container

SELECT create_hypertable('data_points', 'timestamp', chunk_time_interval := INTERVAL '1 day', if_not_exists := TRUE);
SELECT create_hypertable('telemetry_data', 'timestamp', chunk_time_interval := INTERVAL '1 day', if_not_exists := TRUE);

-- Retention policy: delete raw data older than 90 days
SELECT add_retention_policy('data_points', retention_period := INTERVAL '90 days', shrink_gap := NULL);

-- Compression: enable on chunks older than 7 days
SELECT set_compression_policy('data_points', before := INTERVAL '7 days');
