# Deployment

## Vercel (Recommended)

CleanMate is a standard Next.js 16 app — Vercel auto-detects the framework, build
command, and output directory. No `vercel.json` is required.

```bash
npm install -g vercel
vercel login
vercel              # follow the prompts; pick the existing project or create new
```

After the first deploy, Vercel watches your git remote and redeploys on push.

### Build configuration

Vercel will run `npm run build`, which is set to:

```
next build --webpack
```

The `--webpack` flag is intentional. Next.js 16 defaults to Turbopack for `build`,
but `@serwist/next` only hooks into the webpack pipeline today — using Turbopack
silently skips service-worker generation. (Turbopack support is tracked at
[serwist/serwist#54](https://github.com/serwist/serwist/issues/54); we'll switch
to `@serwist/turbopack` when it goes stable.)

Local `npm run dev` keeps Turbopack — Serwist is disabled in development
(`disable: process.env.NODE_ENV !== 'production'` in `next.config.mjs`), so dev
speed and HMR are unaffected.

### Environment variables (Vercel dashboard → Project → Settings → Environment Variables)

| Name | Value | Scope | Sensitive? |
|------|-------|-------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → `Project URL` | Production + Preview + Development | No (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` | Production + Preview + Development | No (RLS-gated) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` | **Production + Preview** (NOT Development) | ⚠️ **Yes — never expose to browser** |
| `NEXT_PUBLIC_SITE_URL` | Your production URL, e.g. `https://cleanmate.vercel.app` | Production | No |

Notes:
- `NEXT_PUBLIC_*` values are inlined into client bundles at **build** time. Changing them requires a redeploy.
- For Preview deploys, set `NEXT_PUBLIC_SITE_URL` to `https://${VERCEL_URL}` if you want magic-link redirects to work on previews — or leave it unset there and let `window.location.origin` be the fallback (the code already does this).
- `SUPABASE_SERVICE_ROLE_KEY` is **not** referenced from any client component in this codebase, but if you ever add a server-only feature that needs admin access, this is the key.

### Post-deploy: update Supabase

1. **Supabase → Authentication → URL Configuration**
   - **Site URL**: `https://cleanmate.vercel.app` (your production domain)
   - **Redirect URLs**: add `https://cleanmate.vercel.app/**` (the `**` wildcard matches the magic-link callback path)
   - For previews: also add `https://*.vercel.app/**` if you want previews to authenticate.
2. Verify a magic-link email actually links to your domain (not localhost).

### Post-deploy: verify PWA

In production, the service worker should be registered automatically.

1. Open your deployed URL in Chrome DevTools.
2. **Application → Service Workers** — `/sw.js` should be listed as `activated and is running`.
3. **Application → Manifest** — should show:
   - Name "CleanMate", theme `#D4824A`, display `standalone`
   - Icons: `icon-192.png`, `icon-512.png`, `icon.svg`, `icon-maskable.svg`
   - "Installable" badge present (if not, click the warnings — usually means you're on http or behind a self-signed cert)
4. **Lighthouse → PWA category** → expect green ticks for installability + offline fallback.
5. Run `curl -I https://your-domain/sw.js` and confirm `Cache-Control: public, max-age=0, must-revalidate` (set in `next.config.mjs`'s `headers()`).

### Custom domain

After adding a custom domain in Vercel:
1. Update `NEXT_PUBLIC_SITE_URL` env var to the new domain (redeploy).
2. Update Supabase auth Site URL + Redirect URLs to the new domain.
3. Old Vercel `*.vercel.app` URLs continue to work; magic-link emails will use whatever Site URL is set.

## Build verification (locally)

Before pushing to Vercel, you can sanity-check the production build:

```bash
npm run build       # builds with webpack; should print "✓ (serwist) Bundling..."
ls public/sw.js     # ~40-60 KB, generated automatically
npm start           # boots production server on :3000
```

Open <http://localhost:3000> and check DevTools → Application → Service Workers.

## Auth: Email confirmation 모드 선택

CleanMate는 두 가지 회원가입 흐름을 모두 지원해요. 코드는 자동 분기 — Supabase 설정만 바꾸면 됩니다.

### 옵션 A — Confirm email **OFF** (개발/MVP)

회원가입 시 이메일 인증 없이 즉시 로그인.

- **장점**: 메일 발송 없음 → rate limit 무관, 100% 안정
- **단점**: 가짜 이메일도 가입 가능 (보안 ↓)
- **설정**: Supabase 대시보드 → Authentication → **Sign In / Providers → User Signups → `Confirm email`** **OFF** → Save

코드 동작: `signUp` 응답의 `data.session`이 즉시 채워짐 → 자동으로 홈 이동.

### 옵션 B — Confirm email **ON** (표준 운영)

회원가입 후 인증 메일 클릭해야 로그인 가능. 진짜 이메일 소유자만 통과.

- **장점**: 보안 강화 (가짜 이메일 차단)
- **단점**: 메일 발송 필요. Supabase 무료 default SMTP는 시간당 3-4건 한도 → 운영에 부적합
- **설정**:
  1. Supabase 대시보드 → Authentication → **Sign In / Providers → User Signups → `Confirm email`** **ON** → Save
  2. **Custom SMTP 필수** (아래)

코드 동작: `signUp` 응답의 `data.session`이 `null` → "이메일 확인해주세요" 안내 화면. 사용자가 메일 링크 클릭 → 자동 로그인.

### Custom SMTP 연결 (옵션 B 운영 시 필수)

Resend가 가장 쉬워요 — 월 3,000건 무료, GitHub 로그인.

1. https://resend.com 가입 → API Keys → **Create API Key** → 이름 `cleanmate-supabase` → Create → 키 복사 (`re_xxx...`)
2. **Supabase 대시보드 → Project Settings → Auth** (또는 Authentication → Emails → SMTP Settings):
   - **Enable Custom SMTP**: ON
   - **Sender email**: 본인 도메인 있으면 `noreply@your-domain.com`, 없으면 `onboarding@resend.dev` (Resend 기본)
   - **Sender name**: `CleanMate`
   - **Host**: `smtp.resend.com`
   - **Port**: `587`
   - **Username**: `resend`
   - **Password**: 1번에서 받은 Resend API 키
   - **Save**
3. 회원가입 한 번 해서 메일 5초 안에 도착하는지 검증

대안: SendGrid (무료 100/일), AWS SES, Postmark 등도 같은 방식.

### 옵션 B 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 가입은 됐는데 메일 안 옴 | Supabase default SMTP rate limit | Custom SMTP 설정 (Resend) |
| 메일 왔는데 클릭 시 "redirect not allowed" | URL Configuration 미갱신 | Site URL + Redirect URLs에 production 도메인 추가 |
| Gmail에서 메일이 Promotions 탭에 들어감 | DNS 인증 부족 | Resend의 Domain Verification (DKIM/SPF) 설정 |

---

## Self-hosted (any Node 20+ host)

No Dockerfile is included; the standard flow works:

```bash
npm ci --omit=dev=false   # need devDeps for build (serwist plugin etc.)
npm run build
npm start                 # uses PORT env var if set
```

Required env vars: same as the Vercel table above.

If you're behind a reverse proxy (nginx, Caddy), forward `/sw.js` and
`/manifest.json` without modifying `Cache-Control` — Next.js already sets the
right header.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `public/sw.js` not generated after build | Build ran with Turbopack instead of webpack | Confirm `package.json` `"build": "next build --webpack"` |
| `Cannot find module '@serwist/next/worker'` during build | Stale or missing install | `rm -rf node_modules .next && npm install` |
| Service worker registers but old assets keep loading | Browser served cached SW | DevTools → Application → Service Workers → "Update on reload" + hard refresh |
| iOS home-screen icon looks blocky | Current PNGs are single-color placeholders | Replace `public/icons/icon-192.png` and `icon-512.png` with real designed PNGs |
| Magic-link email opens `localhost` | Supabase Site URL still local | Update Supabase → Auth → URL Configuration to the deployed domain |
| 401 on every Supabase query in production | RLS enabled but policies missing | Re-run `supabase/policies.sql` in SQL Editor |
| `permission denied for table X` (after wiping `public` schema) | Table-level GRANTs were not auto-restored | Run `supabase/grants.sql` once |
| Realtime never fires | Tables not in `supabase_realtime` publication | Run `supabase/realtime.sql`, or add via Database → Replication UI |
