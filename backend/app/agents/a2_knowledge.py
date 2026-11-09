from sqlalchemy.orm import Session

from app.models.knowledge import BrandProfile
from app.models.review import Review
from app.schemas.contracts import CanonicalContent, RetrievedKnowledge
from app.services.knowledge import retrieve_knowledge


def run(db: Session, review: Review, canonical: CanonicalContent):
    knowledge: RetrievedKnowledge = retrieve_knowledge(db, review.org_id, canonical.full_text)
    profile = db.query(BrandProfile).filter(BrandProfile.org_id == review.org_id).first()
    if profile:
        knowledge.knowledge_snapshot["brand_profile"] = {
            "name": profile.name,
            "description": profile.description,
            "voice_tone": profile.voice_tone,
            "colors": profile.colors,
        }
    return knowledge.model_dump(), "pgvector-retrieval", 0, 0