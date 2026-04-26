# Supabase 셋업 트러블슈팅 가이드

> CleanMate를 처음 Supabase에 연결할 때 마주칠 수 있는 **4가지 흔한 함정**과 해결 방법을 정리한 문서입니다.
> 먼저 [정상 셋업 순서](#정상-셋업-순서-한-번에-통과)대로 진행하다가 막히면 해당 함정 섹션을 참조하세요.

---

## 정상 셋업 순서 (한 번에 통과)

이 순서를 그대로 따르면 모든 함정을 피할 수 있어요.

| 단계 | 어디서 | 무엇을 |
|------|--------|--------|
| 1 | Supabase 대시보드 | 새 프로젝트 생성 (Free tier, region: Seoul) |
| 2 | Settings → API → **Legacy 탭** | `Project URL` + `anon` + `service_role` 3개 키 복사 |
| 3 | 로컬 IDE | `cp .env.local.example .env.local` 후 **placeholder 모두 지우고** 실제 값 4줄로 작성 |
| 4 | SQL Editor | `schema.sql` → `functions.sql` → `policies.sql` → `realtime.sql` → `grants.sql` **순서대로 1회씩** |
| 5 | Storage | `verifications` 버킷 생성 (**Public: OFF**) |
| 6 | SQL Editor | Storage 정책 SQL (`verifications_upload_own`, `verifications_read_authenticated`) 1회 |
| 7 | Auth → Providers | Email **ON**, Confirm email **OFF**, Anonymous **ON** → Save |
| 8 | Auth → URL Configuration | Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**` |
| 9 | 로컬 터미널 | `npm run dev` |
| 10 | 브라우저 | `http://localhost:3000` 접속 → 익명 로그인 → 골든패스 검증 |

---

## 함정 4가지

### 함정 ①: `.env.local`에 placeholder를 안 지우고 실제 키를 추가함

#### 증상
- `npm run dev`로 서버는 뜨지만 Supabase 호출이 모두 실패
- 브라우저에 로그인 화면조차 안 뜨거나 빈 화면
- `curl https://...supabase.co/auth/v1/health` → 응답 없음 (DNS 실패)

#### 원인
`.env.local.example`을 `.env.local`로 복사하면 placeholder 값이 들어있어요:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

여기서 placeholder를 **지우지 않고** 그 아래에 실제 키를 추가하면 다음과 같이 됨:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co  ← 이게 사용됨
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key                ← 이게 사용됨
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key            ← 이게 사용됨
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co           ← 무시됨
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...                   ← 무시됨
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...                       ← 무시됨
```

대부분의 환경변수 파서는 **같은 키가 중복되면 첫 줄을 우선** 사용해요. 즉 placeholder가 활성화되어 `your-project.supabase.co`로 호출하다가 DNS resolve 실패.

#### 해결
`.env.local`을 다시 열어서 **placeholder 라인 4줄을 모두 삭제**하고 실제 값 4줄만 남기세요.

#### 빠른 검증
```bash
grep -E "your-(project|anon-key|service-role-key)" .env.local
```
→ 아무것도 출력 안 되면 OK. placeholder 라인이 보이면 그 줄들 삭제.

#### 예방
복사 직후 placeholder 라인을 먼저 **모두 지운 다음** 실제 값을 입력하는 습관 들이기.

---

### 함정 ②: `schema.sql`을 두 번 실행해서 "relation already exists" 에러

#### 증상
SQL Editor에서 `schema.sql` 실행했는데:
```
ERROR: 42P07: relation "profiles" already exists
```

#### 원인
`schema.sql`의 `create table public.profiles ...` 같은 명령은 **`IF NOT EXISTS`가 없어서** 이미 존재하면 즉시 에러로 멈춤. 첫 시도가 어딘가에서 멈췄거나, 사용자가 모르고 두 번 돌렸으면 일부 테이블이 만들어진 상태에서 재실행 → 첫 테이블에서 충돌.

#### 해결: public 스키마 wipe 후 재실행
SQL Editor 새 탭에서 다음을 먼저 실행:

```sql
drop schema public cascade;
create schema public;
grant all on schema public to postgres, anon, authenticated, service_role;
```

⚠️ 주의: 새 프로젝트가 아니라면 이 명령은 **모든 데이터를 날립니다**. 새로 만든 빈 프로젝트에서만 사용.

그 다음 `schema.sql`을 처음부터 다시 실행. 11개 테이블이 한 번에 생성됨.

#### 예방
- SQL은 **한 번씩만** 실행. 결과 메시지 (`Success. No rows returned`)를 확인하고 다음 단계로.
- 같은 SQL을 또 돌려야 할 일이 생기면, 이미 적용된 상태인지 먼저 확인 (Table Editor에서 테이블 존재 여부 등).

---

### 함정 ③: `drop schema public cascade` 후 GRANT 누락 — "permission denied for table X"

#### 증상
- 회원가입은 성공
- 그런데 onboarding 페이지에서 "시작하기" 누르자:
  ```
  permission denied for table party_members
  ```
- 또는 홈 화면 진입 직전 비슷한 빨간 에러 박스

#### 원인 — RLS와 GRANT는 별개의 보안 레이어

PostgreSQL은 **두 겹의 보안 게이트**가 있어요:

```
요청 → [GRANT 게이트] → [RLS 게이트] → 데이터
       (테이블 자체     (어떤 행을
        에 접근 가능?)   볼 수 있음?)
```

- **GRANT** = "이 사용자 역할(role)이 이 테이블에 어떤 동작을 할 수 있냐?"
- **RLS** = "이 사용자가 이 테이블의 어떤 행(row)을 볼 수 있냐?"

`policies.sql`은 **RLS만** 설정해요. GRANT는 보통 Supabase가 **새 테이블 생성 시 자동으로** anon/authenticated에 부여합니다.

그런데 `drop schema public cascade` → `create schema public`을 실행하면:
- 새 schema는 빈 상태
- 그 안에 schema.sql로 테이블을 다시 만들 때, **자동 GRANT 메커니즘이 항상 작동하지는 않음** (Supabase 내부 트리거 타이밍 이슈)
- 결과: RLS는 켜졌지만 GRANT는 누락 → 모든 쿼리가 첫 번째 게이트(GRANT)에서 차단

#### 해결: `grants.sql` 실행
이 프로젝트에는 [`supabase/grants.sql`](../supabase/grants.sql) 파일이 있어요. SQL Editor에서 한 번만 실행하세요:

```sql
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to anon, authenticated;
grant usage on all sequences in schema public to anon, authenticated;

-- 향후 만들어질 테이블에도 자동 적용
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant execute on functions to anon, authenticated;
alter default privileges in schema public grant usage on sequences to anon, authenticated;
```

이 SQL은 **RLS 정책의 보안 효과를 깨지 않아요**. RLS는 여전히 행 수준 통제를 그대로 함. GRANT는 단지 첫 번째 게이트(테이블 접근 자체)를 열어줄 뿐.

#### 예방
- 처음 셋업 시 wipe(drop schema)를 했다면 SQL 실행 순서에 `grants.sql`을 반드시 포함.
- 새 프로젝트(wipe 안 함)에서는 자동 GRANT가 잘 동작하므로 grants.sql 생략해도 OK이지만, 안전하게 항상 실행하는 습관도 권장.

---

### 함정 ④: PostgREST가 트랜시티브 관계를 자동 추론 못함 — "Could not find a relationship"

#### 증상
홈/인박스/활동 페이지에서:
```
Could not find a relationship between 'verifications' and 'profiles'
in the schema cache
```

또는 `party_members`/`activity` 등 다른 테이블 이름으로 비슷한 메시지.

DevTools Network 탭을 보면:
```
GET .../rest/v1/verifications?select=*,task:tasks(*),requester:profiles!...
→ 400 Bad Request
```

#### 원인 — 트랜시티브 관계는 자동 추론 X

CleanMate의 외래키 구조를 보면:

```
verifications.requested_by  ──→ auth.users.id
                                     ↑
profiles.id  ────────────────────────┘
```

`verifications`와 `profiles`는 **둘 다 `auth.users`를 거쳐서만** 연결돼요. 직접적인 FK가 없음.

PostgREST(Supabase의 REST API 엔진)는 **직접적인 외래키만** 자동으로 풀 수 있어요. 두 단계 건너뛴 트랜시티브 관계는 못 풀음. 코드가 다음처럼 join을 요청하면:

```ts
.select('*, requester:profiles!verifications_requested_by_fkey(*)')
```

PostgREST가 "verifications에 profiles로 가는 FK는 없다"라며 400 에러.

#### 해결 1: 코드에서 join 제거 (이 프로젝트가 채택한 방법)

`profiles` 정보는 클라이언트에서 이미 다른 경로로 받아오는 `members` 리스트로 lookup하면 됨:

```ts
// 기존 (실패):
.select('*, task:tasks(*), requester:profiles!verifications_requested_by_fkey(*)')

// 변경 (성공):
.select('*, task:tasks(*)')

// 그리고 UI 코드에서:
const requester = data.members.find((m) => m.id === verif.requested_by);
//                     ↑
//                     useAppData에서 이미 받은 멤버 리스트
```

이 프로젝트에서 수정된 파일:
- [`lib/db/verifications.ts`](../lib/db/verifications.ts) — `requester:profiles!...` 제거
- [`lib/db/activity.ts`](../lib/db/activity.ts) — `actor:profiles!...` 제거
- [`lib/db/profile.ts`](../lib/db/profile.ts) — `getPartyMemberProfiles`를 두 단계 fetch로 변경

#### 해결 2 (대안): schema에 직접 FK 추가

`schema.sql`에서 `verifications.requested_by`의 FK를 `auth.users` 대신 `public.profiles(id)`로 변경:

```sql
-- 기존:
requested_by uuid not null references auth.users on delete cascade,

-- 변경:
requested_by uuid not null references public.profiles(id) on delete cascade,
```

`profiles.id`가 이미 `auth.users.id`를 참조하므로 transitive cascade는 그대로 작동. 단, 이렇게 변경하면 PostgREST가 직접 FK를 보고 자동 추론 가능 → 코드 join 그대로 두어도 됨.

이 방법은 schema 자체를 바꾸므로 **새 프로젝트에서 처음부터** 적용하는 게 깔끔. 이미 운영 중이면 ALTER로 변경 가능하지만 데이터 영향 없는지 확인 필요.

#### 예방
- 외래키가 `auth.users`로 향하고 동시에 클라이언트가 `profiles` 정보를 원한다면 → **처음부터 코드를 lookup 패턴**으로 작성하거나, **schema FK를 `profiles`로** 향하게.
- supabase-js의 join 문법은 직접 FK에서만 작동한다는 점을 기억.

---

## 핵심 개념 두 가지 (보너스)

### A. RLS vs GRANT — 두 겹의 보안

| | GRANT | RLS |
|---|---|---|
| 통제 대상 | 테이블 자체에 접근 가능한지 | 어떤 **행(row)**을 볼 수 있는지 |
| 설정 위치 | `grant select on table X to role Y` | `create policy ... on table X for select using (...)` |
| 통과 못 하면 | "permission denied" | 빈 결과 (행 0개) |
| 비유 | 건물 입장권 | 건물 내 어떤 방에 들어갈 수 있는지 |

**둘 다 통과해야** 데이터 접근 가능. 한쪽이라도 막히면 차단.

### B. PostgREST의 자동 관계 추론

PostgREST는 PostgreSQL의 외래키 그래프를 읽어서 join 가능한 경로를 자동으로 알아냅니다.

```
A.fk_b ──→ B  : A→B join 가능 ✅
A.fk_b ──→ B.fk_c ──→ C  : A→C 직접 join 불가능 ❌ (A→B 또는 B→C는 OK)
```

**단일 FK만 자동 인식.** 두 단계 이상 건너뛴 관계는 클라이언트가 직접 `.in('id', ids)` 같은 식으로 분리해서 호출해야 합니다.

---

## 만약 또 새로운 에러가 나오면

1. **DevTools Console** 탭 열기 (F12)
2. 빨간 글씨 에러 메시지를 **텍스트로 복사** (이미지 말고)
3. 메시지의 키워드로 진단:
   - `permission denied for table X` → 함정 ③ (GRANT 누락)
   - `Could not find a relationship between X and Y` → 함정 ④ (트랜시티브 관계)
   - `relation X already exists` → 함정 ② (SQL 두 번 실행)
   - 그 외 → 새로운 원인. 메시지 그대로 검색하거나 도움 요청.

---

## 정리

| 함정 | 한 줄 요약 |
|---|---|
| ① `.env.local` 중복 | placeholder 라인 안 지우고 진짜 키 추가 → 첫 줄 우선 → 실패 |
| ② SQL 두 번 실행 | `create table`은 idempotent 안 함 → 한 번만 |
| ③ GRANT 누락 | wipe 후 자동 grant가 안 걸림 → `grants.sql` 한 번 실행 |
| ④ 트랜시티브 관계 | PostgREST는 직접 FK만 자동 인식 → 코드에서 lookup 분리 |

이 4가지만 알면 처음 셋업의 80% 이상은 막힘 없이 통과합니다. 행운을 빕니다 🍀
