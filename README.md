# ARGUS — Autonomous Multi-User AI Brand Governance Platform

Argus is an enterprise brand-governance and organizational trust platform that introduces an intelligent, evidence-linked verification layer between content creation and publication.

Instead of operating as an unexplainable heuristic content scorer, Argus coordinates a **seven-agent specialist AI swarm** that cross-checks submitted communications against approved organizational knowledge, grounds all findings in traceable provenance, suggests intent-constrained corrections, provides human-controlled approval gates, and uses a **Change Impact Knowledge Graph** to trace how updates to approved brand rules or facts impact historical content.

---

## 1. Key Differentiating Architecture

1. **Seven-Agent Coordinated AI Swarm**:
   - **Agent 1 (Content Intake & Multimodal Understanding)**: Extracts canonical representations from text, images (OCR & VLM), and multi-page documents (PDF, DOCX, PPTX).
   - **Agent 2 (Brand Knowledge & Graph Retrieval)**: Retrieves active, approved brand guidelines, policies, facts, and prohibited terms using semantic vector search and graph edges.
   - **Agent 3 (Claim & Evidence Verification)**: Extracts quantitative and qualitative claims, verifies statements against approved knowledge, and classifies claims (`SUPPORTED`, `CONTRADICTED`, `UNSUPPORTED`, `OUTDATED`, `AMBIGUOUS`).
   - **Agent 4 (Brand Policy, Tone & Terminology)**: Enforces deterministic policy rules, prohibited terminology, channel conventions, and tone attributes.
   - **Agent 5 (Visual Identity & Accessibility)**: Inspects logos, brand palette consistency, text-in-image OCR legibility, and visual accessibility.
   - **Agent 6 (Conflict Resolution & Risk Adjudication)**: Merges findings, resolves conflicting interpretations with an argumentation graph, and calculates consolidated risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
   - **Agent 7 (Intent-Constrained Correction & Explanation)**: Computes minimal diff suggestions that preserve the creator's strategic message and commercial intent while resolving violations.

2. **Persistent Change Impact Knowledge Graph**:
   - Implemented in PostgreSQL using relational `graph_nodes` and `graph_edges` tables with recursive SQL Common Table Expressions (`WITH RECURSIVE`).
   - When an approved fact or policy changes (e.g. customer count increases or comparison policy tightens), Argus creates an immutable new version, traverses dependent content through the graph, and triggers a **Change Impact Event** notifying reviewers to reassess impacted reviews.

3. **Multi-Format Content Intake**:
   - **Direct Text**: Ad copy, email campaigns, social posts, website copy.
   - **Static Images**: PNG, JPG, WEBP with logo recognition, palette consistency, text contrast, and alt text suggestions.
   - **Documents**: PDF, DOCX, PPTX, TXT, Markdown with slide, page, and paragraph location tracking.

4. **Human Reviewer Authority & Immutable Audit Trail**:
   - Automated agents cannot independently authorize content.
   - Unresolved `CRITICAL` findings block standard approval unless an authorized reviewer explicitly overrides with an audit justification.
   - Every approval, rejection, and version change is recorded in an append-only audit log with SHA-256 hash chains.

---

## 2. Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, `@xyflow/react` (interactive graph explorer), Lucide Icons.
- **Backend**: Python 3.12, FastAPI, Pydantic v2 schemas, SQLAlchemy 2.0, Celery + Redis for asynchronous orchestration.
- **Database**: PostgreSQL with `pgvector` for vector embeddings + SQLite support for local offline development.
- **AI Models & Adapters**: Configurable OpenAI-compatible provider adapter with live and development offline fallbacks.

---

## 3. Judge & Demonstration Quick-Start

### Pre-Seeded Demonstration Workspace:
- **Organisation**: Nexus Technologies (`nexus-technologies`)
- **Brand Profile**: Enterprise AI Analytics brand identity, palette (`#1E40AF`, `#0EA5E9`, `#10B981`), tone guidelines.
- **Approved Knowledge Base**:
  - Fact: Company Inception (2019)
  - Fact: Customer Count (5,000 enterprise customers across 40 countries)
  - Fact: Data Processing Throughput (10M points/sec)
  - Claim: Mid-Market Analytics Leadership
  - Policy: Competitor Comparison Policy (Prohibits unapproved named competitor comparisons)
  - Policy: Data Security & Compliance Claims
  - Term: Approved Product Naming (`Nexus Analytics`)
  - Prohibited Term: Prohibited Guarantee Language (`guaranteed ROI`, `100% accurate`)
  - Voice Rule: Channel-Specific Social Media Guidelines
- **Content Item**:
  - *Q4 Campaign Email - Enterprise Analytics* with direct competitor comparisons (`50% faster than Salesforce Analytics`) and prohibited guarantee claims (`guaranteed ROI in 90 days`).
- **Review**:
  - Full 7-Agent execution records, CRITICAL and MAJOR findings with exact evidence links, side-by-side correction suggestions, and graph edges.
- **Change Impact Scenario**:
  - Change Impact Event demonstrating customer count update from 5,000 to 6,000 customers.

### One-Click Demo Credentials:
| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@argus.demo` | `Demo1234!` |
| **Reviewer** | `reviewer@argus.demo` | `Demo1234!` |
| **Editor** | `editor@argus.demo` | `Demo1234!` |

---

## 4. Local Installation & Development

### Backend Setup:
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup:
```bash
cd frontend
npm install
npm run dev
# Access UI at http://localhost:3000
```

### Running with Docker Compose:
```bash
docker compose up --build
```

---

## 5. Round 3 Roadmap Improvements

1. **Enterprise Publishing & CMS Gates**:
   - Integrations with Contentful, WordPress, Hubspot, and GitHub to establish mandatory review gates prior to external publication.
2. **Temporal & Full Multimodal Governance**:
   - Frame-level video analysis, voiceover audio tone validation, and campaign-wide multi-asset consistency checks.
3. **Advanced Governance Intelligence**:
   - Policy-change simulation ("what-if" impact analysis before publishing new rules), recurring brand risk detection, and cross-team guideline ambiguity metrics.

---

## 6. Team & Responsibilities

- **Parth Sakhare** — Team Lead: Architecture, agent orchestration, Knowledge Graph design, conflict resolution & pitch.
- **Sahil Khan** — Backend & Verification: FastAPI backend, database schema, extraction pipeline, pgvector retrieval & claim verification.
- **Rohan Rathod** — Frontend & Workflow: Next.js frontend, interactive React Flow graph explorer, review and approval interfaces.
