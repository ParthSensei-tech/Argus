// Argus API client — all endpoints match the actual backend routes
import type {
  AuditEvent,
  BrandProfile,
  CorrectionSuggestion,
  DashboardSummary,
  FileUploadResponse,
  GraphNode,
  GraphSnapshot,
  ImpactEvent,
  KnowledgeItem,
  KnowledgeSource,
  KnowledgeVersion,
  MeResponse,
  Organisation,
  RecurringIssue,
  Review,
  ReviewDetail,
  ReviewListItem,
  TokenResponse,
} from "@/lib/types";

// ─── Token / Org helpers ──────────────────────────────────────────────────────

const TOKEN_KEY = "argus_token";
const ORG_KEY = "argus_org_id";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ORG_KEY);
}
export function getStoredOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORG_KEY);
}
export function setStoredOrgId(id: string): void {
  localStorage.setItem(ORG_KEY, id);
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const orgId = getStoredOrgId();
  const hdrs: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) hdrs["Authorization"] = `Bearer ${token}`;
  if (orgId) hdrs["X-Org-Id"] = orgId;
  if (!(options.body instanceof FormData)) hdrs["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, { ...options, headers: hdrs });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    let detail: unknown;
    try {
      const j = await res.json();
      detail = j;
      if (typeof j?.detail === "string") msg = j.detail;
      else if (Array.isArray(j?.detail))
        msg = j.detail.map((e: { msg: string }) => e.msg).join("; ");
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function demoLogin(role: "admin" | "reviewer" | "editor" = "admin"): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/v1/auth/demo-login", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}

export async function register(
  email: string,
  password: string,
  full_name: string
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name }),
  });
}

export async function me(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/api/v1/auth/me");
}

export async function createOrg(name: string): Promise<Organisation> {
  return apiFetch<Organisation>("/api/v1/auth/orgs", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function uploadFile(file: File, purpose: string): Promise<FileUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);
  return apiFetch<FileUploadResponse>("/api/v1/files/upload", {
    method: "POST",
    body: form,
  });
}

export async function getFileUrl(fileId: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(`/api/v1/files/${fileId}/url`);
}

// ─── Knowledge Sources ────────────────────────────────────────────────────────

export async function listSources(): Promise<KnowledgeSource[]> {
  return apiFetch<KnowledgeSource[]>("/api/v1/knowledge/sources");
}
export async function getSource(id: string) {
  return apiFetch(`/api/v1/knowledge/sources/${id}`);
}
export async function createSource(title: string, kind: string, file_id?: string): Promise<KnowledgeSource> {
  return apiFetch<KnowledgeSource>("/api/v1/knowledge/sources", {
    method: "POST",
    body: JSON.stringify({ title, kind, file_id }),
  });
}
export async function approveSource(id: string): Promise<KnowledgeSource> {
  return apiFetch<KnowledgeSource>(`/api/v1/knowledge/sources/${id}/approve`, { method: "POST" });
}
export async function rejectSource(id: string): Promise<KnowledgeSource> {
  return apiFetch<KnowledgeSource>(`/api/v1/knowledge/sources/${id}/reject`, { method: "POST" });
}

// ─── Knowledge Items ──────────────────────────────────────────────────────────

