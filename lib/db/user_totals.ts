import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserTotals } from '@/types/app';

type Client = SupabaseClient;

export async function getMyTotals(supabase: Client): Promise<UserTotals | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('user_totals')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error) return null;
  return data as UserTotals;
}
