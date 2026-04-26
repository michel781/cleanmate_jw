'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getVerificationPhotoSignedUrl } from '@/lib/db/verifications';

type Props = {
  /** Storage path (preferred) or legacy absolute URL. */
  pathOrUrl: string | null | undefined;
  alt: string;
  className?: string;
  /** Rendered when path is missing or signed URL fetch fails. */
  fallback: React.ReactNode;
};

/**
 * Renders a verification photo from a Supabase Storage path by minting
 * a short-lived signed URL at render time. Bucket is private; only
 * co-party-members of the folder owner can mint a URL (RLS-enforced).
 */
export function VerificationPhoto({ pathOrUrl, alt, className, fallback }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }
    const supabase = createClient();
    getVerificationPhotoSignedUrl(supabase, pathOrUrl).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [pathOrUrl]);

  if (!pathOrUrl || url === null) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
