# 🧹 CleanMate

> 혼자 하던 청소, 같이 하는 즐거움 — 파트너 상호 인증 기반 청소 습관 앱

CleanMate는 룸메이트/동거인/연인이 서로의 청소를 **사진으로 인증**하고, 상대방이 **확인**해야 완료되는 독특한 구조의 청소 관리 앱입니다. 허위 체크가 불가능해서 집안일 분담으로 인한 갈등을 줄입니다.

## 🛠 기술 스택

- **프론트엔드**: Next.js 16.2 (App Router, Turbopack) + React 19 + TypeScript
- **스타일**: Tailwind CSS 3.4 + Pretendard 폰트
- **백엔드**: Supabase (Postgres + Auth + Storage + Realtime)
- **기타**: Lucide Icons, Framer Motion, Zod
- **배포**: Vercel 권장 (무료 티어에서 시작 가능)

## 📁 프로젝트 구조

```
cleanmate/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 루트 (auth/onboarding 상태 확인 후 리다이렉트)
│   ├── layout.tsx                # 최상위 레이아웃 (폰트, 메타데이터)
│   ├── globals.css               # 글로벌 스타일
│   ├── login/                    # 로그인 (이메일 매직링크 + 익명)
│   ├── onboarding/               # 튜토리얼 (3단계)
│   ├── join/[code]/              # 초대 코드로 파티 참여
│   └── home/                     # 메인 앱 (SPA 스타일 단일 페이지에 모든 뷰)
│                                 #   → home / inbox / tasks / stats / activity /
│                                 #     mypage / achievements / settings / notifications
│                                 #     뷰를 내부 state로 전환
├── components/                   # 재사용 컴포넌트
│   ├── LivingRoom.tsx            # SVG 거실 (4개 상태)
│   ├── Character.tsx             # SVG 캐릭터 (기분별 표정)
│   ├── BottomNav.tsx             # 하단 네비게이션
│   └── modals/                   # 모달 컴포넌트
├── lib/
│   ├── supabase/                 # Supabase 클라이언트 (browser/server/middleware)
│   ├── db/                       # DB 쿼리 레이어 (tasks, verifications, ...)
│   ├── domain/                   # 순수 도메인 로직 (점수, 스트릭, 레벨, 배지)
│   └── utils/                    # 유틸리티 (알림, 공유, 날짜)
├── supabase/
│   ├── schema.sql                # 테이블 정의
│   ├── policies.sql              # Row Level Security 정책
│   ├── functions.sql             # DB 함수 & 트리거
│   └── seed.sql                  # 샘플 데이터 (개발용)
├── types/                        # TypeScript 타입 정의
├── hooks/                        # React 커스텀 훅
├── middleware.ts                 # Supabase 인증 세션 갱신
└── docs/                         # 추가 문서
```

## 🚀 빠른 시작 (5분 셋업)

### 1. 프로젝트 설치

```bash
npm install
# 또는 pnpm install (권장)
```

### 2. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성 (무료)
2. 프로젝트의 **Settings → API**에서 다음 값을 복사:
   - `Project URL`
   - `anon public` 키
   - `service_role` 키 (⚠️ 서버에서만 사용)

### 3. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열어서 복사한 값을 넣어주세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 4. DB 스키마 적용

Supabase 대시보드의 **SQL Editor**에서 다음 순서로 실행 (각각 한 번만):

1. `supabase/schema.sql` — 테이블 생성
2. `supabase/functions.sql` — 트리거 & RPC 함수 (`approve_verification`, `join_party`, `get_party_by_invite_code` 등)
3. `supabase/policies.sql` — Row Level Security 정책 + Storage 정책
4. `supabase/realtime.sql` — Realtime 구독 활성화 (없으면 인박스 실시간 알림 안 됨)
5. `supabase/grants.sql` — 테이블 GRANT (필수, 누락 시 "permission denied" 에러)
6. (선택) `supabase/seed.sql` — 샘플 데이터

> 이 5단계 중 어디서든 막히면 [`docs/SETUP_TROUBLESHOOTING.md`](docs/SETUP_TROUBLESHOOTING.md)를 먼저 확인하세요. 흔한 함정 4개의 증상/원인/해결을 정리해뒀어요.

또는 Supabase CLI를 사용하면:

```bash
npx supabase db push
```

> **이미 운영 중이라면**: 보안 마이그레이션을 별도로 적용해주세요.
> `supabase/migrations/2026-04-26-security-fixes.sql` 한 번 실행. 자세한 내용은 파일 헤더 코멘트 참조.

