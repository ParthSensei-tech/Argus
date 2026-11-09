"""Argus Database Seeder for Demonstration and Judge Evaluation.

Seeds:
- Users: Alex Admin (admin@argus.demo), Riley Reviewer (reviewer@argus.demo), Sam Editor (editor@argus.demo) [Password: Demo1234!]
- Organisation: Nexus Technologies
- Brand Profile: Nexus Technologies brand voice, guidelines, colors
- Approved Knowledge:
  * Brand Voice Guidelines
  * Company History / Founded Fact
  * Customer Count Fact (5,000 customers in 40 countries)
  * Data Processing Speed Fact (10M points/sec)
  * Market Leadership Claim
  * Competitor Comparison Policy
  * Data Security Claims Policy
  * Product Name Term
  * Prohibited Guarantee Language
  * Channel-specific Social Media Voice Rule
- Content Items & Versions:
  * Marketing Email with Claims & Competitor Comparison
- Complete 7-Agent Review with:
  * 7 AgentRuns (all recorded with tokens, timings, models)
  * Critical & Major Findings with exact evidence links
  * Intent-constrained Correction Suggestions
  * Full Knowledge Graph Nodes & Directed Provenance Edges
- Change Impact Knowledge Graph Scenario:
  * Customer Count updated from 5,000 to 6,000
  * ImpactEvent linking to affected content review
- Audit Trail Events
"""

import os
import sys
import uuid
from datetime import datetime, timezone

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.audit import AuditEvent
from app.models.content import ContentItem, ContentVersion
from app.models.graph import GraphEdge, GraphNode, ImpactEvent
from app.models.identity import Organisation, OrganisationMember, User
from app.models.knowledge import BrandProfile, Embedding, KnowledgeItem, KnowledgeSource, KnowledgeVersion
from app.models.review import (
    AgentOutput,
    AgentRun,
    CorrectionSuggestion,
    EvidenceReference,
    Review,
    ReviewDecision,
    ReviewFinding,
)
from app.schemas.enums import EntityType, FindingCategory, FindingStatus, KnowledgeType, Relation, ReviewStatus, Role, Severity
from app.services import audit, graph
from app.services.embeddings import EmbeddingService, _dev_vector, _hash


def utcnow():
    return datetime.now(timezone.utc)


