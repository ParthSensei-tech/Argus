import json

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.adapter import chat_structured
from app.core.config import get_settings
from app.models.review import Review
from app.schemas.contracts import AdjudicationOutput, ConsolidatedFinding
from app.schemas.enums import RiskLevel, Severity

settings = get_settings()


class RationaleOut(BaseModel):
    rationale: str = ""
    notes: list[dict] = Field(default_factory=list)


def run(db: Session, review: Review, specialist_payloads: list[dict]):
    findings: list[ConsolidatedFinding] = []
    seen: dict[tuple, str] = {}
    for payload in specialist_payloads:
        if payload.get("not_applicable"):
            continue
        for idx, raw in enumerate(payload.get("findings", [])):
            finding = ConsolidatedFinding.model_validate(raw)
            finding.finding_key = f"a{payload.get('agent_id', 0)}f{idx}"
            key = (finding.category.value, finding.original_text.strip().lower())
            if finding.original_text.strip() and key in seen:
                finding.kept = False
                finding.dedupe_of = seen[key]
                finding.resolution_note = f"Duplicate of {seen[key]}; retained for traceability."
            else:
                seen[key] = finding.finding_key
            findings.append(finding)

    conflicts = []
    by_text: dict[str, list[ConsolidatedFinding]] = {}
    for f in findings:
        if f.kept and f.original_text.strip():
            by_text.setdefault(f.original_text.strip().lower(), []).append(f)
    for text, group in by_text.items():
        statuses = {f.status.value for f in group}
        if "SUPPORTED" in statuses and ("CONTRADICTED" in statuses or "VIOLATION" in statuses):
            conflicts.append({
                "text": text,
                "finding_keys": [f.finding_key for f in group],
                "statuses": sorted(statuses),
                "resolution": "Both findings preserved; unresolved conflict escalated to human reviewer.",
            })
            for f in group:
                f.human_action_required = True

    kept = [f for f in findings if f.kept]
    if any(f.severity == Severity.CRITICAL or f.status.value == "CONTRADICTED" for f in kept):
        risk = RiskLevel.CRITICAL
    elif any(f.severity == Severity.MAJOR or f.status.value == "UNSUPPORTED" for f in kept):
        risk = RiskLevel.HIGH
    elif any(f.severity == Severity.MINOR for f in kept):
        risk = RiskLevel.MEDIUM
    else:
        risk = RiskLevel.LOW

    rationale = (
        f"Consolidated {len(findings)} finding(s) from specialists; {len(findings) - len(kept)} duplicate(s) "
        f"marked, {len(conflicts)} conflict(s). Risk {risk.value} from highest kept severity/status. "
        "No agent grants approval; human decision required."
    )
    model, tin, tout = "deterministic-adjudication", 0, 0
    if conflicts and settings.ai_available:
        result = chat_structured(
            role="fast",
            system="You resolve nothing silently. Explain the conflict and why both findings are preserved for the human reviewer.",
            user=json.dumps({"conflicts": conflicts}),
            schema=RationaleOut,
        )
        extra = RationaleOut.model_validate(result.payload)
        if extra.rationale:
            rationale += " " + extra.rationale
        model, tin, tout = result.model, result.tokens_in, result.tokens_out

    output = AdjudicationOutput(
        consolidated=findings,
        conflicts=conflicts,
        unresolved_questions=[c["resolution"] for c in conflicts],
        risk=risk,
        human_review_required=bool(conflicts) or risk in (RiskLevel.HIGH, RiskLevel.CRITICAL),
        rationale=rationale,
    )
    return output.model_dump(), model, tin, tout