### 5. Authentication 설정

Supabase 대시보드에서:
- **Authentication → Providers**: 이메일 활성화
- **Authentication → Settings**: "Enable anonymous sign-ins" 체크 (데모용)
- **Authentication → URL Configuration**: Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**`

### 6. Storage 버킷 생성

**Storage → Create bucket**:
- 이름: `verifications`
- **Public: OFF** (꼭 OFF — 앱에서 signed URL을 생성해서 보여줍니다)

Storage RLS 정책은 **3번 단계의 `policies.sql`에 이미 포함**돼 있어요 (`verifications_upload_own`, `verifications_read_party`, `verifications_delete_own`). 별도로 추가할 SQL 없음.

### 7. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속!

## 📱 PWA

서비스 워커는 `@serwist/next` (이미 dependency에 포함)으로 자동 생성됩니다.
프로덕션 빌드(`npm run build`)에서만 활성화되고, dev 모드에서는 비활성화돼서 HMR 속도에 영향이 없어요.

배포 후 PWA 검증 방법, manifest 설정, custom domain 처리 등은
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) 참조.

## 🧪 데이터 모델 개요

```
auth.users (Supabase 관리)
  ├── profiles          (프로필: 이름, 이모지)
  ├── notification_settings
  └── user_badges

parties (파티/집)
  ├── party_members     (유저↔파티 조인)
  ├── tasks             (청소 항목)
  │   └── verifications (사진 인증 요청)
  ├── scores            (유저별 누적 점수)
  ├── streaks           (파티 스트릭)
  └── activity          (활동 로그)
```

## 🔐 인증 흐름

1. **익명 로그인** 또는 **이메일 로그인**
2. 로그인 시 자동으로:
   - `profiles` 레코드 생성 (트리거)
   - 개인 `party` 생성 (첫 로그인 시)
   - 기본 `notification_settings` 생성
3. 파트너 초대:
   - 내 파티의 `invite_code` 공유
   - 상대방이 `/join/[code]` 경로 방문 → 승인 → 파티 참여

## 🔔 실시간 기능

- **인증 요청 수신**: Supabase Realtime으로 `verifications` 테이블 구독
- **파트너 완료 알림**: Postgres 트리거로 활동 기록
- **웹 푸시 알림**: 브라우저 Notification API (추가 설정 필요)

## 🎨 디자인 시스템

### 방의 4가지 상태 (점수 기반 자동 전환)
| 점수 | 상태 | 이모지 | 무드 |
|------|------|--------|------|
| 85-100 | Clean | ☀️ | 맑음 |
| 60-84 | OK | ⛅ | 흐림 |
| 35-59 | Dirty | 🌧️ | 비 |
| 0-34 | Critical | ⛈️ | 천둥번개 |

컬러 토큰은 `lib/constants.ts`에 정의되어 있습니다.

## 📦 배포

### Vercel (권장)

```bash
npm install -g vercel
vercel
```

Vercel 대시보드에서 환경변수 설정 후 자동 배포됩니다.

### 환경변수 체크리스트 (프로덕션)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_SITE_URL` (선택, 이메일 리다이렉트용)

## 🛣 로드맵

- [x] 핵심 인증 플로우 (완료)
- [x] 방 상태 실시간 반영 (완료)
- [x] 스트릭 + 배지 시스템 (완료)
- [x] 마이페이지 + 알림 설정 (완료)
- [ ] 실시간 동기화 (Supabase Realtime)
- [ ] 푸시 알림 (웹 푸시 → 네이티브)
- [ ] 사진 AI 분석 (GPT-4V로 청소 완료도 평가)
- [ ] Capacitor로 iOS/Android 네이티브 빌드

## 🤝 기여

이 프로젝트는 개인 프로토타입에서 시작됐습니다. 개선 제안과 PR 환영합니다.

## 📄 라이선스

MIT

## 💡 Claude Code 사용 팁

이 프로젝트는 Claude Code(Anthropic)와 함께 개발되었습니다. `docs/ARCHITECTURE.md`에 주요 결정사항과 확장 방향이 정리되어 있으니, AI 에이전트와 함께 개발할 때 참고하세요.

명령어 예시:
```bash
# 실시간 동기화 기능 추가하기
claude "verifications 테이블에 Supabase Realtime 구독 붙여줘. 
       인박스 페이지에서 새 요청이 오면 자동으로 나타나게."

# 새 기능 추가
claude "요일별 청소 통계 페이지 /stats/weekly 만들어줘. 
       tasks의 verifications를 요일별로 집계해서 막대그래프로 보여줘."
```
