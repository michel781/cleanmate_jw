export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

interface ShareOptions {
  title?: string;
  text: string;
  url?: string;
}

export async function shareOrCopy(opts: ShareOptions): Promise<ShareResult> {
  const url = opts.url ?? (typeof window !== 'undefined' ? window.location.href : '');
  const payload = { title: opts.title ?? 'CleanMate', text: opts.text, url };

  // Try native share first
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (e) {
      const err = e as Error;
      if (err.name === 'AbortError') return 'cancelled';
    }
  }

  // Fallback: copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${opts.text}\n\n${url}`);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}

export function buildInviteMessage(inviterName: string, inviteCode: string, siteUrl: string): string {
  return `집안일 때문에 다퉈본 적 있어요? 😅

${inviterName}의 청소 파티에 초대됐어요!
🧹 같이 사진으로 인증하고 ✨ 방이 실시간으로 깨끗해져요

초대 코드: ${inviteCode}
👉 ${siteUrl}/join/${inviteCode}`;
}
