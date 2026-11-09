'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { listReviews } from '@/lib/api';
import type { ReviewListItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/spinner';
import {
  FileCheck2,
  FilePlus,
  Search,
  Filter,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function ReviewsListPage() {
  const { currentOrg } = useAuth();
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        setLoading(true);
        const data = await listReviews();
        setReviews(data);
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    }
    if (currentOrg) {
      fetchReviews();
    }
  }, [currentOrg]);

  const filtered = reviews.filter((r) => {
    if (filterStatus === 'AWAITING' && r.status !== 'AWAITING_REVIEW') return false;
    if (filterStatus === 'COMPLETED' && r.status !== 'COMPLETED') return false;
    if (filterStatus === 'FAILED' && r.status !== 'FAILED') return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Content Reviews & Governance Pipeline
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track multi-stage analysis, agent runs, human approvals, and versioned brand decisions.
          </p>
        </div>
        <Link href="/reviews/new">
          <Button className="gap-2">
            <FilePlus className="h-4 w-4" />
            Submit Content
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {['ALL', 'AWAITING', 'COMPLETED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                filterStatus === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200',
              ].join(' ')}
            >
              {st === 'ALL'
                ? `All (${reviews.length})`
                : st === 'AWAITING'
                ? `Awaiting Review (${reviews.filter((r) => r.status === 'AWAITING_REVIEW').length})`
                : st === 'COMPLETED'
                ? `Completed (${reviews.filter((r) => r.status === 'COMPLETED').length})`
                : `Failed (${reviews.filter((r) => r.status === 'FAILED').length})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-xs shadow-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Reviews Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50/70 text-gray-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Content Title</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Decision</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filtered.map((r) => {
                    const riskBadge =
                      r.risk === 'CRITICAL'
                        ? 'destructive'
                        : r.risk === 'HIGH'
                        ? 'warning'
                        : r.risk === 'MEDIUM'
                        ? 'secondary'
                        : 'success';

                    const ModalityIcon =
                      r.input_type === 'IMAGE'
                        ? ImageIcon
                        : r.input_type === 'DOCUMENT'
                        ? FileSpreadsheet
                        : FileText;

                    return (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          <Link href={`/reviews/${r.id}`} className="hover:text-indigo-600 transition">
                            {r.title}
                          </Link>
                          <span className="ml-2 text-[10px] text-gray-400 font-normal">
                            v{r.version}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                            <ModalityIcon className="h-3 w-3 text-gray-500" />
                            {r.input_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 capitalize">{r.channel || 'General'}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-gray-800">
                            {r.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {r.risk ? (
                            <Badge variant={riskBadge}>{r.risk}</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.decision ? (
                            <Badge variant="outline" className="font-semibold text-gray-800">
                              {r.decision}
                            </Badge>
                          ) : (
                            <span className="text-amber-600 font-medium">Pending Decision</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/reviews/${r.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              View Audit
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <FileCheck2 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-900">No content reviews found</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Submit text, images, or documents to trigger the 7-agent swarm analysis.
              </p>
              <Link href="/reviews/new">
                <Button size="sm" className="gap-2">
                  <FilePlus className="h-4 w-4" />
                  Submit New Content
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
