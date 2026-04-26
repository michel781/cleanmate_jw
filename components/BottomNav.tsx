'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bell, Edit3, TrendingUp, User } from 'lucide-react';
import { useAppContext } from '@/app/(app)/AppDataProvider';

type NavKey = 'home' | 'inbox' | 'tasks' | 'stats' | 'mypage';

const NAV_ITEMS: Array<{
  key: NavKey;
  href: string;
  icon: typeof Home;
  label: string;
  match: (p: string) => boolean;
}> = [
  { key: 'home',   href: '/',             icon: Home,       label: '내 방', match: (p) => p === '/' },
  { key: 'inbox',  href: '/inbox',        icon: Bell,       label: '인증', match: (p) => p.startsWith('/inbox') },
  { key: 'tasks',  href: '/tasks',        icon: Edit3,      label: '항목', match: (p) => p.startsWith('/tasks') },
  { key: 'stats',  href: '/stats',        icon: TrendingUp, label: '파티', match: (p) => p.startsWith('/stats') || p.startsWith('/activity') },
  { key: 'mypage', href: '/me',           icon: User,       label: 'MY',  match: (p) => p.startsWith('/me') || p.startsWith('/settings') || p.startsWith('/achievements') },
];

const HIDE_PATTERNS: RegExp[] = [
  /^\/camera\//,                    // photo capture
  /^\/tasks\/new$/,                 // add task form
  /^\/tasks\/[^/]+\/edit$/,         // edit task form
  /^\/me\/edit$/,                   // edit profile form
];

export function BottomNav() {
  const pathname = usePathname();
  const { state, theme, pendingForMe } = useAppContext();

  if (HIDE_PATTERNS.some((re) => re.test(pathname))) return null;

  const isDark = state === 'critical' || state === 'dirty';
  const gradientEnd = state === 'critical' ? '#241812' : state === 'dirty' ? '#4F3828' : '#FAF4EB';

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pt-3 pb-5 z-30"
      style={{ background: `linear-gradient(180deg, transparent, ${gradientEnd} 40%)` }}
    >
      <div
        className="flex items-center justify-around rounded-2xl py-2 px-2"
        style={{
          background: isDark ? 'rgba(255,251,245,0.1)' : '#FFFBF5',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {NAV_ITEMS.map((nav) => {
          const isActive = nav.match(pathname);
          const Icon = nav.icon;
          const badge = nav.key === 'inbox' ? pendingForMe.length : 0;

          return (
            <Link
              key={nav.key}
              href={nav.href}
              className="relative flex-1 flex flex-col items-center py-2 px-1.5 rounded-xl transition-all active:scale-90"
              style={{ background: isActive ? `${theme.accent}15` : 'transparent' }}
            >
              <Icon size={17} style={{ color: isActive ? theme.accent : theme.text, opacity: isActive ? 1 : 0.5 }} />
              <span
                className="text-[9px] mt-1 font-bold"
                style={{ color: isActive ? theme.accent : theme.text, opacity: isActive ? 1 : 0.5 }}
              >
                {nav.label}
              </span>
              {badge > 0 && (
                <span
                  className="absolute top-1 right-2 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: theme.accent, color: '#FFFBF5' }}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
