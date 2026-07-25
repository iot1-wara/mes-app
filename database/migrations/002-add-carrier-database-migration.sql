-- 002-add-carrier-database-migration.sql
-- Phase 9: dbProcessData columns for carriers table (per Station Speichermodell)

BEGIN;

-- Add iCarrierID (maps to SPS Int(128))
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS i_carrier_id INTEGER;

-- Add iResourceID as INTEGER (migrated from UUID string, maps to stMES uiResourceId)
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS i_resource_id INTEGER;

-- Add dbProcessData parallel parameter fields
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS i_par1 INTEGER DEFAULT 0;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS i_par2 INTEGER DEFAULT 0;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS i_par3 INTEGER DEFAULT 0;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS i_par4 INTEGER DEFAULT 0;

-- Add last process timestamp (maps to dbProcessData ldtTimeStamp)
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS last_process_timestamp TIMESTAMP;

-- Add part number (maps to stMES udiPNo)
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS part_number VARCHAR(100);

COMMIT;
