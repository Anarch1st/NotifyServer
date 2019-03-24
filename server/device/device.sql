CREATE TABLE IF NOT EXISTS devices (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  modified_at timestamp with time zone default CURRENT_TIMESTAMP,
  name char(20) unique,
  token varchar
);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_modified_devices() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.modified_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_devices_modtime ON devices;
CREATE TRIGGER update_devices_modtime
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE PROCEDURE  update_modified_devices();
