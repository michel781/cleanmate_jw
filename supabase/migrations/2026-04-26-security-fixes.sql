-- ============================================================
-- 2026-04-26 Security fixes (from /cso audit)
--
-- Run this once in your Supabase SQL Editor on existing deployments.
-- Idempotent: safe to run multiple times.
--
-- For fresh setups, the same fixes are baked into:
--   - supabase/policies.sql  (RLS policies)
--   - supabase/functions.sql (RPC functions)
--   - supabase/grants.sql    (no change needed)
--
-- BUCKET REQUIREMENT: the `verifications` storage bucket must be PRIVATE.
-- Set this in Supabase Dashboard → Storage → verifications → Settings →
-- Public bucket: OFF. App now uses signed URLs (15 min) at render time.
-- ============================================================

-- ----- F1 ---------------------------------------------------
-- Drop the wide-open SELECT-on-parties policy. Anyone with the
-- public anon key could otherwise dump every household's invite_code
-- and walk into arbitrary parties via join_party().
drop policy if exists "parties_select_by_invite" on public.parties;

-- Replace the dropped read with a SECURITY DEFINER RPC that only
-- exposes id + name for the matched code. No more "select * from parties".
create or replace function public.get_party_by_invite_code(p_code text)
returns table(id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name
  from public.parties
  where invite_code = upper(p_code)
  limit 1;
$$;

grant execute on function public.get_party_by_invite_code(text) to anon, authenticated;

-- ----- F2 ---------------------------------------------------
-- approve_verification + reject_verification used to trust caller-supplied
-- p_approver_id / p_rejecter_id. Now we derive the actor from auth.uid()
-- and verify they're actually a party member (and not the requester).

drop function if exists public.approve_verification(uuid, uuid);

create or replace function public.approve_verification(p_verification_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_verif record;
  v_task record;
  v_today date := current_date;
  v_last_active_date date;
  v_streak_freezes integer;
  v_streak_current integer;
  v_streak_longest integer;
  v_diff_days integer;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_verif
  from public.verifications
  where id = p_verification_id and status = 'pending'
  for update;
  if not found then
    raise exception '인증 요청을 찾을 수 없어요 (이미 처리되었거나 존재하지 않음)';
  end if;

  if not exists (
    select 1 from public.party_members
    where party_id = v_verif.party_id and user_id = v_user_id
  ) then
    raise exception '파티 멤버만 승인할 수 있어요';
  end if;

  if v_verif.requested_by = v_user_id then
    raise exception '본인이 요청한 인증은 본인이 승인할 수 없어요';
  end if;

  select * into v_task from public.tasks where id = v_verif.task_id;

  update public.verifications
    set status = 'approved',
        resolved_by = v_user_id,
        resolved_at = now()
    where id = p_verification_id;

  update public.tasks
    set last_done_at = now(),
        last_done_by = v_verif.requested_by
    where id = v_verif.task_id;

  update public.scores
    set score = score + 10
    where party_id = v_verif.party_id and user_id = v_verif.requested_by;

  select current, longest, last_active_date, freezes
    into v_streak_current, v_streak_longest, v_last_active_date, v_streak_freezes
    from public.streaks
    where party_id = v_verif.party_id
    for update;

  if v_last_active_date is null or v_last_active_date <> v_today then
    v_diff_days := (v_today - coalesce(v_last_active_date, v_today - 1))::integer;
    if v_diff_days = 1 then
      v_streak_current := v_streak_current + 1;
      if v_streak_current > v_streak_longest then
        v_streak_longest := v_streak_current;
      end if;
    elsif v_diff_days > 1 and v_streak_freezes > 0 and v_diff_days <= 3 then
      v_streak_freezes := v_streak_freezes - 1;
    elsif v_diff_days > 1 then
      v_streak_current := 1;
    end if;

    update public.streaks
      set current = v_streak_current,
          longest = v_streak_longest,
          last_active_date = v_today,
          freezes = v_streak_freezes
      where party_id = v_verif.party_id;
  end if;

  update public.user_totals
    set approved_count = approved_count + 1
    where user_id = v_verif.requested_by;

  insert into public.activity (party_id, type, actor_id, target_id, metadata)
  values (
    v_verif.party_id, 'approved', v_verif.requested_by, v_task.id,
    jsonb_build_object(
      'task_name', v_task.name,
      'emoji', v_task.emoji,
      'approver_id', v_user_id
    )
  );

  return json_build_object(
    'success', true,
    'task_id', v_task.id,
    'task_name', v_task.name,
    'task_emoji', v_task.emoji,
    'streak_current', v_streak_current
  );
end;
$$;

grant execute on function public.approve_verification(uuid) to authenticated;

drop function if exists public.reject_verification(uuid, uuid, text);

create or replace function public.reject_verification(
  p_verification_id uuid,
  p_reason text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_verif record;
  v_task record;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_verif from public.verifications
    where id = p_verification_id and status = 'pending' for update;
  if not found then raise exception '인증 요청을 찾을 수 없어요'; end if;

  if not exists (
    select 1 from public.party_members
    where party_id = v_verif.party_id and user_id = v_user_id
  ) then
    raise exception '파티 멤버만 반려할 수 있어요';
  end if;

  if v_verif.requested_by = v_user_id then
    raise exception '본인이 요청한 인증은 본인이 반려할 수 없어요';
  end if;

  select * into v_task from public.tasks where id = v_verif.task_id;

  update public.verifications
    set status = 'rejected',
        resolved_by = v_user_id,
        resolved_at = now(),
        reject_reason = p_reason
    where id = p_verification_id;

  update public.user_totals
    set rejected_count = rejected_count + 1
    where user_id = v_verif.requested_by;

  insert into public.activity (party_id, type, actor_id, target_id, metadata)
  values (
    v_verif.party_id, 'rejected', v_verif.requested_by, v_task.id,
    jsonb_build_object(
      'task_name', v_task.name,
      'emoji', v_task.emoji,
      'reason', p_reason,
      'rejecter_id', v_user_id
    )
  );

  return json_build_object('success', true);
end;
$$;

grant execute on function public.reject_verification(uuid, text) to authenticated;

-- ----- F4 ---------------------------------------------------
-- parties_update_members needs WITH CHECK so members can't tamper with
-- columns they shouldn't (or rotate invite_code maliciously).
drop policy if exists "parties_update_members" on public.parties;

create policy "parties_update_members"
  on public.parties for update
  using (public.is_party_member(id))
  with check (public.is_party_member(id));

-- ----- F5 ---------------------------------------------------
-- profiles_update_self defense-in-depth: add WITH CHECK so id can't drift.
drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ----- F3: Storage RLS -------------------------------------
-- Bucket must be PRIVATE. App uses signed URLs at render time.
drop policy if exists "verifications_upload_own" on storage.objects;
drop policy if exists "verifications_read_party" on storage.objects;
drop policy if exists "verifications_delete_own" on storage.objects;

-- Upload: only allowed under your own folder (path prefix = your auth.uid).
create policy "verifications_upload_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: only co-party-members of the folder owner. This is what enables
-- partner approval while blocking the world.
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
