# Claude Code에서 이어서 개발하기

이 문서는 이 프로젝트를 Claude Code (Antigravity) 환경에서 이어서 개발할 때
가장 먼저 읽어야 할 가이드입니다.

---

## ✅ 이미 완성되어 있는 것

### 풀스택 기반
- **Next.js 16.2 + React 19 + TypeScript 5.7** 프로젝트 세팅 완료
- **Tailwind CSS 3.4** 설정 (브랜드 컬러 토큰, Pretendard/Caveat 폰트)
- **미들웨어**로 Supabase 인증 세션 자동 갱신
- 절대 경로 `@/*` 적용 (`tsconfig.json`)

### 백엔드 (Supabase)
`supabase/` 폴더의 4개 SQL 파일을 **순서대로** 대시보드 SQL Editor에서 실행하면 됩니다.

| 파일 | 내용 |
|------|------|
| `schema.sql` | 11개 테이블 (profiles, parties, party_members, tasks, verifications, scores, streaks, activity, user_badges, notification_settings, user_totals) + 트리거 |
| `functions.sql` | `handle_new_user`, `approve_verification`, `reject_verification`, `create_verification`, `join_party`, `calculate_room_score` (RPC로 앱에서 호출) |
| `policies.sql` | 모든 테이블의 Row Level Security 정책 + `is_party_member()` 헬퍼 |
| `seed.sql` | (선택) 샘플 청소 항목 6개 삽입 |

스토리지 버킷 `verifications`도 만들어 주세요 (RLS 보호).

### 프론트엔드 구조

```
app/page.tsx              → 루트: auth 확인 후 /login, /onboarding, /home 중으로 리다이렉트
app/login/page.tsx        → 이메일 매직링크 로그인 + 익명 로그인 (데모용)
app/onboarding/page.tsx   → 3단계 튜토리얼 (웰컴 → 컨셉 → 프로필)
app/join/[code]/page.tsx  → 초대 코드로 파티 참여
app/home/page.tsx         → 메인 앱 (1499줄, SPA 스타일로 모든 뷰 내장)
                            └ view state로 전환: home/inbox/tasks/stats/mypage/
                              settings/notifications/achievements/activity/
                              camera/waiting/add_task/edit_task/edit_profile
```

### 라이브러리 레이어
- `lib/supabase/` — client (browser), server (SSR), middleware (세션 갱신)
- `lib/db/` — 각 도메인의 쿼리 함수 (profile, party, tasks, verifications, scores, streaks, activity, badges, notifications, user_totals)
- `lib/domain/` — 순수 로직 (점수 계산, 스트릭, 레벨, 배지)
- `lib/utils/` — 브라우저 알림, 공유, 날짜 포맷
- `lib/constants.ts` — THEME, BADGES, 이모지, 주기 옵션 등

### 커스텀 훅
- `hooks/useAppData.ts` — 파티 전체 데이터를 한 번에 로드하고 refresh 제공

---

## 🚧 Claude Code에서 우선 작업할 것들

### 1. `npm install` 후 첫 빌드 에러 해결
```bash
npm install
npm run type-check  # TypeScript 에러가 있을 수 있음
npm run dev
```

주요 체크포인트:
- `types/database.ts`는 **수작업 플레이스홀더**입니다. Supabase 스키마 적용 후 자동 재생성:
  ```bash
  npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
  ```
- RPC 응답 타입은 수동으로 정의했어요. 실제 응답과 다를 경우 `types/database.ts`의 `Functions` 섹션을 수정하세요.

### 2. 현재 구조의 리팩토링 결정
`app/home/page.tsx`는 편의상 **1500줄 SPA**로 만들어져 있습니다. 프로덕션 완성도를 올리려면:

**옵션 A** (권장, Next.js 스타일): 뷰별로 별도 라우트로 분리
```
app/
├── (app)/
│   ├── layout.tsx          # BottomNav 공통
│   ├── page.tsx            # home (거실)
│   ├── inbox/page.tsx
│   ├── tasks/page.tsx
│   ├── tasks/new/page.tsx
│   ├── tasks/[id]/edit/page.tsx
│   ├── camera/[taskId]/page.tsx
│   ├── stats/page.tsx
│   ├── activity/page.tsx
│   ├── me/page.tsx
│   ├── me/edit/page.tsx
│   ├── achievements/page.tsx
│   └── settings/
│       ├── page.tsx
│       ├── notifications/page.tsx
│       └── partner/page.tsx
```

