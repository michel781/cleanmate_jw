import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserBadge } from '@/types/app';

type Client = SupabaseClient;

export async function getMyBadges(supabase: Client): Promise<UserBadge[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: true });
  if (error) return [];
  return (data ?? []) as UserBadge[];
}

export async function unlockBadges(
  supabase: Client,
  badgeIds: string[],
  partyId: string
): Promise<UserBadge[]> {
  if (badgeIds.length === 0) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const rows = badgeIds.map((id) => ({ user_id: user.id, badge_id: id, party_id: partyId }));
  const { data, error } = await supabase
    .from('user_badges')
    .upsert(rows, { onConflict: 'user_id,badge_id', ignoreDuplicates: true })
    .select('*');
  if (error) return [];
  return (data ?? []) as UserBadge[];
}
