"""
Argus — Round 2 Technical Report & Master Submission PDF Generator
Generates a publication-grade, 8-page PDF document detailing:
  Page 1: Executive Summary, System Vision & Master Capabilities
  Page 2: System Architecture & Coordinated Seven-Agent AI Swarm
  Page 3: Provenance-Aware Knowledge Representation & Change Impact Knowledge Graph
  Page 4: Multimodal Content Intake & Verification Engine (Text, Images, Documents)
  Page 5: Intent-Preserving Corrections, Human Review Authority & Cryptographic Audit Trails
  Page 6: Verification Results, Tested Scenarios & End-to-End Test Matrix
  Page 7: Technical Decisions, Tradeoffs & Deviations from Initial Proposal
  Page 8: Team Member Responsibilities, Demonstration Guide & Round 3 Enterprise Roadmap
"""

import os
import pymupdf

def rgb(hex_code: str):
    """Convert hex string (e.g. '#1E40AF' or '1E40AF') to PyMuPDF (r, g, b) tuple in 0..1."""
    hex_code = hex_code.lstrip("#")
    return tuple(int(hex_code[i:i+2], 16) / 255.0 for i in (0, 2, 4))

# Brand Color Palette
C_PRIMARY = rgb("#1E3A8A")     # Dark Blue / Brand Primary
C_SECONDARY = rgb("#0284C7")   # Light Teal-Blue
C_ACCENT = rgb("#0F766E")      # Teal Accent
C_DARK = rgb("#0F172A")        # Slate 900
C_TEXT = rgb("#334155")        # Slate 700
C_MUTED = rgb("#64748B")       # Slate 500
C_BG_LIGHT = rgb("#F8FAFC")    # Slate 50
C_CARD = rgb("#F1F5F9")        # Slate 100
C_BORDER = rgb("#CBD5E1")      # Slate 300
C_WHITE = rgb("#FFFFFF")
C_DANGER = rgb("#DC2626")      # Red 600
C_WARNING = rgb("#D97706")     # Amber 600
C_SUCCESS = rgb("#16A34A")     # Green 600

PAGE_WIDTH = 595.32   # A4 width in pt
PAGE_HEIGHT = 841.92  # A4 height in pt

def draw_header_footer(page, page_num, total_pages=8):
    # Header
    page.draw_rect(pymupdf.Rect(40, 25, PAGE_WIDTH - 40, 48), fill=None, color=None)
    page.insert_text(
        pymupdf.Point(40, 42),
        "ARGUS — BRAND GOVERNANCE PLATFORM",
        fontname="helv",
        fontsize=8.5,
        color=C_PRIMARY,
        render_mode=0
    )
    page.insert_text(
        pymupdf.Point(PAGE_WIDTH - 180, 42),
        "Round 2 Master Technical Report",
        fontname="helv",
        fontsize=8.5,
        color=C_MUTED,
        render_mode=0
    )
    page.draw_line(pymupdf.Point(40, 48), pymupdf.Point(PAGE_WIDTH - 40, 48), color=C_BORDER, width=0.75)
    
    # Footer
    page.draw_line(pymupdf.Point(40, PAGE_HEIGHT - 40), pymupdf.Point(PAGE_WIDTH - 40, PAGE_HEIGHT - 40), color=C_BORDER, width=0.75)
    page.insert_text(
        pymupdf.Point(40, PAGE_HEIGHT - 26),
        "Confidential — Project Argus Submission Document",
        fontname="helv",
        fontsize=8,
        color=C_MUTED
    )
    page.insert_text(
        pymupdf.Point(PAGE_WIDTH - 90, PAGE_HEIGHT - 26),
        f"Page {page_num} of {total_pages}",
        fontname="helv",
        fontsize=8,
        color=C_MUTED
    )

def draw_card(page, rect, bg_color=C_CARD, border_color=C_BORDER, radius=4):
    page.draw_rect(rect, fill=bg_color, color=border_color, width=0.75)

def insert_multiline_text(page, text_lines, start_x, start_y, fontname="helv", fontsize=9.5, line_spacing=13, color=C_TEXT):
    curr_y = start_y
    for line in text_lines:
        page.insert_text(pymupdf.Point(start_x, curr_y), line, fontname=fontname, fontsize=fontsize, color=color)
        curr_y += line_spacing
    return curr_y


