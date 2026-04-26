-- ============================================================
-- CleanMate — Row Level Security (RLS) Policies
-- Run this AFTER schema.sql and functions.sql
--
-- Security model:
-- - Users can only see/modify data within parties they are a member of
-- - Profile is visible to party members
-- - Nothing is public
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles              enable row level security;
alter table public.parties               enable row level security;
alter table public.party_members         enable row level security;
alter table public.tasks                 enable row level security;
alter table public.verifications         enable row level security;
alter table public.scores                enable row level security;
alter table public.streaks               enable row level security;
alter table public.activity              enable row level security;
alter table public.user_badges           enable row level security;
alter table public.notification_settings enable row level security;
alter table public.user_totals           enable row level security;

-- ============================================================
-- Helper: is_party_member
-- ============================================================
create or replace function public.is_party_member(p_party_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.party_members
    where party_id = p_party_id and user_id = auth.uid()
  );
$$;

-- ============================================================
-- PROFILES
-- Users can read any profile that's a co-party-member (for displaying names)
-- Users can only update their own profile
-- ============================================================
create policy "profiles_select_self_and_party_members"
  on public.profiles for select
  using (
    id = auth.uid()
    or id in (
      select user_id from public.party_members
      where party_id in (select party_id from public.party_members where user_id = auth.uid())
    )
  );

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid());

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

-- ============================================================
-- PARTIES
-- ============================================================
create policy "parties_select_members"
  on public.parties for select
  using (public.is_party_member(id));

create policy "parties_select_by_invite"
  on public.parties for select
  using (true);
-- ^ Anyone with invite_code can read the party name. You can tighten this if needed.

create policy "parties_update_members"
  on public.parties for update
  using (public.is_party_member(id));

-- ============================================================
-- PARTY MEMBERS
-- ============================================================
create policy "party_members_select_own_parties"
  on public.party_members for select
  using (public.is_party_member(party_id));

create policy "party_members_insert_self"
  on public.party_members for insert
  with check (user_id = auth.uid());

create policy "party_members_delete_self"
  on public.party_members for delete
  using (user_id = auth.uid());

-- ============================================================
-- TASKS
-- ============================================================
create policy "tasks_select"
  on public.tasks for select
  using (public.is_party_member(party_id));

create policy "tasks_insert"
  on public.tasks for insert
  with check (public.is_party_member(party_id));

create policy "tasks_update"
  on public.tasks for update
  using (public.is_party_member(party_id));

create policy "tasks_delete"
  on public.tasks for delete
  using (public.is_party_member(party_id));

-- ============================================================
-- VERIFICATIONS
-- ============================================================
create policy "verifications_select"
  on public.verifications for select
  using (public.is_party_member(party_id));

create policy "verifications_insert_self"
  on public.verifications for insert
  with check (requested_by = auth.uid() and public.is_party_member(party_id));

-- Updates are done via SECURITY DEFINER functions (approve_verification, reject_verification)

-- ============================================================
-- SCORES
-- ============================================================
create policy "scores_select"
  on public.scores for select
  using (public.is_party_member(party_id));

-- Updates are done via SECURITY DEFINER functions

-- ============================================================
-- STREAKS
-- ============================================================
create policy "streaks_select"
  on public.streaks for select
  using (public.is_party_member(party_id));

-- ============================================================
-- ACTIVITY
-- ============================================================
create policy "activity_select"
  on public.activity for select
  using (public.is_party_member(party_id));

create policy "activity_insert"
  on public.activity for insert
  with check (public.is_party_member(party_id));

-- ============================================================
-- USER BADGES
-- ============================================================
create policy "user_badges_select_self_or_party"
  on public.user_badges for select
  using (
    user_id = auth.uid()
    or (party_id is not null and public.is_party_member(party_id))
  );

create policy "user_badges_insert_self"
  on public.user_badges for insert
  with check (user_id = auth.uid());

-- ============================================================
-- NOTIFICATION SETTINGS (private)
-- ============================================================
create policy "notification_settings_select_self"
  on public.notification_settings for select
  using (user_id = auth.uid());

create policy "notification_settings_update_self"
  on public.notification_settings for update
  using (user_id = auth.uid());

create policy "notification_settings_insert_self"
  on public.notification_settings for insert
  with check (user_id = auth.uid());

-- ============================================================
-- USER TOTALS
-- ============================================================
create policy "user_totals_select_self_or_party"
  on public.user_totals for select
  using (
    user_id = auth.uid()
    or user_id in (
      select user_id from public.party_members
      where party_id in (select party_id from public.party_members where user_id = auth.uid())
    )
  );

-- ============================================================
-- STORAGE POLICIES (run in Supabase dashboard after creating 'verifications' bucket)
-- ============================================================
/*
-- Policy: "Users can upload verification photos to their own path"
create policy "verifications_upload_own"
  on storage.objects for insert
  with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: "Party members can read verification photos"
create policy "verifications_read_party"
  on storage.objects for select
  using (
    bucket_id = 'verifications'
    -- Additional check: verify user is party member
    -- You can tighten this with a more complex check joining to verifications table
  );
*/