export async function listItems(params?: { status?: string; type?: string }): Promise<KnowledgeItem[]> {
  const q = params
    ? "?" + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("&")
    : "";
  return apiFetch<KnowledgeItem[]>(`/api/v1/knowledge/items${q}`);
}
export async function getItem(id: string) {
  return apiFetch(`/api/v1/knowledge/items/${id}`);
}
export async function createItem(payload: Record<string, unknown>): Promise<KnowledgeItem> {
  return apiFetch<KnowledgeItem>("/api/v1/knowledge/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function approveItem(id: string): Promise<KnowledgeItem> {
  return apiFetch<KnowledgeItem>(`/api/v1/knowledge/items/${id}/approve`, { method: "POST" });
}
export async function rejectItem(id: string): Promise<KnowledgeItem> {
  return apiFetch<KnowledgeItem>(`/api/v1/knowledge/items/${id}/reject`, { method: "POST" });
}
export async function createVersion(id: string, payload: Record<string, unknown>): Promise<KnowledgeVersion> {
  return apiFetch<KnowledgeVersion>(`/api/v1/knowledge/items/${id}/versions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function listVersions(id: string): Promise<KnowledgeVersion[]> {
  return apiFetch<KnowledgeVersion[]>(`/api/v1/knowledge/items/${id}/versions`);
}

// ─── Brand Profile ────────────────────────────────────────────────────────────

export async function getBrandProfile(): Promise<BrandProfile | null> {
  return apiFetch<BrandProfile | null>("/api/v1/knowledge/brand-profile");
}
export async function updateBrandProfile(payload: Partial<BrandProfile>): Promise<BrandProfile> {
  return apiFetch<BrandProfile>("/api/v1/knowledge/brand-profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function listReviews(params?: { status?: string; limit?: number }): Promise<ReviewListItem[]> {
  const q = params
    ? "?" + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join("&")
    : "";
  return apiFetch<ReviewListItem[]>(`/api/v1/reviews${q}`);
}
export async function createReview(payload: Record<string, unknown>): Promise<Review> {
  return apiFetch<Review>("/api/v1/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function getReview(id: string): Promise<ReviewDetail> {
  return apiFetch<ReviewDetail>(`/api/v1/reviews/${id}`);
}
export async function rerunReview(id: string, raw_text?: string): Promise<Review> {
  return apiFetch<Review>(`/api/v1/reviews/${id}/rerun`, {
    method: "POST",
    body: JSON.stringify({ raw_text }),
  });
}
export async function decideCorrection(
  review_id: string,
  correction_id: string,
  accept: boolean
): Promise<CorrectionSuggestion> {
  return apiFetch<CorrectionSuggestion>(
    `/api/v1/reviews/${review_id}/corrections/${correction_id}?accept=${accept}`,
    { method: "POST" }
  );
}
export async function decideReview(
  review_id: string,
  payload: { decision: string; reason?: string; override_critical?: boolean }
): Promise<Review> {
  return apiFetch<Review>(`/api/v1/reviews/${review_id}/decision`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export async function getGraph(search?: string): Promise<GraphSnapshot> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<GraphSnapshot>(`/api/v1/knowledge-graph${q}`);
}
export async function getNode(id: string): Promise<{ node: GraphNode; edges: GraphEdge[] }> {
  return apiFetch(`/api/v1/knowledge-graph/nodes/${id}`);
}
export async function getNodeDependencies(id: string) {
  return apiFetch(`/api/v1/knowledge-graph/nodes/${id}/dependencies`);
}
export async function getImpactDetail(event_id: string) {
  return apiFetch(`/api/v1/knowledge-graph/impact/${event_id}`);
}

// ─── Impact Events ────────────────────────────────────────────────────────────

export async function listImpactEvents(): Promise<ImpactEvent[]> {
  return apiFetch<ImpactEvent[]>("/api/v1/impact-events");
}
export async function reassessImpact(id: string): Promise<ImpactEvent> {
  return apiFetch<ImpactEvent>(`/api/v1/impact-events/${id}/reassess`, { method: "POST" });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>("/api/v1/dashboard/summary");
}
export async function getRecurringIssues(): Promise<RecurringIssue[]> {
  return apiFetch<RecurringIssue[]>("/api/v1/dashboard/recurring-issues");
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function getAuditLog(params?: { limit?: number; entity_type?: string }): Promise<AuditEvent[]> {
  const q = params
    ? "?" + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join("&")
    : "";
  return apiFetch<AuditEvent[]>(`/api/v1/audit${q}`);
}

// Re-export GraphEdge type for graph components
export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  provenance: Record<string, unknown>;
};
