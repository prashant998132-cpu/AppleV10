// app/(dashboard)/layout.jsx
import { getUser, getSupabaseServer } from '@/lib/db/supabase';
import DashboardClient from '@/components/dashboard/DashboardClient';
import InstallBanner from '@/components/pwa/InstallBanner';
import AuthGuard from '@/components/dashboard/AuthGuard';

export default async function DashboardLayout({ children }) {
  // Try server-side auth (cookie-based)
  const user = await getUser();

  // Check if Supabase is configured
  const { SUPABASE_ENABLED } = await import('@/lib/db/supabase');

  // No Supabase configured = guest mode, allow direct access
  if (!user && !SUPABASE_ENABLED) {
    return (
      <>
        <DashboardClient user={{ id:'guest_local', email:'guest@jarvis.local', guest:true }} profile={null}>
          {children}
        </DashboardClient>
        <InstallBanner />
      </>
    );
  }

  // Supabase configured but no user → AuthGuard for login
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
