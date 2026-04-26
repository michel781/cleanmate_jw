-- ============================================================
-- CleanMate — Seed Data (for development only)
-- Run this AFTER you have at least one user in auth.users
-- ============================================================

-- Sample cleaning tasks for a new party
-- Replace 'YOUR_PARTY_ID' with an actual party UUID from public.parties
--
-- Usage:
-- 1. Sign up / login to your app once to create a user + party
-- 2. Find your party_id: select id from public.parties where created_by = 'YOUR_USER_ID';
-- 3. Replace 'YOUR_PARTY_ID' below and run

do $$
declare
  v_party_id uuid;
begin
  -- Get the first party (for dev convenience)
  select id into v_party_id from public.parties limit 1;
  if v_party_id is null then
    raise notice 'No party found. Sign up first to create a user and party.';
    return;
  end if;

  -- Insert sample tasks
  insert into public.tasks (party_id, name, emoji, cycle, weight, last_done_at)
  values
    (v_party_id, '설거지',       '🍽️',  1,  15, now() - interval '0 days'),
    (v_party_id, '화장실 청소',  '🚿',  7,  12, now() - interval '5 days'),
    (v_party_id, '거실 청소기',  '🧹',  3,  10, now() - interval '4 days'),
    (v_party_id, '빨래',         '👕',  5,   9, now() - interval '2 days'),
    (v_party_id, '분리수거',     '♻️',  2,   7, now() - interval '3 days'),
    (v_party_id, '침구 정리',    '🛏️', 14,   8, now() - interval '6 days');

  raise notice 'Seeded 6 tasks for party %', v_party_id;
end;
$$;
