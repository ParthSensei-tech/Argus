'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  approveItem,
  approveSource,
  createItem,
  createSource,
  createVersion,
  getBrandProfile,
  listItems,
  listSources,
  rejectItem,
  updateBrandProfile,
  uploadFile,
} from '@/lib/api';
import type {
  BrandProfile,
  KnowledgeItem,
  KnowledgeSource,
  KnowledgeType,
} from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/spinner';
import {
  BookOpen,
  Plus,
  Upload,
  Check,
  X,
  History,
  Shield,
  Layers,
  Sparkles,
  FileText,
  AlertCircle,
  Tag,
  Palette,
  Search,
  Crown,
  Zap,
} from 'lucide-react';

export default function KnowledgePage() {
  const { currentOrg } = useAuth();

  const [activeTab, setActiveTab] = useState<'ITEMS' | 'SOURCES' | 'PROFILE'>('ITEMS');
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [createItemModal, setCreateItemModal] = useState(false);
  const [newItemType, setNewItemType] = useState<KnowledgeType>('FACT');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemBody, setNewItemBody] = useState('');
  const [itemSubmitting, setItemSubmitting] = useState(false);

  // Version modal
  const [versionModal, setVersionModal] = useState<KnowledgeItem | null>(null);
  const [newVersionBody, setNewVersionBody] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [versionSubmitting, setVersionSubmitting] = useState(false);

  // Upload source modal
  const [uploadSourceModal, setUploadSourceModal] = useState(false);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceSubmitting, setSourceSubmitting] = useState(false);

  // Profile Form
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [brandColors, setBrandColors] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [itData, srcData, profData] = await Promise.all([
        listItems(),
        listSources(),
        getBrandProfile().catch(() => null),
      ]);
      setItems(itData);
      setSources(srcData);
      setProfile(profData);
      if (profData) {
        setBrandName(profData.name || '');
        setBrandDesc(profData.description || '');
        setBrandTone(JSON.stringify(profData.voice_tone || {}, null, 2));
        setBrandColors((profData.colors || []).join(', '));
      }
    } catch (err) {
      console.error('Failed to load knowledge:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg) {
      loadAll();
    }
  }, [currentOrg]);

  const handleApproveItem = async (id: string) => {
    try {
      await approveItem(id);
      await loadAll();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleRejectItem = async (id: string) => {
    try {
      await rejectItem(id);
      await loadAll();
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemSubmitting(true);
    try {
      await createItem({
        type: newItemType,
        title: newItemTitle,
        body: newItemBody,
        structured: {},
      });
      setCreateItemModal(false);
      setNewItemTitle('');
      setNewItemBody('');
      await loadAll();
    } catch (err: any) {
      alert(`Failed to create item: ${err.message}`);
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleQuickAddJudgeRule = async (type: KnowledgeType, title: string, body: string) => {
    try {
      const item = await createItem({
        type,
        title,
        body,
        structured: { term: title },
      });
      await approveItem(item.id);
      await loadAll();
    } catch (err: any) {
      alert(`Quick add failed: ${err.message}`);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionModal) return;
    setVersionSubmitting(true);
    try {
      await createVersion(versionModal.id, {
        body: newVersionBody,
        change_note: changeNote,
      });
      setVersionModal(null);
      setNewVersionBody('');
      setChangeNote('');
      await loadAll();
    } catch (err: any) {
      alert(`Failed to update version: ${err.message}`);
    } finally {
      setVersionSubmitting(false);
    }
  };

  const handleUploadSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceSubmitting(true);
    try {
      let fileId: string | undefined = undefined;
      if (sourceFile) {
        const up = await uploadFile(sourceFile, 'KNOWLEDGE_SOURCE');
        fileId = up.id;
      }
      await createSource(sourceTitle, 'DOCUMENT', fileId);
      setUploadSourceModal(false);
      setSourceTitle('');
      setSourceFile(null);
      await loadAll();
    } catch (err: any) {
      alert(`Failed to upload source: ${err.message}`);
    } finally {
      setSourceSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      let parsedTone = {};
      try {
        parsedTone = JSON.parse(brandTone);
      } catch {
        parsedTone = { tone: brandTone };
      }
      const colors = brandColors
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await updateBrandProfile({
        name: brandName,
        description: brandDesc,
        voice_tone: parsedTone,
        colors,
      });
      await loadAll();
      alert('Brand Profile saved successfully.');
    } catch (err: any) {
      alert(`Failed to update profile: ${err.message}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const filteredItems = items.filter((it) => {
    if (filterType !== 'ALL' && it.type !== filterType) return false;
    if (filterStatus !== 'ALL' && it.status !== filterStatus) return false;
    if (search && !it.title.toLowerCase().includes(search.toLowerCase()) && !it.body.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-purple-900/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight gold-gradient-text">
              Brand Knowledge Management
            </h1>
            <Badge variant="default">
              <Crown className="h-3 w-3 mr-1" /> Provenance-Aware Engine
            </Badge>
          </div>
          <p className="mt-1 text-xs text-purple-200/70">
            Approved facts, policies, prohibited terminology, and visual guidelines powering the 7-agent verification swarm.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setUploadSourceModal(true)}
            className="gap-1.5 text-xs"
          >
            <Upload className="h-4 w-4" />
            Upload Guideline Doc
          </Button>
          <Button
            onClick={() => setCreateItemModal(true)}
            className="gap-1.5 text-xs font-bold shadow-gold-sm"
          >
            <Plus className="h-4 w-4" />
            Add Brand Rule / Fact
          </Button>
        </div>
      </div>

      {/* Judge Benchmark Rule Quick-Add Bar */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-[#150A2A] to-purple-950/50 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-white">Judge Live Testing Presets:</span>
            <span className="text-[11px] text-purple-300/70 ml-1.5">
              1-Click create & approve novel benchmark rules into the live Knowledge Graph:
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleQuickAddJudgeRule(
                'FACT',
                'SOC 2 Type II Certification',
                'Nexus Technologies holds active SOC 2 Type II compliance verified by Ernst & Young.'
              )
            }
            className="text-[10px] h-7 px-2"
          >
            + Fact: SOC 2
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleQuickAddJudgeRule(
                'PROHIBITED_TERM',
                'foolproof',
                'The term "foolproof" is prohibited in all external customer communications.'
              )
            }
            className="text-[10px] h-7 px-2 text-amber-300 border-amber-500/40"
          >
            + Banned Term: &quot;foolproof&quot;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleQuickAddJudgeRule(
                'POLICY',
                'Zero Downtime Claims',
                'Communications must never guarantee 100% or zero downtime without approved engineering SLA addendum.'
              )
            }
            className="text-[10px] h-7 px-2 text-amber-300 border-amber-500/40"
          >
            + Policy: Zero Downtime
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full sm:w-auto grid grid-cols-3">
          <TabsTrigger value="ITEMS" className="gap-2">
            <Layers className="h-4 w-4" />
            Knowledge Base ({items.length})
          </TabsTrigger>
          <TabsTrigger value="SOURCES" className="gap-2">
            <FileText className="h-4 w-4" />
            Source Documents ({sources.length})
          </TabsTrigger>
          <TabsTrigger value="PROFILE" className="gap-2">
            <Palette className="h-4 w-4" />
            Brand Identity & Tone
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Knowledge Items */}
        <TabsContent value="ITEMS" className="space-y-4 pt-2">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-purple-800/60 bg-purple-950/60 px-2.5 py-1.5 text-xs text-white shadow-xs focus:border-amber-400 focus:outline-none"
              >
                <option value="ALL" className="bg-[#160C2A]">All Rule Types</option>
                <option value="GUIDELINE" className="bg-[#160C2A]">Guideline</option>
                <option value="FACT" className="bg-[#160C2A]">Fact</option>
                <option value="CLAIM" className="bg-[#160C2A]">Claim</option>
                <option value="TERM" className="bg-[#160C2A]">Term</option>
                <option value="PROHIBITED_TERM" className="bg-[#160C2A]">Prohibited Term</option>
                <option value="POLICY" className="bg-[#160C2A]">Policy</option>
                <option value="VOICE_RULE" className="bg-[#160C2A]">Voice Rule</option>
                <option value="VISUAL_ASSET" className="bg-[#160C2A]">Visual Asset</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-purple-800/60 bg-purple-950/60 px-2.5 py-1.5 text-xs text-white shadow-xs focus:border-amber-400 focus:outline-none"
              >
                <option value="ALL" className="bg-[#160C2A]">All Statuses</option>
                <option value="APPROVED" className="bg-[#160C2A]">Approved (Active Evidence)</option>
                <option value="PENDING" className="bg-[#160C2A]">Pending Human Review</option>
                <option value="REJECTED" className="bg-[#160C2A]">Rejected</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-purple-400/60" />
              <input
                type="text"
                placeholder="Search knowledge..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-purple-800/60 bg-purple-950/60 py-1.5 pl-8 pr-3 text-xs text-white placeholder-purple-400/40 shadow-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Items List */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="lg" className="text-amber-400" />
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredItems.map((it) => {
                const statusBadge =
                  it.status === 'APPROVED'
                    ? 'success'
                    : it.status === 'REJECTED'
                    ? 'destructive'
                    : 'warning';

                return (
                  <Card key={it.id} className="flex flex-col justify-between hover:border-amber-500/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-[9px] text-amber-300 border-amber-500/40">
                          {it.type}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-purple-400/70 font-mono">
                            v{it.current_version}
                          </span>
                          <Badge variant={statusBadge}>{it.status}</Badge>
                        </div>
                      </div>
                      <CardTitle className="text-sm font-bold text-white mt-2">
                        {it.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 py-2">
                      <p className="text-xs text-purple-200/90 leading-relaxed bg-purple-950/60 p-2.5 rounded-xl border border-purple-900/40">
                        {it.body}
                      </p>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between border-t border-purple-900/30 pt-3 text-xs">
                      {it.status === 'PENDING' ? (
                        <div className="flex items-center gap-2 w-full justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectItem(it.id)}
                            className="h-7 text-xs text-red-400 border-red-500/40 hover:bg-red-500/10"
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveItem(it.id)}
                            className="h-7 text-xs font-bold"
                          >
                            Approve as Authoritative
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] text-purple-300/60">
                            {it.status === 'APPROVED' ? 'Active in Knowledge Graph' : 'Quarantined from verification'}
                          </span>
                          {it.status === 'APPROVED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setVersionModal(it);
                                setNewVersionBody(it.body);
                                setChangeNote('');
                              }}
                              className="h-7 text-xs gap-1"
                            >
                              <History className="h-3 w-3 text-amber-400" />
                              Update (New Version)
                            </Button>
                          )}
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-xs text-purple-300/60">
                <BookOpen className="mx-auto h-8 w-8 text-purple-400/40 mb-2" />
                No knowledge rules match your filters. Add approved brand guidelines or facts above.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Source Documents */}
        <TabsContent value="SOURCES" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-white">Approved Source Documents</CardTitle>
              <CardDescription className="text-xs text-purple-200/70">
                Uploaded policy manuals, PDFs, and guideline sheets. Rules extracted from documents remain pending until authorized.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sources.length > 0 ? (
                <div className="divide-y divide-purple-900/30">
                  {sources.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-3.5">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">{s.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-purple-300/60">
                          <span>Kind: {s.kind}</span>
                          <span>•</span>
                          <span>Uploaded: {new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={s.status === 'APPROVED' ? 'success' : 'warning'}>
                          {s.status}
                        </Badge>
                        {s.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              await approveSource(s.id);
                              await loadAll();
                            }}
                            className="font-bold text-xs"
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-purple-300/60 py-8">
                  No source documents uploaded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Brand Identity & Tone Profile */}
        <TabsContent value="PROFILE" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-white">Brand Identity & Voice Profile</CardTitle>
              <CardDescription className="text-xs text-purple-200/70">
                High-level brand guidelines evaluated by Agent 4 for tone, voice personality, and approved colors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-purple-200">
                    Brand Name *
                  </label>
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-purple-200">
                    Brand Description & Purpose
                  </label>
                  <Textarea
                    value={brandDesc}
                    onChange={(e) => setBrandDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-purple-200">
                    Voice & Tone Attributes (JSON or descriptive text)
                  </label>
                  <Textarea
                    value={brandTone}
                    onChange={(e) => setBrandTone(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-purple-200">
                    Approved Brand Palette Hex Colors (Comma-separated)
                  </label>
                  <Input
                    value={brandColors}
                    onChange={(e) => setBrandColors(e.target.value)}
                    placeholder="#1E40AF, #0EA5E9, #10B981, #FFFFFF"
                  />
                </div>

                <Button type="submit" isLoading={profileSaving} className="font-bold shadow-gold-sm">
                  Save Brand Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Create Knowledge Item */}
      <Dialog
        open={createItemModal}
        onClose={() => setCreateItemModal(false)}
        title="Add Approved Brand Knowledge Rule"
        description="Creates a new knowledge item. Items start as pending until approved by an administrator."
      >
        <form onSubmit={handleCreateItem} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-purple-200 mb-1">
              Rule Type *
            </label>
            <select
              value={newItemType}
              onChange={(e) => setNewItemType(e.target.value as any)}
              className="w-full rounded-lg border border-purple-800/60 bg-purple-950/60 p-2 text-xs text-white"
            >
              <option value="FACT" className="bg-[#160C2A]">Fact (Verified organizational data)</option>
              <option value="POLICY" className="bg-[#160C2A]">Policy (Regulatory or corporate rules)</option>
              <option value="GUIDELINE" className="bg-[#160C2A]">Guideline (Communication standards)</option>
              <option value="CLAIM" className="bg-[#160C2A]">Claim (Marketing & benchmark claims)</option>
              <option value="TERM" className="bg-[#160C2A]">Term (Approved product & company naming)</option>
              <option value="PROHIBITED_TERM" className="bg-[#160C2A]">Prohibited Term (Banned keywords)</option>
              <option value="VOICE_RULE" className="bg-[#160C2A]">Voice Rule (Channel-specific rules)</option>
              <option value="VISUAL_ASSET" className="bg-[#160C2A]">Visual Asset (Logo & imagery rules)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-purple-200 mb-1">
              Title / Descriptor *
            </label>
            <Input
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="e.g. Q3 Customer Count or Competitor Comparison Policy"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-purple-200 mb-1">
              Rule Statement / Approved Evidence *
            </label>
            <Textarea
              value={newItemBody}
              onChange={(e) => setNewItemBody(e.target.value)}
              placeholder="Exact wording, numeric facts, or specific policy conditions..."
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-purple-900/30">
            <Button variant="outline" type="button" onClick={() => setCreateItemModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={itemSubmitting} className="font-bold shadow-gold-sm">
              Create Item
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Create Version (Triggers Change Impact!) */}
      <Dialog
        open={!!versionModal}
        onClose={() => setVersionModal(null)}
        title={`Create New Version for: ${versionModal?.title}`}
        description="Updating an approved knowledge item creates a new immutable version and triggers the Change Impact Knowledge Graph to identify affected historical content reviews."
      >
        <form onSubmit={handleCreateVersion} className="space-y-4 pt-2">
          <Alert variant="warning" title="Change Impact Notice">
            Creating a new version does not overwrite historical records. Connected reviews will be flagged in the Change Impact explorer for reassessment.
          </Alert>

          <div>
            <label className="block text-xs font-medium text-purple-200 mb-1">
              Updated Statement / Evidence *
            </label>
            <Textarea
              value={newVersionBody}
              onChange={(e) => setNewVersionBody(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-purple-200 mb-1">
              Audit Change Note / Rationale *
            </label>
            <Input
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="e.g. Updated customer count to 6,000 for Q4 2024"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-purple-900/30">
            <Button variant="outline" type="button" onClick={() => setVersionModal(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={versionSubmitting} className="font-bold shadow-gold-sm">
              Commit Version & Propagate Impact
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Upload Source Document */}
      <Dialog
        open={uploadSourceModal}
        onClose={() => setUploadSourceModal(false)}
        title="Upload Brand Guideline Document"
        description="Upload a PDF, DOCX, or PPTX. Rules extracted from documents enter a pending state for safety."
      >
        <form onSubmit={handleUploadSource} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-purple-200 mb-1">
              Document Title *
            </label>
            <Input
              value={sourceTitle}
              onChange={(e) => setSourceTitle(e.target.value)}
              placeholder="e.g. Global Brand Guidelines 2024"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-purple-200 mb-1">
              File Attachment
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.pptx,.txt,.md"
              onChange={(e) => setSourceFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-purple-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-purple-900/30">
            <Button variant="outline" type="button" onClick={() => setUploadSourceModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={sourceSubmitting} className="font-bold shadow-gold-sm">
              Upload & Ingest
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
