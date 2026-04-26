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
app/login/page.tsx        → 이메일 로그인 + 익명 로그인 (퍼블릭)
app/onboarding/page.tsx   → 3단계 튜토리얼 (웰컴 → 컨셉 → 프로필)
app/join/[code]/page.tsx  → 초대 코드로 파티 참여 (퍼블릭, get_party_by_invite_code RPC 사용)
app/(app)/                → 인증 필요한 메인 앱 (proxy.ts 미들웨어가 미인증 시 /login으로)
  ├── layout.tsx          → BottomNav + AppDataProvider
  ├── AppDataProvider.tsx → 파티 데이터 + 실시간 구독
  ├── page.tsx            → 홈 (거실)
  ├── inbox/page.tsx      → 인증 요청함 (signed URL로 사진 표시)
  ├── tasks/              → 청소 항목 목록/추가/편집
  ├── camera/[taskId]/    → 인증 사진 업로드
  ├── stats/page.tsx      → 통계
  ├── activity/page.tsx   → 활동 로그
  ├── achievements/       → 배지
  ├── inbox, me, settings → ...
```

> **참고**: 초기 버전은 `app/home/page.tsx` 한 파일에 1500줄 SPA였지만,
> 현재는 `app/(app)/` route group으로 분리 완료됐어요. 이 문서가 SPA 구조를
> 언급하는 부분이 남아있다면 stale.

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

### 2. ✅ 라우트 분리 완료
초기 버전의 `app/home/page.tsx` 1500줄 SPA는 이미 `app/(app)/*` route group으로 분리 완료. 위 "프론트엔드 구조" 섹션 참조.

### 3. ✅ 모달 컴포넌트 추출 완료
`components/modals/`에 `RejectDialog`, `DeleteConfirmDialog`, `ShareModal`, `NewBadgesModal` 모두 분리됨.

### 4. ✅ 이미지 업로드 연결 완료
- `lib/db/verifications.ts`의 `uploadVerificationPhoto()` — 클라이언트에서 압축 후 Storage로 업로드, 경로(path) 반환
- `app/(app)/camera/[taskId]/page.tsx` — `<input type="file" accept="image/*" capture="environment">` 사용
- `components/VerificationPhoto.tsx` — 인박스에서 signed URL로 사진 표시 (bucket은 private, RLS로 같은 파티 멤버만 열람)

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

- [ ] `types/database.ts` Supabase CLI로 재생성 권장 (`SUPABASE_PROJECT_ID=xxx npm run db:types`). 현재는 수작업 유지보수.
- [ ] 실제 PWA 아이콘 추가 필요 (`public/icons/icon-192.png`, `icon-512.png`은 placeholder)
- [ ] 푸시 알림 (FCM/Web Push)은 지금 브라우저 Notification만 지원
- [ ] 다국어 (i18n) 미적용 — 한국어 하드코딩
- [ ] E2E 테스트 (Playwright) 미적용. 단위 테스트는 vitest로 도메인 로직 47개 케이스 커버 (`npm test`, [TESTING.md](TESTING.md) 참고)
- [ ] `approve_verification` RPC의 배지 자동 해금 로직 — 현재 클라이언트에서 체크, DB에서도 해주면 더 안전
- [ ] Rate limiting / abuse 방지 (프로덕션 전 필요)

---

즐거운 개발 되세요! 🧹✨
