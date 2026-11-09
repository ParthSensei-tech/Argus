'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAuth } from '@/lib/auth';
import { getGraph, getNode } from '@/lib/api';
import type { GraphNode, GraphSnapshot } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/spinner';
import {
  Network,
  Search,
  RefreshCw,
  GitBranch,
  Layers,
  ArrowRight,
  Info,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

const ENTITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ORGANISATION: { bg: '#EEF2FF', border: '#4F46E5', text: '#312E81' },
  SOURCE_DOCUMENT: { bg: '#F0FDF4', border: '#16A34A', text: '#14532D' },
  GUIDELINE: { bg: '#F8FAFC', border: '#64748B', text: '#0F172A' },
  POLICY_RULE: { bg: '#FEF2F2', border: '#DC2626', text: '#7F1D1D' },
  FACT: { bg: '#ECFDF5', border: '#059669', text: '#064E3B' },
  CLAIM: { bg: '#EFF6FF', border: '#2563EB', text: '#1E3A8A' },
  TERM: { bg: '#F5F3FF', border: '#7C3AED', text: '#4C1D95' },
  PROHIBITED_TERM: { bg: '#FFF1F2', border: '#E11D48', text: '#881337' },
  CONTENT_ITEM: { bg: '#FFFBEB', border: '#D97706', text: '#78350F' },
  CONTENT_VERSION: { bg: '#FEF3C7', border: '#B45309', text: '#451A03' },
  REVIEW: { bg: '#F3E8FF', border: '#9333EA', text: '#581C87' },
  FINDING: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
  APPROVAL_DECISION: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
};

export default function GraphExplorerPage() {
  const { currentOrg } = useAuth();
  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<{ node: GraphNode; edges: any[] } | null>(null);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const loadGraphData = async () => {
    setLoading(true);
    try {
      const data = await getGraph(search || undefined);
      setSnapshot(data);

      // Auto-layout in grid/layered fashion
      const flowNodes: Node[] = data.nodes.map((n, i) => {
        const color = ENTITY_COLORS[n.entity_type] || { bg: '#FFFFFF', border: '#94A3B8', text: '#1E293B' };
        const row = Math.floor(i / 4);
        const col = i % 4;

        return {
          id: n.id,
          position: { x: col * 280 + 40, y: row * 180 + 40 },
          data: { label: n.label, entity_type: n.entity_type, properties: n.properties },
          style: {
            background: color.bg,
            color: color.text,
            border: `2px solid ${color.border}`,
            borderRadius: '12px',
            padding: '12px',
            fontSize: '11px',
            fontWeight: '600',
            width: '220px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          },
        };
      });

      const flowEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relation,
        animated: e.relation === 'CONTRADICTS' || e.relation === 'REVIEWED_UNDER',
        style: {
          stroke: e.relation === 'CONTRADICTS' ? '#EF4444' : '#6366F1',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: e.relation === 'CONTRADICTS' ? '#EF4444' : '#6366F1',
        },
        labelStyle: {
          fontSize: 9,
          fill: '#475569',
          fontWeight: 700,
        },
        labelBgStyle: {
          fill: '#FFFFFF',
          fillOpacity: 0.85,
        },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg) {
      loadGraphData();
    }
  }, [currentOrg]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const handleNodeClick = async (_: any, node: Node) => {
    try {
      const detail = await getNode(node.id);
      setSelectedNode(detail);
    } catch (err) {
      console.error('Failed to load node detail:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Change Impact Knowledge Graph
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real PostgreSQL recursive graph connecting guidelines, facts, reviews, findings, and approval decisions with full provenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search graph entities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadGraphData()}
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs shadow-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadGraphData} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Graph Area + Node Provenance Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Graph Canvas */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden border border-gray-200 shadow-sm">
            <div className="h-[620px] w-full bg-slate-50 relative">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={handleNodeClick}
                  fitView
                >
                  <Background color="#cbd5e1" gap={16} size={1} />
                  <Controls />
                </ReactFlow>
              )}
            </div>
            <div className="border-t border-gray-100 bg-white p-3 text-xs flex flex-wrap items-center gap-3">
              <span className="font-semibold text-gray-500">Legend:</span>
              {Object.entries(ENTITY_COLORS).map(([key, col]) => (
                <span key={key} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: col.border }}
                  />
                  <span className="text-[10px] text-gray-700 capitalize">
                    {key.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* Selected Node Provenance Inspector */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Info className="h-4 w-4 text-indigo-600" />
                Entity Provenance Inspector
              </CardTitle>
              <CardDescription className="text-xs">
                Click any node in the knowledge graph to view its origins and dependencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 text-xs">
              {selectedNode ? (
                <div className="space-y-3">
                  <div>
                    <Badge variant="default" className="text-[10px]">
                      {selectedNode.node.entity_type}
                    </Badge>
                    <h4 className="mt-1 font-bold text-gray-900 text-sm">
                      {selectedNode.node.label}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Node ID: {selectedNode.node.id}
                    </p>
                  </div>

                  {selectedNode.node.ref_id && (
                    <div className="rounded bg-gray-50 p-2 border border-gray-100">
                      <span className="font-semibold text-gray-600 block text-[10px] uppercase">
                        Underlying Object Reference
                      </span>
                      <p className="font-mono text-gray-800 text-[11px] truncate">
                        {selectedNode.node.ref_id}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="font-semibold text-gray-700 block mb-1">
                      Direct Relationships ({selectedNode.edges.length})
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {selectedNode.edges.map((e, idx) => (
                        <div
                          key={idx}
                          className="rounded border border-gray-200 bg-white p-2 text-[11px] space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-indigo-700">
                              {e.relation}
                            </span>
                            {e.provenance?.established_by && (
                              <span className="text-[9px] text-gray-400">
                                by {e.provenance.established_by}
                              </span>
                            )}
                          </div>
                          {e.provenance?.why && (
                            <p className="text-gray-600 italic text-[10px]">
                              &ldquo;{e.provenance.why}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedNode.node.properties && Object.keys(selectedNode.node.properties).length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">
                        Node Metadata
                      </span>
                      <pre className="max-h-36 overflow-y-auto rounded bg-gray-900 p-2 text-[10px] text-gray-100 font-mono">
                        {JSON.stringify(selectedNode.node.properties, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center text-gray-400">
                  <GitBranch className="h-8 w-8 mb-2 stroke-1" />
                  <p className="text-xs">No entity selected</p>
                  <p className="text-[10px] mt-1 text-gray-400">
                    Select a node to inspect provenance and recursive dependencies.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
