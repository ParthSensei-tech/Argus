'use client';

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Change Impact Knowledge Events
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Automated graph traversal discovering previously reviewed or approved content affected when brand rules or verified facts change.
          </p>
        </div>

        <Link href="/graph">
          <Button variant="outline" size="sm" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Explore Graph Explorer
          </Button>
        </Link>
      </div>

      {/* Events Table / Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Active Impact Events ({events.length})
          </CardTitle>
          <CardDescription>
            When an administrator updates an approved fact or policy, Argus tracks all historical downstream reviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : events.length > 0 ? (
            <div className="divide-y divide-gray-100">
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
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50/50 px-2 rounded-lg transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={sevBadge} className="text-[10px]">
                          {ev.severity} IMPACT
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          v{ev.from_version} → v{ev.to_version}
                        </Badge>
                        <span className="text-xs font-semibold text-gray-900">
                          {ev.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-800">
                        {ev.change_summary}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span>Affected downstream items: <strong>{ev.affected_count}</strong></span>
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
                          className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
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
            <div className="py-12 text-center text-sm text-gray-500">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
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
            <div className="rounded-lg bg-gray-50 p-3 border border-gray-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Change Rationale</span>
                <Badge variant="outline">v{selectedEvent.event.from_version} → v{selectedEvent.event.to_version}</Badge>
              </div>
              <p className="text-gray-900 font-medium">{selectedEvent.event.change_summary}</p>
            </div>

            <div>
              <h5 className="font-bold text-gray-900 mb-2">
                Affected Downstream Entities ({selectedEvent.affected?.length || 0})
              </h5>
              {selectedEvent.affected && selectedEvent.affected.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedEvent.affected.map((aff: any) => (
                    <div
                      key={aff.id}
                      className="flex items-center justify-between rounded border border-gray-200 bg-white p-2.5"
                    >
                      <div>
                        <Badge variant="secondary" className="text-[9px] mb-1">
                          {aff.entity_type} (Depth {aff.depth})
                        </Badge>
                        <p className="font-semibold text-gray-900">{aff.label}</p>
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
                <p className="text-gray-500 italic">No historical content directly depends on this item.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
              {selectedEvent.event.status !== 'RESOLVED' && (
                <Button
                  onClick={() => handleReassess(selectedEvent.event.id)}
                  isLoading={reassessing === selectedEvent.event.id}
                  className="bg-indigo-600 hover:bg-indigo-700"
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
