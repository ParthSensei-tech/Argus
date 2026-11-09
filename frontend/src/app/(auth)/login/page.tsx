'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login, setToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Shield, Sparkles, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      setToken(res.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo1234!');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Brand Banner */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            ARGUS
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Autonomous Seven-Agent Brand Governance & Verification Swarm
          </p>
        </div>

        <Card className="border-gray-200 shadow-xl shadow-gray-100">
          <CardHeader>
            <CardTitle>Sign in to Workspace</CardTitle>
            <CardDescription>
              Enter your credentials or choose a pre-configured demo account below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Work Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full" isLoading={loading}>
                Sign In
              </Button>
            </form>

            {/* Quick Demo Access Buttons */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Demo Profiles for Judges
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  <Sparkles className="h-3 w-3" /> One-Click
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('admin@argus.demo')}
                  className="rounded-lg border border-gray-200 bg-white p-2.5 text-center text-xs font-medium text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <p className="font-semibold text-gray-900">Alex Admin</p>
                  <p className="text-[10px] text-indigo-600">Admin Role</p>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('reviewer@argus.demo')}
                  className="rounded-lg border border-gray-200 bg-white p-2.5 text-center text-xs font-medium text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <p className="font-semibold text-gray-900">Riley Rev</p>
                  <p className="text-[10px] text-indigo-600">Reviewer</p>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('editor@argus.demo')}
                  className="rounded-lg border border-gray-200 bg-white p-2.5 text-center text-xs font-medium text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <p className="font-semibold text-gray-900">Sam Editor</p>
                  <p className="text-[10px] text-indigo-600">Editor Role</p>
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t border-gray-50 bg-gray-50/50 text-xs text-gray-500">
            Need an account?{' '}
            <Link href="/register" className="ml-1 font-semibold text-indigo-600 hover:underline">
              Register here
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
