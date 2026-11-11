-- The application uses server-side SQL and its existing session authorization.
-- No browser/Data API role may read these tables, including credential hashes.
CREATE ROLE purpose_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO purpose_app;
GRANT USAGE ON SCHEMA public TO purpose_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated, purpose_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO purpose_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO purpose_app;

DO $$
DECLARE app_table record;
BEGIN
  FOR app_table IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', app_table.tablename);
    EXECUTE format(
      'CREATE POLICY purpose_backend_access ON public.%I FOR ALL TO purpose_app USING (true) WITH CHECK (true)',
      app_table.tablename
    );
  END LOOP;
END $$;

-- A future migration must explicitly grant backend access and add its RLS
-- policy. New objects must never become readable by the public API by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER ROLE purpose_app SET search_path = public, pg_catalog;
ALTER ROLE purpose_app SET statement_timeout = '15s';
ALTER ROLE purpose_app SET idle_in_transaction_session_timeout = '30s';
