import hashlib
import math
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.knowledge import Embedding, KnowledgeItem, KnowledgeVersion

settings = get_settings()


class EmbeddingBudgetError(Exception):
    pass


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _dev_vector(text: str, dim: int) -> list[float]:
    seed = hashlib.sha256(text.encode()).digest()
    raw = []
    while len(raw) < dim:
        seed = hashlib.sha256(seed).digest()
        raw.extend(b / 255.0 for b in seed)
    vec = raw[:dim]
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (na * nb)


class EmbeddingService:
    """Hash-cached embeddings. openrouter=Qwen3-8B (paid, capped), local=sentence-transformers, dev=hash vectors."""

    def __init__(self):
        self.provider = settings.EMBEDDING_PROVIDER
        self.dim = settings.EMBEDDING_DIM
        self._local_model = None

    @property
    def model_name(self) -> str:
        if self.provider == "local":
            return settings.EMBEDDING_LOCAL_MODEL
        if self.provider == "dev":
            return "dev-hash-vector"
        return settings.EMBEDDING_MODEL

    def _check_budget(self, db: Session, estimated_tokens: int) -> None:
        if self.provider != "openrouter":
            return
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        used = (
            db.query(Embedding)
            .filter(Embedding.created_at >= month_start)
            .with_entities(Embedding.tokens)
            .all()
        )
        total = sum(t[0] for t in used)
        if total + estimated_tokens > settings.EMBEDDING_MAX_TOKENS_PER_MONTH:
            raise EmbeddingBudgetError(
                f"Monthly embedding budget exceeded ({total}+{estimated_tokens} > "
                f"{settings.EMBEDDING_MAX_TOKENS_PER_MONTH} tokens). Switch EMBEDDING_PROVIDER=local or raise cap."
            )

    def embed_texts(self, texts: list[str], db: Session | None = None) -> list[list[float]]:
        if self.provider == "dev":
            return [_dev_vector(t, self.dim) for t in texts]
        if self.provider == "local":
            if self._local_model is None:
                from sentence_transformers import SentenceTransformer

                self._local_model = SentenceTransformer(settings.EMBEDDING_LOCAL_MODEL)
            return self._local_model.encode(texts, normalize_embeddings=True).tolist()
        if not settings.embedding_key:
            raise EmbeddingBudgetError("No embedding API key configured (keystore Argus-Qwen)")
        estimated = sum(max(1, len(t) // 4) for t in texts)
        if db is not None:
            self._check_budget(db, estimated)
        r = httpx.post(
            f"{settings.EMBEDDING_BASE_URL}/embeddings",
            headers={"Authorization": f"Bearer {settings.embedding_key}"},
            json={"model": settings.EMBEDDING_MODEL, "input": texts, "encoding_format": "float"},
            timeout=60,
        )
        r.raise_for_status()
        data = r.json()["data"]
        return [d["embedding"] for d in sorted(data, key=lambda d: d["index"])]

    def embed_version(self, db: Session, version: KnowledgeVersion) -> Embedding:
        text = f"{version.body}\n{version.structured}".strip()
        content_hash = _hash(text)
        existing = (
            db.query(Embedding)
            .filter(Embedding.item_version_id == version.id)
            .first()
        )
        if existing:
            return existing
        cached = (
            db.query(Embedding)
            .filter(Embedding.content_hash == content_hash, Embedding.model == self.model_name)
            .first()
        )
        vector = cached.vector if cached else self.embed_texts([text], db=db)[0]
        emb = Embedding(
            org_id=version.org_id,
            item_version_id=version.id,
            model=self.model_name,
            dim=self.dim,
            vector=vector,
            content_hash=content_hash,
            tokens=0 if cached else max(1, len(text) // 4),
        )
        db.add(emb)
        db.flush()
        return emb

    def search(self, db: Session, org_id: uuid.UUID, query: str, k: int = 8) -> list[tuple[KnowledgeVersion, float]]:
        qvec = self.embed_texts([query], db=db)[0]
        rows = (
            db.query(Embedding, KnowledgeVersion, KnowledgeItem)
            .join(KnowledgeVersion, KnowledgeVersion.id == Embedding.item_version_id)
            .join(KnowledgeItem, KnowledgeItem.id == KnowledgeVersion.item_id)
            .filter(
                Embedding.org_id == org_id,
                KnowledgeItem.status == "APPROVED",
                KnowledgeVersion.superseded.is_(False),
                KnowledgeVersion.version == KnowledgeItem.current_version,
            )
            .all()
        )
        scored = [(version, _cosine(qvec, emb.vector)) for emb, version, item in rows]
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored[:k]