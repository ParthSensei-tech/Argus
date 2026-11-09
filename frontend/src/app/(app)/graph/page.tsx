'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback } from 'react';
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
  Info,
  Crown,
} from 'lucide-react';

const ENTITY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  ORGANISATION: { bg: '#1E1038', border: '#A855F7', text: '#F3E8FF', glow: 'rgba(168, 85, 247, 0.4)' },
  SOURCE_DOCUMENT: { bg: '#064E3B', border: '#34D399', text: '#ECFDF5', glow: 'rgba(52, 211, 153, 0.4)' },
  GUIDELINE: { bg: '#1E293B', border: '#94A3B8', text: '#F8FAFC', glow: 'rgba(148, 163, 184, 0.3)' },
  POLICY_RULE: { bg: '#450A0A', border: '#F87171', text: '#FEE2E2', glow: 'rgba(248, 113, 113, 0.4)' },
  FACT: { bg: '#172554', border: '#60A5FA', text: '#EFF6FF', glow: 'rgba(96, 165, 250, 0.4)' },
  CLAIM: { bg: '#1E3A8A', border: '#38BDF8', text: '#E0F2FE', glow: 'rgba(56, 189, 248, 0.4)' },
  TERM: { bg: '#3B0764', border: '#C084FC', text: '#FAF5FF', glow: 'rgba(192, 132, 252, 0.4)' },
  PROHIBITED_TERM: { bg: '#500724', border: '#FB7185', text: '#FFE4E6', glow: 'rgba(251, 113, 133, 0.5)' },
  CONTENT_ITEM: { bg: '#451A03', border: '#F59E0B', text: '#FEF3C7', glow: 'rgba(245, 158, 11, 0.45)' },
  CONTENT_VERSION: { bg: '#3E1C00', border: '#D97706', text: '#FEF3C7', glow: 'rgba(217, 119, 6, 0.4)' },
  REVIEW: { bg: '#2E1065', border: '#A855F7', text: '#FAF5FF', glow: 'rgba(168, 85, 247, 0.4)' },
  FINDING: { bg: '#4C0519', border: '#F43F5E', text: '#FFF1F2', glow: 'rgba(244, 63, 94, 0.5)' },
  APPROVAL_DECISION: { bg: '#064E3B', border: '#10B981', text: '#D1FAE5', glow: 'rgba(16, 185, 129, 0.4)' },
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

      const flowNodes: Node[] = data.nodes.map((n, i) => {
        const color = ENTITY_COLORS[n.entity_type] || {
          bg: '#160C2A',
          border: '#F59E0B',
          text: '#FFFFFF',
          glow: 'rgba(245, 158, 11, 0.3)',
        };
        const row = Math.floor(i / 4);
        const col = i % 4;

        return {
          id: n.id,
          position: { x: col * 290 + 40, y: row * 190 + 40 },
          data: { label: n.label, entity_type: n.entity_type, properties: n.properties },
          style: {
            background: color.bg,
            color: color.text,
            border: `2px solid ${color.border}`,
            borderRadius: '14px',
            padding: '12px',
            fontSize: '11px',
            fontWeight: '600',
            width: '230px',
            boxShadow: `0 0 16px -2px ${color.glow}`,
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
          stroke: e.relation === 'CONTRADICTS' ? '#F43F5E' : '#F59E0B',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: e.relation === 'CONTRADICTS' ? '#F43F5E' : '#F59E0B',
        },
        labelStyle: {
          fontSize: 9,
          fill: '#FDE68A',
          fontWeight: 700,
        },
        labelBgStyle: {
          fill: '#150A2A',
          fillOpacity: 0.95,
          rx: 4,
          ry: 4,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-purple-900/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight gold-gradient-text">
              Change Impact Knowledge Graph
            </h1>
            <Badge variant="default">
              <Crown className="h-3 w-3 mr-1" /> Recursive Traversal Engine
            </Badge>
          </div>
          <p className="mt-1 text-xs text-purple-200/70">
            Relational graph connecting guidelines, facts, reviews, findings, and approval decisions with full provenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-purple-400/60" />
            <input
              type="text"
              placeholder="Search graph entities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadGraphData()}
              className="w-full rounded-lg border border-purple-800/60 bg-purple-950/60 py-1.5 pl-8 pr-3 text-xs text-white placeholder-purple-400/40 shadow-xs focus:border-amber-400 focus:outline-none"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadGraphData} className="gap-1.5 text-xs font-semibold">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Graph Area + Node Provenance Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Graph Canvas */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden border border-purple-800/50 shadow-2xl">
            <div className="h-[620px] w-full bg-[#0A0414] relative">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner size="lg" className="text-amber-400" />
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
                  <Background color="rgba(168, 85, 247, 0.15)" gap={18} size={1} />
                  <Controls className="bg-purple-950/80 border-purple-800/60 text-white rounded-lg overflow-hidden shadow-lg" />
                </ReactFlow>
              )}
            </div>
            <div className="border-t border-purple-900/40 bg-purple-950/50 p-3 text-xs flex flex-wrap items-center gap-3">
              <span className="font-bold text-amber-300">Legend:</span>
              {Object.entries(ENTITY_COLORS).map(([key, col]) => (
                <span key={key} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: col.border, boxShadow: `0 0 6px ${col.border}` }}
                  />
                  <span className="text-[10px] text-purple-200 capitalize">
                    {key.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* Selected Node Provenance Inspector */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col purple-glass border-amber-500/25">
            <CardHeader className="pb-3 border-b border-purple-900/30">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-amber-300">
                <Info className="h-4 w-4 text-amber-400" />
                Entity Provenance Inspector
              </CardTitle>
              <CardDescription className="text-[11px] text-purple-300/70">
                Click any node in the graph to view its origins and dependencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 text-xs pt-3">
              {selectedNode ? (
                <div className="space-y-3">
                  <div>
                    <Badge variant="default" className="text-[9px]">
                      {selectedNode.node.entity_type}
                    </Badge>
                    <h4 className="mt-1 font-bold text-white text-xs">
                      {selectedNode.node.label}
                    </h4>
                    <p className="text-[10px] text-purple-400/60 font-mono mt-0.5 truncate">
                      ID: {selectedNode.node.id}
                    </p>
                  </div>

                  {selectedNode.node.ref_id && (
                    <div className="rounded-lg bg-purple-950/70 p-2.5 border border-purple-800/50">
                      <span className="font-bold text-amber-400 block text-[9px] uppercase">
                        Underlying Object Reference
                      </span>
                      <p className="font-mono text-purple-200 text-[10px] truncate">
                        {selectedNode.node.ref_id}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="font-bold text-purple-200 block mb-1 text-[11px]">
                      Direct Relationships ({selectedNode.edges.length})
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {selectedNode.edges.map((e, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-purple-800/50 bg-purple-950/60 p-2 text-[10px] space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-400">
                              {e.relation}
                            </span>
                            {e.provenance?.established_by && (
                              <span className="text-[9px] text-purple-400/70">
                                by {e.provenance.established_by}
                              </span>
                            )}
                          </div>
                          {e.provenance?.why && (
                            <p className="text-purple-300/80 italic text-[10px]">
                              &ldquo;{e.provenance.why}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedNode.node.properties && Object.keys(selectedNode.node.properties).length > 0 && (
                    <div>
                      <span className="font-bold text-purple-200 block mb-1 text-[11px]">
                        Node Metadata
                      </span>
                      <pre className="max-h-36 overflow-y-auto rounded-lg bg-[#07030D] p-2 text-[10px] text-amber-200 font-mono border border-purple-900/50 scrollbar-thin">
                        {JSON.stringify(selectedNode.node.properties, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center text-purple-400/50">
                  <GitBranch className="h-8 w-8 mb-2 stroke-1 text-amber-400/60" />
                  <p className="text-xs text-purple-200">No entity selected</p>
                  <p className="text-[10px] mt-1 text-purple-300/60">
                    Click any node to inspect provenance and recursive dependencies.
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
