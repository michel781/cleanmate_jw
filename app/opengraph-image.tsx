import { ImageResponse } from 'next/og';

// Route metadata: Next.js wires these into <meta property="og:image"> automatically.
export const alt = 'CleanMate — 혼자 하던 청소, 같이 하는 즐거움';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Hand-rendered "clean" room scene matching the app's living room SVG.
  // satori/next-og supports a constrained CSS subset, so we keep the layout
  // simple: absolute positioning + plain divs + emoji.
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, #FAF4EB 0%, #F5EDE0 100%)',
          display: 'flex',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Sun in the window — top left of the room */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 90,
            width: 360,
            height: 280,
            background: 'linear-gradient(180deg, #F8DFA0 0%, #F3C97A 100%)',
            border: '6px solid #D4824A',
            borderRadius: 8,
            display: 'flex',
          }}
        >
          {/* window cross */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 6,
              background: '#D4824A',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 6,
              background: '#D4824A',
            }}
          />
          {/* sun */}
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 36,
              width: 100,
              height: 100,
              background: '#FFFBF5',
              borderRadius: '50%',
              opacity: 0.92,
              display: 'flex',
            }}
          />
        </div>

        {/* Sunflower picture frame — top right */}
        <div
          style={{
            position: 'absolute',
            top: 120,
            left: 510,
            width: 130,
            height: 160,
            background: '#FFFBF5',
            border: '5px solid #D4824A',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 80,
          }}
        >
          🌻
        </div>

        {/* Character (happy bear) */}
        <div
          style={{
            position: 'absolute',
            top: 290,
            left: 220,
            width: 180,
            height: 180,
            background: '#D4824A',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 90,
          }}
        >
          😊
        </div>

        {/* Floor line */}
        <div
          style={{
            position: 'absolute',
            top: 470,
            left: 0,
            right: 0,
            height: 160,
            background: 'linear-gradient(180deg, #C89C6E 0%, #A67C52 100%)',
            display: 'flex',
          }}
        />

        {/* Sparkles */}
        <div style={{ position: 'absolute', top: 200, left: 50, fontSize: 36, display: 'flex' }}>✨</div>
        <div style={{ position: 'absolute', top: 320, left: 690, fontSize: 36, display: 'flex' }}>✨</div>
        <div style={{ position: 'absolute', top: 420, left: 130, fontSize: 30, display: 'flex' }}>✨</div>

        {/* Right side: title + tagline + CTA */}
        <div
          style={{
            position: 'absolute',
            top: 110,
            right: 70,
            width: 460,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 32, opacity: 0.6, color: '#3D2817', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 56 }}>🧹</span>
            <span style={{ fontWeight: 700 }}>CleanMate</span>
          </div>

          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: '#3D2817',
              lineHeight: 1.15,
              marginTop: 30,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex' }}>혼자 하던 청소,</div>
            <div style={{ display: 'flex' }}>같이 하는 즐거움</div>
          </div>

          <div
            style={{
              fontSize: 26,
              color: '#3D2817',
              opacity: 0.7,
              marginTop: 28,
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex' }}>파트너와 서로 사진으로 인증하는</div>
            <div style={{ display: 'flex' }}>정직한 청소 습관 앱</div>
          </div>

          <div
            style={{
              marginTop: 40,
              alignSelf: 'flex-start',
              padding: '14px 28px',
              background: '#D4824A',
              color: '#FFFBF5',
              borderRadius: 16,
              fontSize: 26,
              fontWeight: 700,
              display: 'flex',
            }}
          >
            ✨ 같이 시작해요
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
