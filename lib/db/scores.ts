import type { SupabaseClient } from '@supabase/supabase-js';
import type { Score } from '@/types/app';

type Client = SupabaseClient;

export async function listPartyScores(supabase: Client, partyId: string): Promise<Score[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('party_id', partyId);
  if (error) throw error;
  return (data ?? []) as Score[];
}
