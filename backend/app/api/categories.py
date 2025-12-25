from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.models.category import Category, CategoryCreate
from app.repositories import CategoryRepository

router = APIRouter(prefix="/categories", tags=["categories"])

# Dependency to get CategoryRepository instance
def get_category_repository() -> CategoryRepository:
    return CategoryRepository()

@router.post("/", response_model=Category)
async def create_category(
    category_create: CategoryCreate,
    category_repo: CategoryRepository = Depends(get_category_repository)
):
    """Create a new category"""
    existing_category = category_repo.get_by_name(category_create.name)
    if existing_category:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category_id = category_repo.create(category_create)
    category = category_repo.get_by_id(category_id)
    if not category:
        raise HTTPException(status_code=500, detail="Failed to retrieve created category")
    return category

@router.get("/", response_model=List[Category])
async def get_all_categories(
    category_repo: CategoryRepository = Depends(get_category_repository)
):
    """Get all categories"""
    return category_repo.get_all()
