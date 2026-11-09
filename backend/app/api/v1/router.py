from fastapi import APIRouter

from app.api.v1 import audit, auth, dashboard, files, graph, impact, knowledge, members, reviews

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(files.router)
api_router.include_router(knowledge.router)
api_router.include_router(reviews.router)
api_router.include_router(graph.router)
api_router.include_router(impact.router)
api_router.include_router(audit.router)
api_router.include_router(dashboard.router)
api_router.include_router(members.router)