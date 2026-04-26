import type { SupabaseClient } from '@supabase/supabase-js';
import type { Verification } from '@/types/app';

type Client = SupabaseClient;

export async function listPartyVerifications(
  supabase: Client,
  partyId: string
): Promise<Verification[]> {
  const { data, error } = await supabase
    .from('verifications')
    .select('*, task:tasks(*)')
    .eq('party_id', partyId)
    .order('requested_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Verification[];
}

export async function listPendingForUser(
  supabase: Client,
  partyId: string,
  userId: string
): Promise<Verification[]> {
  const { data, error } = await supabase
    .from('verifications')
    .select('*, task:tasks(*)')
    .eq('party_id', partyId)
    .eq('status', 'pending')
    .neq('requested_by', userId)
    .order('requested_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Verification[];
}

export async function createVerification(
  supabase: Client,
  taskId: string,
  opts?: { photoPlaceholder?: string; photoUrl?: string }
): Promise<string> {
  const { data, error } = await supabase.rpc('create_verification', {
    p_task_id: taskId,
    p_photo_placeholder: opts?.photoPlaceholder ?? undefined,
    p_photo_url: opts?.photoUrl ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Approve a pending verification. The acting user is derived server-side
 * from auth.uid() — there is no caller-supplied approver id, by design.
 * Throws if the caller isn't a party member or is the original requester.
 */
export async function approveVerification(supabase: Client, verificationId: string) {
  const { data, error } = await supabase.rpc('approve_verification', {
    p_verification_id: verificationId,
  });
  if (error) throw error;
  return data;
}

/**
 * Reject a pending verification. Same auth posture as approveVerification.
 */
export async function rejectVerification(
  supabase: Client,
  verificationId: string,
  reason: string
) {
  const { data, error } = await supabase.rpc('reject_verification', {
    p_verification_id: verificationId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

/**
 * Upload a verification photo to Supabase Storage. Returns the storage
 * **path** (e.g. `<user-uuid>/1714117200000.jpg`), NOT a URL.
 *
 * The bucket is private — readable URLs are minted on demand via
 * getVerificationPhotoSignedUrl. The path is what gets stored in
 * verifications.photo_url.
 */
export async function uploadVerificationPhoto(
  supabase: Client,
  file: File,
  userId: string
): Promise<string> {
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('verifications').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/**
 * Mint a short-lived signed URL for a stored photo path. RLS on
 * storage.objects ensures the caller is a co-party-member of the
 * folder owner before the URL gets generated.
 *
 * Back-compat: if `pathOrUrl` already looks like an absolute http(s) URL
 * (rows uploaded before this change), return it as-is.
 */
export async function getVerificationPhotoSignedUrl(
  supabase: Client,
  pathOrUrl: string,
  expiresInSec = 60 * 15
): Promise<string | null> {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage
    .from('verifications')
    .createSignedUrl(pathOrUrl, expiresInSec);
  if (error || !data) return null;
  return data.signedUrl;
}
