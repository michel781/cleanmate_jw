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
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

-- ============================================================
-- PARTIES
-- ============================================================
create policy "parties_select_members"
  on public.parties for select
  using (public.is_party_member(id));

-- Invite-code lookup is NOT done via a wide-open SELECT policy. It's done
-- via the `get_party_by_invite_code(text)` SECURITY DEFINER function in
-- functions.sql, which exposes only id + name for one matching row.
-- Previous version had `using (true)` here, which let anyone with the
-- public anon key dump every party + invite_code in the database.

create policy "parties_update_members"
  on public.parties for update
  using (public.is_party_member(id))
  with check (public.is_party_member(id));

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
-- STORAGE POLICIES
--
-- Prerequisite: create the `verifications` bucket in Supabase Dashboard
-- with **Public bucket: OFF**. The app uses signed URLs at render time.
--
-- Path scheme: <user_uuid>/<timestamp>.jpg — uploads go under the
-- uploader's auth.uid() folder. RLS enforces this on insert AND on read.
-- ============================================================

-- Upload: only allowed under your own auth.uid() folder.
create policy "verifications_upload_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: only co-party-members of the folder owner. This is what lets
-- a partner view + approve verifications while blocking everyone else.
create policy "verifications_read_party"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verifications'
    and exists (
      select 1
      from public.party_members pm_self
      join public.party_members pm_owner
        on pm_self.party_id = pm_owner.party_id
      where pm_self.user_id = auth.uid()
        and pm_owner.user_id::text = (storage.foldername(name))[1]
    )
  );

-- Delete: only your own uploads.
create policy "verifications_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
