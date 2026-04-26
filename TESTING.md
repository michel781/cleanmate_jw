# Testing

> 100% test coverage is the goal — tests make vibe coding safe. Without them, vibe coding is just yolo coding. With them, it's a superpower.

## Stack

- **Vitest** for the test runner. Pure-Node environment (no jsdom yet — components aren't covered).
- **TypeScript** path alias resolution via `vitest.config.ts`.
- No `@testing-library/react` yet. Add it when you start testing components.

## Run

```bash
npm test          # run once
npm run test:watch  # watch mode while developing
```

## Where tests live

```
__tests__/
├── domain/
│   ├── score.test.ts      # calculateScore + getStateFromScore + getDaysSince
│   ├── streak.test.ts     # updateStreakOnActivity (all gap cases incl. freezes)
│   ├── level.test.ts      # getLevel (boundaries + max-level edge case)
│   └── badges.test.ts     # checkNewBadges (each unlock condition)
└── db/
    └── verifications.test.ts  # getVerificationPhotoSignedUrl (legacy compat + sign path)
```

Test files mirror the source tree. A test for `lib/foo/bar.ts` lives at `__tests__/foo/bar.test.ts`.

## Conventions

- One `describe` per exported function (or per major behavior cluster).
- Test names use `it('does the thing when X')` form, not `should`.
- Build inputs with helper factories (e.g. `makeTask`, `makeStreak`) that take `Partial<T>` overrides — keeps tests focused on the differences.
- Date-dependent code uses `Date.now()`-relative builders (`isoDaysAgo(n)`) instead of mocking the clock. Cleaner and more representative.
- Mock at the surface area you actually call (e.g. `supabase.storage.from(...).createSignedUrl(...)`), not the entire SDK.

## What's covered today

- `lib/domain/*` — pure business logic. The score / streak / level / badge formulas all live here AND in the Supabase SQL functions. **When you change a formula, update both.** The unit tests catch the client side; the SQL function is reviewed manually.
- `lib/db/verifications.ts` — the storage URL helper, including legacy URL pass-through.

## What's NOT covered yet

- React components (no jsdom + @testing-library/react setup yet).
- Supabase RPC calls end-to-end (would need a test DB or supabase-js mocks).
- The middleware/proxy auth redirect logic.
- Storage RLS behavior (must be tested against a real Supabase project).

When you need React component tests, add:

```bash
npm install -D @testing-library/react jsdom
```

…and switch `vitest.config.ts` `environment: 'node'` to `'jsdom'`.

## Expectations when contributing

- **New function or new conditional branch?** Write a test that exercises the new behavior, including at least one edge case.
- **Bug fix?** Add a regression test that fails on the old code and passes on the fix. Reference the bug in a comment.
- **Refactor?** Run `npm test` before AND after. The suite must stay green.
- **Don't commit code that breaks the suite.** If a test is wrong, fix the test in the same commit (and explain why in the message).
