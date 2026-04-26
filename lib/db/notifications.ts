import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationSettings } from '@/types/app';

type Client = SupabaseClient;

export async function getMyNotificationSettings(
  supabase: Client
): Promise<NotificationSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error) return null;
  return data as NotificationSettings;
}

export async function updateMyNotificationSettings(
  supabase: Client,
  updates: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('notification_settings')
    .update(updates)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  return data as NotificationSettings;
}
