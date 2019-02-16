CREATE TABLE IF NOT EXISTS notifications (
  id uuid primary key default uuid_generate_v4(),
  timestamp timestamp with time zone default CURRENT_TIMESTAMP,
  source char(20),
  title char(20),
  message varchar,
  destination char(20),
  response varchar
);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