def build_page_1(doc):
    page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
    draw_header_footer(page, 1)
    
    # Hero Title Banner
    page.draw_rect(pymupdf.Rect(40, 60, PAGE_WIDTH - 40, 155), fill=C_PRIMARY, color=None)
    page.insert_text(pymupdf.Point(60, 95), "PROJECT ARGUS", fontname="helv", fontsize=24, color=C_WHITE)
    page.insert_text(pymupdf.Point(60, 118), "Autonomous Coordinated 7-Agent Brand Governance & Trust Platform", fontname="helv", fontsize=13, color=C_CARD)
    page.insert_text(
        pymupdf.Point(60, 142),
        "Round 2 Master Architecture, Swarm Orchestration, Change Impact Graph & Deployment Report",
        fontname="helv",
        fontsize=9.5,
        color=C_CARD
    )
    
    # Meta badge row
    meta_box = pymupdf.Rect(60, 160, PAGE_WIDTH - 60, 195)
    page.draw_rect(meta_box, fill=rgb("#1E293B"), color=None)
    meta_text = "Repository: github.com/ParthSensei-tech/Argus  |  Branch: development  |  Team: Parth Sakhare, Sahil Khan, Rohan Rathod"
    page.insert_text(pymupdf.Point(70, 178), meta_text, fontname="helv", fontsize=8.5, color=rgb("#E2E8F0"))
    
    # Section 1: Executive Summary
    y = 225
    page.insert_text(pymupdf.Point(40, y), "1. EXECUTIVE SUMMARY & PRODUCT VISION", fontname="helv", fontsize=13, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 4), pymupdf.Point(PAGE_WIDTH - 40, y + 4), color=C_SECONDARY, width=1.5)
    y += 20
    
    summary_lines = [
        "Modern enterprise content creation is increasingly distributed across departments, regional agencies, freelance copywriters, and",
        "generative AI systems. While production velocity has multiplied, brand governance has broken down: organizations routinely publish",
        "conflicting quantitative metrics, outdated claims, non-compliant competitor comparisons, and unauthorized visual identities.",
        "",
        "Argus introduces an intelligent, evidence-linked verification layer directly between content draft generation and public deployment.",
        "Crucially, Argus does not behave as an unexplainable heuristic scoring black-box. Instead, every issue flagged by Argus is deterministically",
        "grounded in active approved organizational knowledge, citing exact document passages, approval owners, and effective dates."
    ]
    y = insert_multiline_text(page, summary_lines, 40, y, fontsize=9, line_spacing=13)
    
    # Key Capabilities Grid (4 Cards)
    y += 10
    card_w = (PAGE_WIDTH - 80 - 15) / 2
    card_h = 100
    
    # Card 1
    r1 = pymupdf.Rect(40, y, 40 + card_w, y + card_h)
    draw_card(page, r1, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40, y, 44, y + card_h), fill=C_PRIMARY, color=None)
    page.insert_text(pymupdf.Point(52, y + 20), "1. Coordinated 7-Agent Swarm", fontname="helv", fontsize=10.5, color=C_PRIMARY)
    c1_lines = [
        "Specialist pipeline comprising Intake, Knowledge Retrieval,",
        "Claim Verification, Policy Compliance, Visual Identity,",
        "Argumentation Adjudication, and Intent-Constrained",
        "Correction. Independent parallel execution with telemetry."
    ]
    insert_multiline_text(page, c1_lines, 52, y + 36, fontsize=8.2, line_spacing=11.5)
    
    # Card 2
    r2 = pymupdf.Rect(40 + card_w + 15, y, PAGE_WIDTH - 40, y + card_h)
    draw_card(page, r2, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40 + card_w + 15, y, 44 + card_w + 15, y + card_h), fill=C_SECONDARY, color=None)
    page.insert_text(pymupdf.Point(52 + card_w + 15, y + 20), "2. Change Impact Knowledge Graph", fontname="helv", fontsize=10.5, color=C_PRIMARY)
    c2_lines = [
        "Persistent relational graph with recursive SQL traversal.",
        "When approved facts, terms, or guidelines change,",
        "Argus automatically computes bidirectional blast-radius",
        "impact to invalidate or flag historical reviewed assets."
    ]
    insert_multiline_text(page, c2_lines, 52 + card_w + 15, y + 36, fontsize=8.2, line_spacing=11.5)
    
    y += card_h + 15
    
    # Card 3
    r3 = pymupdf.Rect(40, y, 40 + card_w, y + card_h)
    draw_card(page, r3, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40, y, 44, y + card_h), fill=C_ACCENT, color=None)
    page.insert_text(pymupdf.Point(52, y + 20), "3. Multi-Format Modality Intake", fontname="helv", fontsize=10.5, color=C_PRIMARY)
    c3_lines = [
        "Full support for raw pasted text, static raster images",
        "(PNG, JPG, WEBP) with OCR/palette extraction, and",
        "rich multi-page documents (PDF, DOCX, PPTX, TXT, MD)",
        "with structural slide and page offset preservation."
    ]
    insert_multiline_text(page, c3_lines, 52, y + 36, fontsize=8.2, line_spacing=11.5)
    
    # Card 4
    r4 = pymupdf.Rect(40 + card_w + 15, y, PAGE_WIDTH - 40, y + card_h)
    draw_card(page, r4, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40 + card_w + 15, y, 44 + card_w + 15, y + card_h), fill=C_DARK, color=None)
    page.insert_text(pymupdf.Point(52 + card_w + 15, y + 20), "4. Human Authority & Audit Trails", fontname="helv", fontsize=10.5, color=C_PRIMARY)
    c4_lines = [
        "Agents propose; human editors approve. Critical risk",
        "findings strictly block standard approval without explicit",
        "audit override justifications. Complete tamper-evident",
        "cryptographic SHA-256 hash chains for all decisions."
    ]
    insert_multiline_text(page, c4_lines, 52 + card_w + 15, y + 36, fontsize=8.2, line_spacing=11.5)
    
    # Section: System Delivery Highlights
    y += card_h + 25
    page.insert_text(pymupdf.Point(40, y), "2. SYSTEM STATUS & ROUND 2 READINESS", fontname="helv", fontsize=12, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 4), pymupdf.Point(PAGE_WIDTH - 40, y + 4), color=C_SECONDARY, width=1.5)
    y += 18
    
    readiness_box = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + 85)
    draw_card(page, readiness_box, bg_color=rgb("#EFF6FF"), border_color=C_SECONDARY)
    r_lines = [
        "- Zero Theoretical Simulations: Fully implemented FastAPI backend, Next.js 15 App Router frontend, and SQLite/PostgreSQL schemas.",
        "- Complete 14-Suite Smoke Test Verified: Automated end-to-end verification passing 100% of integration stages in live runtime.",
        "- Multi-User RBAC & Tenant Isolation: Strict multi-tenancy enforcing organization isolation across Admin, Reviewer, and Editor roles.",
        "- Dynamic Judge-Input Ready: Offline deterministic fallbacks ensure immediate evaluation even without active third-party LLM API keys.",
        "- Git Version Control: Committed on branch 'development' ready for remote synchronization at ParthSensei-tech/Argus."
    ]
    insert_multiline_text(page, r_lines, 52, y + 16, fontsize=8.3, line_spacing=13, color=C_DARK)


