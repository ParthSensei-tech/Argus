'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  getDashboardSummary,
  getRecurringIssues,
  getBrandProfile,
} from '@/lib/api';
import type { BrandProfile, DashboardSummary, RecurringIssue } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/spinner';
import {
  ShieldAlert,
  FileCheck,
  AlertCircle,
  FilePlus,
  ArrowRight,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
} from 'lucide-react';

export default function DashboardPage() {
  const { currentOrg } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [issues, setIssues] = useState<RecurringIssue[]>([]);
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sumData, issData, profData] = await Promise.all([
          getDashboardSummary(),
          getRecurringIssues(),
          getBrandProfile().catch(() => null),
        ]);
        setSummary(sumData);
        setIssues(issData);
        setProfile(profData);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const awaitingCount = summary?.awaiting_human_review || 0;
  const impactCount = summary?.open_impact_events || 0;
  const pendingKnowledge = summary?.pending_knowledge_items || 0;
  const totalContent = summary?.total_content_items || 0;

  return (
    <div className="space-y-8">
      {/* Workspace Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {currentOrg?.name || 'Workspace'}
            </h1>
            <Badge variant="default">Governed by 7 AI Agents</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {profile?.description ||
              'Real-time brand compliance, multimodal verification & change impact tracing.'}
          </p>
          {profile?.colors && profile.colors.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Brand Palette:</span>
              <div className="flex items-center gap-1.5">
                {profile.colors.map((c, i) => (
                  <span
                    key={i}
                    className="h-4 w-4 rounded-full border border-gray-300 shadow-xs"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/reviews/new">
            <Button className="gap-2">
              <FilePlus className="h-4 w-4" />
              Submit Content for Review
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Awaiting Review */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-gray-500">
              Awaiting Decision
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{awaitingCount}</div>
            <p className="mt-1 text-xs text-gray-500">
              {awaitingCount === 1 ? '1 content item needs approval' : `${awaitingCount} items awaiting sign-off`}
            </p>
          </CardContent>
        </Card>

        {/* Change Impact Alerts */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-gray-500">
              Change Impact Alerts
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{impactCount}</div>
            <p className="mt-1 text-xs text-gray-500">
              Impacted reviews needing reassessment
            </p>
          </CardContent>
        </Card>

        {/* Pending Knowledge Items */}
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-gray-500">
              Pending Brand Rules
            </CardTitle>
            <Layers className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{pendingKnowledge}</div>
            <p className="mt-1 text-xs text-gray-500">
              Extracted facts/rules requiring approval
            </p>
          </CardContent>
        </Card>

        {/* Total Content Items */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-gray-500">
              Verified Assets
            </CardTitle>
            <FileCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalContent}</div>
            <p className="mt-1 text-xs text-gray-500">
              Total content items evaluated in workspace
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Recent Reviews & Swarm Health */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Content Reviews Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Content Submissions</CardTitle>
                <CardDescription>
                  Submissions processed through the coordinated 7-agent pipeline.
                </CardDescription>
              </div>
              <Link href="/reviews">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {summary?.recent_reviews && summary.recent_reviews.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {summary.recent_reviews.map((r) => {
                    const riskBadge =
                      r.risk === 'CRITICAL'
                        ? 'destructive'
                        : r.risk === 'HIGH'
                        ? 'warning'
                        : r.risk === 'MEDIUM'
                        ? 'secondary'
                        : 'success';

                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between py-3.5 hover:bg-gray-50/50 rounded-lg px-2"
                      >
                        <div className="space-y-1">
                          <Link
                            href={`/reviews/${r.id}`}
                            className="font-medium text-gray-900 hover:text-indigo-600 transition"
                          >
                            {r.title}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Status: {r.status}</span>
                            <span>•</span>
                            <span>{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {r.risk && (
                            <Badge variant={riskBadge}>
                              {r.risk} RISK
                            </Badge>
                          )}
                          {r.decision && (
                            <Badge variant="outline" className="font-semibold">
                              {r.decision}
                            </Badge>
                          )}
                          <Link href={`/reviews/${r.id}`}>
                            <Button variant="outline" size="sm">
                              Inspect
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-gray-500">
                  No submissions yet.{' '}
                  <Link href="/reviews/new" className="text-indigo-600 underline">
                    Submit your first content item
                  </Link>
                  .
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 7-Agent Architecture Status */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                AI Swarm Orchestration
              </CardTitle>
              <CardDescription>
                Seven specialist agents active in current workspace pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { id: 1, name: 'Agent 1: Content Intake & Multimodal', role: 'Canonical representation' },
                { id: 2, name: 'Agent 2: Knowledge & Graph Retrieval', role: 'Approved provenance' },
                { id: 3, name: 'Agent 3: Claim & Evidence Verification', role: 'Fact & benchmark audit' },
                { id: 4, name: 'Agent 4: Brand Policy & Terminology', role: 'Prohibited terms & tone' },
                { id: 5, name: 'Agent 5: Visual Identity & Accessibility', role: 'Logo & contrast checks' },
                { id: 6, name: 'Agent 6: Conflict Adjudication', role: 'Argumentation graph' },
                { id: 7, name: 'Agent 7: Intent-Constrained Correction', role: 'Side-by-side edits' },
              ].map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/70 p-2.5"
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{agent.name}</p>
                    <p className="text-[11px] text-gray-500">{agent.role}</p>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-xs" title="Operational" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recurring Issues Section */}
      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              Frequently Detected Brand Policy Violations
            </CardTitle>
            <CardDescription>
              Repeated issues identified across multiple content submissions in this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {issues.slice(0, 6).map((iss, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-amber-200 bg-amber-50/40 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="warning" className="text-[10px]">
                      {iss.category}
                    </Badge>
                    <span className="text-xs font-bold text-amber-900">
                      {iss.occurrences} {iss.occurrences === 1 ? 'hit' : 'hits'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-900 italic line-clamp-2">
                    &ldquo;{iss.text}&rdquo;
                  </p>
                  <p className="mt-2 text-[11px] text-gray-500">
                    Flagged in {iss.reviews_affected} distinct review submissions
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
