# CleanMate — Security Posture Report

**Date:** 2026-04-26
**Mode:** daily (8/10 confidence gate)
**Scope:** full
**Branch:** main (commit 3d343f6)
**Stack:** Next.js 16.2.4 + React 19 + Supabase (Postgres + Auth + Storage + Realtime)
**Architecture note:** Zero API routes. All data access goes through Supabase client (anon key). RLS is the entire security boundary.

---

## ATTACK SURFACE MAP

```
CODE SURFACE
  Public endpoints:      2  (/login, /join/[code])
  Authenticated routes:  17 (everything under app/(app)/* + /onboarding)
  Admin-only:            0
  API endpoints:         0
  File upload points:    1  (verifications photo upload via Supabase Storage)
  External integrations: 1  (Supabase only)
  Background jobs:       0
  WebSocket channels:    3  (supabase_realtime: verifications, tasks, activity)

INFRASTRUCTURE SURFACE
  CI/CD workflows:       0  (deploy via Vercel direct git connection)
  Webhook receivers:     0
  Container configs:     0
  IaC configs:           0
  Deploy targets:        1  (Vercel — project "certification")
  Secret management:     env vars (.env.local, Vercel project envs)
```

---

## TOP-LINE VERDICT

**CRITICAL exposure in the database authorization layer.** The app has no API routes, so every read/write goes directly from the browser to Postgres. That makes RLS the entire defense line, and the RLS policies have a hole large enough to drive a truck through: any unauthenticated user with the public anon key (which is in every page bundle) can dump every party row in the database, including invite codes. Once you have an invite code, `join_party()` lets you walk into any household.

Two SECURITY DEFINER functions (`approve_verification`, `reject_verification`) also trust caller-supplied user IDs without checking `auth.uid()`, so anyone who learns a verification UUID can approve or reject it as anyone.

Fix the parties policy first. Everything else is downstream of that.

---

## SECURITY FINDINGS

| # | Sev | Conf | Status | Category | Finding | Phase | File:Line |
|---|-----|------|--------|----------|---------|-------|-----------|
| 1 | **CRIT** | 9/10 | VERIFIED | A01 / RLS | `parties_select_by_invite using (true)` exposes every party + invite_code to anon role | P9 | supabase/policies.sql:69-72 |
| 2 | **HIGH** | 9/10 | VERIFIED | A01 / RLS | `approve_verification` / `reject_verification` trust caller-supplied approver_id; no `auth.uid()` check | P9 | supabase/functions.sql:94-239 |
| 3 | **HIGH** | 7/10 | UNVERIFIED | A05 / Data | Verification photos uploaded with `getPublicUrl`; storage RLS commented out in repo | P11 | supabase/policies.sql:197-214, lib/db/verifications.ts:87-94 |
| 4 | **HIGH** | 8/10 | VERIFIED | A01 / RLS | `parties_update_members` has USING but no WITH CHECK — any party member can rotate invite_code or rename party | P9 | supabase/policies.sql:74-76 |
| 5 | MED | 8/10 | VERIFIED | A05 / RLS | `profiles_update_self` has no WITH CHECK — narrow impact, but inconsistent with other tables | P9 | supabase/policies.sql:54-56 |
| 6 | MED | 7/10 | VERIFIED | Secrets | `SUPABASE_SERVICE_ROLE_KEY` present in `.env.local` but never imported anywhere — dead config | P2 | .env.local:3 |
| 7 | LOW | 8/10 | VERIFIED | Hygiene | `.gstack/` not in `.gitignore` — security reports could be committed | P14 | .gitignore |

---

## Finding 1 — Wide-open RLS on `parties` table — `supabase/policies.sql:69-72`

**Severity:** CRITICAL
**Confidence:** 9/10
**Status:** VERIFIED
**Phase:** 9 — OWASP A01 Broken Access Control
**Category:** Row-Level Security misconfiguration

**Description:**
Two SELECT policies are defined on `public.parties`:

```sql
-- supabase/policies.sql:65-67
create policy "parties_select_members"
  on public.parties for select
  using (public.is_party_member(id));

-- supabase/policies.sql:69-72   ← THE PROBLEM
create policy "parties_select_by_invite"
  on public.parties for select
  using (true);
```

In Postgres RLS, multiple permissive policies for the same action are combined with OR. So the effective policy is `is_party_member(id) OR true` = `true` for every row, every role. Plus, the policy has no `TO authenticated` clause, so it applies to the `anon` role too. Plus, `grants.sql:17` grants `select` on all tables to `anon`. Both gates are open.

