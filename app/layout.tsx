import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://certification-fawn-psi.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'CleanMate — 혼자 하던 청소, 같이 하는 즐거움',
  description: '파트너와 서로 사진으로 인증하는 청소 습관 앱. 허위 체크 없는 정직한 분담.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192' },
    ],
  },
  // Next.js automatically wires app/opengraph-image.tsx and app/twitter-image.tsx
  // into the OG/Twitter meta tags below. We only need to set the textual fields.
  openGraph: {
    type: 'website',
    siteName: 'CleanMate',
    title: 'CleanMate — 혼자 하던 청소, 같이 하는 즐거움',
    description: '파트너와 서로 사진으로 인증하는 청소 습관 앱',
    locale: 'ko_KR',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CleanMate — 혼자 하던 청소, 같이 하는 즐거움',
    description: '파트너와 서로 사진으로 인증하는 청소 습관 앱',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CleanMate',
  },
};

export const viewport: Viewport = {
  themeColor: '#D4824A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