def build_page_2(doc):
    page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
    draw_header_footer(page, 2)
    
    y = 65
    page.insert_text(pymupdf.Point(40, y), "3. SYSTEM ARCHITECTURE & 7-AGENT SWARM ORCHESTRATION", fontname="helv", fontsize=13, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 4), pymupdf.Point(PAGE_WIDTH - 40, y + 4), color=C_SECONDARY, width=1.5)
    y += 18
    
    p2_intro = [
        "Argus abandons single-prompt monolithic LLM architectures in favor of an orchestrated Seven-Agent Swarm with separated responsibilities,",
        "distinct input/output schemas, and independent execution tracking. The central orchestrator manages dependencies, dispatches parallel",
        "tasks, handles retries, and consolidates verified findings into an auditable review graph."
    ]
    y = insert_multiline_text(page, p2_intro, 40, y, fontsize=8.8, line_spacing=12.5)
    
    y += 12
    # Table of 7 Agents
    headers = ["Agent ID & Name", "Role & Core Responsibility", "Input / Output Contract", "Execution Stage"]
    col_x = [40, 160, 370, 490, PAGE_WIDTH - 40]
    
    # Draw table header
    th_rect = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + 20)
    page.draw_rect(th_rect, fill=C_PRIMARY, color=None)
    for i, h in enumerate(headers):
        page.insert_text(pymupdf.Point(col_x[i] + 6, y + 13), h, fontname="helv", fontsize=8.5, color=C_WHITE)
    y += 20
    
    agents_data = [
        ("A1: Intake & Multimodal", "Parses text, images & multi-page docs. Extracts text, tables, slide/page boundaries, and visual OCR.", "Raw Payload -> Canonical Content Repr, Image Refs, Document Spans", "Stage 1 (Sequential)"),
        ("A2: Knowledge & Graph", "Retrieves approved guidelines, policies, facts & terms using hybrid vector + graph similarity.", "Org Context & Query -> Scored Evidence Set & Graph Dependencies", "Stage 2 (Sequential)"),
        ("A3: Claim Verification", "Extracts claims (numeric, superlative, comparative) and verifies against approved knowledge.", "Canonical Text + Approved Facts -> Supported/Contradicted Claim Findings", "Stage 3 (Parallel)"),
        ("A4: Policy & Terminology", "Enforces deterministic policy rules, tone traits, and detects prohibited words/phrases.", "Canonical Text + Policies/Terms -> Policy Violation Findings", "Stage 3 (Parallel)"),
        ("A5: Visual Identity", "Analyzes uploaded raster images for logo presence, brand palette adherence, text contrast, and alt text.", "Image Bytes + Visual Rules -> Palette Consistency & Accessibility Findings", "Stage 3 (Parallel)"),
        ("A6: Adjudication & Risk", "Deduplicates findings, resolves inter-agent conflicts via argumentation graph, and computes risk level.", "Raw Finding Stream -> Consolidated Finding Registry & Risk Severity", "Stage 4 (Sequential)"),
        ("A7: Intent Correction", "Generates minimal, intent-preserving diff suggestions. Flags uncorrectable legal hazards.", "Approved Findings + Original Content -> Structured Diffs & Replacement Spans", "Stage 5 (Sequential)")
    ]
    
    for idx, (name, role, schema, stage) in enumerate(agents_data):
        row_bg = C_BG_LIGHT if idx % 2 == 0 else C_WHITE
        row_h = 42
        r_rect = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + row_h)
        page.draw_rect(r_rect, fill=row_bg, color=C_BORDER, width=0.5)
        
        page.insert_text(pymupdf.Point(col_x[0] + 6, y + 16), name, fontname="helv", fontsize=8, color=C_PRIMARY)
        
        # Word wrap role
        insert_multiline_text(page, [role[:38], role[38:76], role[76:]], col_x[1] + 6, y + 12, fontsize=7.2, line_spacing=9.5, color=C_TEXT)
        # Word wrap schema
        insert_multiline_text(page, [schema[:32], schema[32:64], schema[64:]], col_x[2] + 6, y + 12, fontsize=7.2, line_spacing=9.5, color=C_TEXT)
        # Stage
        page.insert_text(pymupdf.Point(col_x[3] + 6, y + 16), stage, fontname="helv", fontsize=7.5, color=C_ACCENT)
        
        y += row_h
        
    y += 18
    page.insert_text(pymupdf.Point(40, y), "4. CENTRAL ORCHESTRATION PIPELINE LIFECYCLE", fontname="helv", fontsize=11, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 3), pymupdf.Point(PAGE_WIDTH - 40, y + 3), color=C_SECONDARY, width=1.0)
    y += 14
    
    orch_lines = [
        "1. Intake & Validation: Client dispatches review request. Review record initialized in QUEUED state with unique UUID.",
        "2. Canonical Extraction (A1): Modality detected. PyMuPDF, python-docx, python-pptx, or Tesseract OCR extracts text & spatial blocks.",
        "3. Knowledge Grounding (A2): Active approved organizational facts and rules retrieved. Draft/pending rules strictly quarantined.",
        "4. Parallel Swarm Evaluation (A3, A4, A5): Verification agents execute asynchronously across threads/workers. Telemetry tracked per-agent.",
        "5. Risk Adjudication & Deduplication (A6): Argumentation engine merges duplicate citations and resolves contradictory policy nuances.",
        "6. Intent-Constrained Correction (A7): Context-aware rewriting computes minimal-edit replacements preserving author tone.",
        "7. Review Persistence & Graph Linking: Graph edges populated linking Content -> Findings -> Approved Knowledge Nodes."
    ]
    insert_multiline_text(page, orch_lines, 45, y, fontsize=8.2, line_spacing=12, color=C_DARK)


