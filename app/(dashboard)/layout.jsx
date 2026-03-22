// app/(dashboard)/layout.jsx — No login required
import { getUser, getSupabaseServer, LOCAL_USER } from '@/lib/db/supabase';
import DashboardClient from '@/components/dashboard/DashboardClient';
import InstallBanner from '@/components/pwa/InstallBanner';

export default async function DashboardLayout({ children }) {
  // getUser() now returns LOCAL_USER when Supabase not configured
  // So this NEVER returns null — no login redirect ever
  const user = await getUser();
  const finalUser = user || LOCAL_USER;

  // Try to get profile (silent fail if no Supabase)
  let profile = { name: 'Pranshu', personality: 'normal', city: 'Rewa', language: 'auto' };
  try {
    const supabase = await getSupabaseServer();
    const { data: p } = await supabase
      .from('profiles')
      .select('name,personality,city,language')
      .eq('id', finalUser.id)
      .single();
    if (p) profile = p;
  } catch {}

  return (
    <>
      <DashboardClient user={finalUser} profile={profile}>
        {children}
      </DashboardClient>
      <InstallBanner />
    </>
  );
}
