# backend/app/api/__init__.py
from fastapi import APIRouter

api_router = APIRouter()

# Import and include other API routers here
from .transactions import router as transactions_router
from .categories import router as categories_router
from .upload import router as upload_router
api_router.include_router(transactions_router)
api_router.include_router(categories_router)
api_router.include_router(upload_router)
