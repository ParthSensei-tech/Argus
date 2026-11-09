from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_org
from app.models.content import ContentItem, ContentVersion
from app.models.graph import ImpactEvent
from app.models.knowledge import KnowledgeItem
from app.models.review import Review, ReviewFinding
from app.schemas.enums import ReviewStatus

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(ctx=Depends(get_org), db: Session = Depends(get_db)):
    org = ctx.org_id
    review_counts = dict(
        db.query(Review.status, func.count(Review.id)).filter(Review.org_id == org).group_by(Review.status).all()
    )
    risk_counts = dict(
        db.query(Review.risk, func.count(Review.id))
        .filter(Review.org_id == org, Review.risk.isnot(None)).group_by(Review.risk).all()
    )
    knowledge_counts = dict(
        db.query(KnowledgeItem.status, func.count(KnowledgeItem.id))
        .filter(KnowledgeItem.org_id == org).group_by(KnowledgeItem.status).all()
    )
    pending_items = knowledge_counts.get("PENDING", 0)
    awaiting = review_counts.get(ReviewStatus.AWAITING_REVIEW.value, 0)
    open_impacts = (
        db.query(ImpactEvent).filter(ImpactEvent.org_id == org, ImpactEvent.status != "RESOLVED").count()
    )
    recent = (
        db.query(Review).filter(Review.org_id == org).order_by(Review.created_at.desc()).limit(8).all()
    )
    recent_out = []
    for r in recent:
        version = db.get(ContentVersion, r.content_version_id)
        item = db.get(ContentItem, version.content_id) if version else None
        recent_out.append({
            "id": str(r.id), "title": item.title if item else "?", "status": r.status,
            "risk": r.risk, "decision": r.decision, "created_at": r.created_at.isoformat(),
        })
    return {
        "reviews_by_status": review_counts,
        "reviews_by_risk": risk_counts,
        "knowledge_by_status": knowledge_counts,
        "pending_approvals": pending_items + awaiting,
        "pending_knowledge_items": pending_items,
        "awaiting_human_review": awaiting,
        "open_impact_events": open_impacts,
        "total_content_items": db.query(ContentItem).filter(ContentItem.org_id == org).count(),
        "recent_reviews": recent_out,
    }


@router.get("/recurring-issues")
def recurring_issues(ctx=Depends(get_org), db: Session = Depends(get_db)):
    rows = (
        db.query(
            ReviewFinding.category, ReviewFinding.original_text,
            func.count(ReviewFinding.id).label("hits"),
            func.count(func.distinct(ReviewFinding.review_id)).label("reviews"),
        )
        .filter(ReviewFinding.org_id == ctx.org_id, ReviewFinding.dedupe_of.is_(None),
                ReviewFinding.status.notin_(["SUPPORTED", "NOT_APPLICABLE", "INFO"]))
        .group_by(ReviewFinding.category, ReviewFinding.original_text)
        .having(func.count(func.distinct(ReviewFinding.review_id)) >= 2)
        .order_by(func.count(func.distinct(ReviewFinding.review_id)).desc())
        .limit(20)
        .all()
    )
    return [
        {"category": r.category, "text": r.original_text[:300], "occurrences": r.hits, "reviews_affected": r.reviews}
        for r in rows
    ]