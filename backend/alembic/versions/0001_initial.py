"""Initial schema: all Argus tables, pgvector extension, named knowledge views.

Revision ID: 0001
Revises:
Create Date: 2026-11-09
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

VIEWS = {
    "brand_rules": "('POLICY')",
    "approved_facts": "('FACT')",
    "terminology": "('TERM','PROHIBITED_TERM')",
    "visual_assets": "('VISUAL_ASSET')",
}


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    from app.db.base import Base
    import app.models  # noqa: F401

    Base.metadata.create_all(bind)
    for name, types in VIEWS.items():
        op.execute(f"DROP VIEW IF EXISTS {name}")
        op.execute(f"CREATE VIEW {name} AS SELECT * FROM knowledge_items WHERE type IN {types}")


def downgrade() -> None:
    for name in VIEWS:
        op.execute(f"DROP VIEW IF EXISTS {name}")
    from app.db.base import Base
    import app.models  # noqa: F401

    Base.metadata.drop_all(op.get_bind())