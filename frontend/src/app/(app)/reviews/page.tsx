'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { listReviews } from '@/lib/api';
import type { ReviewListItem } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/spinner';
import {
  FileCheck2,
  FilePlus,
  Search,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Crown,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-purple-900/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight gold-gradient-text">
              Content Reviews & Governance Pipeline
            </h1>
            <Badge variant="default">
              <Crown className="h-3 w-3 mr-1" /> Multi-Format Swarm
            </Badge>
          </div>
          <p className="mt-1 text-xs text-purple-200/70">
            Track multi-stage analysis, agent runs, human approvals, and versioned brand decisions.
          </p>
        </div>
        <Link href="/reviews/new">
          <Button className="gap-2 font-bold shadow-gold-sm">
            <FilePlus className="h-4 w-4" />
            Submit Content
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'AWAITING', 'COMPLETED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                filterStatus === st
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-purple-950 shadow-gold-sm font-bold'
                  : 'bg-purple-950/60 text-purple-300/80 hover:bg-purple-900/60 hover:text-white border border-purple-800/50',
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
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-purple-400/60" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-purple-800/60 bg-purple-950/60 py-1.5 pl-9 pr-3 text-xs text-white placeholder-purple-400/40 shadow-xs focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Reviews Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="lg" className="text-amber-400" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-purple-900/40 bg-purple-950/40 text-purple-300 font-semibold uppercase">
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
                <tbody className="divide-y divide-purple-900/30 text-purple-200">
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
                      <tr key={r.id} className="hover:bg-purple-900/20 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <Link href={`/reviews/${r.id}`} className="hover:text-amber-300 transition">
                            {r.title}
                          </Link>
                          <span className="ml-2 text-[10px] text-purple-400/70 font-normal">
                            v{r.version}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 rounded bg-purple-900/40 border border-purple-700/50 px-2 py-0.5 text-[10px] font-medium text-purple-200">
                            <ModalityIcon className="h-3 w-3 text-amber-400" />
                            {r.input_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 capitalize text-purple-300">{r.channel || 'General'}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-white">
                            {r.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {r.risk ? (
                            <Badge variant={riskBadge}>{r.risk}</Badge>
                          ) : (
                            <span className="text-purple-400/60">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.decision ? (
                            <Badge variant="outline" className="font-semibold text-amber-300 border-amber-500/40">
                              {r.decision}
                            </Badge>
                          ) : (
                            <span className="text-amber-400 font-medium">Pending Decision</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-purple-300/70">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/reviews/${r.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              Inspect Audit
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
              <FileCheck2 className="mx-auto h-10 w-10 text-purple-400/40 mb-3" />
              <p className="text-sm font-semibold text-white">No content reviews found</p>
              <p className="text-xs text-purple-300/60 mt-1 mb-4">
                Submit text, images, or documents to trigger the 7-agent swarm analysis.
              </p>
              <Link href="/reviews/new">
                <Button size="sm" className="gap-2 font-bold shadow-gold-sm">
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
