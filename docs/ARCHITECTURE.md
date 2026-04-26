# CleanMate — Architecture Notes

## Philosophy
CleanMate's core insight is **mutual verification**: tasks don't complete until
someone else (a party member) approves your submitted proof. This eliminates
self-reporting bias in household chore tracking.

## Data Flow

```
User action → Client DB function (lib/db/*) → Supabase RPC or direct query
           → Postgres trigger/function → Updated row
           → Realtime broadcast (TODO) → UI update via reload()
```

## Why SECURITY DEFINER functions?
Operations that touch multiple tables atomically (`approve_verification`,
`reject_verification`, `create_verification`, `join_party`) are implemented as
Postgres functions with `SECURITY DEFINER`. This:
1. Ensures atomic consistency (one transaction)
2. Lets us keep tables locked down with strict RLS
3. Centralizes business logic (streak calculation, score update, activity logging)

The downside: these functions must validate `auth.uid()` internally when called.

## Why a "party" abstraction?
Future-proofing for multi-household users (e.g., roommates + family). The
`party_members` junction table lets a single user belong to multiple parties.
For MVP, we default to one party per user (auto-created on signup).

## Score calculation
Implemented in BOTH places:
1. **Client** (`lib/domain/score.ts`) — instant UI feedback, no round-trip
2. **Server** (`calculate_room_score` function) — authoritative, for push notifications etc.

They should produce the same output. When you change the formula, update both.

## Streak logic
Streaks track **party-level consistency** (shared between members), not per-user.
The reasoning: a party's cleanliness depends on the group working together.
Individual contribution is tracked separately in `scores`.

## Badges
Badges are checked client-side after relevant mutations. The server stores the
result but doesn't re-check (trust boundary is the functions.sql). If badge logic
gets more complex (e.g., cheating detection), move to server.

## What's NOT implemented yet
- [ ] Real camera capture → Supabase Storage upload
- [ ] Realtime subscriptions for inbox (use `supabase.channel(...)` and listen for INSERTs on `verifications`)
- [ ] Web Push notifications (need service worker + VAPID keys + API route)
- [ ] Email invitations (use Supabase Auth email + custom templates)
- [ ] Multi-party support UI
- [ ] Typescript types auto-generation via Supabase CLI

## Suggested Claude Code tasks
```bash
# Add realtime inbox
claude "lib/db/verifications.ts의 listPendingForUser에 Supabase Realtime을 추가해줘. 
       새 pending verification이 생기면 클라이언트 상태를 자동 업데이트해야 해."

# Add real camera
claude "app/home/page.tsx의 camera view에서 실제 카메라 접근을 구현해줘. 
       getUserMedia로 사진 찍고, lib/db/verifications.ts의 uploadVerificationPhoto로 업로드해."

# Add push notifications
claude "Supabase Edge Function으로 web push를 구현해줘. 
       verifications에 INSERT 트리거가 걸리면 담당자에게 push를 보내야 해."
```

## Key files to understand first
1. `supabase/schema.sql` — the shape of the data
2. `supabase/functions.sql` — where business logic lives
3. `lib/domain/score.ts` — the core "how dirty is our room" algorithm
4. `app/home/page.tsx` — single-file app shell (will be split as the app grows)
5. `hooks/useAppData.ts` — data loading pattern
