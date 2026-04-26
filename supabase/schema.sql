-- ============================================================
-- CleanMate — Database Schema
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extends auth.users with app-specific fields
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '사용자',
  emoji text not null default '🐻',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PARTIES (households / rooms)
-- ============================================================
create table public.parties (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리집',
  invite_code text unique not null default upper(substring(md5(random()::text) from 1 for 6)),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index idx_parties_invite_code on public.parties(invite_code);

-- ============================================================
-- PARTY MEMBERS (many-to-many between users and parties)
-- ============================================================
create table public.party_members (
  party_id uuid references public.parties on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create index idx_party_members_user on public.party_members(user_id);

-- ============================================================
-- TASKS (cleaning items)
-- ============================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties on delete cascade,
  name text not null,
  emoji text not null default '🧹',
  cycle integer not null default 7 check (cycle > 0),
  weight integer not null default 10 check (weight >= 1 and weight <= 20),
  -- assigned_to: null = both/shared, or specific user_id
  assigned_to uuid references auth.users on delete set null,
  last_done_at timestamptz,
  last_done_by uuid references auth.users on delete set null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index idx_tasks_party on public.tasks(party_id);

-- ============================================================
-- VERIFICATIONS (photo approval requests)
-- ============================================================
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks on delete cascade,
  party_id uuid not null references public.parties on delete cascade,
  requested_by uuid not null references auth.users on delete cascade,
  photo_url text,                      -- Supabase Storage path
  photo_placeholder text,              -- For demo/MVP without real photos
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  resolved_by uuid references auth.users on delete set null,
  resolved_at timestamptz,
  reject_reason text,
  requested_at timestamptz not null default now()
);

create index idx_verifications_party on public.verifications(party_id);
create index idx_verifications_status on public.verifications(status) where status = 'pending';
create index idx_verifications_requested_by on public.verifications(requested_by);

-- ============================================================
-- SCORES (per user per party)
-- ============================================================
create table public.scores (
  party_id uuid references public.parties on delete cascade,
  user_id uuid references auth.users on delete cascade,
  score integer not null default 0 check (score >= 0),
  updated_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

-- ============================================================
-- STREAKS (per party — shared across members)
-- ============================================================
create table public.streaks (
  party_id uuid primary key references public.parties on delete cascade,
  current integer not null default 0,
  longest integer not null default 0,
  last_active_date date,
  freezes integer not null default 2,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
create table public.activity (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties on delete cascade,
  type text not null check (type in (
    'task_added', 'task_deleted', 'task_edited',
    'request', 'approved', 'rejected',
    'party_created', 'member_joined',
    'badge_earned', 'streak_milestone'
  )),
  actor_id uuid references auth.users on delete set null,
  target_id uuid,                      -- Generic FK (task_id, verification_id, etc.)
  metadata jsonb default '{}',         -- Flexible data (task_name, emoji, reason, etc.)
  created_at timestamptz not null default now()
);

create index idx_activity_party_created on public.activity(party_id, created_at desc);

-- ============================================================
-- BADGES (user achievements)
-- ============================================================
create table public.user_badges (
  user_id uuid references auth.users on delete cascade,
  badge_id text not null,              -- e.g. 'first_request', 'streak_7'
  party_id uuid references public.parties on delete set null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ============================================================
-- NOTIFICATION SETTINGS
-- ============================================================
create table public.notification_settings (
  user_id uuid primary key references auth.users on delete cascade,
  enabled boolean not null default false,
  verification_requests boolean not null default true,
  task_reminders boolean not null default true,
  streak_reminders boolean not null default true,
  party_updates boolean not null default true,
  quiet_hours_enabled boolean not null default true,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  updated_at timestamptz not null default now()
);

-- ============================================================
-- USER TOTALS (denormalized counters for performance)
-- ============================================================
create table public.user_totals (
  user_id uuid primary key references auth.users on delete cascade,
  requested_count integer not null default 0,
  approved_count integer not null default 0,
  rejected_count integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGER (generic)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger scores_updated_at before update on public.scores
  for each row execute function public.set_updated_at();

create trigger streaks_updated_at before update on public.streaks
  for each row execute function public.set_updated_at();

create trigger notification_settings_updated_at before update on public.notification_settings
  for each row execute function public.set_updated_at();

create trigger user_totals_updated_at before update on public.user_totals
  for each row execute function public.set_updated_at();
