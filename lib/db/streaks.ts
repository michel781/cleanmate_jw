import type { SupabaseClient } from '@supabase/supabase-js';
import type { Streak } from '@/types/app';

type Client = SupabaseClient;

export async function getStreak(supabase: Client, partyId: string): Promise<Streak | null> {
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('party_id', partyId)
    .single();
  if (error) return null;
  return data as Streak;
}
