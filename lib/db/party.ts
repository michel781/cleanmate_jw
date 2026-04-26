import type { SupabaseClient } from '@supabase/supabase-js';
import type { Party } from '@/types/app';

type Client = SupabaseClient;

/**
 * Gets the primary party for the current user.
 *
 * If the user is in multiple parties (e.g. their auto-created personal party
 * and a partner's party they joined via invite), return the **most recently
 * joined** party. That matches the typical flow: a user signs up (gets a
 * personal party), then joins a partner's party via invite code — they
 * should now see the partner's party as active.
 *
 * For multi-party support with explicit switching, extend this to accept
 * a party_id parameter.
 */
export async function getMyParty(supabase: Client): Promise<Party | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('party_members')
    .select('parties:parties!party_members_party_id_fkey(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return (data as unknown as { parties: Party }).parties;
}

export async function joinPartyByInviteCode(
  supabase: Client,
  inviteCode: string
): Promise<string> {
  const { data, error } = await supabase.rpc('join_party', {
    p_invite_code: inviteCode.toUpperCase(),
  });
  if (error) throw error;
  return data as string;
}

export async function getPartyByInviteCode(
  supabase: Client,
  inviteCode: string
): Promise<Pick<Party, 'id' | 'name'> | null> {
  // Goes through a SECURITY DEFINER RPC that returns only id + name for the
  // matching code, so we don't need a wide-open SELECT policy on parties.
  const { data, error } = await supabase
    .rpc('get_party_by_invite_code', { p_code: inviteCode.toUpperCase() })
    .single();
  if (error || !data) return null;
  return data as { id: string; name: string };
}
