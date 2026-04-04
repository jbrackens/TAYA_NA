from fastapi import APIRouter

from .endpoints import admin, main

api_router = APIRouter()

api_router.include_router(main.router, tags=["main"])
api_router.include_router(admin.router, prefix="/admin", tags=["user_context - admin"])
