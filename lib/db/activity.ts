import type { SupabaseClient } from '@supabase/supabase-js';
import type { Activity } from '@/types/app';

type Client = SupabaseClient;

export async function listActivity(
  supabase: Client,
  partyId: string,
  limit = 50
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('party_id', partyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Activity[];
}