The `parties` table includes `invite_code` (`schema.sql:28` — `text unique not null`).

**Exploit scenario:**
1. Attacker grabs the public `NEXT_PUBLIC_SUPABASE_ANON_KEY` from any page of the deployed app (it's bundled in JS, designed to be public — RLS is supposed to protect data).
2. Without logging in, hits the Supabase REST API:
   ```
   GET https://<project>.supabase.co/rest/v1/parties?select=*
   apikey: <anon-key>
   ```
   Receives every party in the database: id, name, **invite_code**, created_by, created_at.
3. Authenticates (or signs in anonymously — `signInAnonymously` is enabled in `app/login/page.tsx:118`, which costs nothing and creates a usable session).
4. For each leaked invite code, calls:
   ```
   POST /rest/v1/rpc/join_party  body: { p_invite_code: "ABC123" }
   ```
   `join_party` is SECURITY DEFINER and only checks that the caller is authenticated and the code exists (`functions.sql:291-328`). The attacker is now a member of every household.
5. As a party member, RLS now grants the attacker SELECT on every `tasks`, `verifications`, `scores`, `streaks`, `activity`, and `user_totals` row in those parties — including all uploaded photo URLs.

**Impact:** Full read access to every household's tasks, verification photos, scores, and activity log. Lateral takeover of every party in the database.

**Recommendation:** Drop the second policy entirely. Invite-by-code lookup should be done via a SECURITY DEFINER function that takes the code as input and returns just the public-facing fields (`name`, maybe `id`), not via a wide-open SELECT.

```sql
drop policy "parties_select_by_invite" on public.parties;

create or replace function public.get_party_by_invite_code(p_code text)
returns table(id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name from public.parties where invite_code = upper(p_code) limit 1;
$$;

grant execute on function public.get_party_by_invite_code(text) to anon, authenticated;
```

Then update `lib/db/party.ts`'s `getPartyByInviteCode` to call this RPC instead of `select * from parties where invite_code = ?`.

**Playbook:**
1. Apply the migration above in Supabase SQL editor.
2. Update `lib/db/party.ts` to use the RPC.
3. Test: log in as a fresh user → confirm `select * from parties` returns only your own parties.
4. Rotate any invite codes that may already be in the wild — `update public.parties set invite_code = upper(substring(md5(random()::text) from 1 for 6))` (this will break existing share links, accept it).

---

## Finding 2 — SECURITY DEFINER functions trust caller-supplied user IDs — `supabase/functions.sql:94-239`

**Severity:** HIGH
**Confidence:** 9/10
**Status:** VERIFIED
**Phase:** 9 — OWASP A01 Broken Access Control
**Category:** Privileged function trust boundary

**Description:**
`approve_verification(p_verification_id, p_approver_id)` and `reject_verification(p_verification_id, p_rejecter_id, p_reason)` are `SECURITY DEFINER` (run with elevated privileges, bypass RLS). Neither function:
- Calls `auth.uid()` to verify the caller is authenticated.
- Checks that the caller IS the `p_approver_id` they claim to be.
- Checks that the approver/rejecter is a party member of the verification's party.

```sql
-- supabase/functions.sql:94-127  (excerpt of approve_verification)
create or replace function public.approve_verification(
  p_verification_id uuid,
  p_approver_id uuid
) returns json
language plpgsql
security definer
as $$
declare
  v_verif record;
  ...
begin
  -- Lock the verification row
  select * into v_verif from public.verifications where id = p_verification_id ...
  -- ↑ NO check that p_approver_id = auth.uid() or that auth.uid() is a party member
```

Compare with `create_verification` (`functions.sql:255-268`) which correctly does:
```sql
v_user_id uuid := auth.uid();
if v_user_id is null then raise exception 'Not authenticated'; end if;
if not exists (select 1 from public.party_members where party_id = ... and user_id = v_user_id) then
  raise exception '파티 멤버만 인증을 요청할 수 있어요';
```

The grant `grant execute on all functions in schema public to anon, authenticated;` (`grants.sql:18`) means even `anon` can call these.

**Exploit scenario:**
1. Attacker learns a verification UUID. Direct path is blocked — RLS on `verifications` requires `is_party_member(party_id)`. But realtime is enabled on `verifications` (`realtime.sql:10`) and the activity table contains `target_id` which sometimes equals verification IDs and is sent through the same realtime channel.
2. Once attacker has a UUID and any logged-in session (or even just the anon key), they call:
   ```js
   await supabase.rpc('approve_verification', {
     p_verification_id: '<leaked-uuid>',
     p_approver_id: '<arbitrary-user-uuid>'
   });
   ```
3. The function executes as definer, bypassing all RLS. Approves the task, increments scores, updates the streak — for a party the attacker has no business in, attributing the approval to a fabricated user UUID.

**Impact:** With a leaked verification UUID, an attacker can approve/reject any pending verification in any party. The `p_approver_id` parameter being trusted means audit logs lie about who acted.

The reachability of verification UUIDs to non-party-members is what makes this HIGH not CRITICAL. UUIDs are unguessable in practice. But: realtime channels, log files, dev tools, share buttons, and `target_id` in activity rows all leak these IDs. Defense-in-depth says: never trust a SECURITY DEFINER caller-supplied identity.

**Recommendation:** Both functions should derive the actor from `auth.uid()`, drop the parameter, and verify party membership.

```sql
create or replace function public.approve_verification(p_verification_id uuid)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_verif record;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_verif from public.verifications
    where id = p_verification_id and status = 'pending' for update;
  if not found then raise exception '인증 요청을 찾을 수 없어요'; end if;

  if not exists (
    select 1 from public.party_members
    where party_id = v_verif.party_id and user_id = v_user_id
  ) then
    raise exception '파티 멤버만 승인할 수 있어요';
  end if;

  -- Optional: prevent self-approval
  if v_verif.requested_by = v_user_id then
    raise exception '본인이 요청한 인증은 본인이 승인할 수 없어요';
  end if;

  -- ... rest of the existing logic, using v_user_id instead of p_approver_id ...
end;
$$;
```

Same shape for `reject_verification`. Update `lib/db/verifications.ts:50-76` to drop the `approverId` / `rejecterId` arguments.

---

## Finding 3 — Verification photo storage may be world-readable — `lib/db/verifications.ts:87-94`, `supabase/policies.sql:197-214`

**Severity:** HIGH
**Confidence:** 7/10
**Status:** UNVERIFIED (depends on Supabase dashboard bucket configuration — cannot inspect from code alone)
**Phase:** 11 — Data Classification + 9 — OWASP A05 Security Misconfiguration

**Description:**
Photo upload at `lib/db/verifications.ts:87-94`:
```ts
const path = `${userId}/${Date.now()}.jpg`;
await supabase.storage.from('verifications').upload(path, file, ...);
const { data } = supabase.storage.from('verifications').getPublicUrl(path);
return data.publicUrl;
```

`getPublicUrl` only returns a useful URL if the bucket is **public**. If the bucket is public, anyone with the URL can view the photo, forever, no auth required. The URL is then stored in `verifications.photo_url` and rendered to other party members.

Compounding: the storage RLS policies are committed-out in `supabase/policies.sql:197-214`:
```sql
/*
-- Policy: "Users can upload verification photos to their own path"
create policy "verifications_upload_own" ...
*/
```
Comment says "run in Supabase dashboard after creating bucket." So the actual storage policies are untestable from this repo.

Even the commented version had a flaw: `verifications_read_party` only checked `bucket_id = 'verifications'` with no party-member join (the comment admits this). If those policies were applied as-is, any authenticated user could enumerate any photo path.

Also: the upload path uses `userId` from the client — `data.userId` from `useAppContext`. If storage RLS doesn't enforce `(storage.foldername(name))[1] = auth.uid()::text`, an attacker could upload to another user's folder, polluting their evidence trail.

**Exploit scenarios:**
- *If bucket is public:* Anyone with a leaked URL (logs, screenshots shared in support, browser history sync) sees the photo permanently. Combined with Finding 1, an attacker who joined a household via leaked invite code can list `verifications.photo_url` and download every photo.
- *If storage RLS lacks the user-folder check:* Authenticated user A uploads to `<userB>/{ts}.jpg`, framing user B for actions they didn't take.

**Recommendation:**
1. Make the bucket private. Use `createSignedUrl` (15 min expiry) instead of `getPublicUrl`. Update `lib/db/verifications.ts:93-94`:
   ```ts
   const { data, error } = await supabase.storage
     .from('verifications')
     .createSignedUrl(path, 60 * 15);
   ```
   Store the path in `verifications.photo_url`, not the URL. Generate fresh signed URLs at render time.
2. Apply the storage policies for real (uncomment them in `policies.sql` and run, or set in dashboard):
   ```sql
   create policy "verifications_upload_own" on storage.objects for insert
     with check (
       bucket_id = 'verifications'
       and (storage.foldername(name))[1] = auth.uid()::text
     );

   create policy "verifications_read_party" on storage.objects for select
     using (
       bucket_id = 'verifications'
       and exists (
         select 1 from public.verifications v
         join public.party_members pm on pm.party_id = v.party_id
         where v.photo_url like '%' || name || '%'
           and pm.user_id = auth.uid()
       )
     );
   ```
3. Verify in the Supabase dashboard: Storage → Buckets → `verifications` → Settings — confirm "Public bucket" is OFF and Policies tab shows the two policies above.

---

## Finding 4 — `parties_update_members` lacks WITH CHECK — `supabase/policies.sql:74-76`

**Severity:** HIGH
**Confidence:** 8/10
**Status:** VERIFIED
**Phase:** 9 — OWASP A01 Broken Access Control

**Description:**
```sql
create policy "parties_update_members"
  on public.parties for update
  using (public.is_party_member(id));
```

UPDATE policies need both `USING` (which rows can be updated) AND `WITH CHECK` (what new values are allowed). With only USING, a party member can update any column to any value as long as they're a member of the row.

**Exploit scenario:**
A malicious member of party X (e.g., disgruntled ex-roommate who hasn't been removed):
- Rotates `invite_code` repeatedly to lock out the other member trying to invite a new person.
- Renames the party to harassment text.
- Sets `created_by` to themselves (small thing, but it lies in the audit log).

**Recommendation:**
```sql
drop policy "parties_update_members" on public.parties;

create policy "parties_update_members"
  on public.parties for update
  using (public.is_party_member(id))
  with check (
    public.is_party_member(id)
    -- prevent tampering with invariants:
    and id = (select id from public.parties where id = parties.id)
    and created_by = (select created_by from public.parties where id = parties.id)
    and created_at = (select created_at from public.parties where id = parties.id)
  );
```

Better: restrict updates to specific columns via column grants, or move party-rename / invite-rotate to dedicated SECURITY DEFINER functions that enforce role = 'owner'.

---

## Finding 5 — `profiles_update_self` lacks WITH CHECK — `supabase/policies.sql:54-56`

**Severity:** MEDIUM
**Confidence:** 8/10
**Status:** VERIFIED

**Description:**
```sql
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid());
```

Same shape as Finding 4 but lower impact: `id` is a FK to `auth.users(id)` so the user can't change their `id` to another user (FK fails). They CAN, however, set `name` and `emoji` to anything — including UTF-8 lookalikes used to impersonate another party member in the UI.

**Recommendation:**
```sql
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
```

Add server-side validation on `name` length/charset in a trigger or constraint, or strip control characters and zero-width chars on insert/update.

---

## Finding 6 — `SUPABASE_SERVICE_ROLE_KEY` set but unused — `.env.local`

**Severity:** MEDIUM
**Confidence:** 7/10
**Status:** VERIFIED

**Description:**
`.env.local` contains `SUPABASE_SERVICE_ROLE_KEY=<actual-key>` but `grep -r "SERVICE_ROLE"` across the entire codebase returns zero matches. The key is set in your local environment (and presumably in Vercel project envs based on `.env.local.example` documenting it). This is dead config that confers risk: a future contributor seeing it might import it carelessly, and the key sits in your shell environment for any process to read.

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. Leaking it = full database access.

**Exploit scenario:**
- A future PR adds an admin route or webhook that imports the service role key. If that route ships without sufficient guards (e.g., gated only by a path check, or runs in a route that can be reached by user input), the entire RLS posture is bypassed.
- Vercel function logs may capture env vars in stack traces. If `SERVICE_ROLE_KEY` is set on the project but never used, that's the worst of both worlds — the secret is exposed to operations without giving you the runtime benefit.

**Recommendation:**
- Remove `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`, `.env.local.example`, and the Vercel project env vars until you actually need it.
- When you DO need it (e.g., for a webhook or admin script), import it ONLY in `server-only` modules and grep-verify before each release that no `NEXT_PUBLIC_` env shares its name.
- Rotate it now in the Supabase dashboard regardless, since it's been sitting in `.env.local` on a developer machine.

---

## Finding 7 — `.gstack/` not in `.gitignore` — `.gitignore`

**Severity:** LOW
**Confidence:** 8/10

Security reports written to `.gstack/security-reports/` could be committed accidentally. They contain attack scenarios and exploit details that should not be in the public git history.

**Recommendation:**
```bash
echo '.gstack/' >> .gitignore
```

---

## STRIDE Threat Model — Top components

```
COMPONENT: parties / party_members (joining + ownership)
  Spoofing:               Anonymous sign-in is enabled (login/page.tsx:118) — no email verification needed
  Tampering:              ★ Finding 4 — any member can rotate invite_code or rename party
  Repudiation:            ★ Finding 2 — approve/reject log p_approver_id supplied by client, not auth.uid()
  Information Disclosure: ★★★ Finding 1 — every party readable by anon
  Denial of Service:      Anonymous signups create 5+ DB rows each (handle_new_user trigger). No rate limit at app layer.
  Elevation of Privilege: ★ Finding 1 + join_party = lateral takeover of any household

COMPONENT: verifications + storage
  Spoofing:               ★ Finding 2 — approver identity not enforced
  Tampering:              Storage path uses client-supplied userId (Finding 3)
  Information Disclosure: ★★ Finding 3 — getPublicUrl + uncertain bucket privacy
  Repudiation:            Activity log records actor_id from caller, partly via SECURITY DEFINER funcs (Finding 2)

COMPONENT: profiles
  Tampering:              Finding 5 — no WITH CHECK on update
  Information Disclosure: profiles_select policy correctly scopes to co-party-members
```

---

## DATA CLASSIFICATION

```
RESTRICTED:
  - Supabase auth.users (passwords managed by Supabase, OK)
  - SUPABASE_SERVICE_ROLE_KEY (Finding 6 — unused but present)

CONFIDENTIAL:
  - parties.invite_code (Finding 1 — exposed)
  - verifications.photo_url (Finding 3 — possibly public)
  - All household activity, scores, streaks (downstream of Finding 1)

INTERNAL:
  - profiles.name, emoji (user-controlled, no XSS sinks found in codebase ✓)

PUBLIC:
  - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (intentional)
```

---

## SUPPLY CHAIN SUMMARY

```
Direct deps:        13
Total deps:         507
Critical CVEs:      0
High CVEs:          0
Moderate CVEs:      3 (postcss XSS — transitive of next, no fix yet, GHSA-qx2v-qp2m-jg93)
Install scripts:    0 in production deps ✓
Lockfile present:   ✓ package-lock.json
Lockfile tracked:   ✓
```

The postcss CVE (CVSS 6.1) only triggers when processing untrusted CSS through postcss's stringify path. Build-time, no untrusted CSS in your pipeline. Note for awareness, no action required.

---

## SECRETS ARCHAEOLOGY

```
Git history secrets:    0 leaked  ✓ (scanned for AKIA, sk-, sk_live_, ghp_)
.env files tracked:     only .env.local.example (placeholders only)  ✓
.env.local in gitignore: ✓
CI configs with secrets: N/A (no CI files)
```

---

## CI/CD PIPELINE

No GitHub Actions, no GitLab CI, no CircleCI. Deploy is via Vercel's git-push integration. Phase 4 (CI/CD security) has nothing to flag. Be aware: when you DO add CI later, pin third-party actions to commit SHAs and never use `pull_request_target` with PR code checkout.

---

## REMEDIATION ROADMAP — Top 3 to fix this week

```
1. Finding 1 — Fix parties RLS  (effort: 30 min CC, 4h human)
   ★ Drop parties_select_by_invite, replace with get_party_by_invite_code RPC
   ★ Update lib/db/party.ts:getPartyByInviteCode to call the RPC
   ★ Rotate all existing invite_codes (acceptable — breaks live share links)

2. Finding 2 — Fix approve/reject auth checks (effort: 30 min CC, 4h human)
   ★ Rewrite approve_verification + reject_verification to use auth.uid()
   ★ Drop the *_id parameter from both
   ★ Update lib/db/verifications.ts to drop the id arg from the wrapper

3. Finding 3 — Lock down storage (effort: 20 min CC, 2h human)
   ★ Set verifications bucket to private in Supabase dashboard
   ★ Switch lib/db/verifications.ts to createSignedUrl
   ★ Apply the (corrected) storage policies for upload + read
   ★ Verify upload requires (storage.foldername(name))[1] = auth.uid()::text
```

---

## FILTER STATS

```
Candidates scanned:       ~30 patterns across 11 SQL files + 24 page/lib files
Hard-exclusion filtered:  4 (DoS-shape findings, doc-only mentions)
Confidence-gate filtered: 2 (anonymous-signup abuse, postcss CVE — informational only)
Verification filtered:    0
Reported:                 7
```

---

**This tool is not a substitute for a professional security audit.** /cso is an AI-assisted scan that catches common vulnerability patterns. It is not comprehensive, not guaranteed, and not a replacement for hiring a qualified security firm. LLMs can miss subtle vulnerabilities, misunderstand complex auth flows, and produce false negatives. For production systems handling sensitive data, payments, or PII, engage a professional penetration testing firm. Use /cso as a first pass to catch low-hanging fruit between professional audits, not as your only line of defense.