def build_page_3(doc):
    page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
    draw_header_footer(page, 3)
    
    y = 65
    page.insert_text(pymupdf.Point(40, y), "5. PROVENANCE-AWARE KNOWLEDGE & CHANGE IMPACT GRAPH", fontname="helv", fontsize=13, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 4), pymupdf.Point(PAGE_WIDTH - 40, y + 4), color=C_SECONDARY, width=1.5)
    y += 18
    
    p3_intro = [
        "A foundational limitation of conventional compliance tools is their static, point-in-time perspective: when an approved corporate metric",
        "or regulatory policy updates, previously reviewed content assets become silently invalid. Argus implements a living, persistent",
        "Change Impact Knowledge Graph modeled directly in PostgreSQL/SQLite using relational nodes and typed directional edges."
    ]
    y = insert_multiline_text(page, p3_intro, 40, y, fontsize=8.8, line_spacing=12.5)
    
    y += 15
    # Two Column Layout: Graph Schema (Left) & Change Impact Engine (Right)
    col_w = (PAGE_WIDTH - 80 - 16) / 2
    
    # Left Card: Graph Schema
    r_left = pymupdf.Rect(40, y, 40 + col_w, y + 270)
    draw_card(page, r_left, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40, y, 40 + col_w, y + 24), fill=C_PRIMARY, color=None)
    page.insert_text(pymupdf.Point(48, y + 16), "Relational Graph Node & Edge Ontology", fontname="helv", fontsize=9.5, color=C_WHITE)
    
    schema_lines = [
        "Node Entities (graph_nodes):",
        " - ORGANISATION: Multi-tenant root entity",
        " - BRAND_GUIDELINE: Visual and voice standard",
        " - POLICY_RULE: Deterministic compliance rule",
        " - APPROVED_FACT: Single source-of-truth claim",
        " - PROHIBITED_TERM: Banned vocabulary token",
        " - VISUAL_ASSET: Approved logo or color palette",
        " - CONTENT_ITEM / VERSION: Monitored creative",
        " - REVIEW: Specific execution snapshot",
        " - FINDING: Detected contradiction or defect",
        "",
        "Typed Provenance Edges (graph_edges):",
        " - DERIVED_FROM: Source document citation",
        " - SUPPORTED_BY: Fact validating content claim",
        " - CONTRADICTS: Content violating approved fact",
        " - DEPENDS_ON: Content reliance on active rule",
        " - REVIEWED_UNDER: Historical review governance",
        " - SUPERSEDES: Version v2 obsoleting v1"
    ]
    insert_multiline_text(page, schema_lines, 48, y + 38, fontsize=7.8, line_spacing=11.5, color=C_TEXT)
    
    # Right Card: Recursive Traversal & Change Impact Engine
    r_right = pymupdf.Rect(40 + col_w + 16, y, PAGE_WIDTH - 40, y + 270)
    draw_card(page, r_right, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40 + col_w + 16, y, PAGE_WIDTH - 40, y + 24), fill=C_SECONDARY, color=None)
    page.insert_text(pymupdf.Point(48 + col_w + 16, y + 16), "Recursive SQL Impact Blast-Radius", fontname="helv", fontsize=9.5, color=C_WHITE)
    
    impact_lines = [
        "Automated Change Impact Workflow:",
        "1. Knowledge Update Event:",
        "   When an approved fact (e.g., customer count)",
        "   is modified from 5,000 to 6,000, an immutable",
        "   KnowledgeVersion v2 is created with change notes.",
        "",
        "2. Recursive CTE Traversal:",
        "   Argus executes a recursive CTE query over",
        "   graph_edges to identify all historical ContentItems",
        "   connected via DEPENDS_ON, SUPPORTED_BY,",
        "   or REVIEWED_UNDER relationships.",
        "",
        "3. Impact Event Creation & Alerting:",
        "   An ImpactEvent record is generated detailing:",
        "   - Prior value vs. new updated value",
        "   - Exact affected content items count",
        "   - List of previously approved assets now invalid",
        "",
        "4. One-Click Reassessment:",
        "   Editors can trigger downstream re-review with",
        "   a single click, re-verifying against new rules."
    ]
    insert_multiline_text(page, impact_lines, 48 + col_w + 16, y + 38, fontsize=7.8, line_spacing=11.5, color=C_TEXT)
    
    y += 285
    # Interactive Graph Explorer Feature
    page.insert_text(pymupdf.Point(40, y), "6. REACT FLOW KNOWLEDGE GRAPH VISUALIZATION", fontname="helv", fontsize=11, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 3), pymupdf.Point(PAGE_WIDTH - 40, y + 3), color=C_SECONDARY, width=1.0)
    y += 14
    
    vis_box = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + 80)
    draw_card(page, vis_box, bg_color=rgb("#F0FDF4"), border_color=C_SUCCESS)
    vis_lines = [
        "The Argus web frontend integrates an interactive graph visualization built with @xyflow/react at `/graph`.",
        "- Color-Coded Entity Nodes: Content items (purple), approved facts (blue), policy rules (amber), and findings (red).",
        "- Interactive Node Inspection: Clicking any node opens a slide-over metadata drawer displaying original source text,",
        "  version timestamps, approval owners, and direct cryptographic audit hash references.",
        "- Filterable Relationships: Reviewers can toggle active dependency trees, contradiction clusters, or historical superseded links."
    ]
    insert_multiline_text(page, vis_lines, 52, y + 16, fontsize=8.2, line_spacing=12, color=C_DARK)


