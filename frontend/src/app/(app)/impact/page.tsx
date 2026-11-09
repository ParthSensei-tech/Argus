'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  getImpactDetail,
  listImpactEvents,
  reassessImpact,
} from '@/lib/api';
import type { ImpactEvent } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/spinner';
import {
  AlertTriangle,
  RotateCw,
  GitBranch,
  ArrowRight,
  ShieldAlert,
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
  Crown,
} from 'lucide-react';

export default function ImpactEventsPage() {
  const { currentOrg } = useAuth();
  const [events, setEvents] = useState<ImpactEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reassessing, setReassessing] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await listImpactEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load impact events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg) {
      loadEvents();
    }
  }, [currentOrg]);

  const handleInspect = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await getImpactDetail(id);
      setSelectedEvent(data);
    } catch (err: any) {
      alert(`Failed to load impact detail: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReassess = async (id: string) => {
    setReassessing(id);
    try {
      await reassessImpact(id);
      await loadEvents();
      alert('Reassessment dispatched! Connected content items are being re-evaluated against the new knowledge version.');
      if (selectedEvent?.event?.id === id) {
        setSelectedEvent(null);
      }
    } catch (err: any) {
      alert(`Reassessment failed: ${err.message}`);
    } finally {
      setReassessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-purple-900/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight gold-gradient-text">
              Change Impact Knowledge Events
            </h1>
            <Badge variant="default">
              <Crown className="h-3 w-3 mr-1" /> Blast-Radius Tracing
            </Badge>
          </div>
          <p className="mt-1 text-xs text-purple-200/70">
            Automated graph traversal discovering previously reviewed or approved content affected when brand rules or verified facts change.
          </p>
        </div>

        <Link href="/graph">
          <Button variant="outline" size="sm" className="gap-2 font-semibold text-xs">
            <GitBranch className="h-4 w-4 text-amber-400" />
            Explore Knowledge Graph
          </Button>
        </Link>
      </div>

      {/* Events Table / Cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            Active Impact Events ({events.length})
          </CardTitle>
          <CardDescription className="text-xs text-purple-200/70">
            When an administrator updates an approved fact or policy, Argus tracks all historical downstream reviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingSpinner size="lg" className="text-amber-400" />
            </div>
          ) : events.length > 0 ? (
            <div className="divide-y divide-purple-900/30">
              {events.map((ev) => {
                const sevBadge =
                  ev.severity === 'HIGH' || ev.severity === 'CRITICAL'
                    ? 'destructive'
                    : ev.severity === 'MEDIUM'
                    ? 'warning'
                    : 'secondary';

                return (
                  <div
                    key={ev.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-purple-900/20 px-2 rounded-xl transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={sevBadge} className="text-[9px]">
                          {ev.severity} IMPACT
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[9px] text-amber-300 border-amber-500/40">
                          v{ev.from_version} → v{ev.to_version}
                        </Badge>
                        <span className="text-xs font-semibold text-white">
                          {ev.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-purple-100">
                        {ev.change_summary}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-purple-300/60">
                        <span>Affected downstream items: <strong className="text-amber-300">{ev.affected_count}</strong></span>
                        <span>•</span>
                        <span>Logged: {new Date(ev.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInspect(ev.id)}
                        className="text-xs"
                      >
                        Inspect Affected Path
                      </Button>
                      {ev.status !== 'RESOLVED' && (
                        <Button
                          size="sm"
                          onClick={() => handleReassess(ev.id)}
                          isLoading={reassessing === ev.id}
                          className="gap-1.5 text-xs font-bold shadow-gold-sm"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          Reassess Content
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-purple-300/60">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
              All verified content is up to date with the latest brand knowledge versions.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspect Impact Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Change Impact Traversal Inspector"
        description="Recursive SQL graph discovery identifying every connected content version and historical review."
      >
        {selectedEvent && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="rounded-xl bg-purple-950/70 p-3 border border-purple-800/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-purple-200">Change Rationale</span>
                <Badge variant="outline" className="text-amber-300 border-amber-500/40">
                  v{selectedEvent.event.from_version} → v{selectedEvent.event.to_version}
                </Badge>
              </div>
              <p className="text-white font-medium">{selectedEvent.event.change_summary}</p>
            </div>

            <div>
              <h5 className="font-bold text-white mb-2 text-xs">
                Affected Downstream Entities ({selectedEvent.affected?.length || 0})
              </h5>
              {selectedEvent.affected && selectedEvent.affected.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {selectedEvent.affected.map((aff: any) => (
                    <div
                      key={aff.id}
                      className="flex items-center justify-between rounded-xl border border-purple-800/50 bg-purple-950/60 p-2.5"
                    >
                      <div>
                        <Badge variant="secondary" className="text-[9px] mb-1">
                          {aff.entity_type} (Depth {aff.depth})
                        </Badge>
                        <p className="font-semibold text-white">{aff.label}</p>
                      </div>
                      {aff.ref_id && aff.entity_type === 'REVIEW' && (
                        <Link href={`/reviews/${aff.ref_id}`}>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1">
                            Review <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-purple-400/60 italic">No historical content directly depends on this item.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-purple-900/30">
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
              {selectedEvent.event.status !== 'RESOLVED' && (
                <Button
                  onClick={() => handleReassess(selectedEvent.event.id)}
                  isLoading={reassessing === selectedEvent.event.id}
                  className="font-bold shadow-gold-sm"
                >
                  Trigger Fresh Review
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
