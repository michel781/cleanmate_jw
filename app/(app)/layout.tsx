import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppDataProvider } from './AppDataProvider';
import { BottomNav } from '@/components/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', user.id)
    .single<{ onboarded: boolean }>();

  if (!profile?.onboarded) redirect('/onboarding');

  return (
    <AppDataProvider>
      {children}
      <BottomNav />
    </AppDataProvider>
  );
}
