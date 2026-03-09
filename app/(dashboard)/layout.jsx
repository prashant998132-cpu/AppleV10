// app/(dashboard)/layout.jsx
import { redirect } from 'next/navigation';
import { getUser, getSupabaseServer } from '@/lib/db/supabase';
import DashboardClient from '@/components/dashboard/DashboardClient';
import InstallBanner from '@/components/pwa/InstallBanner';

export default async function DashboardLayout({ children }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await getSupabaseServer();
  const { data: profile } = await supabase
    .from('profiles')
    .select('name,personality,city,language')
    .eq('id', user.id)
    .single();

  return (
    <>
      <DashboardClient user={user} profile={profile}>
        {children}
      </DashboardClient>
      <InstallBanner />
    </>
  );
}