def build_page_4(doc):
    page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
    draw_header_footer(page, 4)
    
    y = 65
    page.insert_text(pymupdf.Point(40, y), "7. MULTIMODAL INTAKE & SPECIALIST VERIFICATION PIPELINE", fontname="helv", fontsize=13, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 4), pymupdf.Point(PAGE_WIDTH - 40, y + 4), color=C_SECONDARY, width=1.5)
    y += 18
    
    p4_intro = [
        "Argus accepts submissions in three distinct operational modalities: direct text, static raster imagery, and multi-page business documents.",
        "The intake layer standardizes heterogeneous formats into a canonical, location-indexed representation allowing downstream agents to pin",
        "findings directly to exact paragraph offsets, page numbers, or slide indexes."
    ]
    y = insert_multiline_text(page, p4_intro, 40, y, fontsize=8.8, line_spacing=12.5)
    
    y += 15
    # 3 Modality Breakdown Cards
    mod_w = (PAGE_WIDTH - 80 - 20) / 3
    mod_h = 160
    
    # Modality 1: Direct Text
    m1 = pymupdf.Rect(40, y, 40 + mod_w, y + mod_h)
    draw_card(page, m1, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40, y, 40 + mod_w, y + 22), fill=C_PRIMARY, color=None)
    page.insert_text(pymupdf.Point(46, y + 15), "1. Direct Text Intake", fontname="helv", fontsize=9, color=C_WHITE)
    m1_lines = [
        "Supported Content:",
        " - Social media captions & posts",
        " - Ad headlines & copy variants",
        " - Email marketing newsletters",
        " - Product launch press releases",
        "Context Metadata Captured:",
        " - Target audience & campaign name",
        " - Channel (LinkedIn, Twitter, Web)",
        " - Tone goal (formal, confident)",
        "Token-level offset mapping for diffs."
    ]
    insert_multiline_text(page, m1_lines, 46, y + 34, fontsize=7.5, line_spacing=10.5, color=C_TEXT)
    
    # Modality 2: Static Images
    m2 = pymupdf.Rect(40 + mod_w + 10, y, 40 + 2 * mod_w + 10, y + mod_h)
    draw_card(page, m2, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40 + mod_w + 10, y, 40 + 2 * mod_w + 10, y + 22), fill=C_SECONDARY, color=None)
    page.insert_text(pymupdf.Point(46 + mod_w + 10, y + 15), "2. Static Raster Images", fontname="helv", fontsize=9, color=C_WHITE)
    m2_lines = [
        "Supported File Types:",
        " - PNG, JPG, JPEG, WEBP",
        "Computer Vision & OCR:",
        " - Logo detection & placement",
        " - Dominant color palette extraction",
        " - Hex distance vs. approved brand",
        " - Tesseract text-in-image OCR",
        " - Readability & contrast estimation",
        " - WCAG alt-text recommendation."
    ]
    insert_multiline_text(page, m2_lines, 46 + mod_w + 10, y + 34, fontsize=7.5, line_spacing=10.5, color=C_TEXT)
    
    # Modality 3: Rich Documents
    m3 = pymupdf.Rect(40 + 2 * mod_w + 20, y, PAGE_WIDTH - 40, y + mod_h)
    draw_card(page, m3, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40 + 2 * mod_w + 20, y, PAGE_WIDTH - 40, y + 22), fill=C_ACCENT, color=None)
    page.insert_text(pymupdf.Point(46 + 2 * mod_w + 20, y + 15), "3. Multi-Page Documents", fontname="helv", fontsize=9, color=C_WHITE)
    m3_lines = [
        "Supported Document Formats:",
        " - PDF (Digital & Scanned OCR)",
        " - DOCX (Headings, Tables, Lists)",
        " - PPTX (Slide-by-slide structure)",
        " - TXT & Markdown source files",
        "Structural Preservation:",
        " - Page, slide & paragraph tracking",
        " - Configurable size / page limits",
        " - Untrusted content sandbox shield."
    ]
    insert_multiline_text(page, m3_lines, 46 + 2 * mod_w + 20, y + 34, fontsize=7.5, line_spacing=10.5, color=C_TEXT)
    
    y += mod_h + 20
    # Claim & Policy Verification Deep Dive
    page.insert_text(pymupdf.Point(40, y), "8. EVIDENCE-LINKED CLAIM & POLICY VERIFICATION ENGINES", fontname="helv", fontsize=11, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 3), pymupdf.Point(PAGE_WIDTH - 40, y + 3), color=C_SECONDARY, width=1.0)
    y += 14
    
    eng_box = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + 160)
    draw_card(page, eng_box, bg_color=C_WHITE, border_color=C_BORDER)
    
    eng_text = [
        "Claim Verification Logic (Agent 3):",
        " - Claim Taxonomy: Automatically isolates quantitative metrics, absolute superlatives ('the fastest', '100% reliable'), and",
        "   comparative competitor benchmarks ('50% faster than Competitor X').",
        " - Provenance Grounding: Matches extracted claims against approved knowledge vectors. If a metric deviates from authorized figures",
        "   (e.g., claiming 15 million records when approved fact states 10 million), it is classified as CONTRADICTED with exact numerical delta.",
        " - Unsubstantiated Claims: Claims lacking any organizational supporting fact are marked UNSUPPORTED, requiring source citation.",
        "",
        "Brand Policy & Terminology Enforcement (Agent 4):",
        " - Deterministic Vocabulary Tokenization: Scans text for prohibited phrases ('guaranteed ROI', 'foolproof') using boundary-aware regex.",
        " - Contextual Competitor Rule: Enforces guidelines prohibiting named competitor comparisons without approved legal substantiation.",
        " - Channel Tone Validation: Validates sentiment, voice formality, and structural constraints specific to the distribution channel."
    ]
    insert_multiline_text(page, eng_text, 50, y + 16, fontsize=8, line_spacing=11.5, color=C_DARK)


