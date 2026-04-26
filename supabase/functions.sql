-- ============================================================
-- CleanMate — Functions & Triggers
-- Run this AFTER schema.sql
-- ============================================================

-- ============================================================
-- Auto-create profile on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create profile
  insert into public.profiles (id, name, emoji)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', '사용자'),
    coalesce(new.raw_user_meta_data->>'emoji', '🐻')
  );

  -- Create default notification settings
  insert into public.notification_settings (user_id) values (new.id);

  -- Create user_totals row
  insert into public.user_totals (user_id) values (new.id);

  -- Auto-create a personal party if user has no party yet
  declare
    new_party_id uuid;
  begin
    insert into public.parties (name, created_by)
    values ('우리집', new.id)
    returning id into new_party_id;

    insert into public.party_members (party_id, user_id, role)
    values (new_party_id, new.id, 'owner');

    insert into public.scores (party_id, user_id, score)
    values (new_party_id, new.id, 0);

    insert into public.streaks (party_id)
    values (new_party_id);

    insert into public.activity (party_id, type, actor_id, metadata)
    values (new_party_id, 'party_created', new.id, '{}'::jsonb);
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Calculate room cleanliness score (0-100)
-- Based on how overdue tasks are
-- ============================================================
create or replace function public.calculate_room_score(p_party_id uuid)
returns integer
language plpgsql
stable
as $$
declare
  v_penalty numeric := 0;
  v_task record;
  v_days_since numeric;
  v_ratio numeric;
begin
  for v_task in
    select cycle, weight, last_done_at
    from public.tasks
    where party_id = p_party_id
  loop
    v_days_since := extract(epoch from (now() - coalesce(v_task.last_done_at, now() - interval '999 days'))) / 86400;
    v_ratio := v_days_since / v_task.cycle;
    if v_ratio > 0.8 then
      v_penalty := v_penalty + (v_ratio - 0.8) * v_task.weight * 6;
    end if;
  end loop;

  return greatest(0, least(100, 100 - v_penalty::integer));
end;
$$;

-- ============================================================
-- Approve verification (atomic operation)
-- Updates: task.last_done_at, verification.status, scores, streak, activity
--
-- Actor is derived from auth.uid(), NOT a parameter — this prevents
-- callers from approving on behalf of another user. Caller must be a
-- party member of the verification's party AND not the original requester.
-- ============================================================
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

  -- Lock the verification row
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

  -- 1) Mark verification as approved
  update public.verifications
    set status = 'approved',
        resolved_by = v_user_id,
        resolved_at = now()
    where id = p_verification_id;

  -- 2) Update task's last_done_at
  update public.tasks
    set last_done_at = now(),
        last_done_by = v_verif.requested_by
    where id = v_verif.task_id;

  -- 3) Increment requester's score
  update public.scores
    set score = score + 10
    where party_id = v_verif.party_id and user_id = v_verif.requested_by;

  -- 4) Update streak (locked per party)
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

  -- 5) Increment user_totals
  update public.user_totals
    set approved_count = approved_count + 1
    where user_id = v_verif.requested_by;

  -- 6) Log activity
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

-- ============================================================
-- Reject verification — same auth posture as approve_verification.
-- ============================================================
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

  select * into v_verif from public.verifications where id = p_verification_id and status = 'pending' for update;
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

-- ============================================================
-- Create verification request + increment counter + activity log
-- ============================================================
create or replace function public.create_verification(
  p_task_id uuid,
  p_photo_placeholder text default null,
  p_photo_url text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_task record;
  v_new_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_task from public.tasks where id = p_task_id;
  if not found then raise exception '청소 항목을 찾을 수 없어요'; end if;

  -- Verify user is party member
  if not exists (
    select 1 from public.party_members
    where party_id = v_task.party_id and user_id = v_user_id
  ) then
    raise exception '파티 멤버만 인증을 요청할 수 있어요';
  end if;

  insert into public.verifications (task_id, party_id, requested_by, photo_placeholder, photo_url, status)
  values (p_task_id, v_task.party_id, v_user_id, p_photo_placeholder, p_photo_url, 'pending')
  returning id into v_new_id;

  update public.user_totals
    set requested_count = requested_count + 1
    where user_id = v_user_id;

  insert into public.activity (party_id, type, actor_id, target_id, metadata)
  values (
    v_task.party_id, 'request', v_user_id, p_task_id,
    jsonb_build_object('task_name', v_task.name, 'emoji', v_task.emoji)
  );

  return v_new_id;
end;
$$;

-- ============================================================
-- Look up a party by invite code (returns id + name only).
--
-- Used by the join page to show "you're about to join: {name}" before
-- the user is authenticated. Returns minimal data so we don't need a
-- wide-open SELECT policy on parties.
-- ============================================================
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

-- ============================================================
-- Join party by invite code
-- ============================================================
create or replace function public.join_party(p_invite_code text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_party_id uuid;
  v_user_id uuid := auth.uid();
  v_profile record;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select id into v_party_id from public.parties where invite_code = upper(p_invite_code);
  if not found then raise exception '유효하지 않은 초대 코드예요'; end if;

  -- Already a member?
  if exists (select 1 from public.party_members where party_id = v_party_id and user_id = v_user_id) then
    return v_party_id;
  end if;

  insert into public.party_members (party_id, user_id, role)
  values (v_party_id, v_user_id, 'member');

  insert into public.scores (party_id, user_id, score)
  values (v_party_id, v_user_id, 0)
  on conflict do nothing;

  select * into v_profile from public.profiles where id = v_user_id;

  insert into public.activity (party_id, type, actor_id, metadata)
  values (
    v_party_id, 'member_joined', v_user_id,
    jsonb_build_object('name', v_profile.name, 'emoji', v_profile.emoji)
  );

  return v_party_id;
end;
$$;