def seed():
    print("Initializing database tables...")
    Base.metadata.create_all(engine)

    settings = get_settings()
    # Force dev embeddings for seed script to avoid external network dependencies
    orig_provider = settings.EMBEDDING_PROVIDER
    settings.EMBEDDING_PROVIDER = "dev"

    db = SessionLocal()
    try:
        # Check if already seeded
        existing_org = db.query(Organisation).filter(Organisation.slug == "nexus-technologies").first()
        if existing_org:
            print("[INFO] Nexus Technologies demo organisation already exists. Skipping seed.")
            return

        print("Creating demo users...")
        pw_hash = hash_password("Demo1234!")

        admin_user = User(
            id=uuid.uuid4(),
            email="admin@argus.demo",
            password_hash=pw_hash,
            full_name="Alex Admin",
            is_active=True,
            created_at=utcnow(),
        )
        reviewer_user = User(
            id=uuid.uuid4(),
            email="reviewer@argus.demo",
            password_hash=pw_hash,
            full_name="Riley Reviewer",
            is_active=True,
            created_at=utcnow(),
        )
        editor_user = User(
            id=uuid.uuid4(),
            email="editor@argus.demo",
            password_hash=pw_hash,
            full_name="Sam Editor",
            is_active=True,
            created_at=utcnow(),
        )

        for u in [admin_user, reviewer_user, editor_user]:
            existing_u = db.query(User).filter(User.email == u.email).first()
            if not existing_u:
                db.add(u)
            else:
                if u.email == "admin@argus.demo":
                    admin_user = existing_u
                elif u.email == "reviewer@argus.demo":
                    reviewer_user = existing_u
                elif u.email == "editor@argus.demo":
                    editor_user = existing_u
        db.flush()

        print("Creating organisation & memberships...")
        org = Organisation(
            id=uuid.uuid4(),
            name="Nexus Technologies",
            slug="nexus-technologies",
            created_at=utcnow(),
        )
        db.add(org)
        db.flush()

        m_admin = OrganisationMember(org_id=org.id, user_id=admin_user.id, role=Role.ADMIN.value, created_at=utcnow())
        m_rev = OrganisationMember(org_id=org.id, user_id=reviewer_user.id, role=Role.REVIEWER.value, created_at=utcnow())
        m_ed = OrganisationMember(org_id=org.id, user_id=editor_user.id, role=Role.EDITOR.value, created_at=utcnow())
        db.add_all([m_admin, m_rev, m_ed])
        db.flush()

        # Graph node for Organisation
        org_node = graph.upsert_node(db, org.id, EntityType.ORGANISATION.value, org.id, org.name)

        print("Creating brand profile...")
        profile = BrandProfile(
            id=uuid.uuid4(),
            org_id=org.id,
            name="Nexus Technologies Brand",
            description="Leading enterprise intelligence and automated operational analytics platform.",
            voice_tone={
                "tone": "clear, authoritative, visionary",
                "personality": "innovative, reliable, human-centric",
                "writing_style": "active voice, outcome-oriented, devoid of hype",
            },
            colors=["#1E40AF", "#0EA5E9", "#10B981", "#1F2937", "#F9FAFB"],
            created_at=utcnow(),
        )
        db.add(profile)
        db.flush()

        print("Creating approved brand guidelines and sources...")
        source_doc = KnowledgeSource(
            id=uuid.uuid4(),
            org_id=org.id,
            title="Nexus Global Brand & Communications Guideline 2024",
            kind="DOCUMENT",
            status="APPROVED",
            file_id=None,
            submitted_by=admin_user.id,
            approved_by=admin_user.id,
            approved_at=utcnow(),
            created_at=utcnow(),
        )
        db.add(source_doc)
        db.flush()

        src_node = graph.upsert_node(db, org.id, EntityType.SOURCE_DOCUMENT.value, source_doc.id, source_doc.title)
        graph.add_edge(db, org.id, src_node, org_node, Relation.APPLIES_TO.value, {"established_by": "admin"})

        # Knowledge Items Definition
        items_def = [
            (
                KnowledgeType.GUIDELINE.value,
                "Brand Voice Guidelines",
                "Nexus Technologies communicates with clarity, confidence, and innovation. We use active voice, avoid buzzwords, and speak directly to measurable business outcomes. Our tone is professional yet approachable.",
                {"tone": "confident", "voice": "active", "prohibited_tones": ["aggressive", "hyperbolic"]},
            ),
            (
                KnowledgeType.FACT.value,
                "Company Inception",
                "Nexus Technologies was founded in 2019.",
                {"year": 2019, "milestone": "founded"},
            ),
            (
                KnowledgeType.FACT.value,
                "Customer Count & Global Reach",
                "Nexus Technologies serves over 5,000 enterprise customers across 40 countries as of Q3 2024.",
                {"customers": 5000, "countries": 40, "quarter": "Q3 2024", "segment": "enterprise"},
            ),
            (
                KnowledgeType.FACT.value,
                "Data Processing Throughput",
                "The Nexus Analytics platform processes up to 10 million data points per second with sub-second latency.",
                {"throughput": 10000000, "unit": "data points/sec", "latency": "<1s"},
            ),
            (
                KnowledgeType.CLAIM.value,
                "Mid-Market Analytics Leadership",
                "Nexus Analytics is the leading AI analytics platform for mid-market enterprises in North America, as independently verified by TechMarket Research 2024.",
                {"award": "Leading Mid-Market AI Analytics Platform", "source": "TechMarket Research 2024"},
            ),
            (
                KnowledgeType.POLICY.value,
                "Competitor Comparison Policy",
                "Content must not make direct numerical comparisons to named competitors without Legal approval. Use of phrases like 'better than [competitor]' or '50% faster than [competitor]' is strictly prohibited.",
                {"named_competitor_comparison": "prohibited_without_legal", "severity": "CRITICAL"},
            ),
            (
                KnowledgeType.POLICY.value,
                "Data Security and Compliance Claims Policy",
                "All claims concerning data security, regulatory compliance (SOC 2 Type II, ISO 27001, HIPAA, GDPR), or uptime guarantees (e.g. 99.99%) must reference approved certification versions and have Legal sign-off.",
                {"compliance_verified": ["SOC 2 Type II", "ISO 27001", "GDPR"], "uptime_max_sla": "99.9%"},
            ),
            (
                KnowledgeType.TERM.value,
                "Approved Product & Corporate Naming",
                "The correct product name is 'Nexus Analytics'. Never use 'Nexus Analytics Platform', 'NA Platform', or 'Nexus AI'. The legal corporate entity is 'Nexus Technologies'.",
                {"canonical_product": "Nexus Analytics", "prohibited_variants": ["Nexus Analytics Platform", "NA Platform", "Nexus AI"]},
            ),
            (
                KnowledgeType.PROHIBITED_TERM.value,
                "Prohibited Guarantee Language",
                "Prohibited terms in all promotional materials: 'guaranteed results', 'guaranteed ROI', '100% accurate', 'zero downtime', 'perfect accuracy'. These are unqualified performance guarantees.",
                {"prohibited_terms": ["guaranteed results", "guaranteed ROI", "100% accurate", "zero downtime", "perfect accuracy"]},
            ),
            (
                KnowledgeType.VOICE_RULE.value,
                "Social Media Publishing Rules",
                "Social media posts must be concise (under 280 characters for Twitter/X). Use 2-3 focused hashtags maximum. Avoid dense technical jargon and always include an approved call to action.",
                {"max_characters_x": 280, "max_hashtags": 3, "requires_cta": True},
            ),
        ]

        created_items = {}
        for type_, title, body, structured in items_def:
            item = KnowledgeItem(
                id=uuid.uuid4(),
                org_id=org.id,
                source_id=source_doc.id,
                type=type_,
                title=title,
                body=body,
                structured=structured,
                status="APPROVED",
                current_version=1,
                created_by=admin_user.id,
                approved_by=admin_user.id,
                created_at=utcnow(),
                updated_at=utcnow(),
            )
            db.add(item)
            db.flush()

            k_version = KnowledgeVersion(
                id=uuid.uuid4(),
                org_id=org.id,
                item_id=item.id,
                version=1,
                body=body,
                structured=structured,
                change_note="Initial verified baseline from Brand Guidelines 2024",
                superseded=False,
                created_by=admin_user.id,
                created_at=utcnow(),
            )
            db.add(k_version)
            db.flush()

            # Create embedding
            emb_text = f"{body}\n{structured}".strip()
            vec = _dev_vector(emb_text, settings.EMBEDDING_DIM)
            emb = Embedding(
                id=uuid.uuid4(),
                org_id=org.id,
                item_version_id=k_version.id,
                model="dev-hash-vector",
                dim=settings.EMBEDDING_DIM,
                vector=vec,
                content_hash=_hash(emb_text),
                tokens=len(emb_text) // 4,
                created_at=utcnow(),
            )
            db.add(emb)

            # Graph node
            k_node = graph.item_node(db, org.id, item)
            graph.add_edge(db, org.id, k_node, src_node, Relation.DERIVED_FROM.value, {"source": source_doc.title})

            created_items[title] = (item, k_version, k_node)

        print("Creating Content Submission & Seven-Agent Review...")
        marketing_copy = (
            "Transform your business with Nexus Analytics - the guaranteed #1 solution trusted by over 5,000 enterprises. "
            "Our platform processes 10 million data points per second, 50% faster than Salesforce Analytics. "
            "Get guaranteed ROI in 90 days or your money back. Join 5,000+ customers in 40 countries who rely on Nexus Technologies "
            "for mission-critical insights. Start your free trial today."
        )

        content_item = ContentItem(
            id=uuid.uuid4(),
            org_id=org.id,
            title="Q4 Campaign Email - Enterprise Analytics",
            input_type="TEXT",
            channel="email",
            content_type="marketing_email",
            audience="enterprise_cto",
            campaign="Q4-Enterprise-Growth",
            context="Targeting VP of Engineering and CTOs at scale-up enterprises.",
            created_by=editor_user.id,
            created_at=utcnow(),
        )
        db.add(content_item)
        db.flush()

        content_ver = ContentVersion(
            id=uuid.uuid4(),
            org_id=org.id,
            content_id=content_item.id,
            version=1,
            raw_text=marketing_copy,
            canonical={
                "input_type": "TEXT",
                "full_text": marketing_copy,
                "blocks": [
                    {"block_id": "b1", "kind": "paragraph", "text": marketing_copy, "location": {"char_start": 0, "char_end": len(marketing_copy)}}
                ],
                "images": [],
                "warnings": [],
                "extraction_status": "SUCCESS",
            },
            sha256=_hash(marketing_copy),
            created_at=utcnow(),
        )
        db.add(content_ver)
        db.flush()

        review = Review(
            id=uuid.uuid4(),
            org_id=org.id,
            content_version_id=content_ver.id,
            status=ReviewStatus.AWAITING_REVIEW.value,
            risk="HIGH",
            decision=None,
            decision_reason=None,
            ai_mode="dev",
            correlation_id=str(uuid.uuid4()),
            created_by=editor_user.id,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
        db.add(review)
        db.flush()

        print("Recording 7 Coordinated Agent Runs...")
        agents_info = [
            (1, "Agent 1: Content Intake & Multimodal Understanding", "deterministic-extraction", 0, 0),
            (2, "Agent 2: Brand Knowledge & Graph Retrieval", "pgvector-retrieval", 210, 85),
            (3, "Agent 3: Claim & Evidence Verification", "nvidia/nemotron-3-ultra-550b-a55b", 840, 310),
            (4, "Agent 4: Brand Policy, Tone & Terminology", "nvidia/nemotron-3.5-lightning", 720, 240),
            (5, "Agent 5: Visual Identity & Accessibility", "google/gemma-4-26b-a4b-it", 0, 0),
            (6, "Agent 6: Conflict Resolution & Risk Adjudication", "nvidia/nemotron-3-ultra-550b-a55b", 920, 290),
            (7, "Agent 7: Intent-Constrained Correction & Explanation", "nvidia/nemotron-3-ultra-550b-a55b", 680, 260),
        ]

        agent_runs = {}
        for aid, aname, amodel, tin, tout in agents_info:
            arun = AgentRun(
                id=uuid.uuid4(),
                org_id=org.id,
                review_id=review.id,
                agent_id=aid,
                name=aname,
                status="SUCCESS" if aid != 5 else "NOT_APPLICABLE",
                started_at=utcnow(),
                finished_at=utcnow(),
                attempts=1,
                error=None,
                model=amodel,
                prompt_version="1.0.0",
                tokens_in=tin,
                tokens_out=tout,
            )
            db.add(arun)
            db.flush()

            aout = AgentOutput(
                id=uuid.uuid4(),
                org_id=org.id,
                agent_run_id=arun.id,
                review_id=review.id,
                payload={"agent_id": aid, "status": arun.status, "model": amodel, "summary": f"Completed {aname}"},
                created_at=utcnow(),
            )
            db.add(aout)
            agent_runs[aid] = arun

        print("Adding Findings & Evidence Citations...")
        policy_item, policy_ver, policy_node = created_items["Competitor Comparison Policy"]
        prohib_item, prohib_ver, prohib_node = created_items["Prohibited Guarantee Language"]
        cust_item, cust_ver, cust_node = created_items["Customer Count & Global Reach"]

        # Finding 1: Critical Competitor Comparison
        f1 = ReviewFinding(
            id=uuid.uuid4(),
            org_id=org.id,
            review_id=review.id,
            agent_id=3,
            category=FindingCategory.FACTUAL_CLAIM.value,
            severity=Severity.CRITICAL.value,
            status=FindingStatus.CONTRADICTED.value,
            confidence=0.96,
            original_text="50% faster than Salesforce Analytics",
            source_location={"char_start": marketing_copy.find("50% faster than Salesforce Analytics"), "char_end": marketing_copy.find("50% faster than Salesforce Analytics") + len("50% faster than Salesforce Analytics")},
            explanation="The claim '50% faster than Salesforce Analytics' is a direct numerical comparison to a named competitor without Legal clearance. This violates the Competitor Comparison Policy.",
            policy_reference={"policy_id": str(policy_item.id), "rule": "No direct competitor comparisons without Legal approval"},
            suggested_correction="significantly faster than standard industry alternatives",
            human_action_required=True,
            resolution_note="Adjudication maintained this as CRITICAL due to potential legal liability.",
            created_at=utcnow(),
        )
        db.add(f1)
        db.flush()

        ev1 = EvidenceReference(
            id=uuid.uuid4(),
            org_id=org.id,
            finding_id=f1.id,
            knowledge_item_id=policy_item.id,
            knowledge_version=1,
            source_document_id=source_doc.id,
            source_location={"section": "Competitive Intelligence & Comparisons", "page": 4},
            excerpt="Content must not make direct numerical comparisons to named competitors without Legal approval.",
            relation="CONTRADICTS",
        )
        db.add(ev1)

        # Finding 2: Major Prohibited Guarantee Language
        f2 = ReviewFinding(
            id=uuid.uuid4(),
            org_id=org.id,
            review_id=review.id,
            agent_id=4,
            category=FindingCategory.TONE_TERMINOLOGY.value,
            severity=Severity.MAJOR.value,
            status=FindingStatus.VIOLATION.value,
            confidence=0.98,
            original_text="guaranteed ROI in 90 days or your money back",
            source_location={"char_start": marketing_copy.find("guaranteed ROI in 90 days or your money back"), "char_end": marketing_copy.find("guaranteed ROI in 90 days or your money back") + len("guaranteed ROI in 90 days or your money back")},
            explanation="The phrase 'guaranteed ROI in 90 days or your money back' violates the Prohibited Guarantee Language policy.",
            policy_reference={"policy_id": str(prohib_item.id), "term": "guaranteed ROI"},
            suggested_correction="measurable ROI within 90 days for most deployments",
            human_action_required=True,
            resolution_note="High risk of customer warranty dispute.",
            created_at=utcnow(),
        )
        db.add(f2)
        db.flush()

        ev2 = EvidenceReference(
            id=uuid.uuid4(),
            org_id=org.id,
            finding_id=f2.id,
            knowledge_item_id=prohib_item.id,
            knowledge_version=1,
            source_document_id=source_doc.id,
            source_location={"section": "Prohibited Promotional Terms", "page": 7},
            excerpt="Prohibited terms in all promotional materials: 'guaranteed results', 'guaranteed ROI', '100% accurate'.",
            relation="CONTRADICTS",
        )
        db.add(ev2)

        # Finding 3: Supported customer claim
        f3 = ReviewFinding(
            id=uuid.uuid4(),
            org_id=org.id,
            review_id=review.id,
            agent_id=3,
            category=FindingCategory.FACTUAL_CLAIM.value,
            severity=Severity.INFORMATIONAL.value,
            status=FindingStatus.SUPPORTED.value,
            confidence=0.95,
            original_text="Join 5,000+ customers in 40 countries who rely on Nexus Technologies",
            source_location={"char_start": marketing_copy.find("Join 5,000+ customers in 40 countries who rely on Nexus Technologies"), "char_end": marketing_copy.find("Join 5,000+ customers in 40 countries who rely on Nexus Technologies") + len("Join 5,000+ customers in 40 countries who rely on Nexus Technologies")},
            explanation="Customer count and global reach are verified by approved corporate statistics.",
            policy_reference=None,
            suggested_correction=None,
            human_action_required=False,
            created_at=utcnow(),
        )
        db.add(f3)
        db.flush()

        ev3 = EvidenceReference(
            id=uuid.uuid4(),
            org_id=org.id,
            finding_id=f3.id,
            knowledge_item_id=cust_item.id,
            knowledge_version=1,
            source_document_id=source_doc.id,
            source_location={"section": "Approved Corporate Facts", "page": 2},
            excerpt="Nexus Technologies serves over 5,000 enterprise customers across 40 countries as of Q3 2024.",
            relation="SUPPORTS",
        )
        db.add(ev3)

        print("Adding Intent-Constrained Correction Suggestions...")
        c1 = CorrectionSuggestion(
            id=uuid.uuid4(),
            org_id=org.id,
            review_id=review.id,
            finding_id=f1.id,
            original_text="50% faster than Salesforce Analytics",
            suggested_text="significantly faster than standard industry alternatives",
            explanation="Eliminates legal exposure from uncertified competitor speed benchmarking while highlighting market velocity.",
            status="PENDING",
            created_at=utcnow(),
        )
        c2 = CorrectionSuggestion(
            id=uuid.uuid4(),
            org_id=org.id,
            review_id=review.id,
            finding_id=f2.id,
            original_text="guaranteed ROI in 90 days or your money back",
            suggested_text="measurable ROI within 90 days for most deployments",
            explanation="Replaces unqualified warranty commitment with a realistic customer outcome statement.",
            status="PENDING",
            created_at=utcnow(),
        )
        db.add_all([c1, c2])

        print("Linking Knowledge Graph Nodes & Edges...")
        ci_node = graph.upsert_node(db, org.id, EntityType.CONTENT_ITEM.value, content_item.id, content_item.title)
        cv_node = graph.upsert_node(db, org.id, EntityType.CONTENT_VERSION.value, content_ver.id, f"{content_item.title} v1")
        rev_node = graph.upsert_node(db, org.id, EntityType.REVIEW.value, review.id, f"Review: {content_item.title}")

        prov = {"review_id": str(review.id), "established_by": "orchestrator"}
        graph.add_edge(db, org.id, cv_node, ci_node, Relation.DERIVED_FROM.value, prov)
        graph.add_edge(db, org.id, cv_node, rev_node, Relation.REVIEWED_UNDER.value, prov)

        f1_node = graph.upsert_node(db, org.id, EntityType.FINDING.value, f1.id, "CRITICAL: Competitor comparison violation")
        f2_node = graph.upsert_node(db, org.id, EntityType.FINDING.value, f2.id, "MAJOR: Prohibited guarantee term")
        f3_node = graph.upsert_node(db, org.id, EntityType.FINDING.value, f3.id, "SUPPORTED: Customer count claim")

        graph.add_edge(db, org.id, f1_node, cv_node, Relation.APPLIES_TO.value, prov)
        graph.add_edge(db, org.id, f2_node, cv_node, Relation.APPLIES_TO.value, prov)
        graph.add_edge(db, org.id, f3_node, cv_node, Relation.APPLIES_TO.value, prov)

        graph.add_edge(db, org.id, f1_node, policy_node, Relation.CONTRADICTS.value, {"why": "unapproved direct competitor speed metric"})
        graph.add_edge(db, org.id, f2_node, prohib_node, Relation.CONTRADICTS.value, {"why": "prohibited guarantee keyword"})
        graph.add_edge(db, org.id, f3_node, cust_node, Relation.SUPPORTED_BY.value, {"why": "matches verified customer count fact"})

        # Edge from review to knowledge
        graph.add_edge(db, org.id, rev_node, policy_node, Relation.REVIEWED_UNDER.value, {"knowledge_version": 1})
        graph.add_edge(db, org.id, rev_node, prohib_node, Relation.REVIEWED_UNDER.value, {"knowledge_version": 1})
        graph.add_edge(db, org.id, rev_node, cust_node, Relation.REVIEWED_UNDER.value, {"knowledge_version": 1})

        print("Creating Demonstration Change Impact Scenario...")
        # Scenario: Customer Count knowledge item was updated from 5,000 to 6,000 customers in Q4 2024
        # We record an ImpactEvent showing that this content review is affected by the knowledge change
        impact_event = ImpactEvent(
            id=uuid.uuid4(),
            org_id=org.id,
            item_id=cust_item.id,
            from_version=1,
            to_version=2,
            change_summary="Customer count updated from 5,000 to 6,000 enterprises globally for Q4 2024.",
            severity="MEDIUM",
            status="OPEN",
            affected_count=1,
            created_at=utcnow(),
        )
        db.add(impact_event)

        print("Recording Audit Trail History...")
        audit_records = [
            ("organisation.created", "organisation", org.id, {"name": org.name}),
            ("brand_profile.created", "brand_profile", profile.id, {"brand_name": profile.name}),
            ("knowledge.source_approved", "knowledge_source", source_doc.id, {"title": source_doc.title}),
            ("knowledge.item_created", "knowledge_item", cust_item.id, {"title": cust_item.title, "type": "FACT"}),
            ("review.submitted", "review", review.id, {"title": content_item.title, "input_type": "TEXT"}),
            ("review.completed", "review", review.id, {"status": "AWAITING_REVIEW", "risk": "HIGH", "findings_count": 3}),
            ("knowledge.item_versioned", "knowledge_item", cust_item.id, {"from_version": 1, "to_version": 2, "impact_event_id": str(impact_event.id)}),
        ]

        for action, etype, eid, payload in audit_records:
            audit.record(
                db=db,
                org_id=org.id,
                actor_id=admin_user.id,
                action=action,
                entity_type=etype,
                entity_id=eid,
                payload=payload,
            )

        db.commit()
        print("\n========================================================")
        print("SEEDING SUCCESSFUL!")
        print("========================================================")
        print("Organisation: Nexus Technologies (slug: nexus-technologies)")
        print("Users:")
        print("  - Admin:    admin@argus.demo    / Demo1234!")
        print("  - Reviewer: reviewer@argus.demo / Demo1234!")
        print("  - Editor:   editor@argus.demo   / Demo1234!")
        print("Content Reviews:")
        print(f"  - '{content_item.title}' (ID: {review.id})")
        print("Impact Events:")
        print(f"  - Impact Event on Customer Count (ID: {impact_event.id})")
        print("========================================================\n")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        db.close()
        settings.EMBEDDING_PROVIDER = orig_provider


if __name__ == "__main__":
    seed()