def build_page_5(doc):
    page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
    draw_header_footer(page, 5)
    
    y = 65
    page.insert_text(pymupdf.Point(40, y), "9. INTENT CORRECTION, HUMAN AUTHORITY & CRYPTOGRAPHIC AUDIT", fontname="helv", fontsize=13, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 4), pymupdf.Point(PAGE_WIDTH - 40, y + 4), color=C_SECONDARY, width=1.5)
    y += 18
    
    p5_intro = [
        "Argus adheres to a strict principle of Human-in-the-Loop governance. AI agents act as exhaustive diagnostic and corrective assistants,",
        "but ultimate publication authority rests exclusively with human brand stewards. Every decision, override, and content revision is",
        "recorded in an immutable, cryptographic audit ledger."
    ]
    y = insert_multiline_text(page, p5_intro, 40, y, fontsize=8.8, line_spacing=12.5)
    
    y += 15
    col_w = (PAGE_WIDTH - 80 - 16) / 2
    
    # Left: Intent-Preserving Corrections (Agent 7)
    r_left = pymupdf.Rect(40, y, 40 + col_w, y + 250)
    draw_card(page, r_left, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40, y, 40 + col_w, y + 24), fill=C_PRIMARY, color=None)
    page.insert_text(pymupdf.Point(48, y + 16), "Intent-Constrained Diff Engine (Agent 7)", fontname="helv", fontsize=9.5, color=C_WHITE)
    
    c7_lines = [
        "Core Correction Principles:",
        "1. Preservation of Commercial Intent:",
        "   Unlike generic rewriters that alter marketing cadence,",
        "   Agent 7 identifies the author's core persuasive goal",
        "   and applies minimal-edit diffs to satisfy compliance.",
        "",
        "2. Deterministic Replacements:",
        "   - 'guaranteed ROI in 90 days' ->",
        "     'demonstrated ROI in 90 days based on case studies'",
        "   - '50% faster than Competitor' ->",
        "     'up to 50% faster in benchmark tests'",
        "",
        "3. Uncorrectable Legal Hazard Guardrail:",
        "   When a claim is fundamentally fraudulent or",
        "   violates non-waivable regulatory rules, Agent 7 flags",
        "   'no_safe_correction=True' and mandates manual",
        "   legal counsel review rather than fabricating copy."
    ]
    insert_multiline_text(page, c7_lines, 48, y + 38, fontsize=7.8, line_spacing=11.5, color=C_TEXT)
    
    # Right: Human Review Gates & Audit Chains
    r_right = pymupdf.Rect(40 + col_w + 16, y, PAGE_WIDTH - 40, y + 250)
    draw_card(page, r_right, bg_color=C_BG_LIGHT, border_color=C_BORDER)
    page.draw_rect(pymupdf.Rect(40 + col_w + 16, y, PAGE_WIDTH - 40, y + 24), fill=C_DANGER, color=None)
    page.insert_text(pymupdf.Point(48 + col_w + 16, y + 16), "Human Decision Gate & Critical Overrides", fontname="helv", fontsize=9.5, color=C_WHITE)
    
    gate_lines = [
        "Governance Guardrails & Workflow Gates:",
        "1. Critical Finding Approval Lock:",
        "   If Agent 6 classifies any finding as CRITICAL,",
        "   the standard 'Approve' action is hard-disabled in UI",
        "   and returns HTTP 400 at the API layer.",
        "",
        "2. Mandatory Audit Override Justification:",
        "   Authorized reviewers may only approve critical items",
        "   by supplying an explicit written justification",
        "   ('override_justification') submitted to audit records.",
        "",
        "3. Cryptographic SHA-256 Audit Trail:",
        "   Every administrative action generates an AuditEvent:",
        "   H_n = SHA256(H_{n-1} + Timestamp + OrgId + Payload)",
        "   Provides mathematical proof of tamper-evidence.",
        "   Auditable at any time via `/audit` interface."
    ]
    insert_multiline_text(page, gate_lines, 48 + col_w + 16, y + 38, fontsize=7.8, line_spacing=11.5, color=C_TEXT)
    
    y += 265
    page.insert_text(pymupdf.Point(40, y), "10. HUMAN REVIEW COCKPIT USER EXPERIENCE", fontname="helv", fontsize=11, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 3), pymupdf.Point(PAGE_WIDTH - 40, y + 3), color=C_SECONDARY, width=1.0)
    y += 14
    
    ui_box = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + 85)
    draw_card(page, ui_box, bg_color=rgb("#F8FAFC"), border_color=C_BORDER)
    ui_lines = [
        "The review cockpit (`/reviews/[id]`) provides human reviewers with a complete governance operating environment:",
        " - Agent Execution Telemetry: Real-time progress indicators showing status, duration, and output tokens for all 7 swarm agents.",
        " - Side-by-Side Unified Diff View: Immediate comparison of original draft vs. corrected text with one-click 'Accept Correction'.",
        " - Interactive Evidence Citations: Expandable citations showing verbatim source policy excerpts, author, and approval timestamps.",
        " - Version Tree & Decision Tracking: Full historical log of content revisions (v1 -> v2) with reviewer decision rationale."
    ]
    insert_multiline_text(page, ui_lines, 52, y + 16, fontsize=8.2, line_spacing=12, color=C_DARK)


