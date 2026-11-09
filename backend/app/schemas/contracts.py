from pydantic import BaseModel, Field

from app.schemas.enums import FindingCategory, FindingStatus, RiskLevel, Severity


class SourceLocation(BaseModel):
    page: int | None = None
    slide: int | None = None
    paragraph: int | None = None
    section: str | None = None
    region: dict | None = None
    char_start: int | None = None
    char_end: int | None = None


class ContentBlock(BaseModel):
    block_id: str
    kind: str = "paragraph"
    text: str
    location: SourceLocation = Field(default_factory=SourceLocation)


class ImageRef(BaseModel):
    image_id: str
    storage_key: str
    mime: str
    location: SourceLocation = Field(default_factory=SourceLocation)
    origin: str = "upload"


class CanonicalContent(BaseModel):
    input_type: str
    blocks: list[ContentBlock] = Field(default_factory=list)
    images: list[ImageRef] = Field(default_factory=list)
    full_text: str = ""
    metadata: dict = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    extraction_status: str = "COMPLETE"
    confidence: float = 1.0


class EvidenceRef(BaseModel):
    knowledge_item_id: str | None = None
    knowledge_version: int | None = None
    excerpt: str = ""
    relation: str = "SUPPORTS"
    source_location: dict = Field(default_factory=dict)


class AgentFinding(BaseModel):
    category: FindingCategory
    severity: Severity
    status: FindingStatus
    confidence: float = Field(default=0.5, ge=0, le=1)
    original_text: str = ""
    source_location: SourceLocation = Field(default_factory=SourceLocation)
    explanation: str
    evidence: list[EvidenceRef] = Field(default_factory=list)
    policy_reference: dict | None = None
    suggested_correction: str | None = None
    human_action_required: bool = False


class SpecialistOutput(BaseModel):
    agent_id: int
    findings: list[AgentFinding] = Field(default_factory=list)
    summary: str = ""
    not_applicable: bool = False


class RetrievedItem(BaseModel):
    item_id: str
    version: int
    type: str
    title: str
    body: str
    structured: dict = Field(default_factory=dict)
    score: float = 0.0


class RetrievedKnowledge(BaseModel):
    items: list[RetrievedItem] = Field(default_factory=list)
    knowledge_snapshot: dict = Field(default_factory=dict)


class ConsolidatedFinding(AgentFinding):
    finding_key: str = ""
    dedupe_of: str | None = None
    resolution_note: str | None = None
    kept: bool = True


class AdjudicationOutput(BaseModel):
    consolidated: list[ConsolidatedFinding] = Field(default_factory=list)
    conflicts: list[dict] = Field(default_factory=list)
    unresolved_questions: list[str] = Field(default_factory=list)
    risk: RiskLevel = RiskLevel.LOW
    human_review_required: bool = False
    rationale: str = ""


class CorrectionItem(BaseModel):
    original_text: str
    suggested_text: str
    explanation: str
    finding_key: str = ""
    no_safe_correction: bool = False


class CorrectionOutput(BaseModel):
    corrections: list[CorrectionItem] = Field(default_factory=list)
    intent_notes: str = ""