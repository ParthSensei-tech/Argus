'use client';

// Force dynamic rendering — this page reads auth context (localStorage / cookies)
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Shield, Sparkles, Crown, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<'admin' | 'reviewer' | 'editor' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemoLogin = async (role: 'admin' | 'reviewer' | 'editor') => {
    setError(null);
    setLoading(true);
    setSelectedDemoRole(role);
    try {
      await demoLogin(role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed. Retrying with fallback...');
      try {
        const demoEmails = {
          admin: 'admin@argus.demo',
          reviewer: 'reviewer@argus.demo',
          editor: 'editor@argus.demo',
        };
        await login(demoEmails[role], 'Demo1234!');
        router.push('/dashboard');
      } catch (retryErr: any) {
        setError(retryErr.message || 'Could not connect to demo profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillFormOnly = (demoEmail: string, role: 'admin' | 'reviewer' | 'editor') => {
    setEmail(demoEmail);
    setPassword('Demo1234!');
    setSelectedDemoRole(role);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#090412]">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Brand Banner */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-900 via-amber-600/30 to-amber-500 text-amber-300 border border-amber-500/40 shadow-gold-glow">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight gold-gradient-text">
            ARGUS
          </h1>
          <p className="mt-1 text-xs text-purple-200/80 font-medium">
            Autonomous Seven-Agent Brand Governance & Trust Platform
          </p>
        </div>

        <Card className="purple-glass-gold border-amber-500/30 text-purple-50 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
              <span>Sign in to Workspace</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                <Crown className="h-3 w-3" /> Judge Mode Ready
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-purple-200/70">
              One-click instant demo access or enter judge credentials below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-950/60 border-red-500/40 text-red-200">
                {error}
              </Alert>
            )}

            {/* Quick Demo Access Bar */}
            <div className="mb-5 p-3 rounded-xl bg-purple-950/50 border border-amber-500/25">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Demo Accounts (1-Click Login)
                </span>
                <span className="text-[10px] text-purple-300/80">Activated & Verified</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin('admin')}
                  disabled={loading}
                  className={`group relative rounded-lg border p-2 text-center transition flex flex-col items-center justify-center ${
                    selectedDemoRole === 'admin'
                      ? 'border-amber-400 bg-amber-500/20 text-white shadow-gold-sm'
                      : 'border-purple-800/60 bg-purple-900/30 hover:border-amber-500/50 hover:bg-purple-900/60 text-purple-200'
                  }`}
                >
                  <span className="text-xs font-bold text-white group-hover:text-amber-300">Admin</span>
                  <span className="text-[10px] text-amber-400 font-medium">Alex Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin('reviewer')}
                  disabled={loading}
                  className={`group relative rounded-lg border p-2 text-center transition flex flex-col items-center justify-center ${
                    selectedDemoRole === 'reviewer'
                      ? 'border-amber-400 bg-amber-500/20 text-white shadow-gold-sm'
                      : 'border-purple-800/60 bg-purple-900/30 hover:border-amber-500/50 hover:bg-purple-900/60 text-purple-200'
                  }`}
                >
                  <span className="text-xs font-bold text-white group-hover:text-amber-300">Reviewer</span>
                  <span className="text-[10px] text-amber-400 font-medium">Riley Rev</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin('editor')}
                  disabled={loading}
                  className={`group relative rounded-lg border p-2 text-center transition flex flex-col items-center justify-center ${
                    selectedDemoRole === 'editor'
                      ? 'border-amber-400 bg-amber-500/20 text-white shadow-gold-sm'
                      : 'border-purple-800/60 bg-purple-900/30 hover:border-amber-500/50 hover:bg-purple-900/60 text-purple-200'
                  }`}
                >
                  <span className="text-xs font-bold text-white group-hover:text-amber-300">Editor</span>
                  <span className="text-[10px] text-amber-400 font-medium">Sam Editor</span>
                </button>
              </div>
              <p className="mt-2 text-[10px] text-center text-purple-300/60">
                Click any button above to instantly enter the workspace without typing.
              </p>
            </div>

            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-purple-800/50" />
              <span className="absolute bg-[#160C2A] px-2 text-[10px] uppercase tracking-wider text-purple-300/60">
                Or manual sign in
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-purple-200">
                  Work Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@argus.demo"
                  className="bg-purple-950/60 border-purple-700/50 text-white placeholder-purple-400/50 focus:border-amber-400 focus:ring-amber-400/20"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-purple-200">
                    Password
                  </label>
                  <span className="text-[10px] text-amber-400/80">Demo: Demo1234!</span>
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-purple-950/60 border-purple-700/50 text-white placeholder-purple-400/50 focus:border-amber-400 focus:ring-amber-400/20"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-purple-950 font-bold hover:brightness-110 shadow-gold-sm transition-all"
                isLoading={loading}
              >
                Sign In to Platform <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-purple-800/40 bg-purple-950/30 text-xs text-purple-300/70">
            Need a fresh tenant?{' '}
            <Link href="/register" className="ml-1 font-semibold text-amber-400 hover:text-amber-300 hover:underline">
              Create new workspace
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
