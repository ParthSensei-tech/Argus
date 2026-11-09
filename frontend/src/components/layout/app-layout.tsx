'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './sidebar';
import { LoadingSpinner } from '@/components/ui/spinner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090412]">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4 text-amber-400" />
          <p className="text-xs font-semibold text-amber-300/80">Loading Argus Governance...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#090412] text-[#F3EEFA]">
      <Sidebar />
      <div className="pl-64">
        <main className="min-h-screen p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
