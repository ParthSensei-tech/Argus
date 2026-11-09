'use client';

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

  // Sample prompt filler for demonstration
  const fillSampleText = () => {
    setTitle('Q4 Cloud Analytics Email Campaign');
    setInputType('TEXT');
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
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Submit Content for Governance Review
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            All content is parsed canonically, cross-checked against approved brand evidence, and evaluated by 7 AI specialist agents.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fillSampleText}
          className="gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Load Benchmark Sample
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Input Modality Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Content Modality & Payload</CardTitle>
            <CardDescription>
              Select whether you are submitting direct text, a visual image, or a multi-page document.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
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
                  <FileText className="h-4 w-4" /> Direct Text Copy
                </TabsTrigger>
                <TabsTrigger value="IMAGE" className="gap-2">
                  <ImageIcon className="h-4 w-4" /> Static Image
                </TabsTrigger>
                <TabsTrigger value="DOCUMENT" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" /> Document (PDF/DOCX/PPTX)
                </TabsTrigger>
              </TabsList>

              {/* Text Area */}
              <TabsContent value="TEXT" className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Enter or Paste Content Copy *
                </label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste ad copy, marketing emails, landing page content, or social media statements here..."
                  rows={8}
                  className="font-mono text-sm leading-relaxed"
                />
                <p className="text-[11px] text-gray-500">
                  Agent 1 will segment sentences, identify candidate claims, extract superlatives, and check tone.
                </p>
              </TabsContent>

              {/* Image Input */}
              <TabsContent value="IMAGE" className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700">
                  Upload Visual Asset (PNG, JPG, WEBP) *
                </label>
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-indigo-400 bg-gray-50/50 transition">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {selectedFile ? selectedFile.name : 'Click or drag image file here'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, or WEBP up to 25MB</p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mt-4 text-xs"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Agent 5 will analyse logo usage, brand palette consistency, text-in-image OCR, and accessibility contrast.
                </p>
              </TabsContent>

              {/* Document Input */}
              <TabsContent value="DOCUMENT" className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700">
                  Upload Document (PDF, DOCX, PPTX, TXT, MD) *
                </label>
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-indigo-400 bg-gray-50/50 transition">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    {selectedFile ? selectedFile.name : 'Click or drag document here'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOCX, PPTX, TXT, or MD up to 25MB</p>
                  <input
                    type="file"
                    accept=".pdf,.docx,.pptx,.txt,.md"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mt-4 text-xs"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Agent 1 preserves page and slide numbers so findings can be traced directly to exact locations.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Step 2: Context & Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Publishing Context & Audience</CardTitle>
            <CardDescription>
              Specialist agents evaluate channel-specific tone, audience expectations, and mandatory disclaimers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Publishing Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="email">Email Campaign / Newsletter</option>
                <option value="social">Social Media (Twitter/LinkedIn/Meta)</option>
                <option value="website">Corporate Website / Blog</option>
                <option value="advertisement">Paid Digital Ad / Billboard</option>
                <option value="press_release">Press Release</option>
                <option value="sales_collateral">Sales One-Pager / Slide Deck</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Content Type
              </label>
              <Input
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                placeholder="marketing_email, social_post, landing_page..."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Target Audience
              </label>
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="enterprise_cto, consumers, developers..."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Campaign Identifier
              </label>
              <Input
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="e.g. Q4-Growth-2024"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Additional Instructions or Strategic Context (Optional)
              </label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Special disclaimers, intended messaging nuances, or specific regional requirements..."
                rows={2}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-gray-100 pt-5">
            <span className="text-xs text-gray-500">
              Deterministic + AI verification will begin immediately upon submission.
            </span>
            <Button type="submit" size="lg" isLoading={loading} className="gap-2">
              Launch 7-Agent Swarm
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
