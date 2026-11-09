'use client';

import React from 'react';
import Link from 'next/navigation';
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
  ChevronDown,
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
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-100">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            ARGUS
          </span>
          <span className="block text-[10px] font-semibold tracking-wider text-indigo-600 uppercase">
            AI Brand Governance
          </span>
        </div>
      </div>

      {/* Org Selector */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 p-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Building2 className="h-4 w-4 shrink-0 text-gray-500" />
            <div className="truncate">
              <p className="truncate text-xs font-semibold text-gray-900">
                {currentOrg?.name || 'No Organisation'}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-500">Workspace</span>
                {memberships.find((m) => m.org_id === currentOrg?.id)?.role && (
                  <Badge variant="secondary" className="px-1 py-0 text-[9px] uppercase">
                    {memberships.find((m) => m.org_id === currentOrg?.id)?.role}
                  </Badge>
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
                <option key={m.org_id} value={m.org_id}>
                  {m.org_name} ({m.role})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href));

          return (
            <a
              key={item.href}
              href={item.href}
              className={[
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 font-semibold text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')}
            >
              <Icon
                className={[
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive
                    ? 'text-indigo-600'
                    : 'text-gray-400 group-hover:text-gray-600',
                ].join(' ')}
              />
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {user?.full_name
                ? user.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                : 'U'}
            </div>
            <div className="truncate">
              <p className="truncate text-xs font-semibold text-gray-900">
                {user?.full_name || 'Anonymous User'}
              </p>
              <p className="truncate text-[11px] text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
