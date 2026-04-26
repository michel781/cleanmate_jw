-- ============================================================
-- CleanMate — Realtime publication
-- Run this AFTER schema.sql / functions.sql / policies.sql
--
-- This wires the tables that the app subscribes to via supabase-js
-- (verifications, tasks, activity) into the supabase_realtime
-- publication so postgres_changes events get broadcast.
-- ============================================================

alter publication supabase_realtime add table public.verifications;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.activity;

-- Optional (not subscribed by the client today, but cheap to enable
-- if you later want to react to score/streak changes):
-- alter publication supabase_realtime add table public.scores;
-- alter publication supabase_realtime add table public.streaks;
