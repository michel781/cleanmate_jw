import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url({ message: 'must be a full URL like https://xxxxx.supabase.co' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, { message: 'looks too short — paste the full anon key' }),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(
    `\n[CleanMate] Missing or invalid environment variables:\n${issues}\n\n` +
      `Fix:\n` +
      `  1. cp .env.local.example .env.local\n` +
      `  2. Fill in your Supabase project credentials (Settings → API → Legacy)\n` +
      `  3. Restart \`npm run dev\`\n` +
      `See README.md → 빠른 시작 step 2-3 and docs/SETUP_TROUBLESHOOTING.md (함정 ①).\n`
  );
}

export const env = parsed.data;