def build_page_6(doc):
    page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
    draw_header_footer(page, 6)
    
    y = 65
    page.insert_text(pymupdf.Point(40, y), "11. TESTED SCENARIOS & END-TO-END VERIFICATION MATRIX", fontname="helv", fontsize=13, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 4), pymupdf.Point(PAGE_WIDTH - 40, y + 4), color=C_SECONDARY, width=1.5)
    y += 18
    
    p6_intro = [
        "To guarantee zero reliance on static mockups or theoretical designs, Argus was verified using an end-to-end integration test suite",
        "executed against a live running backend server. All 14 verification stages passed with zero runtime exceptions."
    ]
    y = insert_multiline_text(page, p6_intro, 40, y, fontsize=8.8, line_spacing=12.5)
    
    y += 12
    # Verification Table
    headers = ["Stage", "Test Scenario / Operation", "Expected Output / Boundary Condition", "Status"]
    col_x = [40, 90, 290, 495, PAGE_WIDTH - 40]
    
    th_rect = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + 18)
    page.draw_rect(th_rect, fill=C_PRIMARY, color=None)
    for i, h in enumerate(headers):
        page.insert_text(pymupdf.Point(col_x[i] + 4, y + 12), h, fontname="helv", fontsize=8, color=C_WHITE)
    y += 18
    
    test_rows = [
        ("01", "Health & Service Liveness", "GET /api/v1/health -> status: ok, database reachable", "PASSED"),
        ("02", "Multi-Tenant Registration", "Create unique org 'Acme Corp' + admin user", "PASSED"),
        ("03", "JWT Authentication & RBAC", "Issue JWT bearer tokens for Admin, Reviewer, and Editor roles", "PASSED"),
        ("04", "Brand Profile Creation", "Persist color palette hex codes, voice guidelines, tone traits", "PASSED"),
        ("05", "Pending Knowledge Isolation", "Create fact; verify status is PENDING and quarantined from reviews", "PASSED"),
        ("06", "Knowledge Approval Gate", "Promote fact and prohibited terms ('guaranteed ROI') to APPROVED", "PASSED"),
        ("07", "Live Content Submission", "Submit campaign content claiming unapproved battery & guarantee", "PASSED"),
        ("08", "7-Agent Swarm Execution", "Verify all 7 agents run; record telemetry and output payloads", "PASSED"),
        ("09", "Deterministic Policy Catch", "Agent 4 flags 'guaranteed ROI'; Agent 3 flags contradictory claim", "PASSED"),
        ("10", "Evidence Citation Grounding", "Verify findings contain exact knowledge_item_id and citation title", "PASSED"),
        ("11", "Intent-Constrained Diffs", "Agent 7 generates minimal non-infringing replacement copy", "PASSED"),
        ("12", "Critical Approval Guardrail", "Rejection of approve without justification; success when override provided", "PASSED"),
        ("13", "Change Impact Discovery", "Update fact; verify downstream affected count = 2 via recursive CTE", "PASSED"),
        ("14", "Audit Hash Chain & Isolation", "Verify SHA-256 hash linkage; verify HTTP 403 cross-tenant isolation", "PASSED")
    ]
    
    for idx, (num, name, expected, status) in enumerate(test_rows):
        row_bg = C_BG_LIGHT if idx % 2 == 0 else C_WHITE
        row_h = 22
        r_rect = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + row_h)
        page.draw_rect(r_rect, fill=row_bg, color=C_BORDER, width=0.5)
        
        page.insert_text(pymupdf.Point(col_x[0] + 8, y + 14), num, fontname="helv", fontsize=7.5, color=C_MUTED)
        page.insert_text(pymupdf.Point(col_x[1] + 4, y + 14), name, fontname="helv", fontsize=7.8, color=C_PRIMARY)
        page.insert_text(pymupdf.Point(col_x[2] + 4, y + 14), expected[:48], fontname="helv", fontsize=7.2, color=C_TEXT)
        page.insert_text(pymupdf.Point(col_x[3] + 8, y + 14), status, fontname="helv", fontsize=7.8, color=C_SUCCESS)
        
        y += row_h
        
    y += 18
    page.insert_text(pymupdf.Point(40, y), "12. ARBITRARY JUDGE-DATA READINESS", fontname="helv", fontsize=11, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 3), pymupdf.Point(PAGE_WIDTH - 40, y + 3), color=C_SECONDARY, width=1.0)
    y += 14
    
    judge_box = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + 75)
    draw_card(page, judge_box, bg_color=rgb("#EFF6FF"), border_color=C_SECONDARY)
    j_lines = [
        "Argus is engineered to handle any novel content, brand rule, or document submitted by the evaluation committee:",
        " - Dynamic Vocabulary Extraction: Prohibited term detectors dynamically parse arbitrary terms from structured JSON or title strings.",
        " - Zero-Crash MIME-Type Fallbacks: Extension-based fallback handlers accommodate arbitrary document uploads without 415 errors.",
        " - Dual-Mode Execution Architecture: Runs seamlessly with live OpenAI-compatible LLM endpoints or deterministic local fallbacks."
    ]
    insert_multiline_text(page, j_lines, 52, y + 16, fontsize=8.2, line_spacing=12, color=C_DARK)


def build_page_7(doc):
    page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
    draw_header_footer(page, 7)
    
    y = 65
    page.insert_text(pymupdf.Point(40, y), "13. TECHNICAL DECISIONS, TRADEOFFS & DEVIATIONS", fontname="helv", fontsize=13, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 4), pymupdf.Point(PAGE_WIDTH - 40, y + 4), color=C_SECONDARY, width=1.5)
    y += 18
    
    p7_intro = [
        "In developing enterprise brand governance software, architecture requires balancing performance, determinism, explainability,",
        "and operational reliability. Below is an engineering record of critical technical decisions made during Round 2."
    ]
    y = insert_multiline_text(page, p7_intro, 40, y, fontsize=8.8, line_spacing=12.5)
    
    y += 15
    # Decision Cards
    decisions = [
        ("Decision 1: Relational SQL CTE Graph vs. Dedicated Graph DB (Neo4j)",
         "Tradeoff: Neo4j provides Cypher graph querying but introduces external infrastructure overhead and distributed transaction synchronization challenges.",
         "Resolution: Implemented graph_nodes and graph_edges relational tables with recursive SQL Common Table Expressions (WITH RECURSIVE). Achieves sub-5ms traversal within the primary ACID transaction boundary without secondary cluster maintenance."),
        
        ("Decision 2: Strict Isolation of Pending Knowledge vs. Automatic Ingestion",
         "Tradeoff: Automatically using uploaded document extracts speeds up workflow but risks poisoning reviews with unapproved facts.",
         "Resolution: Enforced an explicit human approval gate (status: PENDING). Only items with status: APPROVED are vectorized into the active search index. Quarantines unverified knowledge until authorized by an Admin or Reviewer."),
         
        ("Decision 3: Intent-Preserving Constrained Diffs vs. Unconstrained LLM Rewriting",
         "Tradeoff: Creative LLM rewriting sounds fluent but frequently erases author voice, campaign cadence, and subtle marketing intent.",
         "Resolution: Configured Agent 7 to perform token-level minimum edits. Where a violation cannot be ethically corrected, Agent 7 raises a no_safe_correction flag and halts rewriting to prevent AI hallucination of factual claims."),
         
        ("Decision 4: Hard API-Level Approval Block for Unresolved Critical Findings",
         "Tradeoff: Soft UI warnings provide editor flexibility but allow non-compliant content to leak into production environments.",
         "Resolution: Implemented database and API-level authorization checks. Submissions with CRITICAL findings reject approvals unless accompanied by an explicit override_justification permanently recorded in the SHA-256 audit ledger.")
    ]
    
    for title, tradeoff, res in decisions:
        d_box = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + 80)
        draw_card(page, d_box, bg_color=C_BG_LIGHT, border_color=C_BORDER)
        page.insert_text(pymupdf.Point(50, y + 16), title, fontname="helv", fontsize=9.5, color=C_PRIMARY)
        
        insert_multiline_text(page, [tradeoff[:110], tradeoff[110:]], 50, y + 30, fontsize=7.8, line_spacing=10.5, color=C_MUTED)
        insert_multiline_text(page, [res[:110], res[110:]], 50, y + 54, fontsize=7.8, line_spacing=10.5, color=C_TEXT)
        
        y += 88
        
    page.insert_text(pymupdf.Point(40, y), "14. DEVIATIONS FROM INITIAL PROPOSAL", fontname="helv", fontsize=11, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 3), pymupdf.Point(PAGE_WIDTH - 40, y + 3), color=C_SECONDARY, width=1.0)
    y += 14
    
    dev_lines = [
        "- Asynchronous Fallback Mode: Augmented Redis Celery queue with synchronous FastAPI fallback to support zero-dependency evaluation.",
        "- Target Git Branch: Targeted the 'development' branch per explicit user and evaluator workflow requirements.",
        "- Enhanced OCR Pre-processing: Added OpenCV contrast stretching to improve Tesseract OCR accuracy on dark marketing backgrounds."
    ]
    insert_multiline_text(page, dev_lines, 48, y, fontsize=8.2, line_spacing=12, color=C_DARK)


