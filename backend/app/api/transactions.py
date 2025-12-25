from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict
from datetime import date
from decimal import Decimal

from app.models.transaction import Transaction, TransactionCreate, TransactionUpdate
from app.services.transaction_service import TransactionService
from app.repositories import TransactionRepository # Need to pass this to the service

router = APIRouter(prefix="/transactions", tags=["transactions"])

# Dependency to get TransactionService instance
def get_transaction_service() -> TransactionService:
    # For now, we instantiate directly. Later, this will be handled by a dependency injection framework
    # and use the actual LLMParser and DuplicateDetectorService
    transaction_repo = TransactionRepository()
    # These are placeholders; actual implementations will be created later
    llm_parser = type('DummyLLMParser', (object,), {'parse_screenshot': lambda self, *args, **kwargs: []})()
    duplicate_detector = type('DummyDuplicateDetectorService', (object,), {'find_duplicates': lambda self, *args, **kwargs: None})(transaction_repo)
    return TransactionService(transaction_repo, llm_parser, duplicate_detector)

@router.post("/batch", response_model=Dict[str, int])
async def save_transactions(
    transactions: List[TransactionCreate],
    transaction_service: TransactionService = Depends(get_transaction_service)
):
    """Save reviewed transactions in batch"""
    return transaction_service.create_transactions_batch(transactions)

@router.put("/{transaction_id}", response_model=bool)
async def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    transaction_service: TransactionService = Depends(get_transaction_service)
):
    """Update individual transaction"""
    success = transaction_service.update_transaction(transaction_id, data)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return success

@router.delete("/{transaction_id}", response_model=bool)
async def delete_transaction(
    transaction_id: int,
    transaction_service: TransactionService = Depends(get_transaction_service)
):
    """Delete transaction (for confirmed duplicates)"""
    success = transaction_service.delete_transaction(transaction_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return success

@router.get("/", response_model=List[Transaction])
async def get_transactions(
    start_date: date = Query(...),
    end_date: date = Query(...),
    transaction_service: TransactionService = Depends(get_transaction_service)
):
    """Retrieve transactions within a specified date range"""
    return transaction_service.get_transactions_by_date_range(start_date, end_date)

@router.get("/monthly-summary", response_model=Dict[str, Decimal])
async def get_monthly_summary(
    year: int = Query(...),
    month: int = Query(...),
    transaction_service: TransactionService = Depends(get_transaction_service)
):
    """Get expense breakdown by category for a month"""
    return transaction_service.get_monthly_summary(year, month)
