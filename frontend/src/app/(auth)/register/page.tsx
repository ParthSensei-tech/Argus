'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Shield, Sparkles, Building2, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, createOrg } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(email, password, fullName);
      if (orgName.trim()) {
        await createOrg(orgName.trim());
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
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
        <div className="mb-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-900 via-amber-600/30 to-amber-500 text-amber-300 border border-amber-500/40 shadow-gold-glow">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight gold-gradient-text">
            Create Argus Account
          </h1>
          <p className="mt-1 text-xs text-purple-200/80 font-medium">
            Set up your identity and initial brand governance tenant
          </p>
        </div>

        <Card className="purple-glass-gold border-amber-500/30 text-purple-50 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
              <span>Register Workspace</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                <Sparkles className="h-3 w-3" /> Multi-Tenant RBAC
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-purple-200/70">
              Argus provides strict cryptographic tenant isolation for enterprise brand knowledge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-950/60 border-red-500/40 text-red-200">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-purple-200">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="bg-purple-950/60 border-purple-700/50 text-white placeholder-purple-400/50 focus:border-amber-400 focus:ring-amber-400/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-purple-200">
                  Work Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="bg-purple-950/60 border-purple-700/50 text-white placeholder-purple-400/50 focus:border-amber-400 focus:ring-amber-400/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-purple-200">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (Min. 8 characters)"
                  className="bg-purple-950/60 border-purple-700/50 text-white placeholder-purple-400/50 focus:border-amber-400 focus:ring-amber-400/20"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-purple-200">
                  Initial Organisation Name
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Global Inc."
                    className="bg-purple-950/60 border-purple-700/50 text-white placeholder-purple-400/50 focus:border-amber-400 focus:ring-amber-400/20 pl-9"
                    required
                  />
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-purple-400/60" />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-purple-950 font-bold hover:brightness-110 shadow-gold-sm transition-all mt-2"
                isLoading={loading}
              >
                Create Workspace <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-purple-800/40 bg-purple-950/30 text-xs text-purple-300/70">
            Already have an account?{' '}
            <Link href="/login" className="ml-1 font-semibold text-amber-400 hover:text-amber-300 hover:underline">
              Sign in here
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
