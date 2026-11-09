from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.review import AgentOutput, AgentRun, Review

AGENT_NAMES = {
    1: "Content Intake & Multimodal Understanding",
    2: "Brand Knowledge & Change Impact Graph",
    3: "Claim & Evidence Verification",
    4: "Brand Policy, Tone & Terminology",
    5: "Visual Identity & Accessibility",
    6: "Conflict Resolution & Risk Adjudication",
    7: "Intent-Constrained Correction & Explanation",
}
PROMPT_VERSION = "1"


def run_agent(db: Session, review: Review, agent_id: int, fn, applicable: bool = True) -> AgentRun:
    run = AgentRun(
        org_id=review.org_id,
        review_id=review.id,
        agent_id=agent_id,
        name=AGENT_NAMES[agent_id],
        status="RUNNING" if applicable else "NOT_APPLICABLE",
        started_at=datetime.now(timezone.utc),
        attempts=1,
        prompt_version=PROMPT_VERSION,
    )
    db.add(run)
    db.commit()
    if not applicable:
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
        return run
    try:
        output, model, tin, tout = fn()
        run.model = model
        run.tokens_in = tin
        run.tokens_out = tout
        run.status = "SUCCESS"
        db.add(AgentOutput(org_id=review.org_id, agent_run_id=run.id, review_id=review.id, payload=output))
    except Exception as exc:
        run.status = "FAILED"
        run.error = str(exc)[:2000]
        raise
    finally:
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
    return run