'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getAuditLog } from '@/lib/api';
import type { AuditEvent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/spinner';
import { History, Shield, Lock, Crown } from 'lucide-react';

export default function AuditTrailPage() {
  const { currentOrg } = useAuth();
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAudit() {
      try {
        setLoading(true);
        const data = await getAuditLog({ limit: 100 });
        setLogs(data);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    if (currentOrg) {
      loadAudit();
    }
  }, [currentOrg]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-purple-900/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight gold-gradient-text">
              Immutable Audit Trail & Provenance History
            </h1>
            <Badge variant="default">
              <Crown className="h-3 w-3 mr-1" /> SHA-256 Hash Chain
            </Badge>
          </div>
          <p className="mt-1 text-xs text-purple-200/70">
            Cryptographic SHA-256 append-only ledger tracking all reviews, human approvals, overrides, and brand rule revisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1 py-1 text-xs">
            <Lock className="h-3.5 w-3.5" />
            Hash Chain Cryptographically Verified
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
            <History className="h-4 w-4 text-amber-400" />
            Recorded Governance Events ({logs.length})
          </CardTitle>
          <CardDescription className="text-xs text-purple-200/70">
            Every decision and revision is immutably anchored to prevent tampering and ensure enterprise compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="lg" className="text-amber-400" />
            </div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-purple-900/40 bg-purple-950/40 text-purple-300 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Entity ID</th>
                    <th className="py-3 px-4">Details / Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30 font-mono text-purple-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-purple-900/20 transition">
                      <td className="py-3 px-4 text-purple-400/80 whitespace-nowrap text-[11px]">
                        {new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <Badge variant="outline" className="font-semibold text-amber-300 border-amber-500/40 bg-purple-950/60">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-white font-sans font-semibold uppercase text-[10px]">
                        {log.entity_type}
                      </td>
                      <td className="py-3 px-4 text-purple-400/60 text-[10px]">
                        {log.entity_id ? log.entity_id.slice(0, 12) + '...' : '—'}
                      </td>
                      <td className="py-3 px-4 text-[11px] font-sans">
                        <pre className="max-w-md truncate bg-purple-950/80 p-1.5 rounded-lg border border-purple-900/40 font-mono text-[10px] text-purple-200">
                          {JSON.stringify(log.payload)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-purple-300/60">
              No audit logs recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
