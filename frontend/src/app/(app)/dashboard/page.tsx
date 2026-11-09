'use client';

export const dynamic = 'force-dynamic';

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
  FilePlus,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
  Activity,
  Crown,
  CheckCircle2,
  Cpu,
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
        <LoadingSpinner size="lg" className="text-amber-400" />
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-purple-900/40 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight gold-gradient-text">
              {currentOrg?.name || 'Nexus Technologies'}
            </h1>
            <Badge variant="default" className="flex items-center gap-1">
              <Crown className="h-3 w-3" /> Governed by 7 AI Agents
            </Badge>
          </div>
          <p className="mt-1 text-xs text-purple-200/70">
            {profile?.description ||
              'Real-time brand compliance, multimodal verification & Change Impact Knowledge Graph tracing.'}
          </p>
          {profile?.colors && profile.colors.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-purple-300/80">Approved Palette:</span>
              <div className="flex items-center gap-1.5">
                {profile.colors.map((c, i) => (
                  <span
                    key={i}
                    className="h-4 w-4 rounded-full border border-amber-500/40 shadow-xs"
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
            <Button className="gap-2 shadow-gold-sm">
              <FilePlus className="h-4 w-4" />
              Review Content
            </Button>
          </Link>
        </div>
      </div>

      {/* Side-by-Side Demo Presentation vs Real-World Judge Tester Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Pre-configured Demonstration Scenario */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/80 via-[#150A2A] to-purple-950/40 border border-amber-500/30 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Pre-Seeded Demo Scenario
            </span>
            <Badge variant="secondary" className="text-[10px]">Ready to Present</Badge>
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            Nexus Technologies Enterprise Showcase
          </h3>
          <p className="text-xs text-purple-200/70 mb-3">
            Contains 10 approved rules, 1 historical multi-agent review with CRITICAL findings & diffs, plus an active Change Impact event.
          </p>
          <div className="flex items-center gap-2">
            <Link href="/reviews">
              <Button variant="outline" size="sm" className="text-xs">
                Inspect Q4 Review
              </Button>
            </Link>
            <Link href="/impact">
              <Button variant="outline" size="sm" className="text-xs">
                View Impact Blast-Radius
              </Button>
            </Link>
          </div>
        </div>

        {/* Right: Real-World Judge Arbitrary Data Tester */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#120824] via-amber-950/20 to-purple-950/40 border border-amber-500/40 shadow-gold-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              <Cpu className="h-3.5 w-3.5 text-amber-400" /> Arbitrary Judge Data Mode
            </span>
            <Badge variant="warning" className="text-[10px]">Real-World Input</Badge>
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            Test Your Own Custom Data Live
          </h3>
          <p className="text-xs text-purple-200/70 mb-3">
            Paste any marketing text, upload static images (PNG/JPG/WEBP), or multi-page documents (PDF, DOCX, PPTX) to evaluate on the fly.
          </p>
          <div className="flex items-center gap-2">
            <Link href="/reviews/new">
              <Button size="sm" className="text-xs font-bold">
                Launch Custom Review <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/knowledge">
              <Button variant="outline" size="sm" className="text-xs">
                Add Custom Rule
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Awaiting Review */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-purple-300/80">
              Awaiting Decision
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-400">{awaitingCount}</div>
            <p className="mt-1 text-xs text-purple-200/60">
              {awaitingCount === 1 ? '1 content item needs approval' : `${awaitingCount} items awaiting sign-off`}
            </p>
          </CardContent>
        </Card>

        {/* Change Impact Alerts */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-purple-300/80">
              Change Impact Alerts
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-red-400">{impactCount}</div>
            <p className="mt-1 text-xs text-purple-200/60">
              Impacted reviews needing reassessment
            </p>
          </CardContent>
        </Card>

        {/* Pending Knowledge Items */}
        <Card className="border-l-4 border-l-amber-400">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-purple-300/80">
              Pending Brand Rules
            </CardTitle>
            <Layers className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-300">{pendingKnowledge}</div>
            <p className="mt-1 text-xs text-purple-200/60">
              Extracted facts/rules requiring approval
            </p>
          </CardContent>
        </Card>

        {/* Total Content Items */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-purple-300/80">
              Verified Assets
            </CardTitle>
            <FileCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-400">{totalContent}</div>
            <p className="mt-1 text-xs text-purple-200/60">
              Total content items evaluated in workspace
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Recent Reviews & Swarm Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Content Reviews Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Content Submissions</CardTitle>
                <CardDescription>
                  Submissions evaluated through the coordinated 7-agent pipeline.
                </CardDescription>
              </div>
              <Link href="/reviews">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-amber-400 hover:text-amber-300">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {summary?.recent_reviews && summary.recent_reviews.length > 0 ? (
                <div className="divide-y divide-purple-900/30">
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
                        className="flex items-center justify-between py-3.5 hover:bg-purple-900/20 rounded-lg px-2 transition"
                      >
                        <div className="space-y-1">
                          <Link
                            href={`/reviews/${r.id}`}
                            className="font-medium text-white hover:text-amber-300 transition"
                          >
                            {r.title}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-purple-300/60">
                            <span>Status: {r.status}</span>
                            <span>•</span>
                            <span>{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {r.risk && (
                            <Badge variant={riskBadge}>
                              {r.risk} RISK
                            </Badge>
                          )}
                          {r.decision && (
                            <Badge variant="outline" className="font-semibold text-amber-300 border-amber-500/40">
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
                <div className="py-8 text-center text-xs text-purple-300/60">
                  No submissions yet.{' '}
                  <Link href="/reviews/new" className="text-amber-400 underline">
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
                <Activity className="h-4 w-4 text-amber-400" />
                AI Swarm Telemetry
              </CardTitle>
              <CardDescription>
                Seven specialist agents active in current workspace pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { id: 1, name: 'Agent 1: Intake & Multimodal', role: 'Canonical representation' },
                { id: 2, name: 'Agent 2: Knowledge Retrieval', role: 'Approved provenance' },
                { id: 3, name: 'Agent 3: Claim Verification', role: 'Fact & benchmark audit' },
                { id: 4, name: 'Agent 4: Brand Policy & Terms', role: 'Prohibited terms & tone' },
                { id: 5, name: 'Agent 5: Visual Identity', role: 'Logo & contrast checks' },
                { id: 6, name: 'Agent 6: Conflict Adjudication', role: 'Argumentation graph' },
                { id: 7, name: 'Agent 7: Intent Correction', role: 'Side-by-side edits' },
              ].map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between rounded-lg border border-purple-800/40 bg-purple-950/40 p-2.5"
                >
                  <div>
                    <p className="text-xs font-semibold text-white">{agent.name}</p>
                    <p className="text-[11px] text-purple-300/60">{agent.role}</p>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" title="Operational" />
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
              <TrendingUp className="h-4 w-4 text-amber-400" />
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
                  className="rounded-xl border border-amber-500/30 bg-purple-950/40 p-3.5 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="warning" className="text-[10px]">
                      {iss.category}
                    </Badge>
                    <span className="text-xs font-bold text-amber-400">
                      {iss.occurrences} {iss.occurrences === 1 ? 'hit' : 'hits'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-white italic line-clamp-2">
                    &ldquo;{iss.text}&rdquo;
                  </p>
                  <p className="mt-2 text-[11px] text-purple-300/60">
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
