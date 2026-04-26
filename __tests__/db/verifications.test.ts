import { describe, it, expect, vi } from 'vitest';
import { getVerificationPhotoSignedUrl } from '@/lib/db/verifications';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Lightweight tests for the storage URL helper. Real Supabase storage is
 * mocked at the surface area we use (createSignedUrl). Real bucket policies
 * are tested at the integration layer (not here).
 */

function fakeClient(signedReturn: { data: { signedUrl: string } | null; error: Error | null }): SupabaseClient {
  return {
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue(signedReturn),
      }),
    },
  } as unknown as SupabaseClient;
}

describe('getVerificationPhotoSignedUrl', () => {
  it('returns absolute http URLs as-is (legacy compatibility)', async () => {
    const client = fakeClient({ data: null, error: null });
    const url = 'http://example.com/foo.jpg';
    expect(await getVerificationPhotoSignedUrl(client, url)).toBe(url);
  });

  it('returns absolute https URLs as-is (legacy compatibility)', async () => {
    const client = fakeClient({ data: null, error: null });
    const url = 'https://abc.supabase.co/storage/v1/object/public/verifications/u1/123.jpg';
    expect(await getVerificationPhotoSignedUrl(client, url)).toBe(url);
  });

  it('treats path-shaped input as a storage path and signs it', async () => {
    const signed = 'https://abc.supabase.co/storage/v1/object/sign/verifications/u1/1.jpg?token=xyz';
    const client = fakeClient({ data: { signedUrl: signed }, error: null });
    const result = await getVerificationPhotoSignedUrl(client, 'u1/1714117200000.jpg');
    expect(result).toBe(signed);
  });

  it('returns null when signing fails', async () => {
    const client = fakeClient({ data: null, error: new Error('boom') });
    const result = await getVerificationPhotoSignedUrl(client, 'u1/1714117200000.jpg');
    expect(result).toBeNull();
  });
});
