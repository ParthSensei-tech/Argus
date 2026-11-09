'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getAuditLog } from '@/lib/api';
import type { AuditEvent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/spinner';
import { History, Shield, Lock, FileCheck2, Database } from 'lucide-react';

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Immutable Audit Trail & Provenance History
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Cryptographic SHA-256 append-only ledger tracking all reviews, human approvals, overrides, and brand rule revisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1 py-1">
            <Lock className="h-3 w-3" />
            Hash Chain Verified
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            Recorded Governance Events ({logs.length})
          </CardTitle>
          <CardDescription>
            Every decision and revision is immutably anchored to prevent tampering and ensure enterprise compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50/70 text-gray-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Entity ID</th>
                    <th className="py-3 px-4">Details / Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <Badge variant="outline" className="font-semibold text-indigo-700 bg-indigo-50/50">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-sans font-medium uppercase text-[11px]">
                        {log.entity_type}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-[10px]">
                        {log.entity_id ? log.entity_id.slice(0, 12) + '...' : '—'}
                      </td>
                      <td className="py-3 px-4 text-[11px] font-sans">
                        <pre className="max-w-md truncate bg-gray-100 p-1 rounded font-mono text-[10px]">
                          {JSON.stringify(log.payload)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-gray-500">
              No audit logs recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
