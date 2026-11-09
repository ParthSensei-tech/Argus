import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_org
from app.models.graph import GraphEdge, GraphNode, ImpactEvent
from app.services import graph

router = APIRouter(prefix="/knowledge-graph", tags=["graph"])


@router.get("")
def get_graph(search: str | None = Query(None), limit: int = Query(300, le=1000),
              ctx=Depends(get_org), db: Session = Depends(get_db)):
    return graph.snapshot(db, ctx.org_id, search=search, limit=limit)


@router.get("/nodes/{node_id}")
def get_node(node_id: uuid.UUID, ctx=Depends(get_org), db: Session = Depends(get_db)):
    node = db.get(GraphNode, node_id)
    if not node or node.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="Node not found")
    edges = (
        db.query(GraphEdge)
        .filter(GraphEdge.org_id == ctx.org_id,
                (GraphEdge.src_id == node_id) | (GraphEdge.dst_id == node_id))
        .all()
    )
    return {
        "node": {"id": str(node.id), "entity_type": node.entity_type,
                 "ref_id": str(node.ref_id) if node.ref_id else None,
                 "label": node.label, "properties": node.properties},
        "edges": [
            {"id": str(e.id), "source": str(e.src_id), "target": str(e.dst_id),
             "relation": e.relation, "provenance": e.provenance}
            for e in edges
        ],
    }


@router.get("/nodes/{node_id}/dependencies")
def get_dependencies(node_id: uuid.UUID, ctx=Depends(get_org), db: Session = Depends(get_db)):
    node = db.get(GraphNode, node_id)
    if not node or node.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="Node not found")
    deps = graph.traverse_dependents(db, ctx.org_id, node.id)
    return {
        "root": str(node.id),
        "dependents": [
            {"id": str(d["id"]), "depth": d["depth"], "entity_type": d["entity_type"],
             "ref_id": str(d["ref_id"]) if d["ref_id"] else None,
             "label": d["label"], "properties": d["properties"]}
            for d in deps
        ],
    }


@router.get("/impact/{event_id}")
def get_impact_detail(event_id: uuid.UUID, ctx=Depends(get_org), db: Session = Depends(get_db)):
    event = db.get(ImpactEvent, event_id)
    if not event or event.org_id != ctx.org_id:
        raise HTTPException(status_code=404, detail="Impact event not found")
    node = (
        db.query(GraphNode)
        .filter(GraphNode.org_id == ctx.org_id, GraphNode.ref_id == event.item_id)
        .first()
    )
    affected = []
    if node:
        deps = graph.traverse_dependents(db, ctx.org_id, node.id)
        affected = [
            {"id": str(d["id"]), "depth": d["depth"], "entity_type": d["entity_type"],
             "ref_id": str(d["ref_id"]) if d["ref_id"] else None, "label": d["label"]}
            for d in deps
            if d["entity_type"] in ("CONTENT_ITEM", "CONTENT_VERSION", "REVIEW")
        ]
    return {
        "event": {"id": str(event.id), "item_id": str(event.item_id),
                  "from_version": event.from_version, "to_version": event.to_version,
                  "change_summary": event.change_summary, "severity": event.severity,
                  "status": event.status, "affected_count": event.affected_count,
                  "created_at": event.created_at.isoformat()},
        "affected": affected,
    }