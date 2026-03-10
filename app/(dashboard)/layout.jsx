// app/(dashboard)/layout.jsx
import { getUser, getSupabaseServer } from '@/lib/db/supabase';
import DashboardClient from '@/components/dashboard/DashboardClient';
import InstallBanner from '@/components/pwa/InstallBanner';
import AuthGuard from '@/components/dashboard/AuthGuard';

export default async function DashboardLayout({ children }) {
  // Try server-side auth (cookie-based)
  const user = await getUser();

  // No server-side user → AuthGuard handles client-side session check
  if (!user) {
    return <AuthGuard>{children}</AuthGuard>;
  }

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
