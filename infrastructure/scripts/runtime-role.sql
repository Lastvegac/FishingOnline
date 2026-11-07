-- Run with psql as the migration owner AFTER migrations; database target must be explicit.
-- FWO_RUNTIME_PASSWORD is read from the environment, never a committed credential.
\set ON_ERROR_STOP on
\getenv runtime_password FWO_RUNTIME_PASSWORD
\if :{?runtime_password}
BEGIN;
SELECT format('CREATE ROLE fwo_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'runtime_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fwo_app') \gexec
ALTER ROLE fwo_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
SELECT format('ALTER ROLE fwo_app PASSWORD %L', :'runtime_password') \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO fwo_app;
SELECT format('GRANT CONNECT ON DATABASE %I TO fwo_app', current_database()) \gexec
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO fwo_app;
REVOKE ALL ON _prisma_migrations FROM fwo_app;
REVOKE UPDATE ON wallet_transactions, audit_logs, user_grants, payment_webhook_logs, payment_fulfillment_logs, payment_order_items FROM fwo_app;
REVOKE UPDATE ON fish_photo_assets FROM fwo_app;
GRANT DELETE ON location_fish, user_equipment TO fwo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fwo_app;
COMMIT;
\else
\echo 'FWO_RUNTIME_PASSWORD is required; no privileges changed.'
\quit 1
\endif
