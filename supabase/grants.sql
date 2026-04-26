-- ============================================================
-- CleanMate — Schema GRANTs
--
-- Run this AFTER schema.sql / functions.sql / policies.sql / realtime.sql,
-- but only if you wiped the public schema (drop schema public cascade) before
-- re-applying the SQLs. A fresh Supabase project does this automatically.
--
-- RLS controls WHICH ROWS a role can see; GRANT controls whether the role
-- can touch the table at all. Both layers must pass for a query to succeed.
-- ============================================================

-- Schema usage
grant usage on schema public to anon, authenticated;

-- Existing objects
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to anon, authenticated;
grant usage on all sequences in schema public to anon, authenticated;

-- Future objects (any table/function/sequence created later inherits these)
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant execute on functions to anon, authenticated;
alter default privileges in schema public grant usage on sequences to anon, authenticated;
