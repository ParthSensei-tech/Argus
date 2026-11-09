import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.graph import GraphEdge, GraphNode
from app.schemas.enums import KNOWLEDGE_ENTITY_MAP, KnowledgeType


def upsert_node(
    db: Session,
    org_id: uuid.UUID,
    entity_type: str,
    ref_id: uuid.UUID | None,
    label: str,
    properties: dict | None = None,
) -> GraphNode:
    node = (
        db.query(GraphNode)
        .filter(GraphNode.org_id == org_id, GraphNode.entity_type == entity_type, GraphNode.ref_id == ref_id)
        .first()
    )
    if node:
        node.label = label
        if properties:
            node.properties = {**(node.properties or {}), **properties}
    else:
        node = GraphNode(
            org_id=org_id, entity_type=entity_type, ref_id=ref_id, label=label, properties=properties or {}
        )
        db.add(node)
        db.flush()
    return node


def item_node(db: Session, org_id: uuid.UUID, item) -> GraphNode:
    entity = KNOWLEDGE_ENTITY_MAP[KnowledgeType(item.type)].value
    return upsert_node(
        db, org_id, entity, item.id, item.title,
        {"status": item.status, "version": item.current_version, "type": item.type},
    )


def add_edge(
    db: Session,
    org_id: uuid.UUID,
    src: GraphNode,
    dst: GraphNode,
    relation: str,
    provenance: dict | None = None,
) -> GraphEdge:
    edge = (
        db.query(GraphEdge)
        .filter(GraphEdge.src_id == src.id, GraphEdge.dst_id == dst.id, GraphEdge.relation == relation)
        .first()
    )
    if edge:
        return edge
    edge = GraphEdge(
        org_id=org_id, src_id=src.id, dst_id=dst.id, relation=relation, provenance=provenance or {}
    )
    db.add(edge)
    db.flush()
    return edge


def traverse_dependents(
    db: Session, org_id: uuid.UUID, root_node_id: uuid.UUID, max_depth: int = 6
) -> list[dict]:
    """Recursive CTE: walk incoming edges (things that depend on the root). Postgres + SQLite."""
    sql = text("""
        WITH RECURSIVE dep(id, depth, path) AS (
            SELECT e.src_id, 1, CAST(:root AS TEXT) || '/' || CAST(e.src_id AS TEXT)
            FROM graph_edges e
            WHERE REPLACE(CAST(e.dst_id AS TEXT), '-', '') = REPLACE(CAST(:root AS TEXT), '-', '')
              AND REPLACE(CAST(e.org_id AS TEXT), '-', '') = REPLACE(CAST(:org AS TEXT), '-', '')
          UNION ALL
            SELECT e.src_id, dep.depth + 1, dep.path || '/' || CAST(e.src_id AS TEXT)
            FROM graph_edges e
            JOIN dep ON e.dst_id = dep.id
            WHERE REPLACE(CAST(e.org_id AS TEXT), '-', '') = REPLACE(CAST(:org AS TEXT), '-', '')
              AND dep.depth < :max_depth
              AND dep.path NOT LIKE '%' || CAST(e.src_id AS TEXT) || '%'
        )
        SELECT DISTINCT dep.id, dep.depth, dep.path,
               n.entity_type, n.ref_id, n.label, n.properties
        FROM dep JOIN graph_nodes n ON n.id = dep.id
        ORDER BY dep.depth
    """)
    rows = db.execute(
        sql, {"root": str(root_node_id), "org": str(org_id), "max_depth": max_depth}
    ).mappings().all()
    out = []
    for r in rows:
        d = dict(r)
        d["id"] = uuid.UUID(str(d["id"]))
        d["ref_id"] = uuid.UUID(str(d["ref_id"])) if d["ref_id"] else None
        out.append(d)
    return out


def snapshot(db: Session, org_id: uuid.UUID, search: str | None = None, limit: int = 300) -> dict:
    q = db.query(GraphNode).filter(GraphNode.org_id == org_id)
    if search:
        q = q.filter(GraphNode.label.ilike(f"%{search}%"))
    nodes = q.limit(limit).all()
    node_ids = [n.id for n in nodes]
    edges = (
        db.query(GraphEdge)
        .filter(GraphEdge.org_id == org_id, GraphEdge.src_id.in_(node_ids), GraphEdge.dst_id.in_(node_ids))
        .all()
    )
    return {
        "nodes": [
            {"id": str(n.id), "entity_type": n.entity_type, "ref_id": str(n.ref_id) if n.ref_id else None,
             "label": n.label, "properties": n.properties}
            for n in nodes
        ],
        "edges": [
            {"id": str(e.id), "source": str(e.src_id), "target": str(e.dst_id),
             "relation": e.relation, "provenance": e.provenance}
            for e in edges
        ],
    }