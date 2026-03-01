-- Umbra Platform — Database Initialization
-- Payment service database is created via POSTGRES_DB env var
-- Additional setup can be added here

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