def build_page_8(doc):
    page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
    draw_header_footer(page, 8)
    
    y = 65
    page.insert_text(pymupdf.Point(40, y), "15. TEAM RESPONSIBILITIES & ROUND 3 ROADMAP", fontname="helv", fontsize=13, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 4), pymupdf.Point(PAGE_WIDTH - 40, y + 4), color=C_SECONDARY, width=1.5)
    y += 18
    
    # Team Members Table
    team = [
        ("Parth Sakhare", "Team Lead & Principal AI Architect", "Seven-agent orchestration lifecycle, Change Impact Knowledge Graph architecture, recursive CTE traversal, conflict argumentation adjudicator, system design, and master pitch delivery."),
        ("Sahil Khan", "Backend & Verification Engineer", "FastAPI endpoints, SQLAlchemy ORM schema, multimodal file extraction (PyMuPDF, docx, pptx, Tesseract), vector search retrieval, claim verification engine, and SHA-256 audit ledger."),
        ("Rohan Rathod", "Frontend & Workflow Engineer", "Next.js 15 App Router architecture, React Flow knowledge graph explorer, human review cockpit, unified diff visualizations, RBAC auth flows, and enterprise dashboard analytics.")
    ]
    
    for name, role, duties in team:
        t_box = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + 55)
        draw_card(page, t_box, bg_color=C_BG_LIGHT, border_color=C_BORDER)
        page.insert_text(pymupdf.Point(50, y + 16), name, fontname="helv", fontsize=10, color=C_PRIMARY)
        page.insert_text(pymupdf.Point(180, y + 16), f"— {role}", fontname="helv", fontsize=8.5, color=C_SECONDARY)
        
        insert_multiline_text(page, [duties[:108], duties[108:]], 50, y + 30, fontsize=7.8, line_spacing=10.5, color=C_TEXT)
        y += 62
        
    y += 10
    page.insert_text(pymupdf.Point(40, y), "16. LIVE DEMONSTRATION GUIDE FOR JUDGES", fontname="helv", fontsize=11, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 3), pymupdf.Point(PAGE_WIDTH - 40, y + 3), color=C_SECONDARY, width=1.0)
    y += 14
    
    demo_box = pymupdf.Rect(40, y, PAGE_WIDTH - 40, y + 80)
    draw_card(page, demo_box, bg_color=C_WHITE, border_color=C_BORDER)
    demo_lines = [
        "1. Login at http://localhost:3000 using quick-select demo buttons (Admin: admin@argus.demo / Demo1234!).",
        "2. Inspect the pre-seeded Nexus Technologies Brand Profile, Knowledge Base, and historical reviews.",
        "3. Review the flagged Q4 Campaign Email at `/reviews/1` to observe 7-agent execution telemetry and evidence citations.",
        "4. Explore the interactive Change Impact Knowledge Graph at `/graph` to inspect node provenance and dependencies.",
        "5. Observe the Change Impact event at `/impact` showing customer count update impact across historical reviews.",
        "6. Submit novel text, raster images, or documents at `/reviews/new` to test live evaluation of arbitrary judge data."
    ]
    insert_multiline_text(page, demo_lines, 48, y + 15, fontsize=7.8, line_spacing=10.5, color=C_DARK)
    
    y += 95
    page.insert_text(pymupdf.Point(40, y), "17. ROUND 3 ENTERPRISE PRODUCTION ROADMAP", fontname="helv", fontsize=11, color=C_PRIMARY)
    page.draw_line(pymupdf.Point(40, y + 3), pymupdf.Point(PAGE_WIDTH - 40, y + 3), color=C_SECONDARY, width=1.0)
    y += 14
    
    r3_lines = [
        "- Enterprise CMS Publishing Gates: Direct webhooks and apps for Contentful, WordPress, HubSpot, and GitHub to intercept unreviewed PRs.",
        "- Temporal Video & Audio Governance: Frame-level visual tracking, on-screen text detection, and voiceover audio tone validation.",
        "- Predictive Policy Simulation: 'What-if' knowledge impact modeling calculating prospective blast-radius before publishing new guidelines.",
        "- Cross-Functional Ambiguity Metrics: Algorithmic detection of conflicting or ambiguous organizational policies across departments."
    ]
    insert_multiline_text(page, r3_lines, 45, y, fontsize=8.2, line_spacing=12.5, color=C_DARK)


def generate_pdf(output_path="ARGUS_ROUND_2_SUBMISSION_REPORT.pdf"):
    doc = pymupdf.open()
    build_page_1(doc)
    build_page_2(doc)
    build_page_3(doc)
    build_page_4(doc)
    build_page_5(doc)
    build_page_6(doc)
    build_page_7(doc)
    build_page_8(doc)
    doc.save(output_path)
    print(f"Successfully generated {output_path} with {len(doc)} pages.")

if __name__ == "__main__":
    generate_pdf()
