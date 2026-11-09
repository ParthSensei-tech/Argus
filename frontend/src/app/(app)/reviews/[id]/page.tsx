'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  decideCorrection,
  decideReview,
  getReview,
  rerunReview,
} from '@/lib/api';
import type {
  AgentRun,
  CorrectionSuggestion,
  Decision,
  ReviewDetail,
  ReviewFinding,
} from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dialog } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/spinner';
import {
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  Check,
  X,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  User,
  ArrowRight,
  GitBranch,
} from 'lucide-react';

export default function ReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reviewId = params?.id;

  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Correction Action Loading States
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Decision Modal State
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<Decision>('APPROVE');
  const [decisionReason, setDecisionReason] = useState('');
  const [overrideCritical, setOverrideCritical] = useState(false);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  // Rerun modal
  const [rerunModalOpen, setRerunModalOpen] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [rerunSubmitting, setRerunSubmitting] = useState(false);

  const fetchDetail = async (quiet = false) => {
    if (!reviewId) return;
    if (!quiet) setLoading(true);
    try {
      const data = await getReview(reviewId);
      setDetail(data);

      // Auto-poll if review is in active pipeline state
      const activeStates = ['QUEUED', 'EXTRACTING', 'LOADING_KNOWLEDGE', 'ANALYZING', 'RESOLVING', 'CORRECTING'];
      if (activeStates.includes(data.review.status)) {
        setPolling(true);
      } else {
        setPolling(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load review details.');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [reviewId]);

  // Polling loop for running agents
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(() => {
      fetchDetail(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [polling, reviewId]);

  const handleCorrectionDecision = async (correctionId: string, accept: boolean) => {
    if (!reviewId) return;
    setActionLoading(correctionId);
    try {
      await decideCorrection(reviewId, correctionId, accept);
      await fetchDetail(true);
    } catch (err: any) {
      alert(`Error updating suggestion: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!reviewId) return;
    setDecisionSubmitting(true);
    try {
      await decideReview(reviewId, {
        decision: selectedDecision,
        reason: decisionReason,
        override_critical: overrideCritical,
      });
      setDecisionModalOpen(false);
      await fetchDetail(true);
    } catch (err: any) {
      alert(`Decision rejected: ${err.message}`);
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleRerun = async () => {
    if (!reviewId) return;
    setRerunSubmitting(true);
    try {
      await rerunReview(reviewId, editedText || undefined);
      setRerunModalOpen(false);
      await fetchDetail(true);
    } catch (err: any) {
      alert(`Failed to rerun review: ${err.message}`);
    } finally {
      setRerunSubmitting(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Retrieving governance audit...</p>
      </div>
    );
  }

  const { review, content, agents, findings, corrections, decisions } = detail;

  const criticalFindings = findings.filter(
    (f) => f.severity === 'CRITICAL' && !['SUPPORTED', 'NOT_APPLICABLE', 'INFO'].includes(f.status)
  );
  const hasCriticalBlocker = criticalFindings.length > 0;

  const riskBadge =
    review.risk === 'CRITICAL'
      ? 'destructive'
      : review.risk === 'HIGH'
      ? 'warning'
      : review.risk === 'MEDIUM'
      ? 'secondary'
      : 'success';

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/reviews" className="text-xs text-gray-500 hover:text-indigo-600">
              Reviews
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-xs font-semibold text-gray-700">Governance Audit</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            {content.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>Version: <strong className="text-gray-900">v{content.version}</strong></span>
            <span>•</span>
            <span>Modality: <strong className="text-gray-900">{content.input_type}</strong></span>
            <span>•</span>
            <span>Channel: <strong className="capitalize text-gray-900">{content.channel}</strong></span>
            <span>•</span>
            <span>Audience: <strong className="text-gray-900">{content.audience}</strong></span>
            {review.ai_mode && (
              <>
                <span>•</span>
                <Badge variant={review.ai_mode === 'live' ? 'success' : 'secondary'}>
                  {review.ai_mode.toUpperCase()} ENGINE
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditedText(content.raw_text);
              setRerunModalOpen(true);
            }}
            className="gap-1.5"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Edit & Re-run
          </Button>

          {review.status === 'AWAITING_REVIEW' && (
            <Button
              onClick={() => {
                setSelectedDecision('APPROVE');
                setDecisionModalOpen(true);
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check className="h-4 w-4" />
              Make Governance Decision
            </Button>
          )}

          {review.decision && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-xs">
              <span className="text-xs text-gray-500">Recorded Decision:</span>
              <Badge variant={review.decision === 'APPROVE' ? 'success' : 'destructive'}>
                {review.decision}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Review Status Banner */}
      <Card
        className={[
          'border-l-4',
          review.status === 'COMPLETED'
            ? 'border-l-emerald-500 bg-emerald-50/20'
            : review.status === 'FAILED'
            ? 'border-l-red-500 bg-red-50/20'
            : review.status === 'AWAITING_REVIEW'
            ? 'border-l-amber-500 bg-amber-50/20'
            : 'border-l-indigo-500 bg-indigo-50/20',
        ].join(' ')}
      >
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4">
          <div className="flex items-center gap-3">
            {review.status === 'COMPLETED' ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : review.status === 'FAILED' ? (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            ) : review.status === 'AWAITING_REVIEW' ? (
              <Clock className="h-6 w-6 text-amber-600" />
            ) : (
              <LoadingSpinner size="default" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">
                  Status: {review.status.replace(/_/g, ' ')}
                </h4>
                {review.risk && <Badge variant={riskBadge}>{review.risk} RISK</Badge>}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {review.status === 'AWAITING_REVIEW'
                  ? 'The 7-agent swarm completed verification. Review findings and suggestions below before authorizing.'
                  : review.status === 'COMPLETED'
                  ? `Governance decision recorded: ${review.decision}. Audit entry appended to immutable hash chain.`
                  : review.status === 'FAILED'
                  ? `Orchestration error: ${review.error}`
                  : 'Specialist AI agents are currently inspecting content against approved brand rules...'}
              </p>
            </div>
          </div>

          <Link href="/graph">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0">
              <GitBranch className="h-3.5 w-3.5 text-indigo-600" />
              Trace in Graph
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* 7-Agent Execution Architecture */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              Coordinated Seven-Agent Execution Logs
            </span>
            <span className="text-xs font-normal text-gray-500">
              Correlation ID: <code className="text-gray-800">{review.correlation_id.slice(0, 8)}</code>
            </span>
          </CardTitle>
          <CardDescription>
            Each specialist runs with its own strict schema contract, scoped prompt instructions, and validated output.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map((ag) => {
              const statusBadge =
                ag.status === 'SUCCESS'
                  ? 'success'
                  : ag.status === 'FAILED'
                  ? 'destructive'
                  : ag.status === 'NOT_APPLICABLE'
                  ? 'secondary'
                  : 'warning';

              return (
                <div
                  key={ag.id}
                  className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 truncate" title={ag.name}>
                      Agent {ag.agent_id}
                    </span>
                    <Badge variant={statusBadge} className="text-[10px] px-1.5 py-0">
                      {ag.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-600 truncate">{ag.name.replace(/^Agent \d+: /, '')}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 pt-1">
                    <span>Model: {ag.model || 'deterministic'}</span>
                    <span>Tokens: {ag.tokens_in + ag.tokens_out}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Critical Blocker Alert if Critical Findings Exist */}
      {hasCriticalBlocker && (
        <Alert variant="destructive" title="Governance Blocked: Unresolved CRITICAL Finding(s)">
          This submission contains {criticalFindings.length} critical issue(s) that conflict with approved organizational policy.
          Standard approval is blocked. Only an authorized reviewer can override with an explicit audit rationale.
        </Alert>
      )}

      {/* Main Analysis Section: Findings & Evidence */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Findings Panel (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              Evidence-Linked Findings ({findings.length})
            </h3>
            <span className="text-xs text-gray-500">
              Traceable to approved facts, guidelines & prohibited terms
            </span>
          </div>

          {findings.length > 0 ? (
            findings.map((f) => {
              const severityBadge =
                f.severity === 'CRITICAL'
                  ? 'destructive'
                  : f.severity === 'MAJOR'
                  ? 'warning'
                  : f.severity === 'MINOR'
                  ? 'secondary'
                  : 'outline';

              return (
                <Card
                  key={f.id}
                  className={[
                    'overflow-hidden transition border-l-4',
                    f.severity === 'CRITICAL'
                      ? 'border-l-red-500'
                      : f.severity === 'MAJOR'
                      ? 'border-l-amber-500'
                      : 'border-l-indigo-400',
                  ].join(' ')}
                >
                  <CardHeader className="bg-gray-50/40 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={severityBadge}>{f.severity}</Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {f.status}
                        </Badge>
                        <span className="text-xs font-semibold text-gray-700">
                          {f.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium">
                        Confidence: {(f.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {/* Original Claimed Text */}
                    {f.original_text && (
                      <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5 text-xs">
                        <span className="font-semibold text-gray-500 uppercase text-[10px] block mb-1">
                          Evaluated Text Segment
                        </span>
                        <p className="font-mono text-gray-900 italic font-medium">
                          &ldquo;{f.original_text}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Finding Explanation */}
                    <div>
                      <p className="text-xs leading-relaxed text-gray-800">
                        {f.explanation}
                      </p>
                      {f.resolution_note && (
                        <p className="mt-1 text-[11px] text-indigo-700 italic">
                          Adjudication note: {f.resolution_note}
                        </p>
                      )}
                    </div>

                    {/* Traceable Evidence References */}
                    {f.evidence && f.evidence.length > 0 && (
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                          <Layers className="h-3.5 w-3.5" />
                          <span>Approved Evidence Citations ({f.evidence.length})</span>
                        </div>
                        {f.evidence.map((ev) => (
                          <div key={ev.id} className="text-xs text-indigo-950 border-t border-indigo-100/60 pt-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">
                                Relation: <Badge variant={ev.relation === 'CONTRADICTS' ? 'destructive' : 'success'} className="text-[9px] py-0 px-1 ml-1">{ev.relation}</Badge>
                              </span>
                              {ev.knowledge_version && (
                                <span className="text-[10px] text-indigo-600 font-mono">
                                  Approved v{ev.knowledge_version}
                                </span>
                              )}
                            </div>
                            <p className="italic text-gray-700 bg-white/70 p-1.5 rounded border border-indigo-100/50">
                              &ldquo;{ev.excerpt}&rdquo;
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-gray-500">
                <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                No policy violations detected. Content complies with approved brand guidelines.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Suggested Corrections & Original Content (1 column) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Intent-Constrained Corrections
              </CardTitle>
              <CardDescription>
                Agent 7 suggestions that preserve the creator&apos;s goal while resolving brand violations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {corrections.length > 0 ? (
                corrections.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-gray-200 bg-gray-50/60 p-3.5 text-xs space-y-2.5"
                  >
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-red-600">Original</span>
                      <p className="line-through text-gray-500 font-mono mt-0.5">{c.original_text}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold uppercase text-emerald-600">Suggested Resolution</span>
                      <p className="text-gray-900 font-semibold font-mono mt-0.5">{c.suggested_text}</p>
                    </div>

                    <p className="text-[11px] text-gray-600 italic">{c.explanation}</p>

                    <div className="flex items-center justify-between border-t border-gray-200/60 pt-2">
                      <span className="text-[10px] font-semibold">
                        Status: <Badge variant={c.status === 'ACCEPTED' ? 'success' : c.status === 'REJECTED' ? 'destructive' : 'secondary'} className="text-[9px] py-0">{c.status}</Badge>
                      </span>

                      {c.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCorrectionDecision(c.id, false)}
                            isLoading={actionLoading === c.id}
                            className="h-6 text-[10px] px-2 text-red-600 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleCorrectionDecision(c.id, true)}
                            isLoading={actionLoading === c.id}
                            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700"
                          >
                            Accept
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 italic text-center py-4">
                  No automated corrections required.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Submitted Raw Content Viewer */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-gray-500">
                Submitted Content Payload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto rounded bg-gray-900 p-3 font-mono text-xs text-gray-100 whitespace-pre-wrap leading-relaxed">
                {content.raw_text || '[Document/Image payload parsed into canonical blocks]'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Human Decision Modal */}
      <Dialog
        open={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title="Record Governance Decision"
        description="Your decision will be recorded in the immutable audit trail along with hash provenance."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Decision Option
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['APPROVE', 'REQUEST_CHANGES', 'REJECT'] as Decision[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDecision(d)}
                  className={[
                    'rounded-lg border p-2.5 text-center text-xs font-semibold transition',
                    selectedDecision === d
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700',
                  ].join(' ')}
                >
                  {d.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reviewer Rationale & Audit Comments
            </label>
            <Textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="State the justification for this decision..."
              rows={3}
            />
          </div>

          {selectedDecision === 'APPROVE' && hasCriticalBlocker && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 space-y-2">
              <p className="font-semibold flex items-center gap-1.5 text-red-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Critical Finding Override Required
              </p>
              <p>
                There are {criticalFindings.length} unresolved critical findings. To approve anyway, you must check the box below and provide a clear rationale.
              </p>
              <label className="flex items-center gap-2 cursor-pointer font-medium mt-1">
                <input
                  type="checkbox"
                  checked={overrideCritical}
                  onChange={(e) => setOverrideCritical(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Override Critical Finding(s) with Auditor Responsibility
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setDecisionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDecisionSubmit}
              isLoading={decisionSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Commit Decision
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit & Re-run Modal */}
      <Dialog
        open={rerunModalOpen}
        onClose={() => setRerunModalOpen(false)}
        title="Revise Content & Re-evaluate"
        description="Creates a new content version and re-runs the seven specialist agents."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Edited Content Copy
            </label>
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={8}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setRerunModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRerun}
              isLoading={rerunSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Dispatch Re-run
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
