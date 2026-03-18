'use client';
// components/dashboard/AuthGuard.jsx — No auth needed
import DashboardClient from '@/components/dashboard/DashboardClient';
import InstallBanner from '@/components/pwa/InstallBanner';

const LOCAL_USER = { id: 'local-user-jarvis', email: 'local@jarvis.app', user_metadata: { name: 'Pranshu' } };
const LOCAL_PROFILE = { name: 'Pranshu', personality: 'normal', city: 'Rewa', language: 'hinglish' };

export default function AuthGuard({ children }) {
  return (
    <>
      <DashboardClient user={LOCAL_USER} profile={LOCAL_PROFILE}>
        {children}
      </DashboardClient>
      <InstallBanner />
    </>
  );
}
