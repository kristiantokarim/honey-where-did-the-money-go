from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

class TransactionBase(BaseModel):
    date: date
    amount: Decimal
    description: str
    source_app: str
    payment_method: Optional[str] = None
    target_account: Optional[str] = None
    category_id: Optional[int] = None
    is_duplicate: bool = False
    duplicate_of_id: Optional[int] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    date: Optional[date] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    source_app: Optional[str] = None
    payment_method: Optional[str] = None
    target_account: Optional[str] = None
    category_id: Optional[int] = None
    is_duplicate: Optional[bool] = None
    duplicate_of_id: Optional[int] = None

class Transaction(TransactionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ParsedTransaction(BaseModel):
    date: date
    amount: Decimal
    description: str
    target_account: Optional[str] = None
    payment_method: Optional[str] = None

class ProcessingResult(BaseModel):
    transactions: list # List of dicts with "transaction", "is_duplicate", "duplicate_of"

