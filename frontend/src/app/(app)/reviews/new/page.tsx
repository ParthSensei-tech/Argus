'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createReview, uploadFile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Upload,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Crown,
  Cpu,
  CheckCircle2,
} from 'lucide-react';

export default function NewReviewPage() {
  const router = useRouter();

  // Submission Form State
  const [inputType, setInputType] = useState<'TEXT' | 'IMAGE' | 'DOCUMENT'>('TEXT');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Metadata
  const [channel, setChannel] = useState('email');
  const [contentType, setContentType] = useState('marketing_email');
  const [audience, setAudience] = useState('enterprise_cto');
  const [campaign, setCampaign] = useState('Q4-Enterprise-Growth');
  const [context, setContext] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a title for this content review.');
      return;
    }

    if (inputType === 'TEXT' && !rawText.trim()) {
      setError('Please enter or paste the content copy to evaluate.');
      return;
    }

    if ((inputType === 'IMAGE' || inputType === 'DOCUMENT') && !selectedFile) {
      setError(`Please upload a ${inputType.toLowerCase()} file.`);
      return;
    }

    setLoading(true);

    try {
      let fileId: string | undefined = undefined;

      if (selectedFile) {
        const uploaded = await uploadFile(selectedFile, 'CONTENT_SUBMISSION');
        fileId = uploaded.id;
      }

      const review = await createReview({
        title,
        input_type: inputType,
        raw_text: rawText,
        file_id: fileId,
        channel,
        content_type: contentType,
        audience,
        campaign,
        context,
      });

      router.push(`/reviews/${review.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit content for review.');
      setLoading(false);
    }
  };

  // Demo presets
  const loadPreset = (preset: 'critical' | 'contradiction' | 'compliant') => {
    setInputType('TEXT');
    if (preset === 'critical') {
      setTitle('Q4 Cloud Analytics Email Campaign');
      setChannel('email');
      setContentType('marketing_email');
      setAudience('enterprise_cto');
      setCampaign('Q4-Accelerate');
      setRawText(
        'Transform your enterprise with Nexus Analytics — the guaranteed #1 analytics solution. ' +
        'Our platform processes 10 million data points per second, 50% faster than Salesforce Analytics. ' +
        'Get guaranteed ROI in 90 days or your money back! Join 5,000+ customers in 40 countries who trust Nexus Technologies. ' +
        'Start your free trial today.'
      );
    } else if (preset === 'contradiction') {
      setTitle('Press Release - Enterprise Throughput Milestone');
      setChannel('press_release');
      setContentType('press_release');
      setAudience('market_analysts');
      setCampaign('Q4-Throughput');
      setRawText(
        'Nexus Analytics announces industry-first breakthrough processing 25 million data points per second. ' +
        'Offering foolproof analytics across 8,000 enterprise customers, Nexus continues to dominate mid-market analytics.'
      );
    } else {
      setTitle('Official Nexus Analytics Product Overview');
      setChannel('website');
      setContentType('landing_page');
      setAudience('enterprise_cto');
      setCampaign('Core-Product-2024');
      setRawText(
        'Founded in 2019, Nexus Technologies powers enterprise data teams with Nexus Analytics. ' +
        'Our high-performance engine processes 10M data points per second with rigorous SOC 2 Type II compliance. ' +
        'Trusted by 5,000 enterprise customers across 40 countries.'
      );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-purple-900/40 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight gold-gradient-text">
              Submit Content for Governance Review
            </h1>
            <Badge variant="default" className="text-[10px]">
              <Crown className="h-3 w-3 mr-1" /> Coordinated 7-Agent Swarm
            </Badge>
          </div>
          <p className="mt-1 text-xs text-purple-200/70">
            Intake parses content canonically, cross-checks against approved knowledge, and dispatches specialist agents in parallel.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {/* Side-by-Side: Preset Demo Benchmarks vs Real-World Custom Input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Demo Benchmarks for Judges */}
        <div className="space-y-4">
          <Card className="purple-glass-gold border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" /> Judge Demo Presets
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  1-Click Load
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-purple-300/70">
                Instantly populate benchmark test scenarios to evaluate how the 7 agents respond.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <button
                type="button"
                onClick={() => loadPreset('critical')}
                className="w-full text-left p-3 rounded-xl border border-purple-800/60 bg-purple-950/40 hover:border-amber-500/50 hover:bg-purple-900/50 transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white group-hover:text-amber-300">
                    Scenario 1: Competitor & Guarantee
                  </span>
                  <Badge variant="destructive" className="text-[9px]">CRITICAL</Badge>
                </div>
                <p className="text-[11px] text-purple-300/70 line-clamp-2">
                  Violates competitor comparison policy vs Salesforce + includes banned term &quot;guaranteed ROI&quot;.
                </p>
              </button>

              <button
                type="button"
                onClick={() => loadPreset('contradiction')}
                className="w-full text-left p-3 rounded-xl border border-purple-800/60 bg-purple-950/40 hover:border-amber-500/50 hover:bg-purple-900/50 transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white group-hover:text-amber-300">
                    Scenario 2: Contradicted Metrics
                  </span>
                  <Badge variant="warning" className="text-[9px]">HIGH RISK</Badge>
                </div>
                <p className="text-[11px] text-purple-300/70 line-clamp-2">
                  Claims 25M points/sec (fact says 10M) and 8,000 customers (fact says 5,000).
                </p>
              </button>

              <button
                type="button"
                onClick={() => loadPreset('compliant')}
                className="w-full text-left p-3 rounded-xl border border-purple-800/60 bg-purple-950/40 hover:border-amber-500/50 hover:bg-purple-900/50 transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white group-hover:text-amber-300">
                    Scenario 3: 100% Compliant Copy
                  </span>
                  <Badge variant="success" className="text-[9px]">LOW RISK</Badge>
                </div>
                <p className="text-[11px] text-purple-300/70 line-clamp-2">
                  Verified claims, approved product terminology, and adheres to brand tone guidelines.
                </p>
              </button>
            </CardContent>
          </Card>

          <Card className="purple-glass border-purple-800/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-amber-400" /> Swarm Execution Flow
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-purple-300/70 space-y-1.5">
              <p>• <strong>Agent 1:</strong> Canonical representation & spatial spans.</p>
              <p>• <strong>Agent 2:</strong> Retrieves active approved brand knowledge.</p>
              <p>• <strong>Agents 3, 4, 5:</strong> Parallel fact, policy, and visual audit.</p>
              <p>• <strong>Agent 6:</strong> Argumentation graph conflict resolution.</p>
              <p>• <strong>Agent 7:</strong> Minimal intent-preserving diffs.</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Form for Arbitrary Judge Data */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Input Modality Tabs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-white">
                  1. Content Modality & Payload (Live Judge Input)
                </CardTitle>
                <CardDescription className="text-xs text-purple-200/70">
                  Enter custom marketing copy, or upload static images or multi-page documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-purple-200">
                    Content Item Title *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q4 Global Product Announcement"
                    required
                  />
                </div>

                <Tabs
                  value={inputType}
                  onValueChange={(val) => setInputType(val as any)}
                >
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="TEXT" className="gap-2">
                      <FileText className="h-4 w-4" /> Direct Text
                    </TabsTrigger>
                    <TabsTrigger value="IMAGE" className="gap-2">
                      <ImageIcon className="h-4 w-4" /> Static Image
                    </TabsTrigger>
                    <TabsTrigger value="DOCUMENT" className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" /> Document
                    </TabsTrigger>
                  </TabsList>

                  {/* Text Area */}
                  <TabsContent value="TEXT" className="space-y-2">
                    <label className="block text-xs font-medium text-purple-200">
                      Enter or Paste Content Copy *
                    </label>
                    <Textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Paste arbitrary marketing copy, ad text, email campaigns, promotional claims..."
                      rows={8}
                      className="font-mono text-xs leading-relaxed"
                    />
                    <p className="text-[10px] text-purple-300/60">
                      Deterministic + AI claim verification will test against approved facts.
                    </p>
                  </TabsContent>

                  {/* Image Input */}
                  <TabsContent value="IMAGE" className="space-y-3">
                    <label className="block text-xs font-medium text-purple-200">
                      Upload Visual Asset (PNG, JPG, WEBP) *
                    </label>
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-800/60 p-8 text-center hover:border-amber-400 bg-purple-950/30 transition">
                      <Upload className="h-8 w-8 text-amber-400/70 mb-2" />
                      <p className="text-xs font-medium text-white">
                        {selectedFile ? selectedFile.name : 'Click or drag image file here'}
                      </p>
                      <p className="text-[10px] text-purple-300/60 mt-1">PNG, JPG, or WEBP up to 25MB</p>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="mt-3 text-xs text-purple-300"
                      />
                    </div>
                    <p className="text-[10px] text-purple-300/60">
                      Agent 5 extracts dominant colors, detects logo presence, text-in-image OCR, and readability.
                    </p>
                  </TabsContent>

                  {/* Document Input */}
                  <TabsContent value="DOCUMENT" className="space-y-3">
                    <label className="block text-xs font-medium text-purple-200">
                      Upload Document (PDF, DOCX, PPTX, TXT, MD) *
                    </label>
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-800/60 p-8 text-center hover:border-amber-400 bg-purple-950/30 transition">
                      <Upload className="h-8 w-8 text-amber-400/70 mb-2" />
                      <p className="text-xs font-medium text-white">
                        {selectedFile ? selectedFile.name : 'Click or drag document here'}
                      </p>
                      <p className="text-[10px] text-purple-300/60 mt-1">PDF, DOCX, PPTX, TXT, or MD up to 25MB</p>
                      <input
                        type="file"
                        accept=".pdf,.docx,.pptx,.txt,.md"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="mt-3 text-xs text-purple-300"
                      />
                    </div>
                    <p className="text-[10px] text-purple-300/60">
                      Agent 1 preserves page and slide numbers so findings link directly to exact document offsets.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Step 2: Context & Metadata */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-white">2. Publishing Context & Audience</CardTitle>
                <CardDescription className="text-xs text-purple-200/70">
                  Target audience and distribution channel constraints evaluated by Agent 4.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-purple-200">
                    Publishing Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full rounded-lg border border-purple-800/60 bg-purple-950/60 px-3 py-2 text-xs text-white shadow-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="email" className="bg-[#160C2A]">Email Campaign / Newsletter</option>
                    <option value="social" className="bg-[#160C2A]">Social Media (LinkedIn/Twitter/Meta)</option>
                    <option value="website" className="bg-[#160C2A]">Corporate Website / Blog</option>
                    <option value="advertisement" className="bg-[#160C2A]">Paid Digital Ad / Billboard</option>
                    <option value="press_release" className="bg-[#160C2A]">Press Release</option>
                    <option value="sales_collateral" className="bg-[#160C2A]">Sales One-Pager / Slide Deck</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-purple-200">
                    Content Type
                  </label>
                  <Input
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    placeholder="marketing_email, social_post, landing_page..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-purple-200">
                    Target Audience
                  </label>
                  <Input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="enterprise_cto, consumers, developers..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-purple-200">
                    Campaign Identifier
                  </label>
                  <Input
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    placeholder="e.g. Q4-Growth-2024"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-purple-200">
                    Additional Strategic Instructions (Optional)
                  </label>
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Special disclaimers, intended messaging nuances, or specific regional requirements..."
                    rows={2}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-purple-900/30 pt-4">
                <span className="text-[11px] text-purple-300/60">
                  Execution telemetry recorded per agent.
                </span>
                <Button type="submit" size="default" isLoading={loading} className="gap-2 font-bold shadow-gold-sm">
                  Launch 7-Agent Swarm
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
