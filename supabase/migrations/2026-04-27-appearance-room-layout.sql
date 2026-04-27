-- Adds character appearance and room layout to profiles.
-- Both are JSONB with safe defaults; existing rows are unaffected.

alter table public.profiles
  add column if not exists appearance jsonb not null default '{}'::jsonb,
  add column if not exists room_layout jsonb not null default '{}'::jsonb;

-- (Optional) lightweight shape check: keep them objects, not arrays/null.
alter table public.profiles
  drop constraint if exists profiles_appearance_is_object;
alter table public.profiles
  add constraint profiles_appearance_is_object
  check (jsonb_typeof(appearance) = 'object');

alter table public.profiles
  drop constraint if exists profiles_room_layout_is_object;
alter table public.profiles
  add constraint profiles_room_layout_is_object
  check (jsonb_typeof(room_layout) = 'object');
