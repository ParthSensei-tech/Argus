'use client';

import React from 'react';
import { AuthProvider } from '@/lib/auth';
import { AppLayout } from '@/components/layout/app-layout';

export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppLayout>{children}</AppLayout>
    </AuthProvider>
  );
}
