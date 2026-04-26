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

export async function approveVerification(
  supabase: Client,
  verificationId: string,
  approverId: string
) {
  const { data, error } = await supabase.rpc('approve_verification', {
    p_verification_id: verificationId,
    p_approver_id: approverId,
  });
  if (error) throw error;
  return data;
}

export async function rejectVerification(
  supabase: Client,
  verificationId: string,
  rejecterId: string,
  reason: string
) {
  const { data, error } = await supabase.rpc('reject_verification', {
    p_verification_id: verificationId,
    p_rejecter_id: rejecterId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

/**
 * Upload a photo to Supabase Storage and return the public/signed URL.
 * Use this in production. For MVP, photo_placeholder works fine.
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
  const { data } = supabase.storage.from('verifications').getPublicUrl(path);
  return data.publicUrl;
}
