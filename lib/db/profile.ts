import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/types/app';

type Client = SupabaseClient;

export async function getMyProfile(supabase: Client): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) return null;
  return data as Profile;
}

export async function updateMyProfile(
  supabase: Client,
  updates: { name?: string; emoji?: string; onboarded?: boolean }
): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getPartyMemberProfiles(
  supabase: Client,
  partyId: string
): Promise<Profile[]> {
  // 1) member user_ids in this party
  const { data: members, error: mErr } = await supabase
    .from('party_members')
    .select('user_id')
    .eq('party_id', partyId);
  if (mErr) throw mErr;
  const ids = (members ?? []).map((m: { user_id: string }) => m.user_id);
  if (ids.length === 0) return [];

  // 2) fetch their profile rows in one round-trip
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ids);
  if (pErr) throw pErr;
  return (profiles ?? []) as Profile[];
}