각 라우트는 서버 컴포넌트에서 데이터 fetch → 클라이언트 컴포넌트로 hydrate. `app/home/page.tsx`의 각 뷰 JSX 블록을 그대로 떼어내면 됩니다.

**옵션 B** (빠름): 그냥 SPA 유지하고 모달·모듈화만 분리

### 3. 컴포넌트 추출
지금 `home/page.tsx`에 인라인으로 박혀있는 것들을 `components/modals/`로 빼기:
- `RejectDialog` — 인증 반려 사유 선택 바텀시트
- `DeleteConfirmDialog` — 항목 삭제 확인
- `ShareModal` — 친구 초대 모달
- `NewBadgesModal` — 배지 획득 축하 모달

### 4. 이미지 업로드 연결
현재 인증 사진은 placeholder 이모지입니다. 실제 카메라/갤러리 업로드를 연결하려면:
- `lib/db/verifications.ts`의 `uploadVerificationPhoto()` 이미 구현됨 (Supabase Storage `verifications` 버킷)
- `app/home/page.tsx`의 camera 뷰에서 `<input type="file" accept="image/*" capture="environment">`로 교체
- 업로드 후 반환된 public URL을 `createVerification` RPC의 `photo_url` 파라미터로 전달

### 5. 실시간 기능 (Realtime)
Supabase Realtime을 이용한 push 업데이트:
- 파트너가 인증 요청하면 인박스 배지가 즉시 뜨도록
- `useAppData` 훅에 `supabase.channel().on('postgres_changes', ...)` 추가

### 6. PWA 완성
- `public/manifest.json`은 이미 있음
- 아이콘이 플레이스홀더예요 — `public/icons/`에 실제 192x192, 512x512 PNG 넣기
- `next-pwa` 또는 Next.js 16 내장 서비스 워커로 오프라인 지원 추가

### 7. 프로덕션 배포
`docs/DEPLOYMENT.md` 참고. Vercel + Supabase 조합이 가장 쉽습니다.

---

## 🔍 Claude Code에서 유용한 명령

```bash
# 개발
npm run dev                # Turbopack으로 dev 서버 (Next.js 16 기본)
npm run type-check         # TypeScript 에러 체크만 (빌드 없이)
npm run lint               # ESLint

# DB
npx supabase gen types typescript --project-id XXX > types/database.ts   # 타입 재생성
npx supabase db push                                                       # 로컬 마이그레이션 적용

# 빌드 & 실행
npm run build && npm start
```

---

## 💡 프롬프트 팁 (Claude Code 내 사용)

작업 요청할 때 이런 식으로 구체적으로 말하면 좋아요:

- "`app/home/page.tsx`의 inbox 뷰 JSX 블록을 `app/(app)/inbox/page.tsx`로 분리해줘. 데이터는 서버에서 `listPendingForUser()`로 가져오고, 승인/반려 action은 클라이언트 컴포넌트로 빼줘."
- "`lib/db/verifications.ts`의 `uploadVerificationPhoto`에 이미지 압축 로직 추가해줘. `browser-image-compression` 라이브러리 쓰고 최대 1920px로 리사이즈."
- "`useAppData` 훅에 Supabase Realtime subscription 추가해서 verifications 테이블 INSERT를 감지하면 refetch 하도록 해줘."
- "iOS Safari에서 100vh 이슈 해결해줘. `dvh` 사용하거나 JS로 viewport 높이 계산."

---

## 📝 알려진 제약/TODO

- [ ] `types/database.ts` Supabase CLI로 재생성 필요
- [ ] 이미지 업로드 UI 미연결 (백엔드는 준비됨)
- [ ] 실제 PWA 아이콘 추가 필요
- [ ] 푸시 알림 (FCM/Web Push)은 지금 브라우저 Notification만 지원
- [ ] 다국어 (i18n) 미적용 — 한국어 하드코딩
- [ ] E2E 테스트 없음 (Playwright 추천)
- [ ] `approve_verification` RPC의 배지 자동 해금 로직 — 현재 클라이언트에서 체크, DB에서도 해주면 더 안전
- [ ] Rate limiting / abuse 방지 (프로덕션 전 필요)

---

즐거운 개발 되세요! 🧹✨
