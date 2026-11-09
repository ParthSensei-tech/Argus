import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import Decision, KnowledgeType, Role


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class FileOut(ORMModel):
    id: uuid.UUID
    filename: str
    mime: str
    size_bytes: int
    sha256: str
    purpose: str


class SourceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=400)
    kind: str = "DOCUMENT"
    file_id: uuid.UUID | None = None


class SourceOut(ORMModel):
    id: uuid.UUID
    title: str
    kind: str
    status: str
    file_id: uuid.UUID | None
    created_at: datetime


class ItemCreate(BaseModel):
    type: KnowledgeType
    title: str = Field(min_length=1, max_length=400)
    body: str = ""
    structured: dict = Field(default_factory=dict)
    source_id: uuid.UUID | None = None


class ItemOut(ORMModel):
    id: uuid.UUID
    type: str
    title: str
    body: str
    structured: dict
    status: str
    current_version: int
    source_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class VersionCreate(BaseModel):
    body: str
    structured: dict | None = None
    change_note: str = Field(min_length=1, max_length=900)


class VersionOut(ORMModel):
    id: uuid.UUID
    item_id: uuid.UUID
    version: int
    body: str
    structured: dict
    change_note: str
    superseded: bool
    created_at: datetime


class BrandProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    voice_tone: dict = Field(default_factory=dict)
    colors: list[str] = Field(default_factory=list)


class BrandProfileOut(ORMModel):
    id: uuid.UUID
    name: str
    description: str
    voice_tone: dict
    colors: list


class ReviewCreate(BaseModel):
    title: str = Field(min_length=1, max_length=400)
    input_type: str
    raw_text: str = ""
    file_id: uuid.UUID | None = None
    channel: str = ""
    content_type: str = ""
    audience: str = ""
    campaign: str = ""
    context: str = ""


class ReviewOut(ORMModel):
    id: uuid.UUID
    content_version_id: uuid.UUID
    status: str
    risk: str | None
    decision: str | None
    decision_reason: str | None
    error: str | None
    ai_mode: str
    correlation_id: str
    created_at: datetime
    updated_at: datetime


class EvidenceOut(ORMModel):
    id: uuid.UUID
    knowledge_item_id: uuid.UUID | None
    knowledge_version: int | None
    source_location: dict
    excerpt: str
    relation: str


class FindingOut(ORMModel):
    id: uuid.UUID
    agent_id: int
    category: str
    severity: str
    status: str
    confidence: float
    original_text: str
    source_location: dict
    explanation: str
    policy_reference: dict | None
    suggested_correction: str | None
    human_action_required: bool
    resolution_note: str | None


class CorrectionOut(ORMModel):
    id: uuid.UUID
    finding_id: uuid.UUID
    original_text: str
    suggested_text: str
    explanation: str
    status: str


class AgentRunOut(ORMModel):
    id: uuid.UUID
    agent_id: int
    name: str
    status: str
    started_at: datetime | None
    finished_at: datetime | None
    attempts: int
    error: str | None
    model: str | None
    tokens_in: int
    tokens_out: int


class DecisionIn(BaseModel):
    decision: Decision
    reason: str = ""
    override_critical: bool = False


class RerunIn(BaseModel):
    raw_text: str | None = None


class MemberIn(BaseModel):
    email: str
    role: Role


class MemberOut(ORMModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: str


class ImpactEventOut(ORMModel):
    id: uuid.UUID
    item_id: uuid.UUID
    from_version: int
    to_version: int
    change_summary: str
    severity: str
    status: str
    affected_count: int
    created_at: datetime