// API types matching backend schemas exactly

export type Role = "ADMIN" | "EDITOR" | "REVIEWER" | "VIEWER";

export type ReviewStatus =
  | "QUEUED"
  | "EXTRACTING"
  | "LOADING_KNOWLEDGE"
  | "ANALYZING"
  | "RESOLVING"
  | "CORRECTING"
  | "AWAITING_REVIEW"
  | "COMPLETED"
  | "FAILED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Decision = "APPROVE" | "REQUEST_CHANGES" | "REJECT";

export type FindingCategory =
  | "FACTUAL_CLAIM"
  | "BRAND_POLICY"
  | "TONE_TERMINOLOGY"
  | "VISUAL_IDENTITY"
  | "ACCESSIBILITY"
  | "CONFLICT";

export type Severity = "CRITICAL" | "MAJOR" | "MINOR" | "INFORMATIONAL";

export type FindingStatus =
  | "SUPPORTED"
  | "CONTRADICTED"
  | "UNSUPPORTED"
  | "OUTDATED"
  | "AMBIGUOUS"
  | "HUMAN_CONFIRMATION_REQUIRED"
  | "VIOLATION"
  | "NOT_APPLICABLE"
  | "INFO";

export type KnowledgeType =
  | "GUIDELINE"
  | "FACT"
  | "CLAIM"
  | "TERM"
  | "PROHIBITED_TERM"
  | "POLICY"
  | "VOICE_RULE"
  | "VISUAL_ASSET";

export type AgentStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED"
  | "NOT_APPLICABLE";

export type CorrectionStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type InputType = "TEXT" | "IMAGE" | "DOCUMENT";

export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface Membership {
  org_id: string;
  org_name: string;
  role: Role;
}

export interface MeResponse {
  user: User;
  memberships: Membership[];
}

export interface TokenResponse {
  access_token: string;
  token_type?: string;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  sha256: string;
  purpose: string;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  kind: string;
  status: string;
  file_id: string | null;
  created_at: string;
}

export interface KnowledgeItem {
  id: string;
  type: KnowledgeType;
  title: string;
  body: string;
  structured: Record<string, unknown>;
  status: string;
  current_version: number;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeVersion {
  id: string;
  item_id: string;
  version: number;
  body: string;
  structured: Record<string, unknown>;
  change_note: string;
  superseded: boolean;
  created_at: string;
}

export interface BrandProfile {
  id: string;
  name: string;
  description: string;
  voice_tone: Record<string, string>;
  colors: string[];
}

export interface Review {
  id: string;
  content_version_id: string;
  status: ReviewStatus;
  risk: RiskLevel | null;
  decision: Decision | null;
  decision_reason: string | null;
  error: string | null;
  ai_mode: string;
  correlation_id: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewListItem extends Review {
  title: string;
  input_type: InputType;
  channel: string;
  version: number;
}

export interface Evidence {
  id: string;
  knowledge_item_id: string | null;
  knowledge_version: number | null;
  source_location: Record<string, unknown>;
  excerpt: string;
  relation: string;
}

export interface ReviewFinding {
  id: string;
  agent_id: number;
  category: FindingCategory;
  severity: Severity;
  status: FindingStatus;
  confidence: number;
  original_text: string;
  source_location: Record<string, unknown>;
  explanation: string;
  policy_reference: Record<string, unknown> | null;
  suggested_correction: string | null;
  human_action_required: boolean;
  resolution_note: string | null;
  evidence: Evidence[];
}

export interface CorrectionSuggestion {
  id: string;
  finding_id: string;
  original_text: string;
  suggested_text: string;
  explanation: string;
  status: CorrectionStatus;
}

export interface AgentRun {
  id: string;
  agent_id: number;
  name: string;
  status: AgentStatus;
  started_at: string | null;
  finished_at: string | null;
  attempts: number;
  error: string | null;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
}

export interface ReviewDecision {
  id: string;
  decision: Decision;
  reason: string;
  override_critical: boolean;
  decided_by: string;
  created_at: string;
}

export interface ReviewDetail {
  review: Review;
  content: {
    id: string;
    title: string;
    input_type: InputType;
    channel: string;
    content_type: string;
    audience: string;
    campaign: string;
    context: string;
    version: number;
    raw_text: string;
    canonical: Record<string, unknown>;
    file_id: string | null;
  };
  agents: AgentRun[];
  findings: ReviewFinding[];
  corrections: CorrectionSuggestion[];
  decisions: ReviewDecision[];
}

export interface GraphNode {
  id: string;
  entity_type: string;
  ref_id: string | null;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  provenance: Record<string, unknown>;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ImpactEvent {
  id: string;
  item_id: string;
  from_version: number;
  to_version: number;
  change_summary: string;
  severity: string;
  status: string;
  affected_count: number;
  created_at: string;
}

export interface DashboardSummary {
  reviews_by_status: Record<string, number>;
  reviews_by_risk: Record<string, number>;
  knowledge_by_status: Record<string, number>;
  pending_approvals: number;
  pending_knowledge_items: number;
  awaiting_human_review: number;
  open_impact_events: number;
  total_content_items: number;
  recent_reviews: Array<{
    id: string;
    title: string;
    status: ReviewStatus;
    risk: RiskLevel | null;
    decision: Decision | null;
    created_at: string;
  }>;
}

export interface AuditEvent {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface RecurringIssue {
  category: FindingCategory;
  text: string;
  occurrences: number;
  reviews_affected: number;
}
