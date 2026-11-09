'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Shield,
  LayoutDashboard,
  FileCheck2,
  FilePlus,
  BookOpen,
  Network,
  AlertTriangle,
  History,
  LogOut,
  Building2,
  Crown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reviews', label: 'Reviews', icon: FileCheck2 },
  { href: '/reviews/new', label: 'Submit Content', icon: FilePlus },
  { href: '/knowledge', label: 'Brand Knowledge', icon: BookOpen },
  { href: '/graph', label: 'Knowledge Graph', icon: Network },
  { href: '/impact', label: 'Change Impact', icon: AlertTriangle },
  { href: '/audit', label: 'Audit Trail', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, memberships, currentOrg, setCurrentOrg, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-purple-900/40 bg-[#0C0618]/95 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-purple-900/30 px-6 bg-purple-950/20">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-950 via-amber-600/30 to-amber-500 text-amber-300 border border-amber-500/40 shadow-gold-sm">
          <Shield className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <span className="text-xl font-extrabold tracking-tight gold-gradient-text">
            ARGUS
          </span>
          <span className="block text-[9.5px] font-bold tracking-widest text-amber-400/80 uppercase">
            Brand Governance
          </span>
        </div>
      </div>

      {/* Org Selector */}
      <div className="border-b border-purple-900/30 p-3.5">
        <div className="relative flex items-center justify-between rounded-lg border border-amber-500/25 bg-purple-950/50 p-2.5 shadow-sm">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Building2 className="h-4 w-4 shrink-0 text-amber-400/80" />
            <div className="truncate">
              <p className="truncate text-xs font-semibold text-white">
                {currentOrg?.name || 'Nexus Technologies'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-purple-300/70">Workspace</span>
                {memberships.find((m) => m.org_id === currentOrg?.id)?.role && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 uppercase">
                    <Crown className="h-2.5 w-2.5" />
                    {memberships.find((m) => m.org_id === currentOrg?.id)?.role}
                  </span>
                )}
              </div>
            </div>
          </div>
          {memberships.length > 1 && (
            <select
              value={currentOrg?.id || ''}
              onChange={(e) => {
                const target = memberships.find((m) => m.org_id === e.target.value);
                if (target) {
                  setCurrentOrg({
                    id: target.org_id,
                    name: target.org_name,
                    slug: target.org_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  });
                }
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              title="Switch Organisation"
            >
              {memberships.map((m) => (
                <option key={m.org_id} value={m.org_id} className="bg-purple-950 text-white">
                  {m.org_name} ({m.role})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-amber-500/15 font-semibold text-amber-300 border border-amber-500/30 shadow-gold-sm'
                  : 'text-purple-200/70 hover:bg-purple-900/30 hover:text-white',
              ].join(' ')}
            >
              <Icon
                className={[
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive
                    ? 'text-amber-400'
                    : 'text-purple-400/60 group-hover:text-amber-300/80',
                ].join(' ')}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-purple-900/30 p-3 bg-purple-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-300">
              {user?.full_name
                ? user.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                : 'U'}
            </div>
            <div className="truncate">
              <p className="truncate text-xs font-semibold text-white">
                {user?.full_name || 'Demo Reviewer'}
              </p>
              <p className="truncate text-[10px] text-purple-300/60">{user?.email || 'admin@argus.demo'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="rounded-lg p-1.5 text-purple-400/70 hover:bg-purple-900/40 hover:text-amber-400 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
